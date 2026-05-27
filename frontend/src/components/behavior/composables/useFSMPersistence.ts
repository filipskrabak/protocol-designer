import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { MarkerType } from '@vue-flow/core'
import { useProtocolStore } from '@/store/ProtocolStore'
import { useFSMEdgeLabels } from './useFSMEdgeLabels'

/**
 * Composable for managing FSM persistence (save/load with debouncing)
 */
export function useFSMPersistence(
  nodes: Ref<Node[]>,
  edges: Ref<Edge[]>,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void
) {
  const protocolStore = useProtocolStore()
  const { generateEdgeLabel } = useFSMEdgeLabels()
  
  // Debounce timer for FSM saving
  const saveDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Save current canvas state to FSM in protocol store
   */
  function saveFSMFromCanvas() {
    const fsm = protocolStore.getCurrentFSM()
    if (!fsm) return

    fsm.nodes = nodes.value.map(node => ({
      id: node.id,
      type: 'fsmState' as const,
      position: node.position,
      data: node.data,
      dimensions: (node as any).dimensions || { width: 150, height: 50 }
    }))

    fsm.edges = edges.value.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      data: edge.data,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      type: edge.type,
      animated: edge.animated,
      style: edge.style
    }))

    fsm.updated_at = new Date().toISOString()
    protocolStore.updateFSM(fsm.id, fsm)
  }

  /**
   * Debounced version of saveFSMFromCanvas
   * Saves after 500ms of inactivity
   */
  function debouncedSaveFSM() {
    if (saveDebounceTimer.value) {
      clearTimeout(saveDebounceTimer.value)
    }

    saveDebounceTimer.value = setTimeout(() => {
      saveFSMFromCanvas()
      console.log('FSM saved (debounced)')
    }, 500)
  }

  /**
   * Load FSM data to canvas
   */
  function loadFSMToCanvas(fsmId: string, updateIdCounter: (nodeIds: string[]) => void) {
    const fsm = protocolStore.getFSMById(fsmId)
    if (!fsm) return

    // Clear current canvas
    setNodes([])
    setEdges([])

    // Update ID counter based on existing node IDs
    if (fsm.nodes && fsm.nodes.length > 0) {
      const existingNodeIds = fsm.nodes.map(node => node.id)
      updateIdCounter(existingNodeIds)
    }

    // Load nodes
    if (fsm.nodes && fsm.nodes.length > 0) {
      setNodes(fsm.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        dimensions: node.dimensions || { width: 150, height: 50 }
      })))
    }

    // Load edges
    if (fsm.edges && fsm.edges.length > 0) {
      setEdges(fsm.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: edge.data,
        label: generateEdgeLabel(edge.data),
        type: edge.type || 'smoothstep',
        animated: edge.animated || false,
        style: edge.style || {
          stroke: '#374151',
          strokeWidth: 2,
          cursor: 'pointer'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#374151'
        }
      })))
    }
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    if (saveDebounceTimer.value) {
      clearTimeout(saveDebounceTimer.value)
      // Save immediately on unmount to ensure no data loss
      saveFSMFromCanvas()
    }
  })

  return {
    saveFSMFromCanvas,
    debouncedSaveFSM,
    loadFSMToCanvas
  }
}
