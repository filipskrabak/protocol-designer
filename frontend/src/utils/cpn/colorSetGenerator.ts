/**
 * Auto-generates CPN color sets and variables from a Protocol's fields.
 *
 * Heuristics:
 * - Field with `field_options` → finiteenumeration ColorSet (one constant per option)
 * - Field with `length` ≤ 8 (bits, ≤ 255 values) → intrange ColorSet [0 .. 2^length - 1]
 * - Field with `length` > 8 → intrange ColorSet [0 .. 65535] (capped; user can adjust)
 * - Each field gets one CPNVariable bound to its ColorSet
 *
 * Special well-known fields:
 * - MsgType / MessageType / Type fields with options → enum (used for MQTT-SN message type)
 * - Boolean-like fields (length 1) → bool ColorSet
 */

import { v4 as uuidv4 } from 'uuid'
import type { Protocol, Field } from '@/contracts/models'
import type { ColorSet, CPNVariable, ColoredPetriNet } from '@/contracts/models'

export interface GenerationResult {
  colorSets: ColorSet[]
  variables: CPNVariable[]
}

/**
 * Derives color sets and variables from a protocol's field definitions.
 * Deduplicates color sets that have identical structure (by name+type+range).
 */
export function generateColorSetsFromProtocol(protocol: Protocol): GenerationResult {
  const colorSets: ColorSet[] = []
  const variables: CPNVariable[] = []

  // Track generated color set names to avoid duplicates
  const csNameMap = new Map<string, ColorSet>()

  for (const field of protocol.fields) {
    const cs = fieldToColorSet(field)
    // Deduplicate by name
    let existing = csNameMap.get(cs.name)
    if (!existing) {
      csNameMap.set(cs.name, cs)
      colorSets.push(cs)
      existing = cs
    }

    variables.push({
      id: uuidv4(),
      name: sanitizeVarName(field.display_name),
      colorSetId: existing.id,
      description: field.description,
    })
  }

  // Always ensure a unit color set for control-flow-only places
  if (!csNameMap.has('UNIT')) {
    const unit: ColorSet = { id: uuidv4(), name: 'UNIT', type: 'unit' }
    colorSets.unshift(unit)
  }

  return { colorSets, variables }
}

/**
 * Creates a new ColoredPetriNet pre-populated with color sets and variables
 * derived from the given protocol.
 */
export function initCPNFromProtocol(protocol: Protocol): ColoredPetriNet {
  const { colorSets, variables } = generateColorSetsFromProtocol(protocol)
  return {
    id: uuidv4(),
    name: `${protocol.name} CPN`,
    description: `Auto-generated CPN for protocol ${protocol.name}`,
    places: [],
    transitions: [],
    arcs: [],
    colorSets,
    variables,
  }
}

//  Helpers

function fieldToColorSet(field: Field): ColorSet {
  // 1-bit fields → bool
  if (field.length === 1 && field.length_unit === 'bits') {
    return {
      id: uuidv4(),
      name: sanitizeName(field.display_name),
      type: 'bool',
    }
  }

  // Enum: fields with named options
  if (field.field_options && field.field_options.length > 0) {
    const enumValues = field.field_options.map(opt => sanitizeEnumValue(opt.name))
    return {
      id: uuidv4(),
      name: sanitizeName(field.display_name),
      type: 'enum',
      enumValues,
    }
  }

  // Int range based on bit width
  const bitLen = fieldBitLength(field)
  const max = bitLen <= 16 ? Math.pow(2, bitLen) - 1 : 65535
  return {
    id: uuidv4(),
    name: sanitizeName(field.display_name),
    type: 'int',
    intMin: 0,
    intMax: max,
  }
}

function fieldBitLength(field: Field): number {
  if (field.length_unit === 'bytes') return field.length * 8
  return field.length
}

/** Convert a display name to a valid CPN color set name (PascalCase, no spaces) */
function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
    || 'ColorSet'
}

/** Convert a display name to a valid CPN variable name (camelCase) */
function sanitizeVarName(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'x'
  return parts[0].toLowerCase() + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

/** Convert option name to a valid enum value identifier */
function sanitizeEnumValue(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&') // identifier cannot start with digit
    .replace(/_+/g, '_')
    .toUpperCase()
    || 'VALUE'
}
