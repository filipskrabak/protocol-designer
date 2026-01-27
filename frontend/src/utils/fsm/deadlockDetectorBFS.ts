// Concrete BFS-based Deadlock Detection for EFSM
// This implements bounded state space exploration using concrete variable valuations

import type {
  FSMNode,
  FSMEdge,
  ProgressDeadlock,
} from './types';
import type {
  EFSMVariable,
  VariableState,
  FSMEvent,
} from '@/contracts/models';
import {
  evaluateGuard,
  executeAction,
  getInitialVariableState,
} from '@/utils/efsm/guardEvaluator';

/**
 * Configuration for node in the BFS exploration
 */
interface BFSNode {
  stateId: string;
  variableState: VariableState;
  depth: number;
  trace: string[]; // Transition IDs taken to reach this node
}

/**
 * Configuration options for deadlock detection
 */
export interface DeadlockDetectionConfig {
  maxDepth: number;      // Maximum depth to explore (default: 50)
  maxNodes: number;      // Maximum nodes to explore (default: 10000)
  timeoutMs: number;     // Timeout in milliseconds (default: 5000)
}

const DEFAULT_CONFIG: DeadlockDetectionConfig = {
  maxDepth: 50,
  maxNodes: 10000,
  timeoutMs: 5000,
};

/**
 * Check if a transition can fire based on event semantics
 *
 * Event availability (CONSERVATIVE approach for soundness):
 * - INPUT: event_possible = FALSE (cannot guarantee environment provides)
 * - OUTPUT: event_possible = TRUE (protocol controls)
 * - INTERNAL: event_possible = TRUE (spontaneous)
 * - TIMEOUT: event_possible = TRUE (time eventually progresses)
 *
 * @param edge - Transition edge
 * @param variableState - Current variable values
 * @param variables - Variable definitions
 * @param events - Event registry
 * @param allowInputs - If true, INPUT events can fire (optimistic mode)
 * @returns true if transition can fire
 */
function canTransitionFire(
  edge: FSMEdge,
  variableState: VariableState,
  variables: EFSMVariable[],
  events: FSMEvent[],
  allowInputs: boolean = false
): boolean {
  // 1. Check guard condition
  // 2. Check event availability (CONSERVATIVE)
  const guard = edge.data?.condition;
  const guardStr = typeof guard === 'string' ? guard :
                   guard?.type === 'manual' ? guard.text : '';

  const guardResult = evaluateGuard(guardStr, variableState, variables);
  if (guardResult !== true) {
    return false; // Guard blocks transition
  }

  // 3. Check event availability
  const eventName = edge.data?.event;

  // No event = epsilon transition (always available)
  if (!eventName || eventName.trim() === '') {
    return true;
  }

  // Find event in registry by name
  const event = events.find(e => e.name === eventName);

  if (!event) {
    // Event not in registry - treat as epsilon (backward compatibility)
    console.warn(`Event "${eventName}" not found in registry, treating as epsilon`);
    return true;
  }

  // 3. Apply event semantics
  switch (event.type) {
    case 'input':
      // INPUT: From environment - cannot guarantee it will occur
      // In optimistic mode (allowInputs=true), we explore these paths but mark them as conditional
      return allowInputs;

    case 'output':
      // OUTPUT: Protocol controls - can emit when ready
      // event_possible = TRUE
      return true;

    case 'internal':
      // INTERNAL: Spontaneous - no external dependency
      // event_possible = TRUE
      return true;

    case 'timeout':
      // TIMEOUT: Time-based - will eventually occur
      // event_possible = TRUE
      return true;

    default:
      // Unknown type - conservative: assume not available
      console.warn(`Unknown event type: ${(event as any).type}`);
      return false;
  }
}

/**
 * Serialize a configuration (state + variable values) to a string key for visited tracking
 */
function serializeConfiguration(stateId: string, variableState: VariableState): string {
  const sortedVars = Object.keys(variableState).sort();
  const values = sortedVars.map(key => `${key}:${variableState[key]}`).join(',');
  return `${stateId}|${values}`;
}

/**
 * Detect deadlocks using concrete BFS exploration
 *
 * Algorithm:
 * 1. Start from initial states with initial variable valuations
 * 2. BFS: for each configuration (state, variables), check all outgoing transitions
 * 3. Evaluate guards with concrete variable values
 * 4. Check event availability using CONSERVATIVE semantics (input = FALSE)
 * 5. If a guard passes AND event available, execute actions and enqueue successor
 * 6. If NO transitions can fire and state is not final → DEADLOCK
 *
 * @param nodes - FSM nodes
 * @param edges - FSM edges (transitions)
 * @param variables - EFSM variables with bounds
 * @param events - Event registry (for semantic analysis)
 * @param config - Detection configuration (limits)
 * @returns Array of progress deadlocks found
 */
