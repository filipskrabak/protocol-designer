import { ref } from 'vue'
import type { FSMEdgeData, FSMNodeData } from '@/contracts/models'

/**
 * Composable for managing FSM dialog states
 */
export function useFSMDialogs() {
  // Transition editing dialog state
  const editDialog = ref(false)
  const editingEdgeId = ref<string>('')
  const editingEdgeData = ref<FSMEdgeData>({})

  // State editing dialog state
  const stateEditDialog = ref(false)
  const editingNodeId = ref<string>('')
  const editingNodeData = ref<FSMNodeData>({
    label: '',
    isInitial: false,
    isFinal: false
  })

  // Confirmation dialog state
  const deleteConfirmDialog = ref(false)
  const deletingFSMId = ref<string>('')
  const deletingFSMName = ref<string>('')
  const clearConfirmDialog = ref(false)

  /**
   * Open transition edit dialog
   */
  function openTransitionEditDialog(edgeId: string, edgeData: FSMEdgeData) {
    editingEdgeId.value = edgeId
    editingEdgeData.value = { ...edgeData }
    editDialog.value = true
  }

  /**
   * Close transition edit dialog
   */
  function closeTransitionEditDialog() {
    editDialog.value = false
  }

  /**
   * Open state edit dialog
   */
  function openStateEditDialog(nodeId: string, nodeData: FSMNodeData) {
    editingNodeId.value = nodeId
    editingNodeData.value = { ...nodeData }
    stateEditDialog.value = true
  }

  /**
   * Close state edit dialog
   */
  function closeStateEditDialog() {
    stateEditDialog.value = false
  }

  /**
   * Open FSM delete confirmation dialog
   */
  function openDeleteConfirmDialog(fsmId: string, fsmName: string) {
    deletingFSMId.value = fsmId
    deletingFSMName.value = fsmName
    deleteConfirmDialog.value = true
  }

  /**
   * Close FSM delete confirmation dialog
   */
  function closeDeleteConfirmDialog() {
    deleteConfirmDialog.value = false
    deletingFSMId.value = ''
    deletingFSMName.value = ''
  }

  /**
   * Open clear all confirmation dialog
   */
  function openClearConfirmDialog() {
    clearConfirmDialog.value = true
  }

  /**
   * Close clear all confirmation dialog
   */
  function closeClearConfirmDialog() {
    clearConfirmDialog.value = false
  }

  return {
    // Transition edit dialog
    editDialog,
    editingEdgeId,
    editingEdgeData,
    openTransitionEditDialog,
    closeTransitionEditDialog,

    // State edit dialog
    stateEditDialog,
    editingNodeId,
    editingNodeData,
    openStateEditDialog,
    closeStateEditDialog,

    // FSM delete confirmation
    deleteConfirmDialog,
    deletingFSMId,
    deletingFSMName,
    openDeleteConfirmDialog,
    closeDeleteConfirmDialog,

    // Clear all confirmation
    clearConfirmDialog,
    openClearConfirmDialog,
    closeClearConfirmDialog
  }
}
