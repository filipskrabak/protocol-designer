<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-4">
      <h3>Protocol Fields</h3>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="protocolRenderStore.showFieldAddModal(null, AddFieldPosition.End)"
        size="small"
      >
        Add Field
      </v-btn>
    </div>

    <!-- Group Assignment Toolbar -->
    <v-expand-transition>
      <v-card
        v-if="selectedFields.length > 0"
        class="mb-4"
        elevation="2"
        color="blue-lighten-5"
      >
        <v-card-item>
          <template #prepend>
            <v-icon color="primary">mdi-tag-multiple</v-icon>
          </template>

          <v-card-title>Assign Fields to a</v-card-title>

          <v-card-subtitle>
            <strong>{{ selectedFields.length }}</strong> field{{ selectedFields.length === 1 ? '' : 's' }} selected
          </v-card-subtitle>

          <template #append>
            <v-btn
              icon="mdi-close"
              size="small"
              variant="text"
              @click="clearSelection"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
        </v-card-item>

        <v-card-text>
          <v-row align="center">
            <v-col cols="12" md="6">
              <v-combobox
                v-model="selectedGroupModel"
                :items="groupOptions"
                label="Select or Type Group Name"
                density="comfortable"
                clearable
                placeholder="Choose existing or type new group name"
                prepend-inner-icon="mdi-tag"
                hint="Type a custom group name or select from predefined options"
                persistent-hint
                item-title="title"
                item-value="value"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="px-4 pb-4">
          <v-btn
            color="primary"
            prepend-icon="mdi-tag"
            @click="assignGroupToSelected"
            :disabled="!selectedGroupId && selectedGroupId !== ''"
            variant="elevated"
          >
            Assign Group
          </v-btn>

          <v-btn
            color="warning"
            prepend-icon="mdi-tag-remove"
            @click="removeGroupFromSelected"
            variant="outlined"
          >
            Remove Group
          </v-btn>
          <v-btn
            color="secondary"
            prepend-icon="mdi-select-all"
            @click="selectAllFields"
            variant="text"
          >
            Select All
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-expand-transition>

    <!-- Info alert about drag and drop -->
    <v-alert
      type="info"
      outlined
      elevation="2"
      icon="mdi-information"
      class="mb-4"
      closable
      v-if="protocolStore.protocol.fields && protocolStore.protocol.fields.length > 1"
    >
      <strong>Tip:</strong> Drag and drop fields to reorder them.
    </v-alert>

    <!-- Empty state -->
    <v-alert
      v-if="!protocolStore.protocol.fields || protocolStore.protocol.fields.length === 0"
      type="warning"
      outlined
      elevation="2"
      icon="mdi-alert"
      class="mb-4"
    >
      No fields have been added yet. Click the "Add Field" button to create your first protocol field.
    </v-alert>

    <!-- Draggable field list -->
    <draggable
      v-model="fieldList"
      @change="onFieldOrderChange"
      item-key="id"
      handle=".drag-handle"
      animation="200"
      ghost-class="ghost"
      chosen-class="chosen"
      drag-class="drag"
    >
      <template #item="{ element: field }">
        <v-card class="mb-2 field-card" elevation="2" :class="{ 'selected-field': selectedFields.includes(field.id) }">
          <v-card-item>
            <template #prepend>

              <!-- Drag handle -->
              <v-icon
                class="drag-handle mr-1"
                color="grey-darken-1"
                :style="{ cursor: 'grab' }"
              >
                mdi-drag-vertical
              </v-icon>

              <!-- Selection checkbox -->
              <v-checkbox
                :model-value="selectedFields.includes(field.id)"
                @update:model-value="toggleFieldSelection(field.id)"
                class="mr-2"
                density="compact"
                hide-details
              />
            </template>

            <v-card-title>
              {{ field.display_name }}
              <!-- Group indicator -->
              <v-chip
                v-if="field.group_id"
                size="small"
                :color="generateGroupColor(field.group_id)"
                class="ml-2"
                text-color="white"
              >
                {{ field.group_id }}
              </v-chip>
            </v-card-title>

            <v-card-subtitle>
              ID: {{ field.id }} |
              {{ field.is_variable_length ? `${field.length}-${field.max_length}` : field.length }} {{ field.length_unit || 'bits' }} |
              {{ field.endian }} endian
              <v-chip
                v-if="field.encapsulate"
                size="x-small"
                color="blue"
                class="ml-1"
              >
                Encapsulation
              </v-chip>
            </v-card-subtitle>

            <template #append>
              <!-- Action buttons -->
              <div class="d-flex align-center">
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="editField(field)"
                  class="mr-1"
                >
                  <v-icon>mdi-pencil</v-icon>
                  <v-tooltip activator="parent" location="top">Edit Field</v-tooltip>
                </v-btn>

                <v-btn
                  icon="mdi-content-duplicate"
                  size="small"
                  variant="text"
                  @click="duplicateField(field)"
                  class="mr-1"
                >
                  <v-icon>mdi-content-duplicate</v-icon>
                  <v-tooltip activator="parent" location="top">Duplicate Field</v-tooltip>
                </v-btn>

                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="deleteField(field)"
                >
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">Delete Field</v-tooltip>
                </v-btn>
              </div>
            </template>
          </v-card-item>

          <!-- Field description if exists -->
          <v-card-text v-if="field.description" class="pt-0">
            <div class="text-body-2 text-grey-darken-1">
              {{ field.description }}
            </div>
          </v-card-text>

          <!-- Field options if any -->
          <v-card-text v-if="field.field_options && field.field_options.length > 0" class="pt-0">
            <div class="text-caption mb-2">Field Options:</div>
            <v-chip
              v-for="option in field.field_options"
              :key="option.value"
              size="small"
              class="mr-1 mb-1"
              color="primary"
            >
              {{ option.name }} ({{ option.value }})
            </v-chip>
          </v-card-text>
        </v-card>
      </template>
    </draggable>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { useProtocolStore } from '@/store/ProtocolStore'
