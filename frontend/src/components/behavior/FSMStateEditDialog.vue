<template>
  <v-dialog
    v-model="dialog"
    max-width="500px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2" :color="getStateColor()">{{ getStateIcon() }}</v-icon>
        <span>Edit State</span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="closeDialog"
        ></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="py-4">
        <v-form ref="form" @submit.prevent="saveState">
          <!-- State Name -->
          <v-text-field
            v-model="localData.label"
            label="State Name"
            placeholder="e.g., Start, Processing, Complete"
            prepend-icon="mdi-tag"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hint="The display name for this state"
            :rules="[rules.required]"
          ></v-text-field>

          <!-- State Type -->
          <v-select
            v-model="stateType"
            label="State Type"
            :items="stateTypeOptions"
            prepend-icon="mdi-shape"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hint="Change the type of this state"
          ></v-select>

          <!-- Description -->
          <v-textarea
            v-model="localData.description"
            label="Description"
            placeholder="Optional description of what this state represents..."
            prepend-icon="mdi-text"
            density="comfortable"
            variant="outlined"
            rows="2"
            auto-grow
            class="mb-3"
            hint="Additional notes about this state"
          ></v-textarea>

          <!-- Metadata -->
          <v-expansion-panels variant="accordion" class="mb-3">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="me-2">mdi-cog</v-icon>
                Advanced Properties
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-text-field
                  v-model="localData.metadata.timeout"
                  label="Timeout (ms)"
                  type="number"
                  placeholder="e.g., 5000"
                  prepend-icon="mdi-timer"
                  density="comfortable"
                  variant="outlined"
                  class="mb-3"
                  hint="Optional timeout for this state"
                ></v-text-field>

                <v-text-field
                  v-model="localData.metadata.entryAction"
                  label="Entry Action"
                  placeholder="e.g., startTimer(), showLoader()"
                  prepend-icon="mdi-login"
                  density="comfortable"
                  variant="outlined"
                  class="mb-3"
                  hint="Action to execute when entering this state"
                ></v-text-field>

                <v-text-field
                  v-model="localData.metadata.exitAction"
                  label="Exit Action"
                  placeholder="e.g., stopTimer(), hideLoader()"
                  prepend-icon="mdi-logout"
                  density="comfortable"
                  variant="outlined"
                  hint="Action to execute when leaving this state"
                ></v-text-field>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn
          color="error"
          variant="text"
          @click="deleteState"
          prepend-icon="mdi-delete"
        >
          Delete
        </v-btn>

        <v-btn
          variant="text"
          @click="closeDialog"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          @click="saveState"
          prepend-icon="mdi-content-save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import type { FSMNodeData } from '@/contracts/models'

interface Props {
  modelValue: boolean
  nodeId?: string
  nodeData?: FSMNodeData
}

interface Emits {
  'update:modelValue': [value: boolean]
  'save': [nodeId: string, data: FSMNodeData]
  'delete': [nodeId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const localData = reactive<FSMNodeData>({
  label: '',
  isInitial: false,
  isFinal: false,
  description: '',
  metadata: {}
})

// State type for easy switching
const stateType = computed({
  get: () => {
    if (localData.isInitial) return 'initial'
    if (localData.isFinal) return 'final'
    return 'normal'
  },
  set: (value: string) => {
    localData.isInitial = value === 'initial'
    localData.isFinal = value === 'final'
  }
})

const stateTypeOptions = [
  { title: 'Normal State', value: 'normal' },
  { title: 'Initial State', value: 'initial' },
  { title: 'Final State', value: 'final' }
]

// Form validation rules
const rules = {
  required: (value: string) => !!value || 'This field is required'
}

// Watch for prop changes to update local data
watch(
  () => props.nodeData,
  (newData) => {
    if (newData) {
      Object.assign(localData, {
        label: newData.label || '',
        isInitial: newData.isInitial || false,
        isFinal: newData.isFinal || false,
        description: newData.description || '',
        metadata: { ...newData.metadata } || {}
      })
    } else {
      // Reset to default values
      Object.assign(localData, {
        label: '',
        isInitial: false,
        isFinal: false,
        description: '',
        metadata: {}
      })
    }
  },
  { immediate: true }
)

function getStateIcon() {
  if (localData.isInitial) return 'mdi-play-circle'
  if (localData.isFinal) return 'mdi-stop-circle'
  return 'mdi-circle'
}

function getStateColor() {
  if (localData.isInitial) return 'success'
  if (localData.isFinal) return 'error'
  return 'primary'
}

function closeDialog() {
  emit('update:modelValue', false)
}

function saveState() {
  if (props.nodeId && localData.label?.trim()) {
    // Clean up empty metadata values
    const cleanMetadata: Record<string, any> = {}

    if (localData.metadata?.timeout) {
      cleanMetadata.timeout = parseInt(localData.metadata.timeout)
    }

    if (localData.metadata?.entryAction?.trim()) {
      cleanMetadata.entryAction = localData.metadata.entryAction.trim()
    }

    if (localData.metadata?.exitAction?.trim()) {
      cleanMetadata.exitAction = localData.metadata.exitAction.trim()
    }

    const cleanData: FSMNodeData = {
      label: localData.label.trim(),
      isInitial: localData.isInitial,
      isFinal: localData.isFinal,
      description: localData.description?.trim() || undefined,
      metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined
    }

    emit('save', props.nodeId, cleanData)
  }
  closeDialog()
}

function deleteState() {
  if (props.nodeId) {
    emit('delete', props.nodeId)
  }
  closeDialog()
}
</script>

<style scoped>
:deep(.v-field--prepended) {
  --v-field-padding-start: 16px;
}

:deep(.v-field__prepend-inner) {
  opacity: 0.7;
}
</style>
