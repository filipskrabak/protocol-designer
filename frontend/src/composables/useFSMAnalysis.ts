// FSM Analysis Composable

import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type {
  FSMNode,
  FSMEdge,
  FSMAnalysisResult,
  FSMMetrics,
  FSMProperties,
  FSMIssues,
  DeterminismIssue,
  CompletenessIssue,
  DeadlockAnalysis,
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
  checkCompleteness,
  findDeadStates,
  findUnreachableStates,
  validateStructure,
} from '@/utils/fsm/validation';
import { detectDeadlocks } from '@/utils/fsm/deadlock';

export function useFSMAnalysis(
  nodes: ComputedRef<FSMNode[]>,
  edges: ComputedRef<FSMEdge[]>,
  variables?: ComputedRef<any[]>
) {
  // Ref to store determinism issues (async computed)
  const determinismIssues: Ref<DeterminismIssue[]> = ref([]);

  // Ref to store completeness issues (async computed)
  const completenessIssues: Ref<CompletenessIssue[]> = ref([]);

  // Ref to store deadlock analysis (async computed)
  const deadlockAnalysis: Ref<DeadlockAnalysis> = ref({
    progressDeadlocks: [],
    circularWaits: [],
    eventStarvation: [],
    terminalNonFinalStates: [],
    hasDeadlocks: false,
  });

  // Flags to track if checks are in progress
  const checkingDeterminism = ref(false);
  const checkingCompleteness = ref(false);
  const checkingDeadlocks = ref(false);

  // Async function to check determinism
  async function updateDeterminismCheck() {
    checkingDeterminism.value = true;
    try {
      determinismIssues.value = await checkDeterminism(edges.value);
    } catch (error) {
      console.error('Error checking determinism:', error);
      determinismIssues.value = [];
    } finally {
      checkingDeterminism.value = false;
    }
  }

  // Async function to check completeness
  async function updateCompletenessCheck() {
    checkingCompleteness.value = true;
    try {
      completenessIssues.value = await checkCompleteness(edges.value, variables?.value);
    } catch (error) {
      console.error('Error checking completeness:', error);
      completenessIssues.value = [];
    } finally {
      checkingCompleteness.value = false;
    }
  }

  // Async function to check deadlocks
  async function updateDeadlockCheck() {
    checkingDeadlocks.value = true;
    try {
      deadlockAnalysis.value = await detectDeadlocks(nodes.value, edges.value);
    } catch (error) {
      console.error('Error checking deadlocks:', error);
      deadlockAnalysis.value = {
        progressDeadlocks: [],
        circularWaits: [],
        eventStarvation: [],
        terminalNonFinalStates: [],
        hasDeadlocks: false,
      };
    } finally {
      checkingDeadlocks.value = false;
    }
  }

  // Watch edges and update determinism check
  watch(edges, () => {
    updateDeterminismCheck();
    updateCompletenessCheck();
  }, { immediate: true, deep: true });

  // Watch nodes and edges and update deadlock check
  watch([nodes, edges], () => {
    updateDeadlockCheck();
  }, { immediate: true, deep: true });

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

    const cyclesDetected = hasCycles(nodes.value, adjacency);
    const stronglyConnected = isStronglyConnected(nodes.value, adjacency);
    const selfLoops = countSelfLoops(edges.value);

    return {
      hasInitialState: structure.hasInitialState,
      hasFinalState: structure.hasFinalState,
      allStatesReachable: allReachable,
      isDeterministic: determinismIssues.value.length === 0,
      isComplete: completenessIssues.value.length === 0,
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
    const deadStates = findDeadStates(nodes.value, edges.value);
    const unreachableStates = findUnreachableStates(nodes.value, edges.value);

    return {
      determinismIssues: determinismIssues.value,
      completenessIssues: completenessIssues.value,
      deadStates,
      unreachableStates,
    };
  });

  /**
   * Deadlocks analysis result (computed from ref)
   */
  const deadlocks = computed(() => deadlockAnalysis.value);

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
      issues.value.completenessIssues.length > 0 ||
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

    // Async checking state
    checkingDeterminism,
    checkingCompleteness,
    checkingDeadlocks,
    determinismIssues,
    completenessIssues,
    deadlockAnalysis,

    // Combined analysis
    analysis,

    // Helper properties
    hasIssues,
    validationColor,
  };
}
