<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2">mdi-chart-timeline-variant</v-icon>
      FSM Properties
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        @click="analyzeCurrentFSM"
        :loading="analyzing"
      >
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text v-if="!currentFSM">
      <v-alert type="info" variant="tonal">
        No FSM selected. Please select or create an FSM to analyze.
      </v-alert>
    </v-card-text>

    <v-card-text v-else-if="!analysisResult">
      <v-alert type="info" variant="tonal">
        Click the refresh button to analyze the current FSM.
      </v-alert>
    </v-card-text>

    <v-card-text v-else class="pa-0">
      <!-- Summary Section -->
      <v-expansion-panels variant="accordion">
        <!-- Overall Status -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon
                :color="analysisResult.isValid ? 'success' : 'warning'"
                class="me-2"
              >
                {{ analysisResult.isValid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
              </v-icon>
              <span class="font-weight-medium">
                Status: {{ analysisResult.isValid ? 'Valid' : 'Has Issues' }}
              </span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" lines="one">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-circle-outline</v-icon>
                </template>
                <v-list-item-title class="text-wrap">States: {{ analysisResult.metrics.totalStates }}</v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-arrow-right-circle</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Transitions: {{ analysisResult.metrics.totalTransitions }}</v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-play-circle</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Initial States: {{ analysisResult.metrics.initialStates }}</v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-stop-circle</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Final States: {{ analysisResult.metrics.finalStates }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Structural Properties -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon class="me-2">mdi-network</v-icon>
              <span class="font-weight-medium">Structural Properties</span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" lines="two">
              <!-- Reachability -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="analysisResult.properties.allStatesReachable ? 'success' : 'error'">
                    {{ analysisResult.properties.allStatesReachable ? 'mdi-check' : 'mdi-close' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">All States Reachable</v-list-item-title>
                <v-list-item-subtitle v-if="!analysisResult.properties.allStatesReachable && analysisResult.issues.unreachableStates.length > 0" class="text-wrap">
                  Unreachable: {{ analysisResult.issues.unreachableStates.join(', ') }}
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Determinism -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="analysisResult.properties.isDeterministic ? 'success' : 'warning'">
                    {{ analysisResult.properties.isDeterministic ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Deterministic</v-list-item-title>
                <v-list-item-subtitle v-if="!analysisResult.properties.isDeterministic" class="text-wrap">
                  Conflicting transitions detected
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Dead States -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="analysisResult.issues.deadStates.length === 0 ? 'success' : 'warning'">
                    {{ analysisResult.issues.deadStates.length === 0 ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">No Dead States</v-list-item-title>
                <v-list-item-subtitle v-if="analysisResult.issues.deadStates.length > 0" class="text-wrap">
                  Dead states: {{ analysisResult.issues.deadStates.join(', ') }}
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Has Initial State -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="analysisResult.properties.hasInitialState ? 'success' : 'error'">
                    {{ analysisResult.properties.hasInitialState ? 'mdi-check' : 'mdi-close' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Has Initial State</v-list-item-title>
              </v-list-item>

              <!-- Has Final State -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="analysisResult.properties.hasFinalState ? 'success' : 'warning'">
                    {{ analysisResult.properties.hasFinalState ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Has Final State</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Graph Properties -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon class="me-2">mdi-graph</v-icon>
              <span class="font-weight-medium">Graph Properties</span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" lines="two">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="analysisResult.properties.isStronglyConnected ? 'success' : 'info'">
                    {{ analysisResult.properties.isStronglyConnected ? 'mdi-check' : 'mdi-information' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Strongly Connected</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  {{ analysisResult.properties.isStronglyConnected ? 'All states can reach each other' : 'Not all states are mutually reachable' }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-chart-timeline</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Maximum Depth</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  Longest path: {{ analysisResult.properties.maxDepth }} transitions
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-sync</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Cycles Detected</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  {{ analysisResult.properties.hasCycles ? 'Yes' : 'No' }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="analysisResult.properties.selfLoops.length > 0">
                <template v-slot:prepend>
                  <v-icon>mdi-reload</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Self-Loops</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  {{ analysisResult.properties.selfLoops.join(', ') }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Issues & Warnings -->
        <v-expansion-panel v-if="analysisResult.issues.warnings.length > 0 || analysisResult.issues.errors.length > 0">
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon color="warning" class="me-2">mdi-alert-octagon</v-icon>
              <span class="font-weight-medium">
                Issues ({{ analysisResult.issues.errors.length + analysisResult.issues.warnings.length }})
              </span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- Errors -->
            <div v-if="analysisResult.issues.errors.length > 0">
              <div class="text-subtitle-2 mb-2 text-error">Errors</div>
              <v-alert
                v-for="(error, index) in analysisResult.issues.errors"
                :key="'error-' + index"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-2"
              >
                {{ error }}
              </v-alert>
            </div>

            <!-- Warnings -->
            <div v-if="analysisResult.issues.warnings.length > 0" :class="{ 'mt-4': analysisResult.issues.errors.length > 0 }">
              <div class="text-subtitle-2 mb-2 text-warning">Warnings</div>
              <v-alert
                v-for="(warning, index) in analysisResult.issues.warnings"
                :key="'warning-' + index"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-2"
              >
                {{ warning }}
              </v-alert>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProtocolStore } from '@/store/ProtocolStore'
import { useNotificationStore } from '@/store/NotificationStore'
import type { FiniteStateMachine, FSMNode, FSMEdge } from '@/contracts/models'

const protocolStore = useProtocolStore()
const notificationStore = useNotificationStore()

const analyzing = ref(false)
const analysisResult = ref<FSMAnalysisResult | null>(null)

interface FSMAnalysisResult {
  isValid: boolean
  metrics: {
    totalStates: number
    totalTransitions: number
    initialStates: number
    finalStates: number
  }
  properties: {
    hasInitialState: boolean
    hasFinalState: boolean
    allStatesReachable: boolean
    isDeterministic: boolean
    isStronglyConnected: boolean
    hasCycles: boolean
    maxDepth: number
    selfLoops: string[]
  }
  issues: {
    errors: string[]
    warnings: string[]
    unreachableStates: string[]
    deadStates: string[]
  }
}

const currentFSM = computed(() => protocolStore.getCurrentFSM())

function analyzeCurrentFSM() {
  const fsm = currentFSM.value
  if (!fsm) {
    notificationStore.showNotification({
      message: 'No FSM selected for analysis',
      color: 'warning',
      icon: 'mdi-alert',
      timeout: 3000
    })
    return
  }

  analyzing.value = true

  try {
    analysisResult.value = performAnalysis(fsm)

    notificationStore.showNotification({
      message: analysisResult.value.isValid ? 'FSM analysis complete - No issues found' : 'FSM analysis complete - Issues detected',
      color: analysisResult.value.isValid ? 'success' : 'warning',
      icon: analysisResult.value.isValid ? 'mdi-check-circle' : 'mdi-alert-circle',
      timeout: 3000
    })
  } catch (error) {
    console.error('Analysis failed:', error)
    notificationStore.showNotification({
      message: 'FSM analysis failed',
      color: 'error',
      icon: 'mdi-alert',
      timeout: 3000
    })
  } finally {
    analyzing.value = false
  }
}

function performAnalysis(fsm: FiniteStateMachine): FSMAnalysisResult {
  const nodes = fsm.nodes || []
  const edges = fsm.edges || []

  const errors: string[] = []
  const warnings: string[] = []

  // Basic metrics
  const totalStates = nodes.length
  const totalTransitions = edges.length
  const initialStates = nodes.filter(n => n.data?.isInitial).length
  const finalStates = nodes.filter(n => n.data?.isFinal).length

  // Check for initial state
  const hasInitialState = initialStates > 0
  if (!hasInitialState) {
    errors.push('No initial state defined')
  } else if (initialStates > 1) {
    errors.push(`Multiple initial states found (${initialStates}). FSM should have exactly one initial state.`)
  }

  // Check for final state
  const hasFinalState = finalStates > 0
  if (!hasFinalState) {
    warnings.push('No final state defined.')
  }

  // Check for empty FSM
  if (totalStates === 0) {
    errors.push('FSM is empty - no states defined')
  }

  // Find reachable states from initial
  const reachableStates = hasInitialState ? findReachableStates(nodes, edges) : new Set<string>()
  const allStatesReachable = reachableStates.size === totalStates
  const unreachableStates = nodes
    .filter(n => !reachableStates.has(n.id))
    .map(n => n.data?.label || n.id)

  if (!allStatesReachable && unreachableStates.length > 0) {
    warnings.push(`${unreachableStates.length} unreachable states found`)
  }

  // Check for dead states (states with no outgoing transitions, except final states)
  const deadStates = nodes
    .filter(n => {
      const hasOutgoing = edges.some(e => e.source === n.id)
      const isFinal = n.data?.isFinal
      return !hasOutgoing && !isFinal
    })
    .map(n => n.data?.label || n.id)

  if (deadStates.length > 0) {
    warnings.push(`${deadStates.length} dead states found (no outgoing transition)`)
  }

  // Check determinism (no multiple transitions with same event from same state)
  const isDeterministic = checkDeterminism(edges)
  if (!isDeterministic) {
    warnings.push('FSM is non-deterministic. Some states have multiple transitions for the same event and condition.')
  }

  // Check for strongly connected
  const isStronglyConnected = checkStronglyConnected(nodes, edges)

  // Detect cycles
  const hasCycles = detectCycles(nodes, edges)

  // Find self-loops
  const selfLoops = edges
    .filter(e => e.source === e.target)
    .map(e => {
      const node = nodes.find(n => n.id === e.source)
      return node?.data?.label || e.source
    })

  // Calculate max depth
  const maxDepth = hasInitialState ? calculateMaxDepth(nodes, edges) : 0

  const isValid = errors.length === 0

  return {
    isValid,
    metrics: {
      totalStates,
      totalTransitions,
      initialStates,
      finalStates
    },
    properties: {
      hasInitialState,
      hasFinalState,
      allStatesReachable,
      isDeterministic,
      isStronglyConnected,
      hasCycles,
      maxDepth,
      selfLoops
    },
    issues: {
      errors,
      warnings,
      unreachableStates,
      deadStates
    }
  }
}

// Helper: Find all states reachable from initial state
function findReachableStates(nodes: FSMNode[], edges: FSMEdge[]): Set<string> {
  const initialNode = nodes.find(n => n.data?.isInitial)
  if (!initialNode) return new Set()

  const reachable = new Set<string>()
  const queue = [initialNode.id]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue

    reachable.add(current)

    // Add all targets of outgoing edges
    edges
      .filter(e => e.source === current)
      .forEach(e => {
        if (!reachable.has(e.target)) {
          queue.push(e.target)
        }
      })
  }

  return reachable
}

// Helper: Check if FSM is deterministic
function checkDeterminism(edges: FSMEdge[]): boolean {
  // Group edges by source state
  const edgesBySource = new Map<string, FSMEdge[]>()

  edges.forEach(edge => {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, [])
    }
    edgesBySource.get(edge.source)!.push(edge)
  })

  // Check for conflicting transitions
  for (const [, sourceEdges] of edgesBySource) {
    // Group by event to check for conflicts
    const eventGroups = new Map<string, FSMEdge[]>()

    for (const edge of sourceEdges) {
      const event = edge.data?.event || ''
      if (!eventGroups.has(event)) {
        eventGroups.set(event, [])
      }
      eventGroups.get(event)!.push(edge)
    }

    // For each event, check if there are conflicting transitions
    for (const [event, edgesWithSameEvent] of eventGroups) {
      if (edgesWithSameEvent.length <= 1) continue // No conflict if only one transition

      // Check for identical conditions
      for (let i = 0; i < edgesWithSameEvent.length; i++) {
        for (let j = i + 1; j < edgesWithSameEvent.length; j++) {
          const edge1 = edgesWithSameEvent[i]
          const edge2 = edgesWithSameEvent[j]

          // Compare conditions
          const condition1 = getConditionSignature(edge1)
          const condition2 = getConditionSignature(edge2)

          // If both have the same condition (or both have no condition), it's non-deterministic
          if (condition1 === condition2) {
            console.log('Non-deterministic transitions found:', {
              event,
              edge1: { source: edge1.source, target: edge1.target, condition: condition1 },
              edge2: { source: edge2.source, target: edge2.target, condition: condition2 }
            })
            return false
          }
        }
      }
    }
  }

  return true
}

// Helper: Get a unique signature for an edge's condition
function getConditionSignature(edge: FSMEdge): string {
  // If using protocol conditions
  if (edge.data?.use_protocol_conditions && edge.data?.protocol_conditions) {
    // Sort and stringify protocol conditions for comparison
    const conditions = edge.data.protocol_conditions
      .map(pc => `${pc.field_id}:${pc.operator}:${pc.value}:${pc.field_option_name || ''}`)
      .sort()
      .join('|')
    return `protocol:${conditions}`
  }

  // If using manual condition
  if (edge.data?.condition) {
    return `manual:${edge.data.condition.trim()}`
  }

  // No condition
  return 'none'
}

// Helper: Check if graph is strongly connected
function checkStronglyConnected(nodes: FSMNode[], edges: FSMEdge[]): boolean {
  if (nodes.length === 0) return true
  if (nodes.length === 1) return true

  // For each node, check if all other nodes are reachable
  for (const node of nodes) {
    const reachable = findReachableFrom(node.id, nodes, edges)
    if (reachable.size !== nodes.length) {
      return false
    }
  }

  return true
}

// Helper: Find reachable states from a specific node
function findReachableFrom(startId: string, nodes: FSMNode[], edges: FSMEdge[]): Set<string> {
  const reachable = new Set<string>()
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue

    reachable.add(current)

    edges
      .filter(e => e.source === current)
      .forEach(e => {
        if (!reachable.has(e.target)) {
          queue.push(e.target)
        }
      })
  }

  return reachable
}

// Helper: Detect cycles using DFS
function detectCycles(nodes: FSMNode[], edges: FSMEdge[]): boolean {
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function hasCycleDFS(nodeId: string): boolean {
    visited.add(nodeId)
    recStack.add(nodeId)

    const outgoing = edges.filter(e => e.source === nodeId)
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        if (hasCycleDFS(edge.target)) return true
      } else if (recStack.has(edge.target)) {
        return true
      }
    }

    recStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycleDFS(node.id)) return true
    }
  }

  return false
}

// Helper: Calculate maximum depth (longest path)
function calculateMaxDepth(nodes: FSMNode[], edges: FSMEdge[]): number {
  const initialNode = nodes.find(n => n.data?.isInitial)
  if (!initialNode) return 0

  const depths = new Map<string, number>()
  const visiting = new Set<string>() // Track nodes in current path to detect cycles
  depths.set(initialNode.id, 0)

  function dfs(nodeId: string, depth: number): number {
    // Prevent infinite recursion on cycles
    if (visiting.has(nodeId)) {
      return depth
    }

    visiting.add(nodeId)
    let maxDepth = depth

    const outgoing = edges.filter(e => e.source === nodeId)
    for (const edge of outgoing) {
      const targetDepth = depths.get(edge.target) || 0
      if (depth + 1 > targetDepth) {
        depths.set(edge.target, depth + 1)
        maxDepth = Math.max(maxDepth, dfs(edge.target, depth + 1))
      }
    }

    visiting.delete(nodeId)
    return maxDepth
  }

  return dfs(initialNode.id, 0)
}
</script>

<style scoped>
.text-wrap {
  white-space: normal !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
}

:deep(.v-list-item-title) {
  white-space: normal !important;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
  min-height: auto !important;
}

:deep(.v-list-item-subtitle) {
  white-space: normal !important;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.3;
  opacity: 0.8;
  min-height: auto !important;
}

:deep(.v-list-item__content) {
  overflow: visible !important;
}

:deep(.v-expansion-panel-title) {
  min-height: 48px !important;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 12px 16px !important;
}

:deep(.v-alert__content) {
  white-space: normal !important;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

:deep(.v-list-item) {
  min-height: auto !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}
</style>
