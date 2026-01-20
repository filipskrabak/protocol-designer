// FSM Validation Utilities

import type {
  FSMNode,
  FSMEdge,
  DeterminismIssue,
  DeadState,
  UnreachableState,
} from './types';
import {
  buildAdjacencyList,
  findReachableNodes,
} from '../graph/algorithms';

/**
 * Get a signature for a condition to compare conditions for determinism
 */
export function getConditionSignature(condition: any): string {
  if (!condition) return '';
  
  if (condition.type === 'protocol') {
    // Sort the conditions by field_id, operator, and value for consistent comparison
    const sorted = [...(condition.conditions || [])].sort((a, b) => {
      if (a.field_id !== b.field_id) return a.field_id.localeCompare(b.field_id);
      if (a.operator !== b.operator) return a.operator.localeCompare(b.operator);
      return String(a.value).localeCompare(String(b.value));
    });
    return JSON.stringify(sorted);
  } else if (condition.type === 'manual') {
    // For manual conditions, use the trimmed text as signature
    return (condition.text || '').trim();
  }
  
  return '';
}

/**
 * Check if FSM is deterministic
 * Returns list of states with non-deterministic transitions
 */
export function checkDeterminism(edges: FSMEdge[]): DeterminismIssue[] {
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
  
  // Check for non-determinism: same event with different conditions or targets
  for (const [state, eventMap] of transitionsByStateAndEvent) {
    for (const [event, transitions] of eventMap) {
      if (transitions.length > 1) {
        // Multiple transitions with same event - check if conditions differ
        const conditionSignatures = new Set<string>();
        
        for (const transition of transitions) {
          const signature = getConditionSignature(transition.data?.condition);
          if (conditionSignatures.has(signature)) {
            // Same event with same condition going to different states - non-deterministic!
            issues.push({
              state,
              event: event || '(empty)',
              targets: transitions.map(t => t.target),
            });
            break;
          }
          conditionSignatures.add(signature);
        }
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
