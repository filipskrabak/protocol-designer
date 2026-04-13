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
                  State space exploration using BFS
                </v-list-item-subtitle>
                <template v-if="deadlocks.explorationStats">
                  <v-list-item-subtitle class="text-wrap">
                    <div class="mt-2 text-caption">
                      Explored nodes: {{ deadlocks.explorationStats.exploredNodes }}
                    </div>
                  </v-list-item-subtitle>
                  <v-list-item-subtitle class="text-wrap">
                    <div class="mt-2 text-caption">
                      Unique configurations: {{ deadlocks.explorationStats.uniqueConfigurations }}
                    </div>
                  </v-list-item-subtitle>
                  <v-list-item-subtitle class="text-wrap">
                    <div class="mt-2 text-caption">
                      Time elapsed: {{ deadlocks.explorationStats.timeElapsedMs }} ms
                    </div>
                  </v-list-item-subtitle>
                </template>
              </v-list-item>
            </v-list>

            <!-- Deadlock Details -->
            <div v-if="deadlocks.hasDeadlocks && deadlocks.progressDeadlocks.length > 0" class="mt-4">
              <v-divider class="mb-3"></v-divider>
              <div class="text-subtitle-2 mb-2">Deadlocks ({{ deadlocks.progressDeadlocks.length }}):</div>
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

                </div>
                <div class="text-caption mt-1">
                  <strong>Reason:</strong> {{ d.reason }}
                </div>
              </v-alert>
            </div>

            <!-- Conditional Deadlocks (Environment-Dependent) -->
            <div v-if="deadlocks.conditionalDeadlocks && deadlocks.conditionalDeadlocks.length > 0" class="mt-4">
              <v-divider class="mb-3"></v-divider>
              <div class="text-subtitle-2 mb-2">Conditional Deadlocks ({{ deadlocks.conditionalDeadlocks.length }}):</div>
              <v-alert
                v-for="d in deadlocks.conditionalDeadlocks"
                :key="`conditional-${d.stateId}`"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-2"
              >
                <div class="text-body-2">
                  <strong>State:</strong> {{ d.label }}
                </div>
                <div class="text-caption mt-1">
                  <strong>Reason:</strong> {{ d.reason }}
                </div>
                <div class="text-caption mt-1">
                  Progress depends ONLY on input event with no fallback: <strong>{{ d.requiredInputs.join(', ') }}</strong>
                </div>
              </v-alert>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

      </v-expansion-panels>
    </v-card-text>

  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProtocolStore } from '@/store/ProtocolStore'
import { useFSMAnalysis } from '@/composables/useFSMAnalysis'
import { detectDeadlocks } from '@/utils/fsm/deadlock'
import type { FSMAnalysisNode, FSMAnalysisEdge } from '@/contracts/models'

const protocolStore = useProtocolStore()

const currentFSM = computed(() => protocolStore.getCurrentFSM())
const hasAnalysis = ref(false)
const hasChanges = ref(false)
const isAnalyzing = ref(false)
const lastAnalyzedVersion = ref<string | null>(null)
// Convert FSM data types to analysis types
const nodes = computed<FSMAnalysisNode[]>(() => {
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

const edges = computed<FSMAnalysisEdge[]>(() => {
  if (!currentFSM.value?.edges) return []

  return currentFSM.value.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: {
      event: edge.data?.event,
      condition: edge.data?.condition || undefined,
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

  const variables = currentFSM.value?.variables || []
  const events = currentFSM.value?.events || []
  if (variables.length > 0) {
    // Run BFS-based deadlock detection with guard evaluation
    try {
      const result = await detectDeadlocks(nodes.value, edges.value, variables, events, true)
      deadlockAnalysis.value = result
    } catch (error) {
      console.error('Error during EFSM verification:', error);
    }
  } else {
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
  if (guard.type === 'manual' && guard.text) {
    return guard.text
  }
  if (guard.type === 'manual' && guard.manualExpression) {
    return guard.manualExpression
  }
  if (typeof guard === 'string') {
    return guard
  }
  return JSON.stringify(guard)
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