export function detectDeadlocksConcreteBFS(
  nodes: FSMNode[],
  edges: FSMEdge[],
  variables: EFSMVariable[],
  events: FSMEvent[] = [],
  config: Partial<DeadlockDetectionConfig> = {}
): {
  deadlocks: ProgressDeadlock[];
  conditionalDeadlocks: { stateId: string; label: string; reason: string; requiredInputs: string[] }[];
  hasCycles: boolean;
  maxDepth: number;
  timeElapsedMs: number;
  exploredNodes: number;
  uniqueConfigurations: number
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  console.group('🔍 Concrete BFS Deadlock Detection');
  console.log('Configuration:', cfg);
  console.log('Nodes:', nodes.length);
  console.log('Edges:', edges.length);
  console.log('Variables:', variables);
  console.log('Events:', events.length, events.length > 0 ? events : '(using epsilon/legacy)');

  const startTime = Date.now();
  const deadlocks: ProgressDeadlock[] = [];
  const conditionalDeadlocks: { stateId: string; label: string; reason: string; requiredInputs: string[] }[] = [];
  let cycleDetected = false;
  let maxDepthReached = 0;

  // Find initial states
  const initialStates = nodes.filter(n => n.data?.type === 'initial');
  if (initialStates.length === 0) {
    console.warn('⚠️ No initial states found');
    console.groupEnd();
    return [];
  }

  // Get initial variable state
  const initialVariableState = getInitialVariableState(variables);
  console.log('📊 Initial variable state:', initialVariableState);

  // Build adjacency list for quick edge lookup
  const outgoingEdges = new Map<string, FSMEdge[]>();
  for (const edge of edges) {
    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge);
  }

  // BFS queue
  const queue: BFSNode[] = [];

  // Visited configurations (state + variable values)
  const visited = new Set<string>();

  // Initialize queue with initial states
  for (const initialState of initialStates) {
    const node: BFSNode = {
      stateId: initialState.id,
      variableState: { ...initialVariableState },
      depth: 0,
      trace: [],
    };
    queue.push(node);
    console.log('🚀 Starting from initial state:', initialState.data?.label || initialState.id);
  }

  let exploredNodes = 0;
  let exploredConfigurations = 0;

  // BFS exploration
  while (queue.length > 0) {
    // Check timeout
    if (Date.now() - startTime > cfg.timeoutMs) {
      console.warn('⏱️ Timeout reached, stopping exploration');
      break;
    }

    // Check node limit
    if (exploredNodes >= cfg.maxNodes) {
      console.warn('📊 Max nodes reached, stopping exploration');
      break;
    }

    const current = queue.shift()!;
    exploredNodes++;

    // Create configuration key
    const configKey = serializeConfiguration(current.stateId, current.variableState);

    // Skip if already visited
    if (visited.has(configKey)) {
      continue;
    }
    visited.add(configKey);
    exploredConfigurations++;

    // Check depth limit
    if (current.depth >= cfg.maxDepth) {
      console.log(`⚠️ Max depth ${cfg.maxDepth} reached at state ${current.stateId}`);
      continue;
    }

    // Get current state node
    const currentStateNode = nodes.find(n => n.id === current.stateId);
    if (!currentStateNode) {
      console.warn(`⚠️ State node not found: ${current.stateId}`);
      continue;
    }

    const isFinal = currentStateNode.data?.type === 'final';

    // Log current configuration (more detailed for debugging)
    console.log(`\n📍 Exploring: state=${currentStateNode.data?.label || current.stateId}, depth=${current.depth}, vars=${JSON.stringify(current.variableState)}`);

    // Get outgoing edges from this state
    const outgoing = outgoingEdges.get(current.stateId) || [];
    console.log(`  → ${outgoing.length} outgoing transitions`);

    // Try to find at least one enabled transition
    let foundEnabledTransition = false;
    const availableInputs: string[] = [];

    for (const edge of outgoing) {
      const targetNode = nodes.find(n => n.id === edge.target);
      const eventName = edge.data?.event || '(epsilon)';
      const guardStr = typeof edge.data?.condition === 'string' ? edge.data.condition :
                       edge.data?.condition?.type === 'manual' ? edge.data?.condition.text : '';

      console.log(`    Checking: ${eventName} → ${targetNode?.data?.label || edge.target}${guardStr ? ` [${guardStr}]` : ''}`);

      // Check if transition can fire (guard + event availability) - OPTIMISTIC mode
      const canFire = canTransitionFire(edge, current.variableState, variables, events, true);
      console.log(`      Can fire: ${canFire}`);

      if (canFire) {
        // Check if this is an INPUT event
        const event = events.find(e => e.name === eventName);
        if (event?.type === 'input') {
          availableInputs.push(eventName);
          // Don't set foundEnabledTransition - INPUT events require environment cooperation
        } else {
          // Non-INPUT transition available (OUTPUT, TIMEOUT, INTERNAL, epsilon)
          foundEnabledTransition = true;
        }

        // Transition is enabled - execute action and explore successor
        const action = edge.data?.action;

        // Execute action to get new variable state
        const newVariableState = executeAction(action || '', current.variableState, variables);

        // Create successor configuration
        const successor: BFSNode = {
          stateId: edge.target,
          variableState: newVariableState,
          depth: current.depth + 1,
          trace: [...current.trace, edge.id],
        };

        // Track max depth
        maxDepthReached = Math.max(maxDepthReached, successor.depth);

        // Check if we've seen this configuration
        const successorKey = serializeConfiguration(successor.stateId, successor.variableState);
        if (!visited.has(successorKey)) {
          queue.push(successor);
        } else {
          // Found a cycle - we're revisiting a state with same variable values
          cycleDetected = true;
        }
      }
    }

    // Determine if this is a deadlock
    if (!foundEnabledTransition && !isFinal) {
      if (availableInputs.length > 0) {
        // CONDITIONAL DEADLOCK: Only INPUT events available
        console.log(`🟡 CONDITIONAL DEADLOCK at state: ${currentStateNode.data?.label || current.stateId}`);
        console.log('   Requires INPUT events:', availableInputs);
        console.log('   Variable values:', current.variableState);

        conditionalDeadlocks.push({
          stateId: current.stateId,
          label: currentStateNode.data?.label || current.stateId,
          reason: `Blocked waiting for INPUT events: ${availableInputs.join(', ')}`,
          requiredInputs: availableInputs,
        });
      } else {
        // HARD DEADLOCK: No transitions at all
        console.log(`🔴 DEADLOCK FOUND at state: ${currentStateNode.data?.label || current.stateId}`);
        console.log('   Variable values:', current.variableState);
        console.log('   Trace length:', current.trace.length);
        console.log('   Depth:', current.depth);

        deadlocks.push({
          stateId: current.stateId,
          label: currentStateNode.data?.label || current.stateId,
          reason: `No enabled transitions with variable state: ${JSON.stringify(current.variableState)}`,
        });
      }
    }
  }

  const elapsedTime = Date.now() - startTime;

  console.log('📈 Exploration statistics:');
  console.log(`   Explored nodes: ${exploredNodes}`);
  console.log(`   Unique configurations: ${exploredConfigurations}`);
  console.log(`   Queue remaining: ${queue.length}`);
  console.log(`   Time elapsed: ${elapsedTime}ms`);
  console.log(`   Deadlocks found: ${deadlocks.length}`);

  if (deadlocks.length > 0) {
    console.log('🔴 Deadlocks detected:', deadlocks);
  } else {
    console.log('✅ No hard deadlocks found');
  }

  if (conditionalDeadlocks.length > 0) {
    console.log('🟡 Conditional deadlocks detected:', conditionalDeadlocks);
  }

  if (cycleDetected) {
    console.log('🔄 Executable cycles detected during exploration');
  }

  console.log(`📏 Maximum depth reached: ${maxDepthReached}`);

  console.groupEnd();

  return {
    deadlocks,
    conditionalDeadlocks,
    hasCycles: cycleDetected,
    maxDepth: maxDepthReached,
    timeElapsedMs: elapsedTime,
    exploredNodes,
    uniqueConfigurations: exploredConfigurations,
  };
}

/**
 * Check if variables have bounded domains (required for concrete enumeration)
 */
export function areVariablesBounded(variables: EFSMVariable[]): boolean {
  for (const v of variables) {
    if (v.type === 'int') {
      if (v.minValue === undefined || v.maxValue === undefined) {
        return false;
      }
      // Check if domain is reasonable (not too large)
      const range = v.maxValue - v.minValue + 1;
      if (range > 100) {
        console.warn(`⚠️ Variable ${v.name} has large domain: ${range} values`);
      }
    }
    // bool and enum are always bounded
  }
  return true;
}
