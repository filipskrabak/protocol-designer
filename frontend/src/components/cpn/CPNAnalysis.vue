<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <v-icon class="me-2">mdi-chart-timeline-variant</v-icon>
      <span>Property Verification</span>
      <v-spacer />

      <!-- Metrics chips -->
      <template v-if="currentCPN && hasAnalysis">
        <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-circle-double">
          {{ currentCPN.places.length }} Places
        </v-chip>
        <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-square-outline">
          {{ currentCPN.transitions.length }} Transitions
        </v-chip>
        <v-chip size="small" variant="tonal" color="info" prepend-icon="mdi-graph">
          {{ results!.stateCount }} Markings
        </v-chip>

        <!-- Quick status -->
        <v-chip
          v-if="hasIssues"
          size="small"
          variant="flat"
          color="warning"
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

      <!-- Refresh button -->
      <v-btn
        v-if="currentCPN"
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="cpnStore.isAnalysisRunning"
        @click="runAnalysis"
      >
        <v-icon>mdi-refresh</v-icon>
        <v-tooltip activator="parent" location="bottom">Run Verification</v-tooltip>
      </v-btn>


    </v-card-title>

    <!-- Truncation warning -->
    <v-alert
      v-if="results?.truncated || results?.bindingLimitHit"
      type="warning"
      variant="tonal"
      density="compact"
      class="ma-4"
    >
      Exploration stopped at {{ results!.stateCount }} markings due to exploration limit.
    </v-alert>

    <!-- Integer range cap warning -->
    <v-alert
      v-if="results?.intRangeCapped"
      type="warning"
      variant="tonal"
      density="compact"
      class="ma-4"
    >
      One or more integer color sets exceeded the limit (256 values) and were silently truncated. Reachability results may be incomplete.
    </v-alert>

    <v-divider />

    <!-- No CPN selected -->
    <v-card-text v-if="!currentCPN">
      <v-alert type="info" variant="tonal">No CPN selected.</v-alert>
    </v-card-text>

    <!-- Empty graph -->
    <v-card-text v-else-if="currentCPN.places.length === 0">
      <v-alert type="info" variant="tonal" density="compact">
        Add places and transitions to the canvas to run verification.
      </v-alert>
    </v-card-text>

    <!-- Running -->
    <v-card-text v-else-if="cpnStore.isAnalysisRunning">
      <v-alert type="info" variant="tonal">
        <div class="d-flex align-center">
          <v-progress-circular indeterminate size="20" width="2" class="me-3" />
          <span>Running verification…</span>
        </div>
      </v-alert>
    </v-card-text>

    <!-- Not yet run -->
    <v-card-text v-else-if="!hasAnalysis">
      <v-alert type="info" variant="tonal">
        Click <v-icon size="small">mdi-refresh</v-icon> to run property verification.
      </v-alert>
    </v-card-text>

    <!-- Results -->
    <v-card-text v-else class="pa-0">
      <v-expansion-panels variant="accordion">

        <!-- Marking Properties -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon class="me-2">mdi-network</v-icon>
              <span class="font-weight-medium">Marking Properties</span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" lines="two">

              <!-- Reachability -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon
                    :color="targetConditions.length === 0
                      ? 'grey'
                      : (results!.reachability?.passed ? 'success' : 'error')"
                  >
                    {{
                      targetConditions.length === 0
                        ? 'mdi-map-marker-question'
                        : (results!.reachability?.passed ? 'mdi-check' : 'mdi-close-circle')
                    }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Reachability</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  {{ results!.reachability?.message }}
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Target marking condition editor -->
              <v-list-item class="pt-1 pb-2">
                <div class="w-100">
                  <div class="text-caption text-medium-emphasis mb-2">
                    Conditions
                    <span class="text-grey">(All must hold at the same time. Run verification to apply)</span>
                  </div>

                  <div
                    v-for="(cond, idx) in targetConditions"
                    :key="idx"
                    class="d-flex align-center ga-2 mb-2"
                  >
                    <v-select
                      v-model="cond.placeId"
                      :items="placeItems"
                      item-title="name"
                      item-value="id"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="min-width: 140px; max-width: 190px"
                    />
                    <span class="text-body-2 flex-shrink-0">&ge;</span>
                    <v-text-field
                      v-model.number="cond.minTokens"
                      type="number"
                      density="compact"
                      variant="outlined"
                      hide-details
                      :min="1"
                      style="max-width: 68px"
                    />
                    <span class="text-caption text-medium-emphasis flex-shrink-0">tokens</span>
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click="removeCondition(idx)"
                    />
                  </div>

                  <v-btn
                    size="x-small"
                    variant="tonal"
                    prepend-icon="mdi-plus"
                    :disabled="!currentCPN!.places.length"
                    @click="addCondition"
                  >
                    Add condition
                  </v-btn>
                </div>
              </v-list-item>

              <!-- Boundedness -->
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="results!.boundedness?.passed ? 'success' : 'warning'">
                    {{ results!.boundedness?.passed ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">Boundedness</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  Checks whether token counts in all places remain bounded.
                  <span v-if="results!.boundedness?.message"> {{ results!.boundedness.message }}</span>
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
                :color="(results!.deadlockFreedom?.witness as any[])?.length ? 'warning' : 'success'"
                class="me-2"
              >
                {{ (results!.deadlockFreedom?.witness as any[])?.length ? 'mdi-lock' : 'mdi-lock-open' }}
              </v-icon>
              <span class="font-weight-medium">Dead Markings / Deadlocks</span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" lines="two">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="success">mdi-check</v-icon>
                </template>
                <v-list-item-title class="text-wrap">
                  {{ (results!.deadlockFreedom?.witness as any[])?.length ? 'Terminal states found' : 'No dead markings' }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  State space exploration via bounded BFS.
                  <span v-if="results!.deadlockFreedom?.message"> {{ results!.deadlockFreedom.message }}</span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <!-- Dead marking list -->
            <div v-if="(results!.deadlockFreedom?.witness as any[] | undefined)?.length" class="mt-4">
              <v-divider class="mb-3" />
              <div class="text-subtitle-2 mb-2">
                Dead markings ({{ (results!.deadlockFreedom!.witness as any[]).length }}):
              </div>
              <v-list density="compact">
                <v-list-item
                  v-for="(step, i) in (results!.deadlockFreedom!.witness as any[])"
                  :key="i"
                >
                  <v-list-item-title class="text-caption font-weight-medium">Terminal marking {{ i + 1 }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    <span
                      v-for="([place, tokens], j) in Object.entries(step)"
                      :key="j"
                    >{{ place }}: {{ tokens }}<span v-if="j < Object.entries(step as Record<string,string>).length - 1">, </span></span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Liveness -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon
                :color="livenessAggregate?.passed ? 'success' : 'warning'"
                class="me-2"
              >
                {{ livenessAggregate?.passed ? 'mdi-check-circle' : 'mdi-alert' }}
              </v-icon>
              <span class="font-weight-medium">
                Liveness (L1)
                <v-chip
                  v-if="livenessAggregate && !livenessAggregate.passed"
                  size="x-small"
                  variant="flat"
                  color="warning"
                  class="ml-2"
                >
                  dead transitions
                </v-chip>
              </span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" lines="two">
              <v-list-item
                v-for="tr in currentCPN!.transitions"
                :key="tr.id"
              >
                <template v-slot:prepend>
                  <v-icon :color="results!.liveness?.[tr.id]?.passed ? 'success' : 'warning'">
                    {{ results!.liveness?.[tr.id]?.passed ? 'mdi-check' : 'mdi-alert' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-wrap">{{ tr.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  {{ results!.liveness?.[tr.id]?.passed
                    ? 'Live'
                    : (results!.liveness?.[tr.id]?.message ?? 'Dead - never fired in explored state space') }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- CPNpy -->
        <CPNpyAnalysisPanel
          v-if="currentCPN"
          ref="cpnpyPanel"
          :cpn="currentCPN"
          :target-conditions="targetConditions"
        />

        <!-- S-Invariants -->
        <v-expansion-panel v-if="hasAnalysis">
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon color="blue" class="me-2">mdi-function-variant</v-icon>
              <span class="font-weight-medium">
                S-Invariants
                <v-chip v-if="cpnStore.isInvariantsRunning" size="x-small" variant="flat" color="grey" class="ml-2">
                  computing...
                </v-chip>
                <v-chip v-else-if="invariants.length > 0" size="x-small" variant="flat" color="blue" class="ml-2">
                  {{ invariants.length }}
                </v-chip>
                <v-chip v-else size="x-small" variant="flat" color="grey" class="ml-2">
                  none
                </v-chip>
              </span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- Loading -->
            <v-alert v-if="cpnStore.isInvariantsRunning" type="info" variant="tonal" density="compact">
              <div class="d-flex align-center">
                <v-progress-circular indeterminate size="18" width="2" class="me-3" />
                <span>Computing S-invariants</span>
              </div>
            </v-alert>

            <!-- None found -->
            <v-alert v-else-if="invariants.length === 0" type="info" variant="tonal" density="compact">
              No S-invariants found
            </v-alert>

            <!-- Results -->
            <template v-else>
              <v-list density="compact">
                <v-list-item v-for="(inv, i) in invariants" :key="i">
                  <template v-slot:prepend>
                    <v-icon color="blue">mdi-equal</v-icon>
                  </template>
                  <v-list-item-title class="text-wrap text-body-2" style="font-family: 'Courier New', monospace">
                    {{ inv.label }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </template>
          </v-expansion-panel-text>
        </v-expansion-panel>

      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { useCPNStore } from '@/store/CPNStore'
import { useNotificationStore } from '@/store/NotificationStore'
import StateSpaceWorker from '@/workers/stateSpace.worker?worker'
import CPNpyAnalysisPanel from './CPNpyAnalysisPanel.vue'
import type {
  TargetMarkingCondition,
  ColoredPetriNet,
  CPNPropertyResult,
  CPNVerificationResults,
} from '@/contracts/models'
import type { WorkerRequest, WorkerResponse } from '@/workers/stateSpace.worker'

const cpnStore = useCPNStore()
const notificationStore = useNotificationStore()

const currentCPN = computed(() => cpnStore.getCurrentCPN())
const results = computed(() => cpnStore.analysisResults)
const invariants = computed(() => cpnStore.invariants)

// ---- Target marking reachability query ----
const targetConditions = ref<TargetMarkingCondition[]>([])
const cpnpyPanel = ref<InstanceType<typeof CPNpyAnalysisPanel> | null>(null)

// Reset all analysis state when the active CPN changes
watch(() => cpnStore.currentCPNId, () => {
  targetConditions.value = []
  cpnStore.clearResults()
  cpnpyPanel.value?.reset()
})

const placeItems = computed(() =>
  currentCPN.value?.places.map((p) => ({ id: p.id, name: p.name })) ?? [],
)

function addCondition() {
  const firstPlace = currentCPN.value?.places[0]
  if (!firstPlace) return
  targetConditions.value.push({ placeId: firstPlace.id, minTokens: 1 })
}

function removeCondition(idx: number) {
  targetConditions.value.splice(idx, 1)
}

const hasAnalysis = computed(() => results.value !== null)

// Aggregate liveness as a single pass/fail: pass if all transitions are live
const livenessAggregate = computed((): CPNPropertyResult | undefined => {
  if (!results.value?.liveness) return undefined
  const entries = Object.values(results.value.liveness)
  if (entries.length === 0) return { passed: true, message: 'No transitions to check' }
  const deadCount = entries.filter(r => !r.passed).length
  if (deadCount === 0) {
    return { passed: true, message: `All ${entries.length} transition${entries.length > 1 ? 's are' : ' is'} live` }
  }
  const deadNames = Object.entries(results.value.liveness)
    .filter(([, r]) => !r.passed)
    .map(([tid]) => currentCPN.value?.transitions.find(t => t.id === tid)?.name ?? tid)
  return {
    passed: false,
    message: `${deadCount} dead transition${deadCount > 1 ? 's' : ''}: ${deadNames.join(', ')}`,
  }
})

const propertyRows = computed(() => {
  if (!results.value) return []
  return [
    { key: 'reachability',    label: 'Reachability',     result: results.value.reachability },
    { key: 'deadlockFreedom', label: 'Dead Markings', result: results.value.deadlockFreedom },
    { key: 'liveness',        label: 'Liveness',         result: livenessAggregate.value },
    { key: 'boundedness',     label: 'Boundedness',      result: results.value.boundedness },
  ]
})

const hasIssues = computed(() => {
  if (!results.value) return false
  return propertyRows.value.some(p => p.result?.passed === false)
})

function runInWorker(
  cpn: ColoredPetriNet,
  targetConditions: TargetMarkingCondition[],
  maxMarkings?: number,
): Promise<CPNVerificationResults> {
  return new Promise((resolve, reject) => {
    const worker = new StateSpaceWorker()
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      worker.terminate()
      if (e.data.type === 'result') resolve(e.data.data)
      else reject(new Error(e.data.message))
    }
    worker.onerror = (e: ErrorEvent) => {
      worker.terminate()
      reject(new Error(e.message))
    }
    // Strip Vue reactive proxies — structured clone cannot clone Proxy objects
    const req: WorkerRequest = {
      cpn: JSON.parse(JSON.stringify(cpn)),
      targetConditions: JSON.parse(JSON.stringify(targetConditions)),
      maxMarkings,
    }
    worker.postMessage(req)
  })
}

async function runAnalysis() {
  const cpn = currentCPN.value
  if (!cpn) return
  cpnStore.isAnalysisRunning = true
  cpnStore.isInvariantsRunning = true
  cpnStore.clearResults()

  try {
    const verification = await runInWorker(cpn, targetConditions.value)

    cpnStore.setAnalysisResults(verification)

    if (verification.truncated || verification.bindingLimitHit) {
      notificationStore.showNotification({
        message: `Exploration stopped at ${verification.stateCount} markings. Results may be incomplete.`,
        timeout: 6000,
        color: 'warning',
        icon: 'mdi-alert',
      })
    }

    if (verification.intRangeCapped) {
      notificationStore.showNotification({
        message: 'Integer color set(s) were truncated during enumeration. Results may be incomplete.',
        timeout: 6000,
        color: 'warning',
        icon: 'mdi-alert',
      })
    }

    cpnStore.isAnalysisRunning = false
    try {
      const response = await axios.post('/api/cpn/analyze', { cpn })
      const backendInvariants = response.data?.invariants ?? []
      cpnStore.setInvariants(backendInvariants)
    } catch {
      cpnStore.setInvariants([])
    } finally {
      cpnStore.isInvariantsRunning = false
    }
  } catch (e) {
    notificationStore.showNotification({
      message: `CPN analysis error: ${e}`,
      timeout: 5000,
      color: 'error',
      icon: 'mdi-alert-circle',
    })
    cpnStore.isAnalysisRunning = false
    cpnStore.isInvariantsRunning = false
  }
}


</script>
