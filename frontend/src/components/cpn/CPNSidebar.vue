<template>
  <div class="cpn-sidebar">
    <!-- Element Palette -->
    <v-card class="ma-3" elevation="2">
      <v-card-title class="d-flex align-center text-subtitle-1">
        <v-icon class="me-2" size="18">mdi-drag</v-icon>
        CPN Elements
      </v-card-title>
      <v-card-text class="pt-0">
        <div class="text-caption text-medium-emphasis mb-3">
          Drag elements to the canvas
        </div>

        <div class="cpn-elements">
          <!-- Place -->
          <div
            class="cpn-element"
            draggable="true"
            @dragstart="onDragStart($event, 'place')"
          >
            <div class="place-preview-circle">P</div>
            <span class="element-label">Place</span>
          </div>

          <!-- Transition -->
          <div
            class="cpn-element"
            draggable="true"
            @dragstart="onDragStart($event, 'transition')"
          >
            <div class="transition-preview-rect">T</div>
            <span class="element-label">Transition</span>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Color Sets -->
    <v-card class="ma-3" elevation="2">
      <v-card-title class="d-flex align-center text-subtitle-1">
        <v-icon class="me-2" size="18">mdi-palette</v-icon>
        Color Sets
        <v-spacer />
        <v-btn
          size="x-small"
          icon="mdi-plus"
          variant="text"
          color="primary"
          @click="$emit('openColorSetBuilder')"
        />
      </v-card-title>
      <v-card-text class="pt-0">
        <div v-if="colorSets.length === 0" class="text-caption text-medium-emphasis">
          No color sets defined. Click + to add one.
        </div>
        <v-list density="compact" class="pa-0" v-else>
          <v-list-item
            v-for="cs in colorSets"
            :key="cs.id"
            density="compact"
            class="px-0"
          >
            <template #prepend>
              <v-chip
                size="x-small"
                :color="colorSetChipColor(cs.type)"
                class="me-2"
              >{{ cs.type }}</v-chip>
            </template>
            <v-list-item-title class="text-body-2">{{ cs.name }}</v-list-item-title>
            <v-list-item-subtitle v-if="cs.type === 'int'" class="text-caption">
              [{{ cs.intMin }} .. {{ cs.intMax }}]
            </v-list-item-subtitle>
            <v-list-item-subtitle v-else-if="cs.type === 'enum'" class="text-caption">
              {{ cs.enumValues?.join(', ') }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Variables -->
    <v-card class="ma-3" elevation="2">
      <v-card-title class="d-flex align-center text-subtitle-1">
        <v-icon class="me-2" size="18">mdi-variable</v-icon>
        Variables
        <v-spacer />
        <v-btn
          size="x-small"
          icon="mdi-plus"
          variant="text"
          color="primary"
          @click="$emit('openVariableEditor')"
        />
      </v-card-title>
      <v-card-text class="pt-0">
        <div v-if="variables.length === 0" class="text-caption text-medium-emphasis">
          No variables defined.
        </div>
        <v-list density="compact" class="pa-0" v-else>
          <v-list-item
            v-for="v in variables"
            :key="v.id"
            density="compact"
            class="px-0"
          >
            <v-list-item-title class="text-body-2">
              {{ v.name }}
              <span class="text-caption text-medium-emphasis ms-1">
                : {{ colorSetNameById(v.colorSetId) }}
              </span>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCPNStore } from '@/store/CPNStore'
import { useCPNDragAndDrop } from './composables/useCPNDragAndDrop'
import type { ColorSet } from '@/contracts/models'

defineEmits<{
  openColorSetBuilder: []
  openVariableEditor: []
}>()

const { onDragStart } = useCPNDragAndDrop()
const cpnStore = useCPNStore()

const colorSets = computed<ColorSet[]>(() => cpnStore.getCurrentCPN()?.colorSets ?? [])
const variables = computed(() => cpnStore.getCurrentCPN()?.variables ?? [])

function colorSetNameById(id: string): string {
  return colorSets.value.find(cs => cs.id === id)?.name ?? id
}

function colorSetChipColor(type: string): string {
  switch (type) {
    case 'bool':   return 'orange'
    case 'int':    return 'blue'
    case 'enum':   return 'green'
    case 'unit':   return 'grey'
    default:       return 'grey'
  }
}
</script>

<style scoped>
.cpn-sidebar {
  width: 240px;
  min-width: 240px;
  height: 100%;
  background-color: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(0, 0, 0, 0.12);
  overflow-y: auto;
  flex-shrink: 0;
}

.cpn-elements {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cpn-element {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: grab;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  user-select: none;
  transition: all 0.15s ease;
}

.cpn-element:hover {
  border-color: #9e9e9e;
  background: #f9f9f9;
  transform: translateX(-2px);
}

.place-preview-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.transition-preview-rect {
  width: 36px;
  height: 50px;
  border-radius: 3px;
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.element-label {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}
</style>
