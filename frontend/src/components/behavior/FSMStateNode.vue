<template>
  <div class="fsm-state-node" :class="{ 'initial': data.isInitial, 'final': data.isFinal }">
    <!-- Initial state indicator (arrow) -->
    <div v-if="data.isInitial" class="initial-arrow">
      <v-icon size="16" color="success">mdi-play</v-icon>
    </div>

    <!-- Main state circle -->
    <div class="state-circle" title="Click to edit state">
      <!-- Final state has double circle -->
      <div v-if="data.isFinal" class="final-inner-circle"></div>

      <!-- State label -->
      <div class="state-label">
        {{ data.label }}
      </div>

      <!-- Edit indicator -->
      <div class="edit-indicator">
        <v-icon size="12" color="white">mdi-pencil</v-icon>
      </div>
    </div>

    <!-- Connection handles -->
    <Handle
      type="target"
      :position="Position.Left"
      class="connection-handle"
    />
    <Handle
      type="source"
      :position="Position.Right"
      class="connection-handle"
    />
    <Handle
      type="target"
      :position="Position.Top"
      class="connection-handle"
    />
    <Handle
      type="source"
      :position="Position.Bottom"
      class="connection-handle"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { FSMNodeData } from '@/contracts/models'

interface Props {
  data: FSMNodeData
}

defineProps<Props>()
</script>

<style scoped>
.fsm-state-node {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.initial-arrow {
  position: absolute;
  left: -25px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
}

.state-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
  border: 2px solid #0ea5e9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.state-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.state-circle:hover .edit-indicator {
  opacity: 1;
}

/* Initial state styling */
.initial .state-circle {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

/* Final state styling */
.final .state-circle {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
}

.final-inner-circle {
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  bottom: 6px;
  border: 2px solid #ef4444;
  border-radius: 50%;
  pointer-events: none;
}

.state-label {
  word-wrap: break-word;
  max-width: 50px;
  line-height: 1.2;
  z-index: 5;
  color: #1f2937;
}

.edit-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: rgba(14, 165, 233, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.state-circle:hover .edit-indicator {
  opacity: 1;
}

.connection-handle {
  width: 8px !important;
  height: 8px !important;
  border: 2px solid #ffffff !important;
  background: #0ea5e9 !important;
  opacity: 0 !important;
  transition: opacity 0.2s ease !important;
}

.fsm-state-node:hover .connection-handle {
  opacity: 1 !important;
}

/* Position handles around the circle */
:deep(.vue-flow__handle-left) {
  left: -4px;
  top: 50%;
}

:deep(.vue-flow__handle-right) {
  right: -4px;
  top: 50%;
}

:deep(.vue-flow__handle-top) {
  top: -4px;
  left: 50%;
}

:deep(.vue-flow__handle-bottom) {
  bottom: -4px;
  left: 50%;
}
</style>
