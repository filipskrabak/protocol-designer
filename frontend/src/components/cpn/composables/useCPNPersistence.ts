import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { MarkerType } from '@vue-flow/core'
import { useCPNStore } from '@/store/CPNStore'
import type { CPNPlace, CPNTransition, CPNArc } from '@/contracts/models'
import type { CPNPlaceNodeData } from '../CPNPlaceNode.vue'
import type { CPNTransitionNodeData } from '../CPNTransitionNode.vue'
import type { CPNArcEdgeData } from '../CPNArcEdge.vue'

/**
 * Composable for saving/loading a CPN to/from the VueFlow canvas nodes + edges.
 */
export function useCPNPersistence(
  nodes: Ref<Node[]>,
  edges: Ref<Edge[]>,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const cpnStore = useCPNStore()
  const saveDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  onUnmounted(() => {
    if (saveDebounceTimer.value) clearTimeout(saveDebounceTimer.value)
  })

  /**
   * Persist the current VueFlow canvas state into the CPN store (and then to SVG).
   */
  function saveCPNFromCanvas() {
    const cpn = cpnStore.getCurrentCPN()
    if (!cpn) return

    // Map VueFlow nodes back to CPN model types
    const places: CPNPlace[] = []
    const transitions: CPNTransition[] = []

    for (const node of nodes.value) {
      if (node.type === 'cpnPlace') {
        const d = node.data as CPNPlaceNodeData
        places.push({
          id: node.id,
          name: d.label,
          colorSetId: d.colorSetId,
          initialMarking: d.initialMarking ?? '',
          position: node.position,
          description: d.description,
        })
      } else if (node.type === 'cpnTransition') {
        const d = node.data as CPNTransitionNodeData
        transitions.push({
          id: node.id,
          name: d.label,
          guard: d.guard,
          position: node.position,
          description: d.description,
        })
      }
    }

    // Map edges back to CPNArc — determine direction from place/transition lists
    const placeIds = new Set(places.map(p => p.id))
    const arcs: CPNArc[] = edges.value.map(edge => {
      const d = (edge.data ?? {}) as CPNArcEdgeData
      const arcType = placeIds.has(edge.source)
        ? ('place-to-transition' as const)
        : ('transition-to-place' as const)
      return {
        id: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        arcType,
        inscription: d.inscription ?? '1`x',
        description: d.description,
      }
    })

    cpnStore.updateCPN(cpn.id, { ...cpn, places, transitions, arcs })
  }

  function debouncedSaveCPN() {
    if (saveDebounceTimer.value) clearTimeout(saveDebounceTimer.value)
    saveDebounceTimer.value = setTimeout(() => {
      saveCPNFromCanvas()
    }, 500)
  }

  /**
   * Load a CPN from the store onto the VueFlow canvas.
   */
  function loadCPNToCanvas(cpnId: string) {
    const cpn = cpnStore.getCPNById(cpnId)
    if (!cpn) return

    setNodes([])
    setEdges([])

    // Build a colorSet name lookup
    const csNameMap = new Map(cpn.colorSets.map(cs => [cs.id, cs.name]))

    const vfNodes: Node[] = [
      ...cpn.places.map(place => ({
        id: place.id,
        type: 'cpnPlace' as const,
        position: place.position,
        data: {
          label: place.name,
          colorSetId: place.colorSetId,
          colorSetName: csNameMap.get(place.colorSetId),
          initialMarking: place.initialMarking,
          description: place.description,
          kind: 'place',
        } satisfies CPNPlaceNodeData,
      })),
      ...cpn.transitions.map(tr => ({
        id: tr.id,
        type: 'cpnTransition' as const,
        position: tr.position,
        data: {
          label: tr.name,
          guard: tr.guard,
          description: tr.description,
          kind: 'transition',
        } satisfies CPNTransitionNodeData,
      })),
    ]

    const vfEdges: Edge[] = cpn.arcs.map(arc => ({
      id: arc.id,
      source: arc.sourceId,
      target: arc.targetId,
      sourceHandle: arc.sourceHandle ?? null,
      targetHandle: arc.targetHandle ?? null,
      data: {
        inscription: arc.inscription,
        description: arc.description,
      } satisfies CPNArcEdgeData,
      type: 'cpnArc',
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#374151' },
      style: { strokeWidth: 2, stroke: '#374151' },
    }))

    setNodes(vfNodes)
    setEdges(vfEdges)
  }

  return { saveCPNFromCanvas, debouncedSaveCPN, loadCPNToCanvas }
}