import { useProtocolRenderStore } from '@/store/ProtocolRenderStore'
import { useNotificationStore } from '@/store/NotificationStore'
import { Field, AddFieldPosition } from '@/contracts'
import { generateGroupColor, getGroupOptions } from '@/utils/groupUtils'
import _ from 'lodash'

const protocolStore = useProtocolStore()
const protocolRenderStore = useProtocolRenderStore()
const notificationStore = useNotificationStore()

// Selection state for mass operations
const selectedFields = ref<string[]>([])
const selectedGroupId = ref<string>('')

// Helper to handle combobox value changes (since combobox returns objects when selected)
const selectedGroupModel = computed({
  get() {
    return selectedGroupId.value
  },
  set(value: any) {
    // If it's an object (selected from dropdown), extract the value property
    if (typeof value === 'object' && value !== null && value.value) {
      selectedGroupId.value = value.value
    } else {
      // If it's a string (typed manually), use it directly
      selectedGroupId.value = value || ''
    }
  }
})

// Group options for the dropdown - computed to include existing groups
const groupOptions = computed(() => {
  return getGroupOptions(protocolStore.protocol.fields)
})

// Computed property for the field list that can be mutated by draggable
const fieldList = computed({
  get() {
    return protocolStore.protocol.fields || []
  },
  set(newFields: Field[]) {
    protocolStore.protocol.fields = newFields
  }
})

// Handle field order changes from drag and drop
function onFieldOrderChange(event: any) {
  console.log('Field order changed:', event)

  // Update the protocol timestamp
  protocolStore.protocol.updated_at = new Date().toLocaleDateString('sk-SK')

  // Re-render the protocol visualization
  protocolRenderStore.initialize()

  notificationStore.showNotification({
    message: 'Field order updated successfully',
    timeout: 3000,
    color: 'success',
    icon: 'mdi-check',
  })
}

