// FSM Analysis Composable

import { computed, type ComputedRef } from 'vue';
import type {
  FSMNode,
  FSMEdge,
  FSMAnalysisResult,
  FSMMetrics,
  FSMProperties,
  FSMIssues,
} from '@/utils/fsm/types';
import {
  buildAdjacencyList,
  hasCycles,
  isStronglyConnected,
  longestPath,
  countSelfLoops,
  findReachableNodes,
} from '@/utils/graph/algorithms';
import {
  checkDeterminism,
  findDeadStates,
  findUnreachableStates,
  validateStructure,
} from '@/utils/fsm/validation';
import { detectDeadlocks } from '@/utils/fsm/deadlock';

export function useFSMAnalysis(
  nodes: ComputedRef<FSMNode[]>,
  edges: ComputedRef<FSMEdge[]>
) {
  /**
   * Calculate basic metrics
   */
  const metrics = computed<FSMMetrics>(() => {
    const initialStates = nodes.value.filter(n => n.data?.type === 'initial');
    const finalStates = nodes.value.filter(n => n.data?.type === 'final');
    
    return {
      totalStates: nodes.value.length,
      totalTransitions: edges.value.length,
      initialStates: initialStates.length,
      finalStates: finalStates.length,
    };
  });

  /**
   * Analyze structural properties
   */
  const properties = computed<FSMProperties>(() => {
    const structure = validateStructure(nodes.value);
    const adjacency = buildAdjacencyList(edges.value);
    
    // Check if all states are reachable from initial states
    let allReachable = true;
    const initialStates = nodes.value.filter(n => n.data?.type === 'initial');
    if (initialStates.length > 0) {
      const reachableSet = new Set<string>();
      for (const initial of initialStates) {
        const reachable = findReachableNodes(initial.id, adjacency);
        reachable.forEach(id => reachableSet.add(id));
      }
      allReachable = reachableSet.size === nodes.value.length;
    } else {
      allReachable = false; // No initial state means nothing is reachable
    }
    
    // Calculate max depth
    let maxDepth = 0;
    for (const initial of initialStates) {
      const depth = longestPath(initial.id, adjacency);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    const determinismIssues = checkDeterminism(edges.value);
    const cyclesDetected = hasCycles(nodes.value, adjacency);
    const stronglyConnected = isStronglyConnected(nodes.value, adjacency);
    const selfLoops = countSelfLoops(edges.value);
    
    return {
      hasInitialState: structure.hasInitialState,
      hasFinalState: structure.hasFinalState,
      allStatesReachable: allReachable,
      isDeterministic: determinismIssues.length === 0,
      isStronglyConnected: stronglyConnected,
      hasCycles: cyclesDetected,
      hasSelfLoops: selfLoops > 0,
      maxDepth,
    };
  });

  /**
   * Identify issues
   */
  const issues = computed<FSMIssues>(() => {
    const determinismIssues = checkDeterminism(edges.value);
    const deadStates = findDeadStates(nodes.value, edges.value);
    const unreachableStates = findUnreachableStates(nodes.value, edges.value);
    
    return {
      determinismIssues,
      deadStates,
      unreachableStates,
    };
  });

  /**
   * Detect deadlocks
   */
  const deadlocks = computed(() => {
    return detectDeadlocks(nodes.value, edges.value);
  });

  /**
   * Complete analysis result
   */
  const analysis = computed<FSMAnalysisResult>(() => {
    return {
      metrics: metrics.value,
      properties: properties.value,
      issues: issues.value,
      deadlocks: deadlocks.value,
    };
  });

  /**
   * Check if FSM has any issues
   */
  const hasIssues = computed(() => {
    return (
      issues.value.determinismIssues.length > 0 ||
      issues.value.deadStates.length > 0 ||
      issues.value.unreachableStates.length > 0 ||
      deadlocks.value.hasDeadlocks
    );
  });

  /**
   * Get validation status color
   */
  const validationColor = computed(() => {
    if (hasIssues.value) return 'error';
    if (!properties.value.hasInitialState || !properties.value.hasFinalState) {
      return 'warning';
    }
    return 'success';
  });

  return {
    // Individual computed properties
    metrics,
    properties,
    issues,
    deadlocks,
    
    // Combined analysis
    analysis,
    
    // Helper properties
    hasIssues,
    validationColor,
  };
}
