<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="480">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-variable</v-icon>
        Variable Editor
      </v-card-title>

      <v-card-text>
        <v-table density="compact" v-if="variables.length">
          <thead>
            <tr>
              <th>Name</th>
              <th>Color Set</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in variables" :key="v.id">
              <td>{{ v.name }}</td>
              <td>{{ colorSetName(v.colorSetId) }}</td>
              <td>
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="remove(v.id)" />
              </td>
            </tr>
          </tbody>
        </v-table>
        <p v-else class="text-caption text-medium-emphasis mb-3">No variables yet.</p>

        <v-divider class="my-4" />

        <div class="text-subtitle-2 mb-2">Add Variable</div>
        <v-row dense>
          <v-col cols="5">
            <v-text-field v-model="form.name" label="Name" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="5">
            <v-select
              v-model="form.colorSetId"
              :items="colorSetItems"
              label="Color Set"
              variant="outlined"
              density="compact"
              item-title="name"
              item-value="id"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" variant="flat" @click="addVariable">Add</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useCPNStore } from '@/store/CPNStore'
import type { CPNVariable } from '@/contracts/models'

defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const cpnStore = useCPNStore()
const colorSetItems = computed(() => cpnStore.getCurrentCPN()?.colorSets ?? [])
const variables = computed<CPNVariable[]>(() => cpnStore.getCurrentCPN()?.variables ?? [])

function colorSetName(id: string) {
  return colorSetItems.value.find(c => c.id === id)?.name ?? id
}

const form = ref({ name: '', colorSetId: '' })

function addVariable() {
  const cpn = cpnStore.getCurrentCPN()
  if (!cpn || !form.value.name.trim() || !form.value.colorSetId) return
  const v: CPNVariable = {
    id: uuidv4(),
    name: form.value.name.trim(),
    colorSetId: form.value.colorSetId,
  }
  cpnStore.updateCPN(cpn.id, { ...cpn, variables: [...cpn.variables, v] })
  form.value = { name: '', colorSetId: '' }
}

function remove(id: string) {
  const cpn = cpnStore.getCurrentCPN()
  if (!cpn) return
  cpnStore.updateCPN(cpn.id, { ...cpn, variables: cpn.variables.filter(v => v.id !== id) })
}
</script>
