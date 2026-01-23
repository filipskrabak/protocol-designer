<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2">mdi-variable</v-icon>
      <span>Variables</span>
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-plus"
        size="small"
        variant="text"
        @click="addVariable"
      >
        <v-icon>mdi-plus</v-icon>
        <v-tooltip activator="parent" location="bottom">Add Variable</v-tooltip>
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text v-if="!variables || variables.length === 0">
      <v-alert type="info" variant="tonal" density="compact">
        No variables defined. Click + to add variables for guard expressions and actions.
      </v-alert>
    </v-card-text>

    <v-card-text v-else class="pa-0">
      <v-list density="compact">
        <v-list-item
          v-for="(variable, index) in variables"
          :key="variable.id"
          class="variable-item"
        >
          <template v-slot:prepend>
            <v-icon :color="getVariableTypeColor(variable.type)">
              {{ getVariableTypeIcon(variable.type) }}
            </v-icon>
          </template>

          <v-list-item-title>
            <span class="font-weight-medium">{{ variable.name }}</span>
            <v-chip size="x-small" variant="text" class="ml-2">
              {{ variable.type }}
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption">
            <span v-if="variable.type === 'int' && variable.minValue !== undefined && variable.maxValue !== undefined">
              Range: [{{ variable.minValue }}, {{ variable.maxValue }}]
            </span>
            <span v-else-if="variable.type === 'enum' && variable.enumValues">
              Values: {{ variable.enumValues.join(', ') }}
            </span>
            <span v-else-if="variable.type === 'bool'">
              Boolean
            </span>
            <span v-if="variable.initialValue !== undefined" class="ml-2">
              • Initial: {{ variable.initialValue }}
            </span>
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-btn
              icon="mdi-pencil"
              size="x-small"
              variant="text"
              @click="editVariable(index)"
            >
              <v-icon size="small">mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              @click="deleteVariable(index)"
            >
              <v-icon size="small">mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <!-- Variable Editor Dialog -->
    <v-dialog v-model="showDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h6">
          {{ editingIndex === -1 ? 'Add Variable' : 'Edit Variable' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="formRef" v-model="formValid">
            <v-text-field
              v-model="editingVariable.name"
              label="Variable Name"
              :rules="nameRules"
              required
              hint="Use alphanumeric characters and underscores"
              persistent-hint
              class="mb-4"
            ></v-text-field>

            <v-select
              v-model="editingVariable.type"
              :items="variableTypes"
              label="Type"
              required
              class="mb-4"
            ></v-select>

            <!-- Integer bounds -->
            <template v-if="editingVariable.type === 'int'">
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model.number="editingVariable.minValue"
                    label="Min Value"
                    type="number"
                    :rules="[v => v !== undefined && v !== null || 'Required']"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model.number="editingVariable.maxValue"
                    label="Max Value"
                    type="number"
                    :rules="[
                      v => v !== undefined && v !== null || 'Required',
                      v => editingVariable.minValue === undefined || v >= editingVariable.minValue || 'Must be >= min'
                    ]"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-text-field
                v-model.number="editingVariable.initialValue"
                label="Initial Value (optional)"
                type="number"
                hint="Leave empty to use minimum value"
                persistent-hint
                class="mb-4"
              ></v-text-field>
            </template>

            <!-- Enum values -->
            <template v-if="editingVariable.type === 'enum'">
              <v-combobox
                v-model="editingVariable.enumValues"
                label="Enum Values"
                multiple
                chips
                :rules="[v => v && v.length > 0 || 'At least one value required']"
                hint="Press Enter after each value"
                persistent-hint
                class="mb-4"
              ></v-combobox>

              <v-select
                v-model="editingVariable.initialValue"
                :items="editingVariable.enumValues || []"
                label="Initial Value (optional)"
                clearable
                hint="Leave empty to use first enum value"
                persistent-hint
                class="mb-4"
              ></v-select>
            </template>

            <!-- Boolean initial value -->
            <template v-if="editingVariable.type === 'bool'">
              <v-select
                v-model="editingVariable.initialValue"
                :items="[
                  { title: 'True', value: true },
                  { title: 'False', value: false }
                ]"
                label="Initial Value (optional)"
                clearable
                hint="Leave empty to use false"
                persistent-hint
                class="mb-4"
              ></v-select>
            </template>

            <v-textarea
              v-model="editingVariable.description"
              label="Description (optional)"
              rows="2"
              hint="Optional description of the variable's purpose"
              persistent-hint
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!formValid"
            @click="saveVariable"
          >
            {{ editingIndex === -1 ? 'Add' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">Delete Variable?</v-card-title>
        <v-card-text>
          Are you sure you want to delete variable "{{ variables[deleteIndex]?.name }}"?
          This may affect guards and actions that reference it.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProtocolStore } from '@/store/ProtocolStore'
import type { EFSMVariable, EFSMVariableType } from '@/contracts/models'
import { v4 as uuid } from 'uuid'

const protocolStore = useProtocolStore()

const currentFSM = computed(() => protocolStore.getCurrentFSM())
const variables = computed(() => currentFSM.value?.variables || [])

const showDialog = ref(false)
const showDeleteDialog = ref(false)
const formValid = ref(false)
const formRef = ref<any>(null)
const editingIndex = ref(-1)
const deleteIndex = ref(-1)

const variableTypes: Array<{ title: string; value: EFSMVariableType }> = [
  { title: 'Integer', value: 'int' },
  { title: 'Boolean', value: 'bool' },
  { title: 'Enumeration', value: 'enum' }
]

const editingVariable = ref<Partial<EFSMVariable>>({})

const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v) || 'Invalid variable name (use letters, numbers, underscores)',
  (v: string) => {
    if (editingIndex.value === -1) {
      return !variables.value.some(var_ => var_.name === v) || 'Variable name already exists'
    } else {
      return !variables.value.some((var_, idx) => idx !== editingIndex.value && var_.name === v) || 'Variable name already exists'
    }
  }
]

