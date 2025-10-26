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

          <!-- Condition Type Toggle -->
          <div class="mb-4 ms-10">
            <div class="d-flex align-center mb-3">
              <v-icon class="me-2" color="grey">mdi-shield-outline</v-icon>
              <span class="text-subtitle-2">Condition (Guard)</span>
            </div>

            <v-btn-toggle
              v-model="conditionMode"
              variant="outlined"
              color="primary"
              density="compact"
              divided
              mandatory
              class="mb-3"
            >
              <v-btn value="protocol" prepend-icon="mdi-file-document-outline" :disabled="!hasProtocolFields">
                Use Protocol Fields
              </v-btn>
              <v-btn value="manual" prepend-icon="mdi-text">
                Custom Condition
              </v-btn>
            </v-btn-toggle>

            <!-- Manual Condition Input -->
            <v-text-field
              v-if="conditionMode === 'manual'"
              v-model="localData.condition"
              label="Custom Condition"
              placeholder="e.g., x > 0, isReady == true"
              density="comfortable"
              variant="outlined"
              hint="Enter any condition expression"
              prepend-icon="mdi-code-tags"
              persistent-hint
            ></v-text-field>

            <!-- Protocol Field Conditions -->
            <div v-else-if="conditionMode === 'protocol'">
              <v-alert
                v-if="!hasProtocolFields"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-3"
              >
                No protocol fields available. Please add fields to the protocol header first.
              </v-alert>

              <div v-else>
                <!-- Existing Protocol Conditions -->
                <div
                  v-for="(condition, index) in localData.protocol_conditions"
                  :key="index"
                  class="protocol-condition-card mb-3"
                >
                  <v-card variant="outlined">
                    <v-card-text class="pb-2">
                      <div class="d-flex align-center mb-2">
                        <v-chip size="small" color="primary" variant="flat" class="me-2">
                          Condition {{ index + 1 }}
                        </v-chip>
                        <v-spacer></v-spacer>
                        <v-btn
                          icon="mdi-delete"
                          size="x-small"
                          variant="text"
                          color="error"
                          @click="removeProtocolCondition(index)"
                        ></v-btn>
                      </div>

                      <v-row dense>
                        <!-- Field Selection -->
                        <v-col cols="12" md="4">
                          <v-select
                            v-model="condition.field_id"
                            :items="protocolFieldItems"
                            label="Protocol Field"
                            density="compact"
                            variant="outlined"
                            item-title="display_name"
                            item-value="id"
                          ></v-select>
                        </v-col>

                        <!-- Operator Selection -->
                        <v-col cols="12" md="4">
                          <v-select
                            v-model="condition.operator"
                            :items="operatorItems"
                            label="Operator"
                            density="compact"
                            variant="outlined"
                            item-title="text"
                            item-value="value"
                          ></v-select>
                        </v-col>

                        <!-- Value Input -->
                        <v-col cols="12" md="4">
                          <!-- Field option selector if field has options -->
                          <v-select
                            v-if="getFieldOptions(condition.field_id).length > 0"
                            v-model="condition.field_option_name"
                            :items="getFieldOptions(condition.field_id)"
                            label="Field Value"
                            density="compact"
                            variant="outlined"
                            item-title="name"
                            item-value="name"
                            clearable
                            @update:model-value="(val) => updateConditionValue(condition, val)"
                          ></v-select>

                          <!-- Manual value input if no options -->
                          <v-text-field
                            v-else-if="!['in_range', 'not_in_range', 'has_flag', 'not_has_flag'].includes(condition.operator)"
                            v-model="condition.value"
                            label="Value"
                            density="compact"
                            variant="outlined"
                            type="number"
                          ></v-text-field>

                          <!-- Range inputs -->
                          <!--<div v-else-if="['in_range', 'not_in_range'].includes(condition.operator)">
                            <v-text-field
                              v-model="condition.min_value"
                              label="Min"
                              density="compact"
                              variant="outlined"
                              type="number"
                              class="mb-1"
                            ></v-text-field>
                            <v-text-field
                              v-model="condition.max_value"
                              label="Max"
                              density="compact"
                              variant="outlined"
                              type="number"
                            ></v-text-field>
                          </div>

                          Bit position for flag operators
                          <v-text-field
                            v-else-if="['has_flag', 'not_has_flag'].includes(condition.operator)"
                            v-model="condition.bit_position"
                            label="Bit Position"
                            density="compact"
                            variant="outlined"
                            type="number"
                            min="0"
                          ></v-text-field>-->
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </div>

                <!-- Add Condition Button -->
                <v-btn
                  variant="outlined"
                  color="primary"
                  prepend-icon="mdi-plus"
                  block
                  @click="addProtocolCondition"
                >
                  Add Condition
                </v-btn>

                <v-alert
                  v-if="localData.protocol_conditions && localData.protocol_conditions.length > 1"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mt-3"
                >
                  Multiple conditions are combined with AND operator
                </v-alert>
              </div>
            </div>
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
import { reactive, watch, computed, ref } from 'vue'
import type { FSMEdgeData, ProtocolFieldCondition, FieldOption } from '@/contracts/models'
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

