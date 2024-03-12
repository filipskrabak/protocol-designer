import { Endian } from "./enums"
import { v4 } from "uuid";

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
  id: typeof v4;
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
