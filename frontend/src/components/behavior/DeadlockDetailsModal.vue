<template>
  <v-dialog
    v-model="localModelValue"
    max-width="900px"
    scrollable
    @update:model-value="updateModelValue"
  >
    <v-card v-if="deadlockDetails">
      <v-card-title class="d-flex align-center bg-error">
        <v-icon class="me-2" color="white">mdi-lock-alert</v-icon>
        <span class="text-white">Deadlock Details</span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          size="small"
          @click="closeModal"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <!-- Deadlock Type and Description -->
        <v-alert
          :type="getDeadlockAlertType(deadlockDetails.type)"
          variant="tonal"
          class="mb-4"
        >
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ getDeadlockTitle(deadlockDetails.type) }}
          </div>
          <div>{{ deadlockDetails.description }}</div>
        </v-alert>

        <!-- Execution Trace -->
        <div class="mb-4">
          <div class="text-h6 mb-3 d-flex align-center">
            <v-icon class="me-2">mdi-routes</v-icon>
            Shortest Execution Trace
          </div>

          <v-timeline side="end" density="compact" class="trace-timeline">
            <v-timeline-item
              v-for="(step, index) in deadlockDetails.shortestTrace"
              :key="index"
              :dot-color="getStepColor(step, index)"
              size="small"
            >
              <template v-slot:icon>
                <v-icon size="small">
                  {{ getStepIcon(step, index) }}
                </v-icon>
              </template>

              <v-card variant="outlined" class="step-card">
                <v-card-text class="pa-3">
                  <!-- State Info -->
                  <div class="d-flex align-center mb-2">
                    <v-chip
                      size="small"
                      color="primary"
                      variant="flat"
                      class="me-2"
                    >
                      {{ step.stateLabel }}
                    </v-chip>
                    <span class="text-caption text-medium-emphasis">
                      State ID: {{ step.stateId }}
                    </span>
                  </div>

                  <!-- Transition Info -->
                  <div v-if="step.transition" class="mb-2">
                    <div class="text-caption text-medium-emphasis mb-1">Transition:</div>
                    <div class="transition-info">
                      <div v-if="step.transition.event" class="d-flex align-center mb-1">
                        <v-icon size="small" class="me-1">mdi-lightning-bolt</v-icon>
                        <span class="text-body-2">Event: <code>{{ step.transition.event }}</code></span>
                      </div>
                      <div v-if="step.guardExpression" class="d-flex align-center mb-1">
                        <v-icon size="small" class="me-1">mdi-shield-check</v-icon>
                        <span class="text-body-2">Guard: <code>{{ step.guardExpression }}</code></span>
                        <v-chip
                          :color="step.guardResult === true ? 'success' : step.guardResult === false ? 'error' : 'warning'"
                          size="x-small"
                          variant="flat"
                          class="ml-2"
                        >
                          {{ step.guardResult === true ? 'Pass' : step.guardResult === false ? 'Fail' : 'Unknown' }}
                        </v-chip>
                      </div>
                      <div v-if="step.transition.action" class="d-flex align-center">
                        <v-icon size="small" class="me-1">mdi-play</v-icon>
                        <span class="text-body-2">Action: <code>{{ step.transition.action }}</code></span>
                      </div>
                    </div>
                  </div>

                  <!-- Variable Values -->
                  <div v-if="Object.keys(step.variableValues).length > 0">
                    <div class="text-caption text-medium-emphasis mb-1">Variables:</div>
                    <div class="variables-grid">
                      <v-chip
                        v-for="(value, varName) in step.variableValues"
                        :key="varName"
                        size="small"
                        variant="outlined"
                        class="ma-1"
                      >
                        <span class="font-weight-medium">{{ varName }}</span>
                        <span class="mx-1">=</span>
                        <span class="font-mono">{{ formatValue(value) }}</span>
                      </v-chip>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </div>

        <!-- Warnings -->
        <div v-if="deadlockDetails.warnings && deadlockDetails.warnings.length > 0" class="mb-4">
          <div class="text-h6 mb-3 d-flex align-center">
            <v-icon class="me-2">mdi-alert</v-icon>
            Related Warnings ({{ deadlockDetails.warnings.length }})
          </div>

          <v-expansion-panels variant="accordion">
            <v-expansion-panel
              v-for="(warning, index) in deadlockDetails.warnings"
              :key="index"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon
                    :color="getWarningSeverityColor(warning.severity)"
                    class="me-2"
                  >
                    {{ getWarningSeverityIcon(warning.severity) }}
                  </v-icon>
                  <span>{{ warning.message }}</span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="text-body-2 mb-2">
                  <strong>Type:</strong> {{ warning.type }}
                </div>
                <div v-if="warning.location.expression" class="text-body-2 mb-2">
                  <strong>Expression:</strong> <code>{{ warning.location.expression }}</code>
                </div>
                <div v-if="warning.location.variableName" class="text-body-2 mb-2">
                  <strong>Variable:</strong> {{ warning.location.variableName }}
                </div>
                <div v-if="warning.suggestion" class="text-body-2">
                  <strong>Suggestion:</strong> {{ warning.suggestion }}
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

        <!-- Affected States -->
        <div>
          <div class="text-h6 mb-3 d-flex align-center">
            <v-icon class="me-2">mdi-alert-circle</v-icon>
            Affected States
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="stateId in deadlockDetails.affectedStates"
              :key="stateId"
              color="error"
              variant="outlined"
            >
              {{ getStateLabel(stateId) }}
            </v-chip>
          </div>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeModal">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { DeadlockDetails, DeadlockType, GuardWarningSeverity, GuardEvaluationTrace } from '@/contracts/models'
