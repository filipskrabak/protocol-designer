/**
 * Auto-generates EFSM variables from a Protocol's fields.
 *
 * Mirrors the CPN colorSetGenerator.ts heuristics:
 * - 1-bit field                   → bool variable
 * - field with field_options       → enum variable (UPPER_CASE sanitized values)
 * - numeric field (bits ≤ 16)     → int variable [0 .. 2^bitLen - 1]
 * - numeric field (bits > 16)     → int variable [0 .. 65535] (capped)
 *
 * Variable names are camelCase of the field's display_name.
 */

import { v4 as uuidv4 } from 'uuid'
import type { Protocol, Field, EFSMVariable } from '@/contracts/models'

/**
 * Derives EFSM variables from a protocol's field definitions.
 * Produces one EFSMVariable per field.
 */
export function generateVariablesFromProtocol(protocol: Protocol): EFSMVariable[] {
  if (!protocol.fields || protocol.fields.length === 0) return []

  return protocol.fields.map(field => fieldToVariable(field))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fieldToVariable(field: Field): EFSMVariable {
  const name = sanitizeVarName(field.display_name)

  // 1-bit fields → bool
  if (field.length === 1 && field.length_unit === 'bits') {
    return {
      id: uuidv4(),
      name,
      type: 'bool',
      initialValue: false,
      description: field.description,
    }
  }

  // Enum: fields with named options
  if (field.field_options && field.field_options.length > 0) {
    const enumValues = field.field_options.map(opt => sanitizeEnumValue(opt.name))
    return {
      id: uuidv4(),
      name,
      type: 'enum',
      enumValues,
      initialValue: enumValues[0],
      description: field.description,
    }
  }

  // Int range based on bit width
  const bitLen = fieldBitLength(field)
  const maxValue = bitLen <= 16 ? Math.pow(2, bitLen) - 1 : 65535
  return {
    id: uuidv4(),
    name,
    type: 'int',
    minValue: 0,
    maxValue,
    initialValue: 0,
    description: field.description,
  }
}

function fieldBitLength(field: Field): number {
  if (field.length_unit === 'bytes') return field.length * 8
  return field.length
}

/** Convert a display name to a valid camelCase variable name */
function sanitizeVarName(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'x'
  return parts[0].toLowerCase() + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

/** Convert option name to a valid UPPER_CASE enum value identifier */
function sanitizeEnumValue(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_')
    .toUpperCase()
    || 'VALUE'
}
