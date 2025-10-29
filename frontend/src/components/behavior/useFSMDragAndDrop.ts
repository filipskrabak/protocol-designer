import { useVueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'
import type { FSMNodeData } from '@/contracts/models'

let id = 0

/**
 * @returns {string} - A unique id for FSM nodes.
 */
function getId() {
  return `fsm_node_${id++}`
}

/**
 * Updates the ID counter based on existing node IDs
 * @param nodeIds - Array of existing node IDs
 */
function updateIdCounter(nodeIds: string[]) {
  let maxId = -1

  // Find the highest ID number from existing nodes
  nodeIds.forEach(nodeId => {
    const match = nodeId.match(/^fsm_node_(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxId) {
        maxId = num
      }
    }
  })

  // Set the counter to one more than the highest existing ID
  if (maxId >= 0) {
    id = maxId + 1
  }

  console.log(`FSM ID counter updated to: ${id}`)
}

/**
 * Global state for drag and drop operations
 */
const state = {
  /**
   * The type of the FSM node being dragged.
   */
  draggedType: ref<string | null>(null),
  isDragOver: ref(false),
  isDragging: ref(false),
}

export default function useFSMDragAndDrop() {
  const { draggedType, isDragOver, isDragging } = state

  const { addNodes, screenToFlowCoordinate, onNodesInitialized, updateNode } = useVueFlow()

  watch(isDragging, (dragging) => {
    document.body.style.userSelect = dragging ? 'none' : ''
  })

  function onDragStart(event: DragEvent, type: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/vueflow', type)
      event.dataTransfer.effectAllowed = 'move'
    }

    draggedType.value = type
    isDragging.value = true

    document.addEventListener('drop', onDragEnd)
  }

  /**
   * Handles the drag over event.
   */
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

  /**
   * Handles the drop event and creates FSM nodes.
   */
  function onDrop(event: DragEvent) {
    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY,
    })

    const nodeId = getId()
    const nodeType = draggedType.value

    // Create different node configurations based on type
    let nodeData: FSMNodeData = {
      label: nodeId,
      isInitial: false,
      isFinal: false
    }

    switch (nodeType) {
      case 'initial':
        nodeData = {
          label: 'Start',
          isInitial: true,
          isFinal: false
        }
        break
      case 'final':
        nodeData = {
          label: 'End',
          isInitial: false,
          isFinal: true
        }
        break
      case 'state':
      default:
        nodeData = {
          label: `S${id}`,
          isInitial: false,
          isFinal: false
        }
        break
    }

    const newNode = {
      id: nodeId,
      type: 'fsmState', // Use our custom node type
      position,
      data: nodeData,
    }

    /**
     * Align node position after drop, so it's centered to the mouse
     */
    const { off } = onNodesInitialized(() => {
      updateNode(nodeId, (node) => ({
        position: {
          x: node.position.x - (node.dimensions?.width || 100) / 2,
          y: node.position.y - (node.dimensions?.height || 50) / 2
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
    updateIdCounter, // Export the function to update ID counter
  }
}
