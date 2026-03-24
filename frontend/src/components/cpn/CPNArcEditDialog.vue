<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="460">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2" color="purple">mdi-arrow-right</v-icon>
        Edit Arc Inscription
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="form.inscription"
          label="Inscription"
          variant="outlined"
          density="compact"
          hint='Multiset expression: e.g.  1`x  or  2`ACK ++ 1`SYN  or  n`p'
          persistent-hint
          class="mb-3"
          style="font-family: monospace"
        />

        <v-select
          v-model="form.arcType"
          :items="arcTypeItems"
          label="Arc Type"
          variant="outlined"
          density="compact"
          class="mb-3"
        />

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
        <v-btn color="error" variant="text" @click="$emit('delete', edgeId)">Delete Arc</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CPNArcEdgeData } from './CPNArcEdge.vue'

const props = defineProps<{
  modelValue: boolean
  edgeId: string
  edgeData: CPNArcEdgeData | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [edgeId: string, data: CPNArcEdgeData]
  delete: [edgeId: string]
}>()

const arcTypeItems = [
  { title: 'Normal', value: 'normal' },
  { title: 'Inhibitor', value: 'inhibitor' },
]

const form = ref<CPNArcEdgeData>({
  inscription: '1`x',
  arcType: 'normal',
  description: '',
})

watch(
  () => props.edgeData,
  (data) => {
    if (!data) return
    form.value = {
      inscription: data.inscription ?? '1`x',
      arcType: data.arcType ?? 'normal',
      description: data.description ?? '',
    }
  },
  { immediate: true },
)

function save() {
  emit('save', props.edgeId, { ...form.value })
  emit('update:modelValue', false)
}
</script>
