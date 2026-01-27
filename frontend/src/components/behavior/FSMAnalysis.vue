<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <v-icon class="me-2">mdi-chart-timeline-variant</v-icon>
      <span>Property Verification</span>
      <v-spacer></v-spacer>

      <!-- Metrics Chips -->
      <template v-if="currentFSM && hasAnalysis">
        <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-circle-outline">
          {{ metrics.totalStates }} States
        </v-chip>
        <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-arrow-right-circle">
          {{ metrics.totalTransitions }} Transitions
        </v-chip>
        <v-chip size="small" variant="tonal" color="success" prepend-icon="mdi-play-circle">
          {{ metrics.initialStates }} Initial
        </v-chip>
        <v-chip size="small" variant="tonal" color="info" prepend-icon="mdi-stop-circle">
          {{ metrics.finalStates }} Final
        </v-chip>

        <!-- Quick Status -->
        <v-chip
          v-if="!properties.allStatesReachable || !properties.isDeterministic || !properties.isComplete || !properties.hasInitialState || issues.deadStates.length > 0 || deadlocks.hasDeadlocks"
          size="small"
          variant="flat"
          :color="!properties.hasInitialState || deadlocks.hasDeadlocks ? 'error' : 'warning'"
          prepend-icon="mdi-alert"
        >
          Issues Found
        </v-chip>
        <v-chip
          v-else
          size="small"
          variant="flat"
          color="success"
          prepend-icon="mdi-check-circle"
        >
          All Checks Pass
        </v-chip>
      </template>

      <!-- Refresh Button -->
      <v-btn
        v-if="currentFSM"
        icon="mdi-refresh"
        size="small"
        variant="text"
        @click="runVerification"
        :loading="isAnalyzing"
      >
        <v-icon>mdi-refresh</v-icon>
        <v-tooltip activator="parent" location="bottom">Run Verification</v-tooltip>
      </v-btn>
    </v-card-title>

    <!-- Warning for changes -->
    <v-alert
      v-if="currentFSM && hasChanges && hasAnalysis"
      type="warning"
      variant="tonal"
      density="compact"
      class="ma-4"
    >
      <div class="d-flex align-center">
        <span>Changes are detected, please run the verification again.</span>
      </div>
    </v-alert>

    <v-divider></v-divider>

    <v-card-text v-if="!currentFSM">
      <v-alert type="info" variant="tonal">
        No FSM selected
      </v-alert>
    </v-card-text>

    <v-card-text v-else-if="isAnalyzing">
      <v-alert type="info" variant="tonal">
        <div class="d-flex align-center">
          <v-progress-circular indeterminate size="20" width="2" class="me-3"></v-progress-circular>
          <span>Running verification...</span>
        </div>
      </v-alert>
    </v-card-text>

    <v-card-text v-else-if="!hasAnalysis">
      <v-alert type="info" variant="tonal">
        Click the refresh button to run property verification
      </v-alert>
    </v-card-text>

    <v-card-text v-else-if="hasAnalysis" class="pa-0">
      <!-- Summary Section -->
      <v-expansion-panels variant="accordion">
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
                  <v-icon :color="properties.allStatesReachable ? 'success' : 'warning'">
                    {{ properties.allStatesReachable ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Reachability</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  Checks whether all states are reachable from the initial state.
                  <p v-if="!properties.allStatesReachable && issues.unreachableStates.length > 0">
                    Unreachable: {{ formatStateLabels(issues.unreachableStates) }}
                  </p>
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Determinism -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="properties.isDeterministic ? 'success' : 'warning'">
                    {{ properties.isDeterministic ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Determinism</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  Checks whether the guards on outgoing transitions from each state are mutually exclusive (using Z3 SMT solver).
                  <div v-if="!properties.isDeterministic && issues.determinismIssues.length > 0" class="mt-2">
                    <v-alert
                      v-for="(issue, idx) in issues.determinismIssues"
                      :key="`det-${idx}`"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mb-2"
                    >
                      <div class="text-body-2">
                        <strong>State:</strong> {{ getStateLabel(issue.state) }}<br>
                        <strong>Event:</strong> {{ issue.event }}<br>
                        <strong>Target states:</strong> {{ issue.targets.map(t => getStateLabel(t)).join(' and ') }}
                      </div>
                      <div v-if="issue.guard1 || issue.guard2" class="text-caption mt-2">
                        <div v-if="issue.guard1" class="mb-1">
                          <strong>Guard 1:</strong> <code class="font-mono">{{ formatGuard(issue.guard1) }}</code>
                        </div>
                        <div v-if="issue.guard2">
                          <strong>Guard 2:</strong> <code class="font-mono">{{ formatGuard(issue.guard2) }}</code>
                        </div>
                      </div>
                      <div v-if="issue.counterExample" class="text-caption mt-2 font-mono">
                        <strong>Counter-example:</strong> {{ issue.counterExample }}
                      </div>
                    </v-alert>
                  </div>
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Completeness -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="properties.isComplete ? 'success' : 'warning'">
                    {{ properties.isComplete ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Completeness</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  Checks whether guards cover all possible cases to prevent local deadlocks (using Z3 SMT solver).
                  <div v-if="!properties.isComplete && issues.completenessIssues.length > 0" class="mt-2">
                    <v-alert
                      v-for="(issue, idx) in issues.completenessIssues"
                      :key="`comp-${idx}`"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mb-2"
                    >
                      <div class="text-body-2">
                        <strong>State:</strong> {{ getStateLabel(issue.state) }}<br>
                        <strong>Event:</strong> {{ issue.event }}
                      </div>
                      <div class="text-caption mt-1">
                        <strong>Issue:</strong> Guards don't cover all possible variable values - potential deadlock
                      </div>
                      <div v-if="issue.gapModel" class="text-caption mt-1 font-mono">
                        <strong>Counter-example:</strong> {{ issue.gapModel }}
                      </div>
                    </v-alert>
                  </div>
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Dead States -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="issues.deadStates.length === 0 ? 'success' : 'warning'">
                    {{ issues.deadStates.length === 0 ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">No Dead States</v-list-item-title>
                <v-list-item-subtitle v-if="issues.deadStates.length > 0" class="text-wrap">
                  Dead states: {{ formatStateLabels(issues.deadStates) }}
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Has Initial State -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="properties.hasInitialState ? 'success' : 'error'">
                    {{ properties.hasInitialState ? 'mdi-check' : 'mdi-close' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Initial State</v-list-item-title>
              </v-list-item>

              <!-- Has Final State -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="properties.hasFinalState ? 'success' : 'warning'">
                    {{ properties.hasFinalState ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Final State</v-list-item-title>
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
                  <v-icon :color="properties.isStronglyConnected ? 'success' : 'info'">
                    {{ properties.isStronglyConnected ? 'mdi-check' : 'mdi-information' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Strongly Connected</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  {{ properties.isStronglyConnected ? 'All states can reach each other' : 'Not all states are mutually reachable' }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-chart-timeline</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Depth</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  Longest path is {{ properties.maxDepth }} transitions
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-sync</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Cycles</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  {{ properties.hasCycles ? 'Yes' : 'No' }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="properties.hasSelfLoops">
                <template v-slot:prepend>
                  <v-icon>mdi-reload</v-icon>
                </template>
                <v-list-item-title class="text-wrap">Self loops</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  Yes
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Deadlock Analysis -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon
                :color="deadlocks.hasDeadlocks ? 'error' : 'success'"
                class="me-2"
              >
                {{ deadlocks.hasDeadlocks ? 'mdi-lock-alert' : 'mdi-lock-open-check' }}
              </v-icon>
              <span class="font-weight-medium">
                Deadlock Analysis
              </span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- Variables required notice -->
            <v-alert
              v-if="!currentFSM?.variables || currentFSM.variables.length === 0"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-3"
            >
              Deadlock detection requires EFSM variables to be defined. Add variables to enable comprehensive deadlock analysis.
            </v-alert>

            <v-list v-else density="compact" lines="two">
              <!-- Deadlock Detection Result -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="deadlocks.hasDeadlocks ? 'error' : 'success'">
                    {{ deadlocks.hasDeadlocks ? 'mdi-close' : 'mdi-check' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">
                  {{ deadlocks.hasDeadlocks ? 'Deadlocks Detected' : 'Deadlock Free' }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  State space exploration using DFS
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <!-- Deadlock Details -->
            <div v-if="deadlocks.hasDeadlocks && deadlocks.progressDeadlocks.length > 0" class="mt-4">
              <v-divider class="mb-3"></v-divider>
              <div class="text-subtitle-2 mb-2">Detected Deadlocks ({{ deadlocks.progressDeadlocks.length }}):</div>
              <v-alert
                v-for="d in deadlocks.progressDeadlocks"
                :key="`deadlock-${d.stateId}`"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-2"
              >
                <div class="text-body-2">
                  <strong>State:</strong> {{ d.label }}
                  <v-btn
                    v-if="currentFSM?.variables && currentFSM.variables.length > 0"
                    icon
                    size="x-small"
                    variant="text"
                    color="primary"
                    @click="showDeadlockInfo(d.stateId, 'progress')"
                    class="ml-1"
                  >
                    <v-icon size="small">mdi-information</v-icon>
                    <v-tooltip activator="parent">Show detailed trace</v-tooltip>
                  </v-btn>
                </div>
                <div class="text-caption mt-1">
                  <strong>Reason:</strong> {{ d.reason }}
                </div>
              </v-alert>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- EFSM Warnings (if variables defined) -->
        <v-expansion-panel v-if="currentFSM?.variables && currentFSM.variables.length > 0">
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon
                :color="efsmWarnings.length === 0 ? 'success' : 'warning'"
                class="me-2"
              >
                {{ efsmWarnings.length === 0 ? 'mdi-check-circle' : 'mdi-alert' }}
              </v-icon>
              <span class="font-weight-medium">
                Variable/Guard Validation
                <v-chip
                  v-if="efsmWarnings.length > 0"
                  size="x-small"
                  variant="flat"
                  color="warning"
                  class="ml-2"
                >
                  {{ efsmWarnings.length }}
                </v-chip>
              </span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-if="efsmWarnings.length === 0">
              <v-alert type="success" variant="tonal" density="compact">
                No warnings found in guards and actions
              </v-alert>
            </div>
            <div v-else>
              <!-- Warning Summary -->
              <div v-if="efsmStats" class="mb-3">
                <v-chip size="small" variant="outlined" class="ma-1">
                  Errors: {{ efsmWarnings.filter(w => w.severity === 'error').length }}
                </v-chip>
                <v-chip size="small" variant="outlined" class="ma-1">
                  Warnings: {{ efsmWarnings.filter(w => w.severity === 'warning').length }}
                </v-chip>
                <v-chip size="small" variant="outlined" class="ma-1">
                  Info: {{ efsmWarnings.filter(w => w.severity === 'info').length }}
                </v-chip>
              </div>

              <!-- Warning List -->
              <v-list density="compact">
                <v-list-item
                  v-for="(warning, index) in efsmWarnings.slice(0, 10)"
                  :key="index"
                  class="warning-item"
                >
                  <template v-slot:prepend>
                    <v-icon
                      :color="getWarningSeverityColor(warning.severity)"
                      size="small"
                    >
                      {{ getWarningSeverityIcon(warning.severity) }}
                    </v-icon>
                  </template>

                  <v-list-item-title class="text-wrap text-body-2">
                    {{ warning.message }}
                  </v-list-item-title>

                  <v-list-item-subtitle v-if="warning.location.expression" class="text-wrap text-caption">
                    <code>{{ warning.location.expression }}</code>
                  </v-list-item-subtitle>

                  <v-list-item-subtitle v-if="warning.suggestion" class="text-wrap text-caption mt-1">
                    💡 {{ warning.suggestion }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <div v-if="efsmWarnings.length > 10" class="text-caption text-center mt-2 text-medium-emphasis">
                ... and {{ efsmWarnings.length - 10 }} more warnings
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <!-- Deadlock Details Modal -->
    <DeadlockDetailsModal
      v-model="showDeadlockModal"
      :deadlock-details="selectedDeadlockDetails"
    />
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProtocolStore } from '@/store/ProtocolStore'
import { useFSMAnalysis } from '@/composables/useFSMAnalysis'
import { analyzeEFSM } from '@/utils/efsm/variableAnalysis'
import { generateDeadlockDetails } from '@/utils/efsm/traceGenerator'
import { detectDeadlocks } from '@/utils/fsm/deadlock'
import type { FSMNode, FSMEdge } from '@/utils/fsm/types'
import type { DeadlockDetails, GuardWarning } from '@/contracts/models'
import DeadlockDetailsModal from './DeadlockDetailsModal.vue'

const protocolStore = useProtocolStore()

const currentFSM = computed(() => protocolStore.getCurrentFSM())
const hasAnalysis = ref(false)
const hasChanges = ref(false)
const isAnalyzing = ref(false)
const lastAnalyzedVersion = ref<string | null>(null)
const efsmWarnings = ref<GuardWarning[]>([])
const efsmStats = ref<any>(null)
const showDeadlockModal = ref(false)
const selectedDeadlockDetails = ref<DeadlockDetails | null>(null)

// Convert FSM data types to analysis types
const nodes = computed<FSMNode[]>(() => {
  if (!currentFSM.value?.nodes) return []

  return currentFSM.value.nodes.map(node => ({
    id: node.id,
    type: node.type,
    data: {
      label: node.data?.label,
      type: node.data?.isInitial ? 'initial' : node.data?.isFinal ? 'final' : 'normal'
    }
  }))
})

const edges = computed<FSMEdge[]>(() => {
  if (!currentFSM.value?.edges) return []

  return currentFSM.value.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: {
      event: edge.data?.event,
      condition: edge.data?.use_protocol_conditions
        ? { type: 'protocol', conditions: edge.data?.protocol_conditions }
        : edge.data?.condition
        ? { type: 'manual', text: edge.data?.condition }
        : undefined,
      action: edge.data?.action
    }
  }))
})

const variables = computed(() => currentFSM.value?.variables || [])

// Use the composable for analysis
const { metrics, properties, issues, deadlocks, deadlockAnalysis } = useFSMAnalysis(nodes, edges, variables)

// Manual verification function
async function runVerification() {
  isAnalyzing.value = true

  // Run EFSM analysis if variables are defined
  const variables = currentFSM.value?.variables || []
  const events = currentFSM.value?.events || []
  if (variables.length > 0) {
    console.log('🔬 Running EFSM verification with variables:', variables);
    const analysis = analyzeEFSM(nodes.value, edges.value, variables)
    efsmWarnings.value = analysis.warnings
    efsmStats.value = analysis.stats

    // Run DFS-based deadlock detection with guard evaluation
    try {
      const result = await detectDeadlocks(nodes.value, edges.value, variables, events, true)
      console.log('Deadlock analysis results:', result);
      // Update the composable's deadlock analysis to show results in UI
      deadlockAnalysis.value = result
    } catch (error) {
      console.error('Error during EFSM verification:', error);
    }
  } else {
    efsmWarnings.value = []
    efsmStats.value = null
    // Reset deadlock analysis when no variables
    deadlockAnalysis.value = {
      progressDeadlocks: [],
      circularWaits: [],
      eventStarvation: [],
      terminalNonFinalStates: [],
      hasDeadlocks: false,
    }
  }

  // Simulate brief analysis time for UX
  setTimeout(() => {
    hasAnalysis.value = true
    hasChanges.value = false
    lastAnalyzedVersion.value = JSON.stringify({ nodes: nodes.value, edges: edges.value, variables })
    isAnalyzing.value = false
  }, 100)
}

// Show deadlock details
async function showDeadlockInfo(stateId: string, deadlockType: 'progress' | 'terminal') {
  const variables = currentFSM.value?.variables || []
  if (variables.length === 0) {
    // No variables, can't generate detailed trace
    return
  }

  const details = generateDeadlockDetails(
    stateId,
    deadlockType,
    nodes.value,
    edges.value,
    variables,
    efsmWarnings.value
  )

  if (details) {
    selectedDeadlockDetails.value = details
    showDeadlockModal.value = true
  }
}

// Watch for changes to FSM structure
watch([nodes, edges], () => {
  if (hasAnalysis.value && lastAnalyzedVersion.value) {
    const currentVersion = JSON.stringify({ nodes: nodes.value, edges: edges.value })
    if (currentVersion !== lastAnalyzedVersion.value) {
      hasChanges.value = true
    }
  }
}, { deep: true })

// Reset when FSM changes
watch(currentFSM, () => {
  hasAnalysis.value = false
  hasChanges.value = false
  lastAnalyzedVersion.value = null
})

// Helper to format state labels
function formatStateLabels(states: { id: string; label: string }[]): string {
  return states.map(s => s.label).join(', ')
}

// Helper to get a single state label by ID
function getStateLabel(stateId: string): string {
  const node = nodes.value.find(n => n.id === stateId)
  return node?.data?.label || stateId
}

// Helper to format guard object for display
function formatGuard(guard: any): string {
  if (!guard) return '(none)'
  if (guard.type === 'manual' && guard.manualExpression) {
    return guard.manualExpression
  }
  if (guard.type === 'protocol' && guard.conditions) {
    return JSON.stringify(guard.conditions)
  }
  if (typeof guard === 'string') {
    return guard
  }
  return JSON.stringify(guard)
}

// Helper functions for warning severity
function getWarningSeverityColor(severity: string): string {
  switch (severity) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
    default:
      return 'grey'
  }
}

function getWarningSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return 'mdi-close-circle'
    case 'warning':
      return 'mdi-alert'
    case 'info':
      return 'mdi-information'
    default:
      return 'mdi-help-circle'
  }
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

.font-mono {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}
</style>