import { useProtocolStore } from '@/store/ProtocolStore'

interface Props {
  modelValue: boolean
  deadlockDetails: DeadlockDetails | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const protocolStore = useProtocolStore()
const localModelValue = ref(props.modelValue)

const currentFSM = computed(() => protocolStore.getCurrentFSM())

watch(() => props.modelValue, (newValue) => {
  localModelValue.value = newValue
})

function updateModelValue(value: boolean) {
  emit('update:modelValue', value)
}

function closeModal() {
  localModelValue.value = false
  updateModelValue(false)
}

function getDeadlockTitle(type: DeadlockType): string {
  switch (type) {
    case 'progress':
      return 'Progress Deadlock'
    case 'circular':
      return 'Circular Wait'
    case 'starvation':
      return 'Event Starvation'
    case 'terminal':
      return 'Terminal Non-Final State'
    default:
      return 'Deadlock'
  }
}

function getDeadlockAlertType(type: DeadlockType): string {
  switch (type) {
    case 'progress':
    case 'terminal':
      return 'error'
    case 'circular':
    case 'starvation':
      return 'warning'
    default:
      return 'info'
  }
}

function getStepColor(step: GuardEvaluationTrace, index: number): string {
  if (index === 0) return 'success' // Initial state
  if (step.guardResult === false) return 'error'
  if (step.guardResult === 'unknown') return 'warning'
  return 'primary'
}

function getStepIcon(step: GuardEvaluationTrace, index: number): string {
  if (index === 0) return 'mdi-play-circle'
  if (index === props.deadlockDetails!.shortestTrace.length - 1) return 'mdi-lock'
  return 'mdi-circle'
}

function getWarningSeverityColor(severity: GuardWarningSeverity): string {
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

function getWarningSeverityIcon(severity: GuardWarningSeverity): string {
  switch (severity) {
    case 'error':
      return 'mdi-alert-circle'
    case 'warning':
      return 'mdi-alert'
    case 'info':
      return 'mdi-information'
    default:
      return 'mdi-help-circle'
  }
}

function getStateLabel(stateId: string): string {
  const node = currentFSM.value?.nodes.find(n => n.id === stateId)
  return node?.data?.label || stateId
}

function formatValue(value: number | boolean | string): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  return String(value)
}
</script>

<style scoped>
.trace-timeline {
  max-height: 500px;
  overflow-y: auto;
}

.step-card {
  background: rgba(var(--v-theme-surface), 0.5);
}

.transition-info {
  background: rgba(var(--v-theme-primary), 0.05);
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding: 8px 12px;
  border-radius: 4px;
}

.variables-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.font-mono {
  font-family: 'Courier New', Courier, monospace;
  font-weight: 600;
}

code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.875em;
  font-family: 'Courier New', Courier, monospace;
}

:deep(.v-timeline-item__body) {
  padding-top: 0 !important;
}

:deep(.v-expansion-panel-title) {
  min-height: 48px;
}
</style>
