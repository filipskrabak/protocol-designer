// Deadlock Detection Algorithms

import type {
  FSMNode,
  FSMEdge,
  ProgressDeadlock,
  DeadlockAnalysis,
} from './types';
import {
  detectDeadlocksConcreteBFS,
  areVariablesBounded,
} from './deadlockDetectorBFS';

/**
 * Comprehensive deadlock detection
 *
 * Implementation:
 * - Uses concrete BFS exploration for EFSM with bounded variables
 * - Explores state space with actual variable values
 * - Detects progress deadlocks (states where no transitions are enabled)
 *
 * Future enhancements:
 * - Circular wait detection (cycles in dependencies)
 * - Event starvation detection (events never reachable)
 * - Terminal non-final state detection
 * - Symbolic (SMT-based) exploration for larger state spaces
 */
export async function detectDeadlocks(
  nodes: FSMNode[],
  edges: FSMEdge[],
  variables?: import('@/contracts/models').EFSMVariable[],
  events?: import('@/contracts/models').FSMEvent[],
  generateDetails: boolean = false
): Promise<DeadlockAnalysis> {
  console.log('🔬 Deadlock detection called with:', {
    nodes: nodes.length,
    edges: edges.length,
    variables: variables?.length || 0,
    generateDetails
  });

  let progressDeadlocks: ProgressDeadlock[] = [];

  // Check if we have variables (EFSM) and they are bounded
  if (variables && variables.length > 0) {
    console.log('🔍 Running EFSM deadlock detection with concrete BFS');

    // Check if variables have bounded domains
    const bounded = areVariablesBounded(variables);
    if (!bounded) {
      console.warn('⚠️ Some variables are unbounded - deadlock detection may be incomplete');
    }

    // Run concrete BFS deadlock detection with CONSERVATIVE event semantics
    // Use events from FSM registry if provided, otherwise empty array
    progressDeadlocks = detectDeadlocksConcreteBFS(nodes, edges, variables, events || [], {
      maxDepth: 50,
      maxNodes: 10000,
      timeoutMs: 5000,
    });
  } else {
    console.log('ℹ️ No variables defined - skipping EFSM deadlock detection');
    // For plain FSM without variables, we would need simpler deadlock detection
    // This is not implemented yet
  }

  const hasDeadlocks = progressDeadlocks.length > 0;

  return {
    progressDeadlocks,
    circularWaits: [], // TODO: Implement circular wait detection
    eventStarvation: [], // TODO: Implement event starvation detection
    terminalNonFinalStates: [], // TODO: Implement terminal non-final detection
    hasDeadlocks,
  };
}
