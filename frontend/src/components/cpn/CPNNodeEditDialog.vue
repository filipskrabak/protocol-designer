<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="480">
    <v-card v-if="node">
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2" :color="node.kind === 'place' ? 'blue' : 'green'">
          {{ node.kind === 'place' ? 'mdi-circle-outline' : 'mdi-rectangle-outline' }}
        </v-icon>
        Edit {{ node.kind === 'place' ? 'Place' : 'Transition' }}
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="form.label"
          label="Name"
          variant="outlined"
          density="compact"
          class="mb-3"
        />

        <!-- Place-specific fields -->
        <template v-if="node.kind === 'place'">
          <v-select
            v-model="form.colorSetId"
            :items="colorSetItems"
            label="Color Set"
            variant="outlined"
            density="compact"
            item-title="name"
            item-value="id"
            class="mb-3"
          />
          <v-text-field
            v-model="form.initialMarking"
            label="Initial Marking"
            variant="outlined"
            density="compact"
            hint='e.g. 0  or  1`Ready  or  2`ACK ++ 1`SYN'
            persistent-hint
            class="mb-3"
            style="font-family: monospace"
          />
        </template>

        <!-- Transition-specific fields -->
        <template v-else>
          <v-text-field
            v-model="form.guard"
            label="Guard Expression (optional)"
            variant="outlined"
            density="compact"
            hint='e.g. x > 0 && state = "Open"'
            persistent-hint
            class="mb-3"
            style="font-family: monospace"
          />
        </template>

        <v-textarea
          v-model="form.description"
          label="Description (optional)"
          variant="outlined"
          density="compact"
          rows="2"
          auto-grow
        />
      </v-card-text>

      <v-card-actions>
        <v-btn color="error" variant="text" @click="$emit('delete', nodeId)">Delete</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCPNStore } from '@/store/CPNStore'
import type { CPNPlaceNodeData, CPNTransitionNodeData } from '@/contracts/models'

type NodeData = CPNPlaceNodeData | CPNTransitionNodeData

const props = defineProps<{
  modelValue: boolean
  nodeId: string
  nodeData: NodeData | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [nodeId: string, data: NodeData]
  delete: [nodeId: string]
}>()

const node = computed(() => props.nodeData)
const cpnStore = useCPNStore()

const colorSetItems = computed(() => {
  const cpn = cpnStore.getCurrentCPN()
  return cpn?.colorSets ?? []
})

const form = ref({
  label: '',
  colorSetId: '',
  initialMarking: '',
  guard: '',
  description: '',
})

watch(
  () => props.nodeData,
  (data) => {
    if (!data) return
    form.value.label = data.label
    form.value.description = data.description ?? ''
    if (data.kind === 'place') {
      const d = data as CPNPlaceNodeData
      form.value.colorSetId = d.colorSetId
      form.value.initialMarking = d.initialMarking
    } else {
      const d = data as CPNTransitionNodeData
      form.value.guard = d.guard ?? ''
    }
  },
  { immediate: true },
)

function save() {
  if (!props.nodeData) return
  let updated: NodeData
  if (props.nodeData.kind === 'place') {
    const cpn = cpnStore.getCurrentCPN()
    const cs = cpn?.colorSets.find(c => c.id === form.value.colorSetId)
    updated = {
      kind: 'place',
      label: form.value.label,
      colorSetId: form.value.colorSetId,
      colorSetName: cs?.name,
      initialMarking: form.value.initialMarking,
      description: form.value.description || undefined,
    } satisfies CPNPlaceNodeData
  } else {
    updated = {
      kind: 'transition',
      label: form.value.label,
      guard: form.value.guard || undefined,
      description: form.value.description || undefined,
    } satisfies CPNTransitionNodeData
  }
  emit('save', props.nodeId, updated)
  emit('update:modelValue', false)
}
</script>
