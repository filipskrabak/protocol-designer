import { Endian } from "./enums"

export interface FieldOptions {
  name: string;
  value: number;
}

export interface Field {
  FieldOptions: FieldOptions[];
  length: number;
  is_variable_length: boolean;
  endian: Endian;
  display_name: string;
  id: string;
  description: string;
  encapsulate: boolean;
}
