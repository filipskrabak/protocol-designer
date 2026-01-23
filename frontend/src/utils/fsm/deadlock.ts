// Deadlock Detection Algorithms

import type {
  FSMNode,
  FSMEdge,
  ProgressDeadlock,
  CircularWait,
  EventStarvation,
  DeadState,
  DeadlockAnalysis,
} from './types';
import {
  buildAdjacencyList,
  findReachableNodes,
  hasPath,
} from '../graph/algorithms';
import { getAllEvents, getStatesWithEvent } from './validation';

/**
 * Find progress deadlocks: states that cannot reach any final state
 */
export function findProgressDeadlocks(
  nodes: FSMNode[],
  edges: FSMEdge[]
): ProgressDeadlock[] {
  const progressDeadlocks: ProgressDeadlock[] = [];

  // Find final states
  const finalStates = nodes.filter(n => n.data?.type === 'final');
  if (finalStates.length === 0) {
    // No final states - every state is a progress deadlock
    return nodes.map(n => ({
      stateId: n.id,
      label: n.data?.label || n.id,
      reason: 'No final state exists in FSM',
    }));
  }

  // Build adjacency list
  const adjacency = buildAdjacencyList(edges);

  // Check each non-final state
  for (const node of nodes) {
    if (node.data?.type === 'final') continue;

    // Check if this state can reach any final state
    let canReachFinal = false;
    for (const finalState of finalStates) {
      if (hasPath(node.id, finalState.id, adjacency)) {
        canReachFinal = true;
        break;
      }
    }

    if (!canReachFinal) {
      progressDeadlocks.push({
        stateId: node.id,
        label: node.data?.label || node.id,
        reason: 'Cannot reach any final state',
      });
    }
  }

  return progressDeadlocks;
}

/**
 * Build wait-for graph to detect circular dependencies
 * A state "waits for" another state if it needs to transition through it
 */
export function buildWaitForGraph(
  nodes: FSMNode[],
  edges: FSMEdge[]
): Map<string, Set<string>> {
  const waitForGraph = new Map<string, Set<string>>();

  // Initialize
  for (const node of nodes) {
    waitForGraph.set(node.id, new Set<string>());
  }

  // For each state, add its direct successors to its wait-for set
  for (const edge of edges) {
    if (edge.source !== edge.target) { // Skip self-loops
      waitForGraph.get(edge.source)?.add(edge.target);
    }
  }

  return waitForGraph;
}

/**
 * Detect circular waits using wait-for graph
 * A circular wait exists if there's a cycle in dependencies
 */
export function findCircularWaits(
  nodes: FSMNode[],
  edges: FSMEdge[]
): CircularWait[] {
  const circularWaits: CircularWait[] = [];
  const waitForGraph = buildWaitForGraph(nodes, edges);

  // Use DFS to find cycles in wait-for graph
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  const foundCycles = new Set<string>(); // Track unique cycles

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const waitingFor = waitForGraph.get(nodeId) || new Set();
    for (const neighbor of waitingFor) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // Found a circular wait!
        const cycleStartIndex = path.indexOf(neighbor);
        const cycleStates = path.slice(cycleStartIndex);

        // Create a normalized cycle key to avoid duplicates
        const sortedCycle = [...cycleStates].sort();
        const cycleKey = sortedCycle.join(',');

        if (!foundCycles.has(cycleKey)) {
          foundCycles.add(cycleKey);

          // Get labels for the states
          const labels = cycleStates.map(id => {
            const node = nodes.find(n => n.id === id);
            return node?.data?.label || id;
          });

          circularWaits.push({
            states: cycleStates,
            labels,
          });
        }
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return circularWaits;
}

/**
 * Find events that can never be triggered (event starvation)
 * An event is starved if it's only reachable from a small subset of states
 */
export function findEventStarvation(
  nodes: FSMNode[],
  edges: FSMEdge[]
): EventStarvation[] {
  const eventStarvations: EventStarvation[] = [];

  // Get all events
  const allEvents = getAllEvents(edges);

  // Find initial states
  const initialStates = nodes.filter(n => n.data?.type === 'initial');
  if (initialStates.length === 0) return eventStarvations;

  // Build adjacency list
  const adjacency = buildAdjacencyList(edges);

  // Find all reachable states from initial states
  const reachableFromInitial = new Set<string>();
  for (const initial of initialStates) {
    const reachable = findReachableNodes(initial.id, adjacency);
    reachable.forEach(id => reachableFromInitial.add(id));
  }

  // Check each event
  for (const event of allEvents) {
    const statesWithEvent = getStatesWithEvent(edges, event);

    // Count how many reachable states have this event
    let reachableCount = 0;
    for (const stateId of statesWithEvent) {
      if (reachableFromInitial.has(stateId)) {
        reachableCount++;
      }
    }

    // If event is only available from unreachable states, it's starved
    if (reachableCount === 0 && statesWithEvent.size > 0) {
      eventStarvations.push({
        event,
        reachableFrom: 0,
        totalStates: statesWithEvent.size,
      });
    }
    // If event is available from very few states relative to total reachable states
    else if (
      reachableCount > 0 &&
      reachableCount < reachableFromInitial.size * 0.1 // Less than 10% of reachable states
    ) {
      eventStarvations.push({
        event,
        reachableFrom: reachableCount,
        totalStates: reachableFromInitial.size,
      });
    }
  }

  return eventStarvations;
}

