<template>
  <v-expansion-panel>
    <v-expansion-panel-title>
      <div class="d-flex align-center gap-2 flex-grow-1">
        <v-icon color="deep-purple" class="me-2">mdi-server</v-icon>
        <span class="font-weight-medium">CPNpy Engine Verification</span>
        <v-chip v-if="cpnpyResult && cpnpyResult.error" size="x-small" color="error" variant="flat" class="ml-2">Error</v-chip>
        <v-chip v-else-if="cpnpyResult" size="x-small" color="deep-purple" variant="flat" class="ml-2">
          {{ cpnpyResult.rgNodes }} markings
        </v-chip>
        <v-spacer />
        <v-btn
          size="x-small"
          variant="tonal"
          color="deep-purple"
          :icon="cpnpyRunning ? undefined : 'mdi-refresh'"
          :loading="cpnpyRunning"
          class="me-2"
          @click.stop="runCpnpy()"
        >
          <v-icon v-if="!cpnpyRunning">mdi-refresh</v-icon>
          <v-tooltip activator="parent" location="bottom">Run cpnpy state-space analysis</v-tooltip>
        </v-btn>
      </div>
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <!-- Loading state -->
      <v-alert v-if="cpnpyRunning" type="info" variant="tonal" density="compact">
        <div class="d-flex align-center">
          <v-progress-circular indeterminate size="18" width="2" class="me-3" />
          <span>Running cpnpy state-space analysis…</span>
        </div>
      </v-alert>

      <!-- Not yet run -->
      <v-alert v-else-if="!cpnpyResult" type="info" variant="tonal" density="compact">
        <div class="text-body-2">
          <strong>cpnpy</strong> is a server-side state-space engine that exhaustively
          explores all reachable markings of your CPN. It computes reachability graphs,
          SCCs, dead markings, transition liveness (L4), place bounds, and home markings.
        </div>
        <div class="mt-2">
          <v-btn size="small" variant="tonal" color="deep-purple" prepend-icon="mdi-play" @click="runCpnpy()">
            Run analysis
          </v-btn>
        </div>
      </v-alert>

      <template v-else>
      <!-- Error state -->
      <v-alert v-if="cpnpyResult.error" type="error" variant="tonal" density="compact" class="mb-3">
        {{ cpnpyResult.error }}
      </v-alert>

      <template v-else>
        <!-- Core metrics -->
        <div class="text-subtitle-2 mb-2">Results</div>
        <v-list density="compact">
          <v-list-item>
            <template v-slot:prepend><v-icon color="deep-purple">mdi-graph</v-icon></template>
            <v-list-item-title>Reachable markings</v-list-item-title>
            <v-list-item-subtitle>{{ cpnpyResult.rgNodes }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template v-slot:prepend>
              <v-icon :color="cpnpyResult.deadTransitions.length ? 'warning' : 'success'">
                {{ cpnpyResult.deadTransitions.length ? 'mdi-alert' : 'mdi-check' }}
              </v-icon>
            </template>
            <v-list-item-title>Dead transitions</v-list-item-title>
            <v-list-item-subtitle>
              {{ cpnpyResult.deadTransitions.length
                ? cpnpyResult.deadTransitions.join(', ')
                : 'None, all transitions fire' }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template v-slot:prepend><v-icon color="deep-purple">mdi-lock</v-icon></template>
            <v-list-item-title>Dead markings (terminal states)</v-list-item-title>
            <v-list-item-subtitle>{{ cpnpyResult.deadMarkings.length }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <!-- Dead markings detail -->
        <div v-if="cpnpyResult.deadMarkings.length" class="mt-3">
          <v-divider class="mb-2" />
          <div class="text-subtitle-2 mb-2">Terminal markings ({{ cpnpyResult.deadMarkings.length }}):</div>
          <v-list density="compact">
            <v-list-item v-for="(dm, i) in cpnpyResult.deadMarkings" :key="i">
              <v-list-item-title class="text-caption font-weight-medium">Terminal marking {{ i + 1 }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                <span v-for="([place, tokens], j) in Object.entries(dm)" :key="j">
                  {{ place }}: {{ tokens }}<span v-if="j < Object.entries(dm).length - 1">, </span>
                </span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <!-- Place bounds -->
        <div class="mt-3">
          <v-divider class="mb-2" />
          <div class="text-subtitle-2 mb-2">Place bounds:</div>
          <v-list density="compact">
            <v-list-item v-for="(bound, place) in cpnpyResult.placeBounds" :key="place">
              <template v-slot:prepend><v-icon size="small" color="deep-purple">mdi-circle-outline</v-icon></template>
              <v-list-item-title class="text-caption">{{ place }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">min {{ bound.min }}, max {{ bound.max }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <!-- Target marking reachability (shown when queried) -->
        <div v-if="cpnpyResult.targetReachability?.queried" class="mt-3">
          <v-divider class="mb-2" />
          <div class="text-subtitle-2 mb-2">Target Marking Reachability</div>
          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon :color="cpnpyResult.targetReachability.reachable ? 'success' : 'error'">
                  {{ cpnpyResult.targetReachability.reachable ? 'mdi-check-circle' : 'mdi-close-circle' }}
                </v-icon>
              </template>
              <v-list-item-title class="text-wrap text-body-2" style="font-family: monospace">
                {{ cpnpyResult.targetReachability.description }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-wrap">
                {{ cpnpyResult.targetReachability.reachable
                  ? `Reachable - ${cpnpyResult.targetReachability.matchingMarkings} matching marking${cpnpyResult.targetReachability.matchingMarkings !== 1 ? 's' : ''} found in complete state space`
                  : 'Not reachable - exhaustive search of complete state space found no matching marking' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <!-- cpnpy-only extras -->
        <div class="mt-3">
          <v-divider class="mb-2" />
          <div class="text-subtitle-2 mb-1">Additional</div>
          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend><v-icon size="small" color="deep-purple">mdi-graph-outline</v-icon></template>
              <v-list-item-title class="text-caption">Reachability graph arcs</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ cpnpyResult.rgArcs }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend><v-icon size="small" color="deep-purple">mdi-graph</v-icon></template>
              <v-list-item-title class="text-caption">SCC nodes / arcs</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ cpnpyResult.sccNodes }} / {{ cpnpyResult.sccArcs }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon size="small" :color="cpnpyResult.homeMarkings ? 'success' : 'grey'">mdi-home</v-icon>
              </template>
              <v-list-item-title class="text-caption">Home markings</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ cpnpyResult.homeMarkings }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon size="small" :color="cpnpyResult.liveTransitions.length ? 'success' : 'grey'">mdi-check-circle</v-icon>
              </template>
              <v-list-item-title class="text-caption">Live transitions (L4)</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                <template v-if="cpnpyResult.liveTransitions.length">
                  {{ cpnpyResult.liveTransitions.join(', ') }}
                </template>
                <template v-else>
                  None (expected for terminating nets with dead markings)
                </template>
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon size="small" :color="cpnpyResult.impartialTransitions.length ? 'info' : 'grey'">mdi-infinity</v-icon>
              </template>
              <v-list-item-title class="text-caption">Impartial transitions</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                <template v-if="cpnpyResult.impartialTransitions.length">
                  {{ cpnpyResult.impartialTransitions.join(', ') }}
                </template>
                <template v-else>None</template>
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend><v-icon size="small" color="grey">mdi-timer</v-icon></template>
              <v-list-item-title class="text-caption">Computation time</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ cpnpyResult.computationTimeMs }} s</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </template>
      </template>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import type { ColoredPetriNet, TargetMarkingCondition } from '@/contracts/models'

import { exportToCPNTools } from '@/utils/cpn/cpntools'

const props = defineProps<{
  cpn: ColoredPetriNet
  targetConditions?: TargetMarkingCondition[]
}>()

interface TargetReachabilityResult {
  queried: boolean
  reachable: boolean
  matchingMarkings: number
  description: string
}

interface CpnpyResult {
  available: boolean
  rgNodes: number
  rgArcs: number
  sccNodes: number
  sccArcs: number
  deadMarkings: Record<string, string>[]
  deadTransitions: string[]
  liveTransitions: string[]
  impartialTransitions: string[]
  homeMarkings: number
  placeBounds: Record<string, { min: number; max: number }>
  computationTimeMs: number
  targetReachability?: TargetReachabilityResult
  error: string | null
}

const cpnpyRunning = ref(false)
const cpnpyResult  = ref<CpnpyResult | null>(null)

async function runCpnpy() {
  cpnpyRunning.value = true
  try {
    const xml = exportToCPNTools(props.cpn)
    const conditions = (props.targetConditions ?? []).map(c => {
      const place = props.cpn.places.find(p => p.id === c.placeId)
      return { placeName: place?.name ?? '', minTokens: c.minTokens }
    }).filter(c => c.placeName !== '')
    const response = await axios.post('/api/cpn/cpnpy-analyze', { xml, targetConditions: conditions })
    cpnpyResult.value = response.data
  } catch (e: any) {
    cpnpyResult.value = {
      available: false,
      rgNodes: 0, rgArcs: 0, sccNodes: 0, sccArcs: 0,
      deadMarkings: [], deadTransitions: [], liveTransitions: [],
      impartialTransitions: [], homeMarkings: 0, placeBounds: {},
      computationTimeMs: 0,
      error: e?.response?.data?.detail ?? e?.message ?? 'Unknown error',
    }
  } finally {
    cpnpyRunning.value = false
  }
}

function reset() {
  cpnpyResult.value = null
}

defineExpose({ runCpnpy, cpnpyRunning, reset })
</script>