const conditionMode = ref<'manual' | 'protocol'>('protocol')

const localData = reactive<FSMEdgeData>({
  event: '',
  condition: '',
  protocol_conditions: [],
  use_protocol_conditions: false,
  action: '',
  description: ''
})

// Computed: Check if protocol has fields
const hasProtocolFields = computed(() => {
  return protocolStore.protocol.fields && protocolStore.protocol.fields.length > 0
})

// Computed: Protocol field items for dropdown
const protocolFieldItems = computed(() => {
  if (!protocolStore.protocol.fields) return []
  return protocolStore.protocol.fields.map(field => ({
    id: field.id,
    display_name: field.display_name
  }))
})

// Operator items
const operatorItems = [
  { text: 'Equals (==)', value: 'equals' },
  { text: 'Not Equals (!=)', value: 'not_equals' },
  { text: 'Greater Than (>)', value: 'greater_than' },
  { text: 'Less Than (<)', value: 'less_than' },
  { text: 'Greater or Equal (>=)', value: 'greater_or_equal' },
  { text: 'Less or Equal (<=)', value: 'less_or_equal' },
]

// Get field options for a specific field
function getFieldOptions(fieldId: string): FieldOption[] {
  const field = protocolStore.protocol.fields?.find(f => f.id === fieldId)
  return field?.field_options || []
}

// Update condition value when field option is selected
function updateConditionValue(condition: ProtocolFieldCondition, optionName: string | null) {
  if (!optionName) {
    condition.value = undefined
    return
  }

  const field = protocolStore.protocol.fields?.find(f => f.id === condition.field_id)
  const option = field?.field_options?.find(o => o.name === optionName)

  if (option) {
    condition.value = option.value
  }
}

// Add a new protocol condition
function addProtocolCondition() {
  if (!localData.protocol_conditions) {
    localData.protocol_conditions = []
  }

  localData.protocol_conditions.push({
    field_id: protocolStore.protocol.fields?.[0]?.id || '',
    operator: 'equals',
    value: undefined
  })
}

// Remove a protocol condition
function removeProtocolCondition(index: number) {
  if (localData.protocol_conditions) {
    localData.protocol_conditions.splice(index, 1)
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
        protocol_conditions: newData.protocol_conditions ? [...newData.protocol_conditions] : [],
        use_protocol_conditions: newData.use_protocol_conditions || false,
        action: newData.action || '',
        description: newData.description || ''
      })

      // Set condition mode based on data
      if (newData.use_protocol_conditions && newData.protocol_conditions && newData.protocol_conditions.length > 0) {
        conditionMode.value = 'protocol'
      } else {
        conditionMode.value = 'manual'
      }
    } else {
      // Reset to default values
      Object.assign(localData, {
        event: '',
        condition: '',
        protocol_conditions: [],
        use_protocol_conditions: false,
        action: '',
        description: ''
      })
      conditionMode.value = 'manual'
    }
  },
  { immediate: true }
)

// Watch condition mode to update use_protocol_conditions flag
watch(conditionMode, (newMode) => {
  localData.use_protocol_conditions = newMode === 'protocol'

  // Initialize protocol_conditions if switching to protocol mode
  if (newMode === 'protocol' && (!localData.protocol_conditions || localData.protocol_conditions.length === 0)) {
    localData.protocol_conditions = []
  }
})

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

    // Save condition based on mode
    if (conditionMode.value === 'manual') {
      if (localData.condition?.trim()) {
        cleanData.condition = localData.condition.trim()
      }
      cleanData.use_protocol_conditions = false
    } else {
      // Protocol conditions mode
      if (localData.protocol_conditions && localData.protocol_conditions.length > 0) {
        cleanData.protocol_conditions = localData.protocol_conditions
        cleanData.use_protocol_conditions = true
      }
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
