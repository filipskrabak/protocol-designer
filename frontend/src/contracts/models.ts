import { Endian, LengthUnit } from "./enums";
import { v4 } from "uuid";

export interface FieldOption {
  name: string;
  value: number;
  used_for_encapsulation?: boolean; // used to indicate if this field option is used for encapsulation
}

export interface Field {
  id: string;
  display_name: string;
  length: number;
  max_length?: number;
  is_variable_length: boolean;
  field_options?: FieldOption[];
  description?: string;
  encapsulate: boolean; // used to indicate if this protocol contains a child protocol
  endian: Endian;
  length_unit: LengthUnit; // unit for the length field (bits or bytes)
  group_id?: string;
}

export interface Protocol {
  id: typeof v4;
  name: string;
  author: string;
  description: string;
  version: string;
  updated_at: string; // timestamp
  created_at: string; // timestamp
  fields: Field[];
  finite_state_machines?: FiniteStateMachine[];
  colored_petri_nets?: ColoredPetriNet[];
}

export interface EncapsulatedProtocol {
  id: typeof v4;
  protocol: Protocol;
  used_for_encapsulation_fields: Field[];
}

export interface Notification {
  message: string;
  timeout: number;
  color: string;
  icon: string;
}

export interface FloatingFieldWindow {
  show: boolean;
  x: number;
  y: number;
  field: Field;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface ExportResult {
  success: boolean;
  content?: string;
  error?: string;
  blob?: Blob;
  filename?: string;
  // For multi-file exports
  files?: Array<{
    content: string;
    filename: string;
    mimeType?: string;
  }>;
}

export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  fileExtension: string;
  mimeType: string;
  icon: string;
  supportsPreview: boolean;
  previewLanguage?: string; // For syntax highlighting in preview
}

export interface ExportHandler {
  format: ExportFormat;
  generate(protocol: Protocol, context: ExportContext): Promise<ExportResult>;
  validate?(protocol: Protocol): { valid: boolean; errors?: string[] };
}

export interface ExportContext {
  svgWrapper?: HTMLElement;
  lengthToBits: (field: Field) => number;
  maxLengthToBits: (field: Field) => number;
  showNotification: (notification: Notification) => void;
  configuration?: Record<string, any>; // For format-specific configuration
}

export interface ExportDropdownItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  onClick: () => void;
}

// FSM Data Structures

export interface FSMNodeData {
  label: string;
  isInitial: boolean;
  isFinal: boolean;
  description?: string;
  metadata?: Record<string, any>; // For additional state properties
}

export interface FSMNode {
  id: string;
  type: 'fsmState';
  position: { x: number; y: number };
  data: FSMNodeData;
  dimensions?: { width: number; height: number };
}

export interface FSMEdgeData {
  event?: string; // Event name that triggers this transition
  condition?: string; // Guard condition expression (may reference EFSM variables)
  action?: string; // Action to execute
  description?: string;
}

export interface FSMEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  sourceHandle?: string; // Source handle ID
  targetHandle?: string; // Target handle ID
  data?: FSMEdgeData;
  type?: string; // Edge type for custom styling
  animated?: boolean;
  style?: Record<string, any>;
  label?: string; // Display label
}

export type EventType = 'input' | 'output' | 'internal' | 'timeout';

export interface FSMEvent {
  name: string;            // Unique name: "recv_ACK" (used as identifier)
  type: EventType;         // Classification: input, output, internal, timeout
  description?: string;
}

/**
 * Get SCXML event name with dot notation
 * Examples: "input.recv_ACK", "output.send_SYN", "timeout.retry"
 */
export function getEventSCXMLName(event: FSMEvent): string {
  return `${event.type}.${event.name}`;
}

export interface FiniteStateMachine {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  created_at: string;
  updated_at: string;
  protocol_id?: string;
  nodes: FSMNode[]; // VueFlow nodes representing states
  edges: FSMEdge[]; // VueFlow edges representing transitions
  events: FSMEvent[]; // Available events for transitions
  variables?: EFSMVariable[]; // EFSM variables for guard expressions
  metadata?: Record<string, any>; // For FSM-specific properties
}

// EFSM Variable Definitions

export type EFSMVariableType = 'int' | 'bool' | 'enum';

export interface EFSMVariable {
  id: string;
  name: string;
  type: EFSMVariableType;
  description?: string;
  // For int: min/max bounds (required)
  minValue?: number;
  maxValue?: number;
  // For enum: explicit values (required for enum type)
  enumValues?: string[];
  // Optional initial value
  initialValue?: number | boolean | string;
}

//  Colored Petri Net (CPN) Data Structures

/**
 * Supported color set types (thesis-scoped subset of CPN-ML):
 *   unit - a single anonymous token (plain P/T net place)
 *   bool - true / false
 *   int - bounded integer [intMin..intMax]
 *   enum - finite enumeration of named values
 */
export type ColorSetType = 'unit' | 'bool' | 'int' | 'enum';

export interface ColorSet {
  id: string;
  name: string;
  type: ColorSetType;
  description?: string;
  // int only
  intMin?: number;
  intMax?: number;
  // enum only
  enumValues?: string[];
}

/** A CPN variable bound to a color set — used in inscription expressions */
export interface CPNVariable {
  id: string;
  name: string;
  colorSetId: string;
  description?: string;
}

/**
 * A place node in the CPN graph.
 * initialMarking is a multiset expression string, e.g. "1`CONNECT ++ 2`ACK"
 * An empty string means the place starts empty.
 */
export interface CPNPlace {
  id: string;
  name: string;
  colorSetId: string;
  initialMarking: string;
  position: { x: number; y: number };
  description?: string;
}

