<template>
  <v-card elevation="2" class="events-panel">
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2">mdi-lightning-bolt</v-icon>
      <span>Events</span>
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-plus"
        size="small"
        variant="text"
        @click="addEvent"
      >
        <v-icon>mdi-plus</v-icon>
        <v-tooltip activator="parent" location="bottom">Add Event</v-tooltip>
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text class="pa-0">
      <!-- Event List -->
      <v-list v-if="events.length > 0" density="compact">
        <v-list-item
          v-for="event in events"
          :key="event.name"
          class="event-item"
        >
          <template v-slot:prepend>
            <v-chip
              :color="getEventColor(event.type)"
              size="small"
              variant="flat"
              class="event-type-chip"
            >
              {{ getEventTypeLabel(event.type) }}
            </v-chip>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ event.name }}
          </v-list-item-title>

          <v-list-item-subtitle v-if="event.description" class="text-caption">
            {{ event.description }}
          </v-list-item-subtitle>

          <template v-slot:append>
            <div class="d-flex ga-1">
              <v-btn
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                @click="editEvent(event)"
              >
                <v-icon>mdi-pencil</v-icon>
                <v-tooltip activator="parent" location="bottom">Edit</v-tooltip>
              </v-btn>
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="confirmDeleteEvent(event)"
              >
                <v-icon>mdi-delete</v-icon>
                <v-tooltip activator="parent" location="bottom">Delete</v-tooltip>
              </v-btn>
            </div>
          </template>
        </v-list-item>
      </v-list>

      <!-- Empty State -->
      <v-alert v-else type="info" variant="tonal" class="ma-4">
        No events defined.
      </v-alert>
    </v-card-text>

    <v-divider></v-divider>

    <!-- Event Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span>{{ isEditing ? 'Edit' : 'Add' }} Event</span>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="py-4">
          <v-form ref="form">
            <!-- Event Name -->
            <v-text-field
              v-model="editingEvent.name"
              label="Event Name *"
              hint="e.g., recv_ACK, send_SYN, timeout_retry"
              persistent-hint
              density="comfortable"
              variant="outlined"
              class="mb-3"
              :rules="[v => !!v || 'Name is required']"
            ></v-text-field>

            <!-- Event Type -->
            <v-select
              v-model="editingEvent.type"
              :items="eventTypes"
              label="Event Type *"
              hint="Classification for formal verification"
              persistent-hint
              density="comfortable"
              variant="outlined"
              class="mb-3"
              :rules="[v => !!v || 'Type is required']"
            >
              <template v-slot:item="{ item, props }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-chip :color="getEventColor(item.value)" size="small">
                      {{ getEventTypeLabel(item.value) }}
                    </v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <!-- Description -->
            <v-textarea
              v-model="editingEvent.description"
              label="Description"
              hint="Optional description of what this event represents"
              persistent-hint
              density="comfortable"
              variant="outlined"
              rows="2"
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveEvent">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Confirm Delete</v-card-title>
        <v-card-text>
          Are you sure you want to delete event <strong>{{ deletingEvent?.name }}</strong>?
          <br/>
          <span class="text-warning">Transitions using this event will need to be updated.</span>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="deleteEvent">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProtocolStore } from '@/store/ProtocolStore'
import { useProtocolRenderStore } from '@/store/ProtocolRenderStore'
import type { FSMEvent, EventType } from '@/contracts/models'

const protocolStore = useProtocolStore()
const protocolRenderStore = useProtocolRenderStore()

const showDialog = ref(false)
const showDeleteDialog = ref(false)
const isEditing = ref(false)
const editingEvent = ref<Partial<FSMEvent>>({})
const originalEventName = ref<string>('')
const deletingEvent = ref<FSMEvent | null>(null)
const form = ref<any>(null)

const eventTypes: { title: string; value: EventType }[] = [
  { title: 'Input Event', value: 'input' },
  { title: 'Output Event', value: 'output' },
  { title: 'Internal Event', value: 'internal' },
  { title: 'Timeout Event', value: 'timeout' },
]

const events = computed(() => {
  const fsm = protocolStore.getCurrentFSM()
  return fsm?.events || []
})

function getEventColor(type: EventType): string {
  switch (type) {
    case 'input': return 'blue'
    case 'output': return 'green'
    case 'internal': return 'purple'
    case 'timeout': return 'orange'
    default: return 'grey'
  }
}

function getEventTypeLabel(type: EventType): string {
  switch (type) {
    case 'input': return 'in'
    case 'output': return 'out'
    case 'internal': return 'int'
    case 'timeout': return 'time'
    default: return type
  }
}

function addEvent() {
  isEditing.value = false
  editingEvent.value = {
    name: '',
    type: 'input',
    description: '',
  }
  showDialog.value = true
}

function editEvent(event: FSMEvent) {
  isEditing.value = true
  originalEventName.value = event.name
  editingEvent.value = { ...event }
  showDialog.value = true
}

function confirmDeleteEvent(event: FSMEvent) {
  deletingEvent.value = event
  showDeleteDialog.value = true
}

async function saveEvent() {
  const { valid } = await form.value.validate()
  if (!valid) return

  const fsm = protocolStore.getCurrentFSM()
  if (!fsm) return

  if (!fsm.events) {
    fsm.events = []
  }

  if (isEditing.value && editingEvent.value.name) {
    // Update existing event (find by original name)
    const index = fsm.events.findIndex(e => e.name === originalEventName.value)
    if (index !== -1) {
      fsm.events[index] = editingEvent.value as FSMEvent
    }
  } else {
    // Check for duplicate name
    const duplicate = fsm.events.find(e => e.name === editingEvent.value.name)
    if (duplicate) {
      alert('Event name must be unique')
      return
    }

    // Add new event
    const newEvent: FSMEvent = {
      name: editingEvent.value.name!,
      type: editingEvent.value.type!,
      description: editingEvent.value.description,
    }
    fsm.events.push(newEvent)
  }

  closeDialog()

  // Persist changes to SVG
  await protocolRenderStore.saveFSMChanges()
}

async function deleteEvent() {
  if (!deletingEvent.value) return

  const fsm = protocolStore.getCurrentFSM()
  if (!fsm || !fsm.events) return

  const index = fsm.events.findIndex(e => e.name === deletingEvent.value!.name)
  if (index !== -1) {
    fsm.events.splice(index, 1)
  }

  showDeleteDialog.value = false
  deletingEvent.value = null

  // Persist changes to SVG
  await protocolRenderStore.saveFSMChanges()
}

function closeDialog() {
  showDialog.value = false
  editingEvent.value = {}
}
</script>

<style scoped>
.events-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.event-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.event-item:last-child {
  border-bottom: none;
}

.event-type-chip {
  min-width: 30px;
  justify-content: center;
  margin-right: 10px;
}
</style>
