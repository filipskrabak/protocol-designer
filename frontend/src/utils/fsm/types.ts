// FSM Analysis Type Definitions

export interface FSMNode {
  id: string;
  type?: string;
  data?: {
    label?: string;
    type?: 'initial' | 'normal' | 'final';
  };
}

export interface FSMEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    event?: string;
    condition?: any;
    action?: string;
  };
}

export interface FSMMetrics {
  totalStates: number;
  totalTransitions: number;
  initialStates: number;
  finalStates: number;
}

export interface DeterminismIssue {
  state: string;
  event: string;
  targets: string[];
  guard1?: any;  // First conflicting guard
  guard2?: any;  // Second conflicting guard
  counterExample?: string;  // Z3 model showing the conflict
}

export interface CompletenessIssue {
  state: string;
  event: string;
  gapModel?: string;  // Counter-example showing inputs not covered by any guard
}

export interface DeadState {
  id: string;
  label: string;
}

export interface UnreachableState {
  id: string;
  label: string;
}

export interface ProgressDeadlock {
  stateId: string;
  label: string;
  reason: string;
}

export interface CircularWait {
  states: string[];
  labels: string[];
}

export interface EventStarvation {
  event: string;
  reachableFrom: number;
  totalStates: number;
}

export interface DeadlockAnalysis {
  progressDeadlocks: ProgressDeadlock[];
  circularWaits: CircularWait[];
  eventStarvation: EventStarvation[];
  terminalNonFinalStates: DeadState[];
  hasDeadlocks: boolean;
  details?: Map<string, import('@/contracts/models').DeadlockDetails>; // Detailed info per deadlock state
}

export interface FSMProperties {
  hasInitialState: boolean;
  hasFinalState: boolean;
  allStatesReachable: boolean;
  isDeterministic: boolean;
  isComplete: boolean;  // True if all state-event pairs have complete guard coverage
  isStronglyConnected: boolean;
  hasCycles: boolean;
  hasSelfLoops: boolean;
  maxDepth: number;
}

export interface FSMIssues {
  determinismIssues: DeterminismIssue[];
  completenessIssues: CompletenessIssue[];
  deadStates: DeadState[];
  unreachableStates: UnreachableState[];
}

export interface FSMAnalysisResult {
  metrics: FSMMetrics;
  properties: FSMProperties;
  issues: FSMIssues;
  deadlocks: DeadlockAnalysis;
}
