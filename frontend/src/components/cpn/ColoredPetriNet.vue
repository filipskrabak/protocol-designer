<template>
  <div class="cpn-editor">
    <!-- Toolbar -->
    <v-card class="cpn-toolbar mb-4" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-graph</v-icon>
        <span>Colored Petri Net Editor</span>
        <v-spacer />
      </v-card-title>

      <v-card-text>
        <v-row align="center">
          <!-- CPN Selector -->
          <v-col cols="auto">
            <v-select
              v-model="currentCPNId"
              :items="cpnListItems"
              label="Select CPN"
              density="compact"
              variant="outlined"
              style="min-width: 250px"
              item-title="name"
              item-value="id"
              prepend-icon="mdi-folder-multiple-outline"
              hint="Select CPN to edit"
              persistent-hint
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon>mdi-sitemap</v-icon>
                  </template>
                  <template v-slot:append v-if="cpnList.length > 1">
                    <v-btn
                      icon="mdi-delete"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click.stop="confirmDeleteCPN(item.raw.id)"
                    />
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <!-- CPN Name -->
          <v-col cols="auto">
            <v-text-field
              v-model="cpnName"
              label="CPN Name"
              density="compact"
              variant="outlined"
              style="min-width: 200px"
              prepend-icon="mdi-rename-box"
            />
          </v-col>

          <!-- New CPN -->
          <v-col cols="auto">
            <v-btn
              @click="createNewCPN"
              prepend-icon="mdi-plus-circle"
              color="primary"
              variant="flat"
              class="mb-5"
            >
              New CPN
            </v-btn>
          </v-col>

          <!-- Duplicate CPN -->
          <v-col cols="auto">
            <v-btn
              @click="duplicateCPN"
              prepend-icon="mdi-content-copy"
              color="secondary"
              variant="outlined"
              class="mb-5"
            >
              Duplicate
            </v-btn>
          </v-col>

          <!-- Clear canvas -->
          <v-col cols="auto">
            <v-btn
              @click="clearConfirmDialog = true"
              prepend-icon="mdi-delete-sweep"
              color="error"
              variant="outlined"
              class="mb-5"
            >
              Clear
            </v-btn>
          </v-col>

          <v-spacer />
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Layout: Canvas + Sidebar -->
    <div class="cpn-layout">
      <v-card class="cpn-canvas" elevation="2">
        <div
          class="canvas-container"
          @drop="onDrop"
        >
          <VueFlow
            :nodes="nodes"
            :edges="edges"
            :node-types="nodeTypes"
            :is-valid-connection="isValidConnection"
            :connection-mode="ConnectionMode.Loose"
            :connection-line-options="connectionLineOptions"
            @connect="handleConnect"
            @nodes-change="onNodesChange"
            @edges-change="onEdgesChange"
            @edge-click="onEdgeClick"
            @node-click="onNodeClick"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            fit-view-on-init
          >
            <template #edge-cpnArc="props">
              <CPNArcEdge
                v-bind="props"
                @edgeClick="(evt, edge) => onEdgeClick({ event: evt, edge })"
              />
            </template>
            <Background :size="2" :gap="20" pattern-color="#BDBDBD" />
            <Controls />
          </VueFlow>
        </div>
      </v-card>

      <!-- Sidebar -->
      <CPNSidebar
        @open-color-set-builder="colorSetBuilderDialog = true"
        @open-variable-editor="variableEditorDialog = true"
      />
    </div>

    <!-- Analysis panel -->
    <div class="mt-4">
      <CPNAnalysis />
    </div>

    <!-- Node Edit Dialog -->
    <CPNNodeEditDialog
      v-model="nodeEditDialog"
      :node-id="editingNodeId"
      :node-data="editingNodeData"
      @save="saveNodeEdit"
      @delete="deleteNode"
    />

    <!-- Arc Edit Dialog -->
    <CPNArcEditDialog
      v-model="arcEditDialog"
      :edge-id="editingEdgeId"
      :edge-data="editingEdgeData"
      :variables="currentCPN?.variables"
      @save="saveArcEdit"
      @delete="deleteArc"
    />

    <!-- Color Set Builder Dialog -->
    <CPNColorSetBuilder v-model="colorSetBuilderDialog" />

    <!-- Variable Editor Dialog -->
    <CPNVariableEditor v-model="variableEditorDialog" />

    <!-- Delete CPN Confirmation -->
    <v-dialog v-model="deleteConfirmDialog" max-width="480">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="error" class="me-2">mdi-alert-circle</v-icon>
          Delete CPN
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete <strong>"{{ deletingCPNName }}"</strong>?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteConfirmDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeDeleteCPN">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear Canvas Confirmation -->
    <v-dialog v-model="clearConfirmDialog" max-width="480">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="me-2">mdi-alert</v-icon>
          Clear Canvas
        </v-card-title>
        <v-card-text>
          Clear all places and transitions in this CPN? This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="clearConfirmDialog = false">Cancel</v-btn>
          <v-btn color="warning" variant="flat" @click="executeClear">Clear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, markRaw, ref, watch } from 'vue'
