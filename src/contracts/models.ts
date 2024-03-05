import { Endian } from "./enums"

export interface FieldOptions {
  name: string;
  value: number;
}

export interface Field {
  field_options: FieldOptions[];
  length: number;
  max_length: number;
  is_variable_length: boolean;
  endian: Endian;
  display_name: string;
  id: string;
  description: string;
  encapsulate: boolean;
}

export interface Protocol {
  name: string;
  author: string;
  description: string;
  version: string;
  last_update: string; // timestamp
  created: string; // timestamp
  fields: Field[];
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
