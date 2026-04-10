export type {
  FSMAnalysisNode,
  FSMAnalysisEdge,
  FSMMetrics,
  DeterminismIssue,
  CompletenessIssue,
  DeadState,
  UnreachableState,
  ProgressDeadlock,
  ConditionalDeadlock,
  CircularWait,
  EventStarvation,
  DeadlockAnalysis,
  FSMProperties,
  FSMIssues,
  FSMAnalysisResult,
} from '@/contracts/models';

/**
 * @deprecated Use FSMAnalysisNode from @/contracts/models instead.
 * These aliases are provided only while consumers are being updated.
 */
export type { FSMAnalysisNode as FSMNode, FSMAnalysisEdge as FSMEdge } from '@/contracts/models';