import { VueFlow, useVueFlow, ConnectionMode, ConnectionLineType, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { v4 as uuidv4 } from 'uuid'

import CPNPlaceNode from './CPNPlaceNode.vue'
import CPNTransitionNode from './CPNTransitionNode.vue'
import CPNSidebar from './CPNSidebar.vue'
import CPNNodeEditDialog from './CPNNodeEditDialog.vue'
import CPNArcEditDialog from './CPNArcEditDialog.vue'
import CPNAnalysis from './CPNAnalysis.vue'
import CPNColorSetBuilder from './CPNColorSetBuilder.vue'
import CPNVariableEditor from './CPNVariableEditor.vue'

import { useCPNDragAndDrop } from './composables/useCPNDragAndDrop'
import { useCPNPersistence } from './composables/useCPNPersistence'
import { useCPNCanvas } from './composables/useCPNCanvas'

import { useCPNStore } from '@/store/CPNStore'
import { useProtocolStore } from '@/store/ProtocolStore'
import { useNotificationStore } from '@/store/NotificationStore'
import type { ColoredPetriNet } from '@/contracts/models'
import type { CPNPlaceNodeData } from './CPNPlaceNode.vue'
import type { CPNTransitionNodeData } from './CPNTransitionNode.vue'
import CPNArcEdge from './CPNArcEdge.vue'
import type { CPNArcEdgeData } from './CPNArcEdge.vue'
import { initCPNFromProtocol } from '@/utils/cpn/colorSetGenerator'

//  VueFlow setup
const nodeTypes = {
  cpnPlace: markRaw(CPNPlaceNode),
  cpnTransition: markRaw(CPNTransitionNode),
}

const connectionLineOptions = {
  type: ConnectionLineType.Bezier,
  style: { strokeWidth: 2, stroke: '#374151' },
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#374151' },
}

const { addEdges, nodes, edges, setNodes, setEdges } = useVueFlow()
const { onDragOver, onDrop, onDragLeave } = useCPNDragAndDrop()
const { saveCPNFromCanvas, loadCPNToCanvas } = useCPNPersistence(nodes, edges, setNodes, setEdges)

//  Dialog state
const nodeEditDialog = ref(false)
const editingNodeId = ref('')
const editingNodeData = ref<CPNPlaceNodeData | CPNTransitionNodeData | null>(null)

const arcEditDialog = ref(false)
const editingEdgeId = ref('')
const editingEdgeData = ref<CPNArcEdgeData | null>(null)

const colorSetBuilderDialog = ref(false)
const variableEditorDialog = ref(false)
const deleteConfirmDialog = ref(false)
const deletingCPNId = ref('')
const deletingCPNName = ref('')
const clearConfirmDialog = ref(false)

//  Canvas operations
function openArcEditDialog(edgeId: string, edgeData: CPNArcEdgeData) {
  editingEdgeId.value = edgeId
  editingEdgeData.value = edgeData
  arcEditDialog.value = true
}

function openNodeEditDialog(nodeId: string, nodeData: CPNPlaceNodeData | CPNTransitionNodeData) {
  editingNodeId.value = nodeId
  editingNodeData.value = nodeData
  nodeEditDialog.value = true
}

const { isValidConnection, handleConnect, onEdgeClick, onNodeClick, onNodesChange, onEdgesChange } =
  useCPNCanvas(nodes, edges, addEdges, saveCPNFromCanvas, openArcEditDialog, openNodeEditDialog)

//  Stores
const cpnStore = useCPNStore()
const protocolStore = useProtocolStore()
const notificationStore = useNotificationStore()

const cpnList = computed(() => cpnStore.cpnList)
const cpnListItems = computed(() =>
  cpnList.value.map(c => ({ id: c.id, name: c.name || 'Unnamed CPN' })),
)

const currentCPNId = computed({
  get: () => cpnStore.currentCPNId,
  set: (value: string | null) => {
    if (value) {
      cpnStore.setCurrentCPN(value)
      loadCPNToCanvas(value)
    }
  },
})

const currentCPN = computed(() => cpnStore.getCurrentCPN())
const cpnName = computed({
  get: () => currentCPN.value?.name ?? '',
  set: (value: string) => {
    const cpn = currentCPN.value
    if (cpn) {
      cpnStore.updateCPN(cpn.id, { ...cpn, name: value })
    }
  },
})

//  Node/edge edit save handlers
function saveNodeEdit(nodeId: string, data: CPNPlaceNodeData | CPNTransitionNodeData) {
  const node = nodes.value.find(n => n.id === nodeId)
  if (node) {
    node.data = data
    saveCPNFromCanvas()
  }
}

function deleteNode(nodeId: string) {
  setNodes(nodes.value.filter(n => n.id !== nodeId))
  setEdges(edges.value.filter(e => e.source !== nodeId && e.target !== nodeId))
  saveCPNFromCanvas()
  nodeEditDialog.value = false
}

function saveArcEdit(edgeId: string, data: CPNArcEdgeData) {
  const edge = edges.value.find(e => e.id === edgeId)
  if (edge) {
    edge.data = data
    saveCPNFromCanvas()
  }
}

function deleteArc(edgeId: string) {
  setEdges(edges.value.filter(e => e.id !== edgeId))
  saveCPNFromCanvas()
  arcEditDialog.value = false
}

//  CPN lifecycle
function createNewCPN() {
  const protocol = protocolStore.protocol
  // Auto-generate color sets from fields when fields are available
  const newCPN = (protocol.fields?.length)
    ? initCPNFromProtocol(protocol)
    : {
        id: uuidv4(),
        name: `CPN ${cpnList.value.length + 1}`,
        description: '',
        places: [],
        transitions: [],
        arcs: [],
        colorSets: [],
        variables: [],
      } as ColoredPetriNet

  // Ensure unique name if multiple
  if (cpnList.value.length > 0) {
    newCPN.name = `${newCPN.name} ${cpnList.value.length + 1}`
  }
  cpnStore.addCPN(newCPN)
  loadCPNToCanvas(newCPN.id)
  notificationStore.showNotification({
    message: `Created ${newCPN.name}`,
    timeout: 2000,
    color: 'success',
    icon: 'mdi-check-circle',
  })
}

function duplicateCPN() {
  const cpn = currentCPN.value
  if (!cpn) return
  const duplicate: ColoredPetriNet = JSON.parse(JSON.stringify(cpn))
  duplicate.id = uuidv4()
  duplicate.name = `${cpn.name} (copy)`
  // Re-assign new UUIDs to places, transitions and arcs so they don't collide
  const idMap = new Map<string, string>()
  duplicate.places = duplicate.places.map(p => {
    const newId = uuidv4()
    idMap.set(p.id, newId)
    return { ...p, id: newId }
  })
  duplicate.transitions = duplicate.transitions.map(t => {
    const newId = uuidv4()
    idMap.set(t.id, newId)
    return { ...t, id: newId }
  })
  duplicate.arcs = duplicate.arcs.map(a => ({
    ...a,
    id: uuidv4(),
    sourceId: idMap.get(a.sourceId) ?? a.sourceId,
    targetId: idMap.get(a.targetId) ?? a.targetId,
  }))
  cpnStore.addCPN(duplicate)
  loadCPNToCanvas(duplicate.id)
  notificationStore.showNotification({
    message: `Duplicated as "${duplicate.name}"`,
    timeout: 2000,
    color: 'success',
    icon: 'mdi-content-copy',
  })
}

function confirmDeleteCPN(id: string) {
  const cpn = cpnStore.getCPNById(id)
  deletingCPNId.value = id
  deletingCPNName.value = cpn?.name ?? id
  deleteConfirmDialog.value = true
}

function executeDeleteCPN() {
  cpnStore.deleteCPN(deletingCPNId.value)
  deleteConfirmDialog.value = false
  if (cpnList.value.length > 0) {
    loadCPNToCanvas(cpnList.value[0].id)
  } else {
    setNodes([])
    setEdges([])
  }
}

function executeClear() {
  setNodes([])
  setEdges([])
  saveCPNFromCanvas()
  clearConfirmDialog.value = false
}

//  Mount
onMounted(() => {
  if (cpnList.value.length === 0) {
    createNewCPN()
  } else if (!cpnStore.currentCPNId) {
    cpnStore.setCurrentCPN(cpnList.value[0].id)
    loadCPNToCanvas(cpnList.value[0].id)
  } else {
    loadCPNToCanvas(cpnStore.currentCPNId)
  }
})

// Watch for protocol switch → reload canvas
let prevProtocolId = String(protocolStore.protocol.id || '')
watch(
  () => String(protocolStore.protocol.id || ''),
  (newId) => {
    if (newId && prevProtocolId && newId !== prevProtocolId) {
      setNodes([])
      setEdges([])
    }
    prevProtocolId = newId
  },
  { immediate: true },
)

watch(
  () => cpnStore.currentCPNId,
  (newId, oldId) => {
    if (newId && newId !== oldId) loadCPNToCanvas(newId)
  },
)
</script>

<style scoped>
.cpn-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cpn-toolbar {
  flex-shrink: 0;
}

.cpn-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0;
}

.cpn-canvas {
  flex: 1;
  min-width: 0;
  position: relative;
}

.canvas-container {
  width: 100%;
  height: 600px;
}
</style>
