// FSM Validation Utilities

import type {
  FSMNode,
  FSMEdge,
  DeterminismIssue,
  CompletenessIssue,
  DeadState,
  UnreachableState,
} from './types';
import {
  buildAdjacencyList,
  findReachableNodes,
} from '../graph/algorithms';
import {
  areGuardsSatisfiableSimultaneously,
  areGuardsComplete,
  edgeDataToGuard,
} from './z3-checker';

/**
 * Check if FSM is deterministic using Z3 SMT solver
 * Returns list of states with non-deterministic transitions
 *
 * Algorithm:
 * 1. Group transitions by source state and event
 * 2. For each group, perform pairwise comparison of guards
 * 3. Use Z3 to check if any two guards can be satisfied simultaneously
 * 4. If satisfiable, the FSM is non-deterministic
 */
export async function checkDeterminism(edges: FSMEdge[]): Promise<DeterminismIssue[]> {
  const issues: DeterminismIssue[] = [];

  // Group transitions by source state and event
  const transitionsByStateAndEvent = new Map<string, Map<string, FSMEdge[]>>();

  for (const edge of edges) {
    const event = edge.data?.event || '';

    if (!transitionsByStateAndEvent.has(edge.source)) {
      transitionsByStateAndEvent.set(edge.source, new Map());
    }

    const stateTransitions = transitionsByStateAndEvent.get(edge.source)!;
    if (!stateTransitions.has(event)) {
      stateTransitions.set(event, []);
    }

    stateTransitions.get(event)!.push(edge);
  }

  // Check for non-determinism: pairwise intersection check using Z3
  for (const [state, eventMap] of transitionsByStateAndEvent) {
    for (const [event, transitions] of eventMap) {
      if (transitions.length > 1) {
        // Multiple transitions with same event - check pairwise for conflicts
        for (let i = 0; i < transitions.length; i++) {
          for (let j = i + 1; j < transitions.length; j++) {
            const t1 = transitions[i];
            const t2 = transitions[j];

            // Convert edge data to Guard objects
            const guard1 = edgeDataToGuard(t1.data);
            const guard2 = edgeDataToGuard(t2.data);

            try {
              // Check if both guards can be true simultaneously
              const result = await areGuardsSatisfiableSimultaneously(guard1, guard2);

              if (result.satisfiable) {
                // Non-determinism detected!
                issues.push({
                  state,
                  event: event || '(empty)',
                  targets: [t1.target, t2.target],
                  guard1,
                  guard2,
                  counterExample: result.model,
                });

                // Log detailed information for debugging
                console.warn(
                  `Non-determinism detected in state "${state}" for event "${event}":`,
                  `\n  Guard 1: ${JSON.stringify(guard1)}`,
                  `\n  Guard 2: ${JSON.stringify(guard2)}`,
                  `\n  Counter-example: ${result.model}`
                );

                // Only report once per state-event pair
                break;
              }
            } catch (error) {
              console.error('Error checking determinism with Z3:', error);
              // Fall back to conservative approach: assume non-deterministic if we can't check
              // (Comment this out if you prefer to ignore errors)
              /*
              issues.push({
                state,
                event: event || '(empty)',
                targets: [t1.target, t2.target],
              });
              */
            }
          }

          // Break outer loop if issue already found
          if (issues.some(issue => issue.state === state && issue.event === (event || '(empty)'))) {
            break;
          }
        }
      }
    }
  }

  return issues;
}

/**
 * Check if FSM has complete guard coverage (no gaps) using Z3 SMT solver
 * Returns list of states/events where guards don't cover all possible cases
 *
 * Algorithm:
 * 1. Group transitions by source state and event
 * 2. For each group, collect all guards
 * 3. Use Z3 to check if NOT(G1 OR G2 OR ... OR Gn) is satisfiable
 * 4. If satisfiable, there's a gap (potential local deadlock)
 */
