import type { FSMEdgeData } from '@/contracts/models'
import { useProtocolStore } from '@/store/ProtocolStore'

/**
 * Composable for generating edge labels from FSM edge data
 */
export function useFSMEdgeLabels() {
  const protocolStore = useProtocolStore()

  /**
   * Generate edge label from edge data
   * Handles both manual conditions and protocol-based conditions
   */
  function generateEdgeLabel(data: FSMEdgeData | undefined): string {
    if (!data) return ''

    const labelParts = []

    // Add event
    if (data.event) {
      labelParts.push(data.event)
    }

    // Add condition - either manual or protocol-based
    if (data.use_protocol_conditions && data.protocol_conditions && data.protocol_conditions.length > 0) {
      // Build protocol condition string
      const conditionStrings = data.protocol_conditions.map(pc => {
        // Find field name
        const field = protocolStore.protocol.fields?.find(f => f.id === pc.field_id)
        const fieldName = field?.display_name || pc.field_id

        // Build condition based on operator
        let condStr = ''

        switch (pc.operator) {
          case 'equals':
            condStr = `${fieldName}==${pc.field_option_name || pc.value}`
            break
          case 'not_equals':
            condStr = `${fieldName}!=${pc.field_option_name || pc.value}`
            break
          case 'greater_than':
            condStr = `${fieldName}>${pc.value}`
            break
          case 'less_than':
            condStr = `${fieldName}<${pc.value}`
            break
          case 'greater_or_equal':
            condStr = `${fieldName}>=${pc.value}`
            break
          case 'less_or_equal':
            condStr = `${fieldName}<=${pc.value}`
            break
        }

        return condStr
      })

      // Join multiple conditions with AND
      let conditionText = conditionStrings.join(' && ')

      // Truncate if too long (more than 50 characters)
      const maxLength = 50
      if (conditionText.length > maxLength) {
        const numConditions = data.protocol_conditions.length
        if (numConditions > 1) {
          // Show count for multiple conditions
          conditionText = `${conditionStrings[0].substring(0, 30)}... (+${numConditions - 1})`
        } else {
          // Truncate single long condition
          conditionText = conditionText.substring(0, maxLength) + '...'
        }
      }

      labelParts.push(`[${conditionText}]`)
    } else if (data.condition) {
      // Manual condition
      let condText = data.condition

      // Truncate if too long
      const maxLength = 50
      if (condText.length > maxLength) {
        condText = condText.substring(0, maxLength) + '...'
      }

      labelParts.push(`[${condText}]`)
    }

    // Add action
    if (data.action) {
      labelParts.push(`/ ${data.action}`)
    }

    return labelParts.length > 0 ? labelParts.join(' ') : ''
  }

  return {
    generateEdgeLabel
  }
}