/**
 * Find terminal states that are not marked as final
 * These are states with no outgoing transitions that should probably be final
 */
export function findTerminalNonFinalStates(
  nodes: FSMNode[],
  edges: FSMEdge[]
): DeadState[] {
  const terminalNonFinalStates: DeadState[] = [];
  const statesWithOutgoing = new Set(edges.map(e => e.source));

  for (const node of nodes) {
    const isFinal = node.data?.type === 'final';
    const hasOutgoing = statesWithOutgoing.has(node.id);

    // Terminal (no outgoing) but not marked as final
    if (!hasOutgoing && !isFinal) {
      terminalNonFinalStates.push({
        id: node.id,
        label: node.data?.label || node.id,
      });
    }
  }

  return terminalNonFinalStates;
}

/**
 * Comprehensive deadlock detection
 * Checks for all types of deadlocks and returns analysis
 * Now supports EFSM with guard evaluation using DFS exploration
 */
export async function detectDeadlocks(
  nodes: FSMNode[],
  edges: FSMEdge[],
  variables?: import('@/contracts/models').EFSMVariable[],
  generateDetails: boolean = false
): Promise<DeadlockAnalysis> {
  // For EFSMs with variables, use formal DFS exploration
  if (variables && variables.length > 0) {
    console.log('🔬 Running EFSM verification with DFS exploration...');
    
    const { exploreAllPaths, generateDeadlockDetails } = await import('../efsm/traceGenerator');
    const { analyzeEFSM } = await import('../efsm/variableAnalysis');
    
    // Run DFS exploration to find reachable states considering guards
    const exploration = exploreAllPaths(nodes, edges, variables);
    
    // Get EFSM-specific warnings
    const { warnings } = analyzeEFSM(nodes, edges, variables);
    
    // Convert DFS deadlock states to progress deadlocks
    const progressDeadlocks: ProgressDeadlock[] = Array.from(exploration.deadlockStates).map(stateId => {
      const node = nodes.find(n => n.id === stateId);
      return {
        stateId,
        label: node?.data?.label || stateId,
        reason: 'No valid transitions due to guard conditions',
      };
    });
    
    // Find unreachable states (not found in DFS)
    const unreachableStates = nodes
      .filter(n => !exploration.reachableStates.has(n.id) && !n.data?.isFinal)
      .map(n => ({
        stateId: n.id,
        label: n.data?.label || n.id,
        reason: 'Unreachable from initial state with given variable domains',
      }));
    
    // Circular waits and event starvation still apply
    const circularWaits = findCircularWaits(nodes, edges);
    const eventStarvation = findEventStarvation(nodes, edges);
    
    // Terminal non-final from structural analysis
    const terminalNonFinalStates = findTerminalNonFinalStates(nodes, edges);
    
    const allDeadlocks = [
      ...progressDeadlocks,
      ...unreachableStates,
      ...terminalNonFinalStates
    ];
    
    const hasDeadlocks =
      allDeadlocks.length > 0 ||
      circularWaits.length > 0 ||
      eventStarvation.length > 0;
    
    let details: Map<string, import('@/contracts/models').DeadlockDetails> | undefined;
    
    // Generate detailed traces if requested
    if (generateDetails && hasDeadlocks) {
      details = new Map();
      
      // Generate details for all detected deadlock states
      for (const deadlock of allDeadlocks) {
        const deadlockDetails = generateDeadlockDetails(
          deadlock.stateId,
          'terminal',
          nodes,
          edges,
          variables,
          warnings
        );
        if (deadlockDetails) {
          details.set(deadlock.stateId, deadlockDetails);
        }
      }
    }
    
    console.log(`✅ EFSM verification complete: ${exploration.reachableStates.size} reachable, ${exploration.deadlockStates.size} deadlocks`);
    
    return {
      progressDeadlocks: allDeadlocks,
      circularWaits,
      eventStarvation,
      terminalNonFinalStates: [],
      hasDeadlocks,
      details,
    };
  }
  
  // For regular FSMs without variables, use traditional analysis
  const progressDeadlocks = findProgressDeadlocks(nodes, edges);
  const circularWaits = findCircularWaits(nodes, edges);
  const eventStarvation = findEventStarvation(nodes, edges);
  const terminalNonFinalStates = findTerminalNonFinalStates(nodes, edges);

  const hasDeadlocks =
    progressDeadlocks.length > 0 ||
    circularWaits.length > 0 ||
    eventStarvation.length > 0 ||
    terminalNonFinalStates.length > 0;

  return {
    progressDeadlocks,
    circularWaits,
    eventStarvation,
    terminalNonFinalStates,
    hasDeadlocks,
    details: undefined,
  };
}
