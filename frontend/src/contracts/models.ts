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

export interface FSMEdgeData {
  event?: string; // Event name that triggers this transition
  condition?: string; // Guard condition
  action?: string; // Action to execute
  description?: string;
}

export interface FSMEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  data?: FSMEdgeData;
  type?: string; // Edge type for custom styling
  animated?: boolean;
  style?: Record<string, any>;
}

export interface FSMEvent {
  id: string;
  name: string;
  description?: string;
  parameters?: Record<string, any>; // Event parameters/data
}

export interface FiniteStateMachine {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  created_at: string;
  updated_at: string;
  nodes: FSMNode[]; // VueFlow nodes representing states
  edges: FSMEdge[]; // VueFlow edges representing transitions
  events: FSMEvent[]; // Available events for transitions
  metadata?: Record<string, any>; // For FSM-specific properties
}
