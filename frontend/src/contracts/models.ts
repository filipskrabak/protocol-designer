import { Endian, LengthUnit } from "./enums";
import { v4 } from "uuid";

export interface FieldOption {
  name: string;
  value: number;
  used_for_encapsulation?: boolean; // used to indicate if this field option is used for encapsulation
}

export interface Field {
  field_options: FieldOption[];
  length: number;
  max_length: number;
  is_variable_length: boolean;
  endian: Endian;
  display_name: string;
  id: string;
  description: string;
  encapsulate: boolean; // used to indicate if this protocol contains a child protocol
  length_unit: LengthUnit; // unit for the length field (bits or bytes)
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
