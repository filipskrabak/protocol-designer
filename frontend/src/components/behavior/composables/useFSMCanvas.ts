import type { Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import { MarkerType } from '@vue-flow/core'
import { v4 as uuidv4 } from 'uuid'
import type { FSMEdgeData, FSMNodeData } from '@/contracts/models'
import { useNotificationStore } from '@/store/NotificationStore'
import { useFSMEdgeLabels } from './useFSMEdgeLabels'

/**
 * Composable for managing FSM canvas operations
 */
export function useFSMCanvas(
  nodes: Ref<any[]>,
  edges: Ref<Edge[]>,
  addEdges: (edges: any[]) => void,
  saveFSMFromCanvas: () => void,
  openTransitionEditDialog: (edgeId: string, edgeData: FSMEdgeData) => void,
  openStateEditDialog: (nodeId: string, nodeData: FSMNodeData) => void
) {
  const notificationStore = useNotificationStore()
  const { generateEdgeLabel } = useFSMEdgeLabels()

  /**
   * Custom connect handler to create FSM edges with default data
   */
  function handleConnect(connection: any) {
    console.log('Connection object received:', connection)

    // Check if an identical transition already exists
    const duplicateEdge = edges.value.find(edge =>
      edge.source === connection.source &&
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
    )

    if (duplicateEdge) {
      console.warn('Duplicate transition')
      notificationStore.showNotification({
        message: 'This transition already exists. Use a different handle or create a different connection.',
        timeout: 4000,
        color: 'warning',
        icon: 'mdi-alert'
      })
      return
    }

    const edgeId = `edge_${uuidv4()}`
    const edgeData: FSMEdgeData = {
      event: '',
      condition: '',
      action: '',
      description: ''
    }

    // Check if this is a self-loop
    const isSelfLoop = connection.source === connection.target

    const newEdge = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      data: {
        ...edgeData,
        isSelfLoop
      },
      label: '',
      animated: false,
      selectable: true,
      focusable: true,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#374151'
      },
      style: {
        stroke: '#374151',
        strokeWidth: 2,
        cursor: 'pointer'
      }
    }

    console.log('New edge being created:', newEdge)

    addEdges([newEdge])
    saveFSMFromCanvas()

    // Immediately show edit dialog for new connection
    openTransitionEditDialog(edgeId, { ...edgeData })
  }

  /**
   * Edge click handler for editing
   */
  function onEdgeClick(edgeMouseEvent: any) {
    console.log('Edge clicked:', edgeMouseEvent)
    const edge = edgeMouseEvent.edge
    openTransitionEditDialog(edge.id, edge.data ? { ...edge.data } : {})
  }

  /**
   * Node click handler for editing
   */
  function onNodeClick(nodeEvent: any) {
    const node = nodeEvent.node
    openStateEditDialog(
      node.id,
      node.data ? { ...node.data } : {
        label: '',
        isInitial: false,
        isFinal: false
      }
    )
  }

  /**
   * Save transition edit
   */
  function saveTransitionEdit(edgeId: string, data: FSMEdgeData) {
    const edgeIndex = edges.value.findIndex(edge => edge.id === edgeId)
    if (edgeIndex !== -1) {
      edges.value[edgeIndex].data = data
      edges.value[edgeIndex].label = generateEdgeLabel(data)
    }
    saveFSMFromCanvas()
  }

  /**
   * Delete transition
   */
  function deleteTransition(edgeId: string) {
    const edgeIndex = edges.value.findIndex(edge => edge.id === edgeId)
    if (edgeIndex !== -1) {
      edges.value.splice(edgeIndex, 1)
      saveFSMFromCanvas()
    }
  }

  /**
   * Save state edit
   */
  function saveStateEdit(nodeId: string, data: FSMNodeData) {
    const nodeIndex = nodes.value.findIndex(node => node.id === nodeId)
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].data = data
    }
    saveFSMFromCanvas()
  }

  /**
   * Delete state
   */
  function deleteState(nodeId: string) {
    const nodeIndex = nodes.value.findIndex(node => node.id === nodeId)
    if (nodeIndex !== -1) {
      nodes.value.splice(nodeIndex, 1)
      
      // Remove all edges connected to this node
      const edgesToRemove = edges.value.filter(edge =>
        edge.source === nodeId || edge.target === nodeId
      )
      edgesToRemove.forEach(edge => {
        const edgeIndex = edges.value.findIndex(e => e.id === edge.id)
        if (edgeIndex !== -1) {
          edges.value.splice(edgeIndex, 1)
        }
      })
      
      saveFSMFromCanvas()
    }
  }

  /**
   * VueFlow change handlers
   */
  function onNodesChange(changes: any, debouncedSaveFSM: () => void) {
    console.log('Nodes changed:', changes)
    debouncedSaveFSM()
  }

  function onEdgesChange(changes: any, debouncedSaveFSM: () => void) {
    console.log('Edges changed:', changes)
    debouncedSaveFSM()
  }

  return {
    handleConnect,
    onEdgeClick,
    onNodeClick,
    saveTransitionEdit,
    deleteTransition,
    saveStateEdit,
    deleteState,
    onNodesChange,
    onEdgesChange
  }
}
