<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="560">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-palette</v-icon>
        Color Sets
      </v-card-title>

      <v-card-text>
        <!-- Existing color sets -->
        <v-table density="compact" v-if="colorSets.length">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Values</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cs in colorSets" :key="cs.id">
              <td>{{ cs.name }}</td>
              <td><v-chip size="x-small" :color="chipColor(cs.type)">{{ cs.type }}</v-chip></td>
              <td class="text-caption">
                <span v-if="cs.type === 'int'">[{{ cs.intMin }} .. {{ cs.intMax }}]</span>
                <span v-else-if="cs.type === 'enum'">{{ cs.enumValues?.join(', ') }}</span>
                <span v-else>-</span>
              </td>
              <td>
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="remove(cs.id)" />
              </td>
            </tr>
          </tbody>
        </v-table>
        <p v-else class="text-caption text-medium-emphasis mb-3">No color sets yet.</p>

        <v-divider class="my-4" />

        <!-- Add new -->
        <div class="text-subtitle-2 mb-2">Add Color Set</div>
        <v-row dense>
          <v-col cols="5">
            <v-text-field v-model="form.name" label="Name" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="4">
            <v-select
              v-model="form.type"
              :items="typeItems"
              label="Type"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row dense v-if="form.type === 'int'">
          <v-col cols="3">
            <v-text-field v-model.number="form.intMin" label="Min" type="number" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="3">
            <v-text-field v-model.number="form.intMax" label="Max" type="number" variant="outlined" density="compact" />
          </v-col>
        </v-row>

        <v-row dense v-if="form.type === 'enum'">
          <v-col cols="8">
            <v-combobox
              v-model="form.enumValues"
              label="Values (comma-separated or press Enter)"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" variant="flat" @click="addColorSet">Add</v-btn>
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
import type { ColorSet, ColorSetType } from '@/contracts/models'

defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const cpnStore = useCPNStore()
const colorSets = computed<ColorSet[]>(() => cpnStore.getCurrentCPN()?.colorSets ?? [])

const typeItems: { title: string; value: ColorSetType }[] = [
  { title: 'Unit', value: 'unit' },
  { title: 'Bool', value: 'bool' },
  { title: 'Int range', value: 'int' },
  { title: 'Enum', value: 'enum' },
]

const form = ref({
  name: '',
  type: 'unit' as ColorSetType,
  intMin: 0,
  intMax: 255,
  enumValues: [] as string[],
})

function chipColor(type: string): string {
  return ({ bool: 'orange', int: 'blue', enum: 'green', unit: 'grey' } as any)[type] ?? 'grey'
}

function addColorSet() {
  const cpn = cpnStore.getCurrentCPN()
  if (!cpn || !form.value.name.trim()) return
  const cs: ColorSet = {
    id: uuidv4(),
    name: form.value.name.trim(),
    type: form.value.type,
    intMin: form.value.type === 'int' ? form.value.intMin : undefined,
    intMax: form.value.type === 'int' ? form.value.intMax : undefined,
    enumValues: form.value.type === 'enum' ? form.value.enumValues.filter(Boolean) : undefined,
  }
  cpnStore.updateCPN(cpn.id, {
    ...cpn,
    colorSets: [...cpn.colorSets, cs],
  })
  form.value = { name: '', type: 'unit', intMin: 0, intMax: 255, enumValues: [] }
}

function remove(id: string) {
  const cpn = cpnStore.getCurrentCPN()
  if (!cpn) return
  cpnStore.updateCPN(cpn.id, {
    ...cpn,
    colorSets: cpn.colorSets.filter(c => c.id !== id),
  })
}
</script>