function addVariable() {
  editingIndex.value = -1
  editingVariable.value = {
    name: '',
    type: 'int',
    minValue: 0,
    maxValue: 10,
  }
  showDialog.value = true
}

function editVariable(index: number) {
  editingIndex.value = index
  editingVariable.value = { ...variables.value[index] }
  showDialog.value = true
}

function deleteVariable(index: number) {
  deleteIndex.value = index
  showDeleteDialog.value = true
}

function confirmDelete() {
  if (currentFSM.value) {
    const newVariables = [...variables.value]
    newVariables.splice(deleteIndex.value, 1)

    const updatedFSM = {
      ...currentFSM.value,
      variables: newVariables
    }

    protocolStore.updateFSM(currentFSM.value.id, updatedFSM)
  }
  showDeleteDialog.value = false
}

function cancelEdit() {
  showDialog.value = false
  editingVariable.value = {}
}

async function saveVariable() {
  if (!formRef.value) return

  const { valid } = await formRef.value.validate()
  if (!valid || !currentFSM.value) return

  const variable: EFSMVariable = {
    id: editingIndex.value === -1 ? uuid() : variables.value[editingIndex.value].id,
    name: editingVariable.value.name!,
    type: editingVariable.value.type!,
    description: editingVariable.value.description,
    minValue: editingVariable.value.minValue,
    maxValue: editingVariable.value.maxValue,
    enumValues: editingVariable.value.enumValues,
    initialValue: editingVariable.value.initialValue,
  }

  const newVariables = [...variables.value]
  if (editingIndex.value === -1) {
    newVariables.push(variable)
  } else {
    newVariables[editingIndex.value] = variable
  }

  const updatedFSM = {
    ...currentFSM.value,
    variables: newVariables
  }

  protocolStore.updateFSM(currentFSM.value.id, updatedFSM)
  showDialog.value = false
}

function getVariableTypeColor(type: EFSMVariableType): string {
  switch (type) {
    case 'int': return 'blue'
    case 'bool': return 'green'
    case 'enum': return 'purple'
    default: return 'grey'
  }
}

function getVariableTypeIcon(type: EFSMVariableType): string {
  switch (type) {
    case 'int': return 'mdi-numeric'
    case 'bool': return 'mdi-toggle-switch'
    case 'enum': return 'mdi-format-list-bulleted'
    default: return 'mdi-variable'
  }
}

// Watch for type changes to clear type-specific fields
watch(() => editingVariable.value.type, (newType, oldType) => {
  if (newType !== oldType && oldType !== undefined) {
    if (newType === 'int') {
      editingVariable.value.minValue = 0
      editingVariable.value.maxValue = 10
      editingVariable.value.enumValues = undefined
      editingVariable.value.initialValue = undefined
    } else if (newType === 'enum') {
      editingVariable.value.minValue = undefined
      editingVariable.value.maxValue = undefined
      editingVariable.value.enumValues = []
      editingVariable.value.initialValue = undefined
    } else if (newType === 'bool') {
      editingVariable.value.minValue = undefined
      editingVariable.value.maxValue = undefined
      editingVariable.value.enumValues = undefined
      editingVariable.value.initialValue = undefined
    }
  }
})
</script>

<style scoped>
.variable-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.variable-item:last-child {
  border-bottom: none;
}

:deep(.v-list-item__prepend) {
  margin-right: 12px !important;
}
</style>
