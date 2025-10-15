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
          <v-col cols="auto">
            <v-text-field
              v-model="fsmName"
              label="FSM Name"
              density="compact"
              style="min-width: 200px"
            />
          </v-col>

          <v-col cols="auto">
            <v-btn
              @click="clearAll"
              prepend-icon="mdi-delete-sweep"
              size="small"
              color="error"
              variant="outlined"
            >
              Clear All
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
            connection-mode="loose"
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
              States: {{ fsm.nodes.length }} | Transitions: {{ fsm.edges.length }} | Events: {{ fsm.events.length }}
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
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { v4 as uuidv4 } from 'uuid'
import FSMSidebar from './FSMSidebar.vue'
import FSMStateNode from './FSMStateNode.vue'
import FSMStateEditDialog from './FSMStateEditDialog.vue'
import FSMTransitionEditDialog from './FSMTransitionEditDialog.vue'
import useFSMDragAndDrop from './useFSMDragAndDrop'
import type { FiniteStateMachine, FSMEdgeData, FSMNodeData } from '@/contracts/models'

// Define custom node types
const nodeTypes = {
  fsmState: FSMStateNode
}

const connectionLineOptions = {
  type: 'smoothstep',
  style: {
    strokeWidth: 2,
    stroke: '#0ea5e9',
  },
  markerEnd: {
    type: 'arrowclosed',
    width: 20,
    height: 20,
    color: '#0ea5e9'
  }
}

const { onConnect, addEdges, nodes, edges, setNodes, setEdges } = useVueFlow()

// Drag and drop functionality
const { onDragOver, onDrop, onDragLeave, isDragOver } = useFSMDragAndDrop()

// FSM data structure
const fsm = reactive<FiniteStateMachine>({
  id: uuidv4(),
  name: 'My FSM',
  description: 'A finite state machine',
  author: 'User',
  version: '1.0.0',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  nodes: [],
  edges: [],
  events: [],
  metadata: {}
})

// Computed property for FSM name binding
const fsmName = computed({
  get: () => fsm.name,
  set: (value: string) => {
    fsm.name = value
    fsm.updated_at = new Date().toISOString()
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

// Clear all nodes and edges
function clearAll() {
  setNodes([])
  setEdges([])
  fsm.nodes = []
  fsm.edges = []
  fsm.updated_at = new Date().toISOString()
}

// Sync VueFlow state with FSM model
function syncFSMData() {
  fsm.nodes = nodes.value.map(node => ({
    id: node.id,
    type: 'fsmState' as const,
    position: node.position,
    data: node.data,
    dimensions: node.dimensions
  }))

  fsm.edges = edges.value.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: edge.data,
    type: edge.type,
    animated: edge.animated,
    style: edge.style
  }))

  fsm.updated_at = new Date().toISOString()
}

// VueFlow event handlers
function onNodesChange(changes: any) {
  // Handle node changes (drag, delete, etc.)
  console.log('Nodes changed:', changes)
  // Sync changes to FSM model
  syncFSMData()
}

function onEdgesChange(changes: any) {
  // Handle edge changes
  console.log('Edges changed:', changes)
  // Sync changes to FSM model
  syncFSMData()
}

// Custom connect handler to create FSM edges with default data
function handleConnect(connection: any) {
  console.log('Connection object received:', connection)

  const edgeId = `edge_${uuidv4()}`
  const edgeData: FSMEdgeData = {
    event: '',
    condition: '',
    action: '',
    description: ''
  }

  const newEdge = {
    id: edgeId,
    source: connection.source,      // Node where drag started
    target: connection.target,      // Node where drag ended
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    data: edgeData,
    label: '', // Start with empty label
    animated: false,
    selectable: true,
    focusable: true,
    markerEnd: {
      type: 'arrowclosed',
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
  syncFSMData()

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

    // Create label from data
    const labelParts = []
    if (data.event) labelParts.push(data.event)
    if (data.condition) labelParts.push(`[${data.condition}]`)
    if (data.action) labelParts.push(`/ ${data.action}`)

    // Update edge label
    edges.value[edgeIndex].label = labelParts.length > 0 ? labelParts.join(' ') : ''
  }

  syncFSMData()
}

// Delete transition
function deleteTransition(edgeId: string) {
  const edgeIndex = edges.value.findIndex(edge => edge.id === edgeId)
  if (edgeIndex !== -1) {
    edges.value.splice(edgeIndex, 1)
    syncFSMData()
  }
}

// Save state edit
function saveStateEdit(nodeId: string, data: FSMNodeData) {
  const nodeIndex = nodes.value.findIndex(node => node.id === nodeId)
  if (nodeIndex !== -1) {
    nodes.value[nodeIndex].data = data
  }
  syncFSMData()
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
    syncFSMData()
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
