import { useVueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { CPNPlaceNodeData } from '../CPNPlaceNode.vue'
import type { CPNTransitionNodeData } from '../CPNTransitionNode.vue'
import { useCPNStore } from '@/store/CPNStore'

/**
 * Global state for CPN drag-and-drop operations
 */
const state = {
  draggedType: ref<'place' | 'transition' | null>(null),
  isDragOver: ref(false),
  isDragging: ref(false),
}

export function useCPNDragAndDrop() {
  const { draggedType, isDragOver, isDragging } = state
  const { addNodes, screenToFlowCoordinate, onNodesInitialized, updateNode } = useVueFlow()

  watch(isDragging, (dragging) => {
    document.body.style.userSelect = dragging ? 'none' : ''
  })

  function onDragStart(event: DragEvent, type: 'place' | 'transition') {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/cpn', type)
      event.dataTransfer.effectAllowed = 'move'
    }
    draggedType.value = type
    isDragging.value = true
    document.addEventListener('drop', onDragEnd)
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault()
    if (draggedType.value) {
      isDragOver.value = true
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    }
  }

  function onDragLeave() {
    isDragOver.value = false
  }

  function onDragEnd() {
    isDragging.value = false
    isDragOver.value = false
    draggedType.value = null
    document.removeEventListener('drop', onDragEnd)
  }

  function onDrop(event: DragEvent) {
    const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
    const type = draggedType.value
    if (!type) return

    const cpnStore = useCPNStore()
    const cpn = cpnStore.getCurrentCPN()
    const defaultColorSetId = cpn?.colorSets?.[0]?.id ?? ''

    const nodeId = uuidv4()

    let newNode: any

    if (type === 'place') {
      const data: CPNPlaceNodeData = {
        label: `P${(cpn?.places?.length ?? 0) + 1}`,
        colorSetId: defaultColorSetId,
        colorSetName: cpn?.colorSets?.[0]?.name,
        initialMarking: '0',
        kind: 'place',
      }
      newNode = { id: nodeId, type: 'cpnPlace', position, data }
    } else {
      const data: CPNTransitionNodeData = {
        label: `T${(cpn?.transitions?.length ?? 0) + 1}`,
        kind: 'transition',
      }
      newNode = { id: nodeId, type: 'cpnTransition', position, data }
    }

    // Center on drop point
    const { off } = onNodesInitialized(() => {
      updateNode(nodeId, (node) => ({
        position: {
          x: node.position.x - (node.dimensions?.width ?? 70) / 2,
          y: node.position.y - (node.dimensions?.height ?? 70) / 2,
        },
      }))
      off()
    })

    addNodes(newNode)
  }

  return {
    draggedType,
    isDragOver,
    isDragging,
    onDragStart,
    onDragLeave,
    onDragOver,
    onDrop,
  }
}