/** A transition node in the CPN graph. */
export interface CPNTransition {
  id: string;
  name: string;
  guard?: string; // boolean expression, e.g. "n > 0"
  position: { x: number; y: number };
  description?: string;
}

/**
 * A directed arc between a place and a transition (or vice-versa).
 * inscription is a multiset expression string, e.g. "1`m" or "n`ACK"
 * Bipartiteness must be enforced by the UI (place↔transition only).
 */
export interface CPNArc {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  arcType: 'place-to-transition' | 'transition-to-place';
  inscription: string;
  description?: string;
}

/** Top-level CPN model — one protocol can hold multiple CPNs. */
export interface ColoredPetriNet {
  id: string;
  name: string;
  description: string;
  places: CPNPlace[];
  transitions: CPNTransition[];
  arcs: CPNArc[];
  colorSets: ColorSet[];
  variables: CPNVariable[];
  metadata?: Record<string, any>;
}

//  Guard Analysis and Warnings

export type GuardWarningType = 'overflow' | 'underflow' | 'contradiction' | 'ambiguous' | 'unreachable' | 'unbounded' | 'undefined_variable' | 'type_mismatch' | 'invalid_expression';
export type GuardWarningSeverity = 'error' | 'warning' | 'info';

export interface GuardWarning {
  type: GuardWarningType;
  severity: GuardWarningSeverity;
  location: {
    transitionId?: string;
    stateId?: string;
    variableName?: string;
    expression?: string;
  };
  message: string;
  suggestion?: string;
}

// Execution Trace for Deadlock Analysis

export interface VariableState {
  [variableName: string]: number | boolean | string;
}

export interface GuardEvaluationTrace {
  stateId: string;
  stateLabel: string;
  transition?: {
    id: string;
    event?: string;
    guard?: string;
    action?: string;
  };
  variableValues: VariableState;
  guardResult?: boolean | 'unknown';
  guardExpression?: string;
}

export type DeadlockType = 'progress' | 'circular' | 'starvation' | 'terminal';

export interface DeadlockDetails {
  type: DeadlockType;
  shortestTrace: GuardEvaluationTrace[];
  affectedStates: string[];
  warnings: GuardWarning[];
  description: string;
}

export interface TargetMarkingCondition {
  placeId: string;
  minTokens: number; // inclusive lower bound
}

// CPN Property Verification Results

/** Result of a single CPN property check (reachability, boundedness, etc.). */
export interface CPNPropertyResult {
  passed: boolean;
  message: string;
  witness?: Record<string, any>;         // marking that satisfies the property
  counterexample?: Record<string, any>[]; // firing sequence leading to violation
}

/** Per-place max token count observed across all explored markings. */
export interface PlaceBounds {
  placeId: string;
  placeName: string;
  maxTokens: number;
}

/** Full result of the in-browser CPN verification pipeline (BFS + KM). */
export interface CPNVerificationResults {
  reachability: CPNPropertyResult;
  deadlockFreedom: CPNPropertyResult;
  boundedness: CPNPropertyResult & { bounds: PlaceBounds[] };
  liveness: Record<string, CPNPropertyResult>;
  stateCount: number;
  truncated: boolean;
  bindingLimitHit: boolean;
  runAt: string; // ISO timestamp
}

// CPN VueFlow node/edge data shapes

/** Data payload for a CPN place node in the VueFlow canvas. */
export interface CPNPlaceNodeData {
  label: string;
  colorSetId: string;
  colorSetName?: string;
  initialMarking: string;
  description?: string;
  /** Node kind - used by isValidConnection to enforce bipartiteness */
  kind: 'place';
}

/** Data payload for a CPN transition node in the VueFlow canvas. */
export interface CPNTransitionNodeData {
  label: string;
  guard?: string;
  description?: string;
  /** Node kind - used by isValidConnection to enforce bipartiteness */
  kind: 'transition';
}

/** Data payload for a CPN arc edge in the VueFlow canvas. */
export interface CPNArcEdgeData {
  inscription: string;
  description?: string;
}

// FSM Analysis Types
//
// These are the lightweight analysis-internal node/edge shapes used by
// validation.ts, deadlock.ts, and useFSMAnalysis.ts.  They are DIFFERENT
// from FSMNode/FSMEdge above (which are the full VueFlow graph model types):
//
//  • FSMNode / FSMEdge  — full VueFlow model (isInitial/isFinal, position, …)
//  • FSMAnalysisNode / FSMAnalysisEdge — stripped projection used by algorithms
//
// FSMAnalysis.vue converts FSMNode → FSMAnalysisNode before calling analysis
// functions so that the algorithms remain independent of VueFlow internals.

export interface FSMAnalysisNode {
  id: string;
  type?: string;
  data?: {
    label?: string;
    type?: 'initial' | 'normal' | 'final';
  };
}

export interface FSMAnalysisEdge {
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

export interface ConditionalDeadlock {
  stateId: string;
  label: string;
  reason: string;
  requiredInputs: string[]; // INPUT events needed to progress
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
  conditionalDeadlocks?: ConditionalDeadlock[];
  circularWaits: CircularWait[];
  eventStarvation: EventStarvation[];
  terminalNonFinalStates: DeadState[];
  hasDeadlocks: boolean;
  hasCycles?: boolean;
  explorationStats?: {
    exploredNodes: number;
    uniqueConfigurations: number;
    maxDepthReached: number;
    timeElapsedMs: number;
  };
  details?: Map<string, DeadlockDetails>;
}

export interface FSMProperties {
  hasInitialState: boolean;
  hasFinalState: boolean;
  allStatesReachable: boolean;
  isDeterministic: boolean;
  isComplete: boolean;
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
