<template>
  <v-dialog
    v-model="dialog"
    max-width="700px"
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
          <!-- Event field  -->
          <v-select
            v-model="localData.event"
            :items="eventItems"
            item-title="displayName"
            item-value="name"
            label="Event"
            prepend-icon="mdi-lightning-bolt"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            clearable
            hint="Select event from registry"
            persistent-hint
          >
            <template v-slot:item="{ item, props }">
              <v-list-item v-bind="props">
                <template v-slot:prepend>
                  <v-chip :color="getEventColor(item.raw.type)" size="small" variant="flat" style="margin-right: 10px;">
                    {{ item.raw.type }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
            <template v-slot:selection="{ item }">
              <v-chip :color="getEventColor(item.raw.type)" size="small" variant="flat" class="me-2" v-if="item.raw.type">
                {{ item.raw.type }}
              </v-chip>
              {{ item.raw.name }}
            </template>
          </v-select>

          <!-- Condition (Guard) -->
          <div class="mb-4 ms-10">
            <div class="d-flex align-center mb-3">
              <v-icon class="me-2" color="grey">mdi-shield-outline</v-icon>
              <span class="text-subtitle-2">Condition (Guard)</span>
            </div>

            <v-text-field
              v-model="localData.condition"
              label="Guard Expression"
              placeholder="e.g., x > 0, isReady == true, msgType == SYN"
              density="comfortable"
              variant="outlined"
              hint="Expression over EFSM variables. Leave empty for unconditional transition."
              prepend-icon="mdi-code-tags"
              persistent-hint
            ></v-text-field>
          </div>

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
import type { FSMEdgeData, EventType } from '@/contracts/models'
import { getEventSCXMLName } from '@/contracts/models'
import { useProtocolStore } from '@/store/ProtocolStore'

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

const protocolStore = useProtocolStore()

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

// Computed: Available events from FSM registry
const availableEvents = computed(() => {
  const fsm = protocolStore.getCurrentFSM()
  return fsm?.events || []
})

// Event items for dropdown
const eventItems = computed(() => {
  return availableEvents.value.map(event => ({
    ...event,
    displayName: `${event.type}.${event.name}`
  }))
})

// Helper to get event color
function getEventColor(type: EventType): string {
  switch (type) {
    case 'input': return 'blue'
    case 'output': return 'green'
    case 'internal': return 'purple'
    case 'timeout': return 'orange'
    default: return 'grey'
  }
}

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
