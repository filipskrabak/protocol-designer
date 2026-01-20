<template>
  <div class="fsm-editor">
    <!-- Toolbar -->
    <v-card class="fsm-toolbar mb-4" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-state-machine</v-icon>
        <span>Finite State Machine Editor</span>
        <v-spacer></v-spacer>
      </v-card-title>

      <v-card-text>
        <v-row align="center">
          <!-- FSM Selector -->
          <v-col cols="auto">
            <v-select
              v-model="currentFSMId"
              :items="fsmListItems"
              label="Select FSM"
              density="compact"
              variant="outlined"
              style="min-width: 250px"
              item-title="name"
              item-value="id"
              prepend-icon="mdi-folder-multiple-outline"
              hint="Select FSM to edit"
              persistent-hint
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon>mdi-state-machine</v-icon>
                  </template>
                  <template v-slot:append v-if="fsmList.length > 1">
                    <v-btn
                      icon="mdi-delete"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click.stop="confirmDeleteFSM(item.raw.id)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <!-- FSM Name -->
          <v-col cols="auto">
            <v-text-field
              v-model="fsmName"
              label="FSM Name"
              density="compact"
              variant="outlined"
              style="min-width: 200px"
              prepend-icon="mdi-rename-box"
            />
          </v-col>

          <!-- New FSM Button -->
          <v-col cols="auto">
            <v-btn
              @click="createNewFSM"
              prepend-icon="mdi-plus-circle"
              color="primary"
              variant="flat"
              class="mb-5"
            >
              New FSM
            </v-btn>
          </v-col>

          <!-- Clear All Button -->
          <v-col cols="auto">
            <v-btn
              @click="clearAll"
              prepend-icon="mdi-delete-sweep"
              color="error"
              variant="outlined"
              class="mb-5 "
            >
              Clear States
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Layout with Canvas and Sidebar -->
    <div class="fsm-layout">
      <!-- VueFlow Canvas -->
      <v-card class="fsm-canvas" elevation="2">
        <div
          class="canvas-container"
          @drop="onDrop"
        >
          <VueFlow
            :nodes="nodes"
            :edges="edges"
            :node-types="nodeTypes"
            :edges-focusable="true"
            :edges-updatable="false"
            :nodes-connectable="true"
            :connection-mode="ConnectionMode.Loose"
            :connection-line-options="connectionLineOptions"
            @nodes-change="onNodesChange"
            @edges-change="onEdgesChange"
            @edge-click="onEdgeClick"
            @node-click="onNodeClick"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            fit-view-on-init
          >
            <!-- Drop Zone Background -->
            <Background
              :size="2"
              :gap="20"
              pattern-color="#BDBDBD"
              :style="{
                backgroundColor: isDragOver ? '#e7f3ff' : 'transparent',
                transition: 'background-color 0.2s ease',
              }"
            />
            <Controls />

            <!-- Drop Indicator -->
            <div v-if="isDragOver" class="drop-indicator">
              <v-icon size="48" color="primary">mdi-plus-circle</v-icon>
              <div class="drop-text">Drop here to create state</div>
            </div>
          </VueFlow>
        </div>
      </v-card>

      <!-- Sidebar -->
      <FSMSidebar />
    </div>

    <!-- FSM Analysis -->
    <div class="mt-4">
      <FSMAnalysis />
    </div>

    <!-- Transition Edit Dialog -->
    <FSMTransitionEditDialog
      v-model="editDialog"
      :edge-id="editingEdgeId"
      :edge-data="editingEdgeData"
      @save="saveTransitionEdit"
      @delete="deleteTransition"
    />

    <!-- State Edit Dialog -->
    <FSMStateEditDialog
      v-model="stateEditDialog"
      :node-id="editingNodeId"
      :node-data="editingNodeData"
      @save="saveStateEdit"
      @delete="deleteState"
    />

    <!-- Delete FSM Confirmation Dialog -->
    <v-dialog v-model="deleteConfirmDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="error" class="me-2">mdi-alert-circle</v-icon>
          Delete FSM
        </v-card-title>
        <v-card-text>
          <p class="text-body-1">
            Are you sure you want to delete FSM <strong>"{{ deletingFSMName }}"</strong>?
          </p>
          <p class="text-body-2 text-error">
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="deleteConfirmDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="executeDeleteFSM"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear States Confirmation Dialog -->
    <v-dialog v-model="clearConfirmDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="me-2">mdi-alert</v-icon>
          Clear All States
        </v-card-title>
        <v-card-text>
          <p class="text-body-1">
            Are you sure you want to clear all states and transitions in this FSM?
          </p>
          <p class="text-body-2 text-warning">
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="clearConfirmDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            @click="executeClearAll"
          >
            Clear All
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, markRaw, watch } from 'vue'
import { VueFlow, useVueFlow, MarkerType, ConnectionMode, ConnectionLineType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { v4 as uuidv4 } from 'uuid'
import FSMSidebar from './FSMSidebar.vue'
import FSMStateNode from './FSMStateNode.vue'
import FSMStateEditDialog from './FSMStateEditDialog.vue'
import FSMTransitionEditDialog from './FSMTransitionEditDialog.vue'
import FSMAnalysis from './FSMAnalysis.vue'
import useFSMDragAndDrop from './useFSMDragAndDrop'
import { useFSMDialogs } from './composables/useFSMDialogs'
import { useFSMPersistence } from './composables/useFSMPersistence'
import { useFSMCanvas } from './composables/useFSMCanvas'
import type { FiniteStateMachine } from '@/contracts/models'
import { useNotificationStore } from '@/store/NotificationStore'
import { useProtocolStore } from '@/store/ProtocolStore'

// Define custom node types
const nodeTypes = {
  fsmState: markRaw(FSMStateNode)
}

const connectionLineOptions = {
  type: ConnectionLineType.SmoothStep,
  style: {
    strokeWidth: 2,
    stroke: '#0ea5e9',
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#0ea5e9'
  }
}

const { onConnect, addEdges, nodes, edges, setNodes, setEdges } = useVueFlow()

// Drag and drop functionality
const { onDragOver, onDrop, onDragLeave, isDragOver, updateIdCounter } = useFSMDragAndDrop()

const notificationStore = useNotificationStore()
const protocolStore = useProtocolStore()

// Dialog management
const {
  editDialog,
  editingEdgeId,
  editingEdgeData,
  stateEditDialog,
  editingNodeId,
  editingNodeData,
  deleteConfirmDialog,
  deletingFSMId,
  deletingFSMName,
  clearConfirmDialog,
  openTransitionEditDialog,
  openStateEditDialog,
  openDeleteConfirmDialog,
  closeDeleteConfirmDialog,
  openClearConfirmDialog,
  closeClearConfirmDialog
} = useFSMDialogs()

// Persistence management
const { saveFSMFromCanvas, debouncedSaveFSM, loadFSMToCanvas } = useFSMPersistence(
  nodes,
  edges,
  setNodes,
  setEdges
)

// Canvas operations
const {
  handleConnect,
  onEdgeClick,
  onNodeClick,
  saveTransitionEdit,
  deleteTransition,
  saveStateEdit,
  deleteState,
  onNodesChange: handleNodesChange,
  onEdgesChange: handleEdgesChange
} = useFSMCanvas(
  nodes,
  edges,
  addEdges,
  saveFSMFromCanvas,
  openTransitionEditDialog,
  openStateEditDialog
)

// Initialize protocol FSM array if needed
protocolStore.ensureFSMArray()

// Current FSM ID (synced with ProtocolStore)
const currentFSMId = computed({
  get: () => protocolStore.currentFSMId,
  set: (value: string | null) => {
    if (value) {
      protocolStore.setCurrentFSM(value)
      loadFSMToCanvas(value, updateIdCounter)
    }
  }
})

// Get FSM list from protocol
const fsmList = computed(() => {
  return protocolStore.protocol.finite_state_machines || []
})

// FSM list items for dropdown
const fsmListItems = computed(() => {
  return fsmList.value.map(fsm => ({
    id: fsm.id,
    name: fsm.name || 'Unnamed FSM'
  }))
})

// Get current FSM from protocol store
const currentFSM = computed(() => {
  return protocolStore.getCurrentFSM()
})

// Computed property for FSM name binding
const fsmName = computed({
  get: () => currentFSM.value?.name || '',
  set: (value: string) => {
    const fsm = currentFSM.value
    if (fsm) {
      fsm.name = value
      fsm.updated_at = new Date().toISOString()
      protocolStore.updateFSM(fsm.id, fsm)
    }
  }
})

// Initialize first FSM if none exist
onMounted(() => {
  if (fsmList.value.length === 0) {
    createNewFSM()
  } else if (!currentFSMId.value) {
    const firstFSM = fsmList.value[0]
    protocolStore.setCurrentFSM(firstFSM.id)
    loadFSMToCanvas(firstFSM.id, updateIdCounter)
  } else {
    loadFSMToCanvas(currentFSMId.value, updateIdCounter)
  }
})

// Watch for protocol changes (when switching between protocols)
// Track the previous protocol ID to detect switches
let previousProtocolId: string = String(protocolStore.protocol.id || '')

watch(
  () => String(protocolStore.protocol.id || ''),
  (newProtocolId) => {
    // Detect protocol change
    const protocolChanged = newProtocolId && previousProtocolId && newProtocolId !== previousProtocolId

    if (protocolChanged) {
      console.log('Protocol changed, will reload FSM canvas', {
        from: previousProtocolId,
        to: newProtocolId
      })

      // Update previous protocol ID
      previousProtocolId = newProtocolId

      // Clear the canvas immediately
      nodes.value = []
      edges.value = []
    } else if (!previousProtocolId && newProtocolId) {
      // First time protocol is loaded
      previousProtocolId = newProtocolId
    }
  },
  { immediate: true }
)

// Watch for currentFSMId changes to reload canvas
watch(
  () => currentFSMId.value,
  (newFSMId, oldFSMId) => {
    if (newFSMId && newFSMId !== oldFSMId) {
      console.log('Current FSM changed, loading to canvas:', newFSMId)
      loadFSMToCanvas(newFSMId, updateIdCounter)
    }
  }
)

// Create new FSM
function createNewFSM() {
  const newFSM: FiniteStateMachine = {
    id: uuidv4(),
    name: `FSM ${fsmList.value.length + 1}`,
    description: '',
    author: protocolStore.protocol.author || 'User',
    version: '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    protocol_id: String(protocolStore.protocol.id || ''),
    nodes: [],
    edges: [],
    events: [],
    metadata: {}
  }

  protocolStore.addFSM(newFSM)
  loadFSMToCanvas(newFSM.id, updateIdCounter)

  notificationStore.showNotification({
    message: `Created new FSM: ${newFSM.name}`,
    timeout: 2000,
    color: 'success',
    icon: 'mdi-check-circle'
  })
}

// Confirm delete FSM
function confirmDeleteFSM(fsmId: string) {
  const fsm = protocolStore.getFSMById(fsmId)
  if (!fsm) return
  openDeleteConfirmDialog(fsmId, fsm.name || 'Unnamed FSM')
}

// Execute delete FSM after confirmation
function executeDeleteFSM() {
  const fsmId = deletingFSMId.value
  const fsmName = deletingFSMName.value

  protocolStore.deleteFSM(fsmId)

  notificationStore.showNotification({
    message: `Deleted FSM: ${fsmName}`,
    timeout: 2000,
    color: 'info',
    icon: 'mdi-information'
  })

  closeDeleteConfirmDialog()

  // Load another FSM if available
  if (fsmList.value.length > 0) {
    loadFSMToCanvas(fsmList.value[0].id, updateIdCounter)
  } else {
    createNewFSM()
  }
}

// Clear all nodes and edges
function clearAll() {
  openClearConfirmDialog()
}

// Execute clear all after confirmation
function executeClearAll() {
  setNodes([])
  setEdges([])
  saveFSMFromCanvas()

  notificationStore.showNotification({
    message: 'Cleared all states and transitions',
    timeout: 2000,
    color: 'info',
    icon: 'mdi-information'
  })

  closeClearConfirmDialog()
}

// VueFlow event handlers
function onNodesChange(changes: any) {
  handleNodesChange(changes, debouncedSaveFSM)
}

function onEdgesChange(changes: any) {
  handleEdgesChange(changes, debouncedSaveFSM)
}

// Connect nodes with edges using custom handler
onConnect(handleConnect)
</script>

<style scoped>
.fsm-editor {
  padding: 16px;

  display: flex;
  flex-direction: column;
}

.fsm-layout {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 600px;
  border-radius: 4px;
  overflow: hidden;
}

.fsm-canvas {
  flex: 1;
  position: relative;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.canvas-container {
  height: 100%;
  width: 100%;
  position: relative;
}

.drop-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  z-index: 10;
}

.drop-text {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #1976d2;
  text-align: center;
}

/* VueFlow styling overrides */
:deep(.vue-flow__background) {
  transition: background-color 0.2s ease;
}

:deep(.vue-flow__node) {
  font-size: 12px;
}

/* FSM Edge Styling */
:deep(.vue-flow__edge) {
  cursor: pointer;
}

:deep(.vue-flow__edge-path) {
  stroke: #374151;
  stroke-width: 2px;
  cursor: pointer;
}

:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke: #0ea5e9;
  stroke-width: 3px;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #0ea5e9;
  stroke-width: 3px;
}

/* Self-loop edges styling - creates larger, more visible loops */
:deep(.vue-flow__edge.self-loop .vue-flow__edge-path) {
  stroke-dasharray: none;
}

/* Increase spacing for self-referencing edges */
.vue-flow {
  --vf-edge-z-index: 1;
}

/* Connection line styling (the temporary line while dragging) */
:deep(.vue-flow__connection-path) {
  stroke: #0ea5e9 !important;
  stroke-width: 2px !important;
  stroke-dasharray: 5, 5;
  animation: dash 0.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

:deep(.vue-flow__connection) {
  pointer-events: none;
}

/* Edge labels */
:deep(.vue-flow__edge-text) {
  fill: #374151;
  font-size: 12px;
  font-weight: 500;
}

:deep(.vue-flow__edge-text-bg) {
  fill: white;
  stroke: #e5e7eb;
}

/* Arrow markers */
:deep(.vue-flow__arrowhead) {
  fill: #374151;
}

:deep(.vue-flow__edge:hover .vue-flow__arrowhead),
:deep(.vue-flow__edge.selected .vue-flow__arrowhead) {
  fill: #0ea5e9;
}
</style>
