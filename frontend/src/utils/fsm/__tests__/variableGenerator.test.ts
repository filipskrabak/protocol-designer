import { generateVariablesFromProtocol } from '../variableGenerator'
import type { Protocol } from '@/contracts/models'

function makeProtocol(fields: Protocol['fields']): Protocol {
  return {
    id: 1,
    name: 'Test',
    fields,
  } as unknown as Protocol
}

describe('generateVariablesFromProtocol', () => {
  it('returns empty array for protocol with no fields', () => {
    const result = generateVariablesFromProtocol(makeProtocol([]))
    expect(result).toEqual([])
  })

  it('returns empty array when fields is undefined', () => {
    const result = generateVariablesFromProtocol({ fields: undefined } as any)
    expect(result).toEqual([])
  })

  it('maps a 1-bit field to a bool variable', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      { id: 'f1', display_name: 'Flag', length: 1, length_unit: 'bits', field_options: [] } as any
    ]))
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('bool')
    expect(result[0].name).toBe('flag')
    expect(result[0].initialValue).toBe(false)
  })

  it('maps a field with options to an enum variable', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      {
        id: 'f1', display_name: 'Message Type', length: 4, length_unit: 'bits',
        field_options: [
          { name: 'SYN', value: 0 },
          { name: 'ACK', value: 1 },
          { name: 'FIN', value: 2 },
        ]
      } as any
    ]))
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('enum')
    expect(result[0].name).toBe('messageType')
    expect(result[0].enumValues).toEqual(['SYN', 'ACK', 'FIN'])
    expect(result[0].initialValue).toBe('SYN')
  })

  it('sanitizes enum option names to UPPER_CASE identifiers', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      {
        id: 'f1', display_name: 'State', length: 4, length_unit: 'bits',
        field_options: [
          { name: 'hello world!', value: 0 },
          { name: '123start', value: 1 },
        ]
      } as any
    ]))
    expect(result[0].enumValues).toEqual(['HELLO_WORLD_', '_123START'])
  })

  it('maps a numeric bit-field to an int variable with correct range', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      { id: 'f1', display_name: 'Version', length: 4, length_unit: 'bits', field_options: [] } as any
    ]))
    expect(result[0].type).toBe('int')
    expect(result[0].minValue).toBe(0)
    expect(result[0].maxValue).toBe(15) // 2^4 - 1
    expect(result[0].initialValue).toBe(0)
  })

  it('maps a byte field to int with correct range (bit conversion)', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      { id: 'f1', display_name: 'TTL', length: 1, length_unit: 'bytes', field_options: [] } as any
    ]))
    // 1 byte = 8 bits → 2^8 - 1 = 255
    expect(result[0].type).toBe('int')
    expect(result[0].maxValue).toBe(255)
  })

  it('caps maxValue at 65535 for large fields', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      { id: 'f1', display_name: 'Payload', length: 32, length_unit: 'bits', field_options: [] } as any
    ]))
    expect(result[0].maxValue).toBe(65535)
  })

  it('converts multi-word display name to camelCase', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      { id: 'f1', display_name: 'Source Port', length: 16, length_unit: 'bits', field_options: [] } as any
    ]))
    expect(result[0].name).toBe('sourcePort')
  })

  it('produces one variable per field', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      { id: 'f1', display_name: 'A', length: 4, length_unit: 'bits', field_options: [] } as any,
      { id: 'f2', display_name: 'B', length: 1, length_unit: 'bits', field_options: [] } as any,
    ]))
    expect(result).toHaveLength(2)
  })

  it('assigns a unique id to each variable', () => {
    const result = generateVariablesFromProtocol(makeProtocol([
      { id: 'f1', display_name: 'A', length: 4, length_unit: 'bits', field_options: [] } as any,
      { id: 'f2', display_name: 'B', length: 4, length_unit: 'bits', field_options: [] } as any,
    ]))
    expect(result[0].id).not.toBe(result[1].id)
  })
})
