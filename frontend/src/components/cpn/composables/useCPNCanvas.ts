import type { Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import { MarkerType } from '@vue-flow/core'
import { v4 as uuidv4 } from 'uuid'
import { useNotificationStore } from '@/store/NotificationStore'
import type { CPNArcEdgeData, CPNPlaceNodeData, CPNTransitionNodeData } from '@/contracts/models'

export interface CPNNodeEditState {
  nodeId: string
  nodeData: CPNPlaceNodeData | CPNTransitionNodeData
}

export interface CPNArcEditState {
  edgeId: string
  edgeData: CPNArcEdgeData
}

/**
 * Composable managing CPN canvas operations:
 * - connection creation with bipartiteness enforcement
 * - click handlers for nodes and edges
 * - dialog open/close state
 */
export function useCPNCanvas(
  nodes: Ref<any[]>,
  edges: Ref<Edge[]>,
  addEdges: (edges: any[]) => void,
  saveCPNFromCanvas: () => void,
  openArcEditDialog: (edgeId: string, edgeData: CPNArcEdgeData) => void,
  openNodeEditDialog: (nodeId: string, nodeData: CPNPlaceNodeData | CPNTransitionNodeData) => void,
) {
  const notificationStore = useNotificationStore()

  /**
   * Enforce bipartite structure: only place→transition or transition→place connections allowed.
   * Called by VueFlow's isValidConnection prop.
   */
  function isValidConnection(connection: { source: string; target: string }): boolean {
    const sourceNode = nodes.value.find(n => n.id === connection.source)
    const targetNode = nodes.value.find(n => n.id === connection.target)
    if (!sourceNode || !targetNode) return false

    const sourceKind = sourceNode.data?.kind
    const targetKind = targetNode.data?.kind

    if (sourceKind === targetKind) {
      notificationStore.showNotification({
        message: `Invalid connection: cannot connect ${sourceKind} to ${targetKind}. CPN arcs must go between places and transitions.`,
        timeout: 4000,
        color: 'warning',
        icon: 'mdi-alert',
      })
      return false
    }
    return true
  }

  /**
   * Connect handler - creates a new arc edge with default inscription.
   */
  function handleConnect(connection: any) {
    if (!isValidConnection(connection)) return

    // Prevent duplicate arcs on the same handle pair
    const duplicate = edges.value.find(
      e =>
        e.source === connection.source &&
        e.target === connection.target &&
        e.sourceHandle === connection.sourceHandle &&
        e.targetHandle === connection.targetHandle,
    )
    if (duplicate) {
      notificationStore.showNotification({
        message: 'This arc already exists.',
        timeout: 3000,
        color: 'warning',
        icon: 'mdi-alert',
      })
      return
    }

    const edgeId = `cpn_arc_${uuidv4()}`
    const arcData: CPNArcEdgeData = { inscription: '1`x', arcType: 'normal' }

    const newEdge = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      data: arcData,
      type: 'cpnArc',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: '#374151',
      },
      style: { strokeWidth: 2, stroke: '#374151' },
    }

    addEdges([newEdge])
    saveCPNFromCanvas()
  }

  function onEdgeClick(edgeMouseEvent: any) {
    const edge = edgeMouseEvent.edge
    openArcEditDialog(edge.id, edge.data ?? { inscription: '1`x', arcType: 'normal' })
  }

  function onNodeClick(nodeEvent: any) {
    const node = nodeEvent.node
    openNodeEditDialog(node.id, node.data)
  }

  function onNodesChange(changes: any[]) {
    const hasFinishedMove = changes.some(c => c.type === 'position' && !c.dragging)
    const hasRemove = changes.some(c => c.type === 'remove')
    if (hasFinishedMove || hasRemove) saveCPNFromCanvas()
  }

  function onEdgesChange(changes: any[]) {
    const hasRemove = changes.some(c => c.type === 'remove')
    if (hasRemove) saveCPNFromCanvas()
  }

  return {
    isValidConnection,
    handleConnect,
    onEdgeClick,
    onNodeClick,
    onNodesChange,
    onEdgesChange,
  }
}