// Edit field function
function editField(field: Field) {
  protocolRenderStore.showFieldEditModal(field)
}

// Duplicate field function
function duplicateField(field: Field) {
  const duplicatedField = _.cloneDeep(field)

  // Generate a unique ID for the duplicated field
  let newId = `${field.id}_copy`
  let counter = 1

  while (protocolStore.protocol.fields?.some(f => f.id === newId)) {
    newId = `${field.id}_copy_${counter}`
    counter++
  }

  duplicatedField.id = newId
  duplicatedField.display_name = `${field.display_name} (Copy)`

  // Add the duplicated field after the original
  const originalIndex = protocolStore.protocol.fields?.findIndex(f => f.id === field.id) || 0
  protocolStore.protocol.fields?.splice(originalIndex + 1, 0, duplicatedField)

  // Update timestamp and re-render
  protocolStore.protocol.updated_at = new Date().toLocaleDateString('sk-SK')
  protocolRenderStore.initialize()

  notificationStore.showNotification({
    message: `Field "${field.display_name}" duplicated successfully`,
    timeout: 3000,
    color: 'success',
    icon: 'mdi-check',
  })
}

// Delete field function
function deleteField(field: Field) {
  protocolRenderStore.showFieldDeleteModal(field)
}

// Group selection functions
function toggleFieldSelection(fieldId: string) {
  const index = selectedFields.value.indexOf(fieldId)
  if (index > -1) {
    selectedFields.value.splice(index, 1)
  } else {
    selectedFields.value.push(fieldId)
  }
}

function clearSelection() {
  selectedFields.value = []
  selectedGroupModel.value = ''
}

function selectAllFields() {
  selectedFields.value = protocolStore.protocol.fields?.map(f => f.id) || []
}

function assignGroupToSelected() {
  if (!selectedGroupId.value && selectedGroupId.value !== '') return

  selectedFields.value.forEach(fieldId => {
    const field = protocolStore.protocol.fields?.find(f => f.id === fieldId)
    if (field) {
      field.group_id = selectedGroupId.value || undefined
    }
  })

  // Update timestamp and re-render
  protocolStore.protocol.updated_at = new Date().toLocaleDateString('sk-SK')
  protocolRenderStore.initialize()

  const groupName = selectedGroupId.value || 'None'
  notificationStore.showNotification({
    message: `Group "${groupName}" assigned to ${selectedFields.value.length} field${selectedFields.value.length === 1 ? '' : 's'}`,
    timeout: 3000,
    color: 'success',
    icon: 'mdi-check',
  })

  clearSelection()
}

function removeGroupFromSelected() {
  selectedFields.value.forEach(fieldId => {
    const field = protocolStore.protocol.fields?.find(f => f.id === fieldId)
    if (field) {
      field.group_id = undefined
    }
  })

  // Update timestamp and re-render
  protocolStore.protocol.updated_at = new Date().toLocaleDateString('sk-SK')
  protocolRenderStore.initialize()

  notificationStore.showNotification({
    message: `Group removed from ${selectedFields.value.length} field${selectedFields.value.length === 1 ? '' : 's'}`,
    timeout: 3000,
    color: 'success',
    icon: 'mdi-check',
  })

  clearSelection()
}
</script>

<style scoped>
.field-card {
  transition: transform 0.2s ease;
}

.field-card:hover {
  transform: translateY(-2px);
}

.selected-field {
  background-color: #E3F2FD !important;
  border: 2px solid #2196F3 !important;
}

.drag-handle:hover {
  cursor: grab !important;
}

.drag-handle:active {
  cursor: grabbing !important;
}

/* Draggable styles */
.ghost {
  opacity: 0.5;
  background: #f5f5f5;
  transform: rotate(2deg);
}

.chosen {
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.drag {
  transform: rotate(1deg);
  opacity: 0.9;
}

/* Animation for smooth transitions */
.v-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
