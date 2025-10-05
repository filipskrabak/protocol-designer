<template>
  <v-dialog
    v-model="dialog"
    max-width="500px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-arrow-right-bold</v-icon>
        <span>Edit Transition</span>
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
        <v-form ref="form" @submit.prevent="saveTransition">
          <!-- Event field -->
          <v-text-field
            v-model="localData.event"
            label="Event"
            placeholder="e.g., buttonClick, timeout, userInput"
            prepend-icon="mdi-lightning-bolt"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hint="The event that triggers this transition"
          ></v-text-field>

          <!-- Condition field -->
          <v-text-field
            v-model="localData.condition"
            label="Condition (Guard)"
            placeholder="e.g., x > 0, isReady == true"
            prepend-icon="mdi-check-circle-outline"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hint="Optional condition that must be true for transition to occur"
          ></v-text-field>

          <!-- Action field -->
          <v-text-field
            v-model="localData.action"
            label="Action"
            placeholder="e.g., increment counter, send signal"
            prepend-icon="mdi-play-circle-outline"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hint="Optional action to execute when transition occurs"
          ></v-text-field>

          <!-- Description field -->
          <v-textarea
            v-model="localData.description"
            label="Description"
            placeholder="Optional description of this transition..."
            prepend-icon="mdi-text"
            density="comfortable"
            variant="outlined"
            rows="2"
            auto-grow
            hint="Additional notes about this transition"
          ></v-textarea>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        
        <v-btn
          color="error"
          variant="text"
          @click="deleteTransition"
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
          @click="saveTransition"
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
import type { FSMEdgeData } from '@/contracts/models'

interface Props {
  modelValue: boolean
  edgeId?: string
  edgeData?: FSMEdgeData
}

interface Emits {
  'update:modelValue': [value: boolean]
  'save': [edgeId: string, data: FSMEdgeData]
  'delete': [edgeId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const localData = reactive<FSMEdgeData>({
  event: '',
  condition: '',
  action: '',
  description: ''
})

// Watch for prop changes to update local data
watch(
  () => props.edgeData,
  (newData) => {
    if (newData) {
      Object.assign(localData, {
        event: newData.event || '',
        condition: newData.condition || '',
        action: newData.action || '',
        description: newData.description || ''
      })
    } else {
      // Reset to default values
      Object.assign(localData, {
        event: '',
        condition: '',
        action: '',
        description: ''
      })
    }
  },
  { immediate: true }
)

function closeDialog() {
  emit('update:modelValue', false)
}

function saveTransition() {
  if (props.edgeId) {
    // Clean up empty values
    const cleanData: FSMEdgeData = {}
    
    if (localData.event?.trim()) {
      cleanData.event = localData.event.trim()
    }
    
    if (localData.condition?.trim()) {
      cleanData.condition = localData.condition.trim()
    }
    
    if (localData.action?.trim()) {
      cleanData.action = localData.action.trim()
    }
    
    if (localData.description?.trim()) {
      cleanData.description = localData.description.trim()
    }
    
    emit('save', props.edgeId, cleanData)
  }
  closeDialog()
}

function deleteTransition() {
  if (props.edgeId) {
    emit('delete', props.edgeId)
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