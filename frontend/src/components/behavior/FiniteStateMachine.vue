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

    <!-- Status Bar -->
    <v-card class="mt-4" elevation="1">
      <v-card-text>
        <v-row align="center">
          <v-col>
            <span class="text-caption">
              <v-chip size="x-small" color="primary" variant="flat" class="me-2">
                {{ currentFSMIndex + 1 }} / {{ fsmList.length }}
              </v-chip>
              States: {{ currentFSM?.nodes.length || 0 }} |
              Transitions: {{ currentFSM?.edges.length || 0 }} |
              Events: {{ currentFSM?.events.length || 0 }}
            </span>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

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
import { computed, ref, onMounted, markRaw, onUnmounted, watch } from 'vue'
import { VueFlow, useVueFlow, MarkerType, ConnectionMode, ConnectionLineType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { v4 as uuidv4 } from 'uuid'
import FSMSidebar from './FSMSidebar.vue'
import FSMStateNode from './FSMStateNode.vue'
import FSMStateEditDialog from './FSMStateEditDialog.vue'
import FSMTransitionEditDialog from './FSMTransitionEditDialog.vue'
import useFSMDragAndDrop from './useFSMDragAndDrop'
import type { FiniteStateMachine, FSMEdgeData, FSMNodeData } from '@/contracts/models'
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

// Initialize protocol FSM array if needed
protocolStore.ensureFSMArray()

// Current FSM ID (synced with ProtocolStore)
const currentFSMId = computed({
  get: () => protocolStore.currentFSMId,
  set: (value: string | null) => {
    if (value) {
      protocolStore.setCurrentFSM(value)
      loadFSMToCanvas(value)
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

// Current FSM index
const currentFSMIndex = computed(() => {
  if (!currentFSMId.value) return 0
  return fsmList.value.findIndex(fsm => fsm.id === currentFSMId.value)
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

// Initialize first FSM if none exist
onMounted(() => {
  if (fsmList.value.length === 0) {
    createNewFSM()
  } else if (!currentFSMId.value) {
    // Load first FSM
    const firstFSM = fsmList.value[0]
    protocolStore.setCurrentFSM(firstFSM.id)
    loadFSMToCanvas(firstFSM.id)
  } else {
    // Load current FSM
    loadFSMToCanvas(currentFSMId.value)
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
// This fires AFTER FSMs are loaded into the protocol
watch(
  () => currentFSMId.value,
  (newFSMId, oldFSMId) => {
    // Only reload if FSM actually changed and we have a valid FSM
    if (newFSMId && newFSMId !== oldFSMId) {
      console.log('Current FSM changed, loading to canvas:', newFSMId)
      loadFSMToCanvas(newFSMId)
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
  loadFSMToCanvas(newFSM.id)

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

  deletingFSMId.value = fsmId
  deletingFSMName.value = fsm.name || 'Unnamed FSM'
  deleteConfirmDialog.value = true
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

  // Close dialog
  deleteConfirmDialog.value = false
  deletingFSMId.value = ''
  deletingFSMName.value = ''

  // Load another FSM if available
  if (fsmList.value.length > 0) {
    loadFSMToCanvas(fsmList.value[0].id)
  } else {
    // Create new FSM if none left
    createNewFSM()
  }
}

// Load FSM data to canvas
function loadFSMToCanvas(fsmId: string) {
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

// Generate edge label from edge data
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

// Clear all nodes and edges (but keep FSM)
function clearAll() {
  clearConfirmDialog.value = true
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

  clearConfirmDialog.value = false
}

// Debounce timer for FSM saving
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Save current canvas state to FSM in protocol store
function saveFSMFromCanvas() {
  const fsm = currentFSM.value
  if (!fsm) return

  fsm.nodes = nodes.value.map(node => ({
    id: node.id,
    type: 'fsmState' as const,
    position: node.position,
    data: node.data,
    dimensions: node.dimensions || { width: 150, height: 50 } // Default dimensions if not yet initialized
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

// Debounced version of saveFSMFromCanvas
function debouncedSaveFSM() {
  // Clear existing timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  // Set new timer - save after 500ms of inactivity
  saveDebounceTimer = setTimeout(() => {
    saveFSMFromCanvas()
    console.log('FSM saved (debounced)')
  }, 500)
}

// Cleanup on component unmount
onUnmounted(() => {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    // Save immediately on unmount to ensure no data loss
    saveFSMFromCanvas()
  }
})

// VueFlow event handlers
function onNodesChange(changes: any) {
  console.log('Nodes changed:', changes)
  debouncedSaveFSM()
}

function onEdgesChange(changes: any) {
  console.log('Edges changed:', changes)
  debouncedSaveFSM()
}

// Custom connect handler to create FSM edges with default data
function handleConnect(connection: any) {
  console.log('Connection object received:', connection)

  // Check if an identical transition already exists
  // (same source, target, and handles would create overlapping edges)
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
    source: connection.source,      // Node where drag started
    target: connection.target,      // Node where drag ended
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    data: {
      ...edgeData,
      isSelfLoop // Store this for rendering purposes
    },
    label: '', // Start with empty label
    animated: false,
    selectable: true,
    focusable: true,
    type: 'smoothstep', // Use smoothstep for better self-loop rendering
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
  editingEdgeId.value = edgeId
  editingEdgeData.value = { ...edgeData }
  editDialog.value = true
}

// Edge click handler for editing
function onEdgeClick(edgeMouseEvent: any) {
  console.log('Edge clicked:', edgeMouseEvent)
  const edge = edgeMouseEvent.edge
  editingEdgeId.value = edge.id
  editingEdgeData.value = edge.data ? { ...edge.data } : {}
  editDialog.value = true
}

// Node click handler for editing
function onNodeClick(nodeEvent: any) {
  const node = nodeEvent.node
  editingNodeId.value = node.id
  editingNodeData.value = node.data ? { ...node.data } : {
    label: '',
    isInitial: false,
    isFinal: false
  }
  stateEditDialog.value = true
}

// Save transition edit
function saveTransitionEdit(edgeId: string, data: FSMEdgeData) {
  const edgeIndex = edges.value.findIndex(edge => edge.id === edgeId)
  if (edgeIndex !== -1) {
    // Update edge data
    edges.value[edgeIndex].data = data

    // Generate and update edge label from data
    edges.value[edgeIndex].label = generateEdgeLabel(data)
  }

  saveFSMFromCanvas()
}

// Delete transition
function deleteTransition(edgeId: string) {
  const edgeIndex = edges.value.findIndex(edge => edge.id === edgeId)
  if (edgeIndex !== -1) {
    edges.value.splice(edgeIndex, 1)
    saveFSMFromCanvas()
  }
}

// Save state edit
function saveStateEdit(nodeId: string, data: FSMNodeData) {
  const nodeIndex = nodes.value.findIndex(node => node.id === nodeId)
  if (nodeIndex !== -1) {
    nodes.value[nodeIndex].data = data
  }
  saveFSMFromCanvas()
}

// Delete state
function deleteState(nodeId: string) {
  const nodeIndex = nodes.value.findIndex(node => node.id === nodeId)
  if (nodeIndex !== -1) {
    nodes.value.splice(nodeIndex, 1)
    // Also remove all edges connected to this node
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

// Connect nodes with edges using custom handler
onConnect(handleConnect)
</script>

<style scoped>
.fsm-editor {
  padding: 16px;
  height: 100vh;
  overflow: hidden;
}

.fsm-layout {
  display: flex;
  gap: 0;
  height: 600px;
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
  height: 600px;
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