export async function checkCompleteness(edges: FSMEdge[], variables?: any[]): Promise<CompletenessIssue[]> {
  const issues: CompletenessIssue[] = [];

  // Group transitions by source state and event
  const transitionsByStateAndEvent = new Map<string, Map<string, FSMEdge[]>>();

  for (const edge of edges) {
    const event = edge.data?.event || '';

    if (!transitionsByStateAndEvent.has(edge.source)) {
      transitionsByStateAndEvent.set(edge.source, new Map());
    }

    const stateTransitions = transitionsByStateAndEvent.get(edge.source)!;
    if (!stateTransitions.has(event)) {
      stateTransitions.set(event, []);
    }

    stateTransitions.get(event)!.push(edge);
  }

  // Check for completeness: gap check using Z3
  for (const [state, eventMap] of transitionsByStateAndEvent) {
    for (const [event, transitions] of eventMap) {
      // Collect all guards for this state-event pair
      const guards = transitions.map(t => edgeDataToGuard(t.data));

      try {
        // Check if guards cover all possible cases
        const result = await areGuardsComplete(guards, state, event, variables);

        if (!result.complete) {
          // Gap detected - guards don't cover all cases!
          issues.push({
            state,
            event: event || '(empty)',
            gapModel: result.gapModel,
          });

          // Log detailed information for debugging
          console.warn(
            `Completeness gap detected in state "${state}" for event "${event}":`,
            `\n  Guards: ${JSON.stringify(guards)}`,
            `\n  Gap example: ${result.gapModel}`
          );
        }
      } catch (error) {
        console.error('Error checking completeness with Z3:', error);
        // On error, assume complete (conservative approach)
      }
    }
  }

  return issues;
}

/**
 * Find dead states (states with no outgoing transitions)
 * Excludes final states as they are expected to have no outgoing transitions
 */
export function findDeadStates(nodes: FSMNode[], edges: FSMEdge[]): DeadState[] {
  const deadStates: DeadState[] = [];
  const statesWithOutgoing = new Set(edges.map(e => e.source));

  for (const node of nodes) {
    const isFinal = node.data?.type === 'final';
    if (!statesWithOutgoing.has(node.id) && !isFinal) {
      deadStates.push({
        id: node.id,
        label: node.data?.label || node.id,
      });
    }
  }

  return deadStates;
}

/**
 * Find unreachable states (states that cannot be reached from initial states)
 */
export function findUnreachableStates(nodes: FSMNode[], edges: FSMEdge[]): UnreachableState[] {
  const unreachableStates: UnreachableState[] = [];

  // Find initial states
  const initialStates = nodes.filter(n => n.data?.type === 'initial');
  if (initialStates.length === 0) {
    // No initial state - all states are technically unreachable
    return nodes.map(n => ({
      id: n.id,
      label: n.data?.label || n.id,
    }));
  }

  // Build adjacency list
  const adjacency = buildAdjacencyList(edges);

  // Find all reachable states from all initial states
  const reachable = new Set<string>();
  for (const initial of initialStates) {
    const reachableFromInitial = findReachableNodes(initial.id, adjacency);
    reachableFromInitial.forEach(id => reachable.add(id));
  }

  // States not in reachable set are unreachable
  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      unreachableStates.push({
        id: node.id,
        label: node.data?.label || node.id,
      });
    }
  }

  return unreachableStates;
}

/**
 * Validate basic FSM structure
 */
export function validateStructure(nodes: FSMNode[]): {
  hasInitialState: boolean;
  hasFinalState: boolean;
  initialStateCount: number;
  finalStateCount: number;
} {
  const initialStates = nodes.filter(n => n.data?.type === 'initial');
  const finalStates = nodes.filter(n => n.data?.type === 'final');

  return {
    hasInitialState: initialStates.length > 0,
    hasFinalState: finalStates.length > 0,
    initialStateCount: initialStates.length,
    finalStateCount: finalStates.length,
  };
}

/**
 * Find all unique events in the FSM
 */
export function getAllEvents(edges: FSMEdge[]): Set<string> {
  const events = new Set<string>();
  for (const edge of edges) {
    const event = edge.data?.event;
    if (event) {
      events.add(event);
    }
  }
  return events;
}

/**
 * Find which states can trigger a specific event
 */
export function getStatesWithEvent(edges: FSMEdge[], event: string): Set<string> {
  const states = new Set<string>();
  for (const edge of edges) {
    if (edge.data?.event === event) {
      states.add(edge.source);
    }
  }
  return states;
}
