import type { FSMEdgeData } from '@/contracts/models'

/**
 * Composable for generating edge labels from FSM edge data
 */
export function useFSMEdgeLabels() {
  /**
   * Generate edge label from edge data
   */
  function generateEdgeLabel(data: FSMEdgeData | undefined): string {
    if (!data) return ''

    const labelParts = []

    // Add event
    if (data.event) {
      labelParts.push(data.event)
    }

    // Add condition
    if (data.condition) {
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
