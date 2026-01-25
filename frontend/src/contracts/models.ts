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

// Protocol field condition mapping for guards
export interface ProtocolFieldCondition {
  field_id: string; // Reference to protocol field
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal';
  value?: string | number; // Comparison value (can reference field option value)
  field_option_name?: string; // Optional: reference to specific field option by name
  //min_value?: number; // For range operators
  //max_value?: number; // For range operators
  //bit_position?: number; // For flag operators
}

export interface FSMEdgeData {
  event?: string; // Event name that triggers this transition
  condition?: string; // Custom/manual guard condition (freeform text)
  protocol_conditions?: ProtocolFieldCondition[]; // Structured protocol field conditions
  use_protocol_conditions?: boolean; // Whether to use protocol_conditions or manual condition
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

// Guard Analysis and Warnings

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
