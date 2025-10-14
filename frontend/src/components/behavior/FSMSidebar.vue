<template>
  <div class="fsm-sidebar">
    <v-card class="ma-4" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-drag</v-icon>
        <span>FSM Elements</span>
      </v-card-title>

      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-3">
          Drag elements to the canvas to use them
        </div>

        <div class="fsm-elements">
          <!-- Initial State -->
          <div
            class="fsm-element initial-state"
            draggable="true"
            @dragstart="onDragStart($event, 'initial')"
          >
            <div class="state-preview initial-preview">
              <div class="preview-arrow">▶</div>
              <div class="preview-circle">Start</div>
            </div>
            <span class="element-label">Initial State</span>
          </div>

          <!-- Normal State -->
          <div
            class="fsm-element normal-state"
            draggable="true"
            @dragstart="onDragStart($event, 'state')"
          >
            <div class="state-preview normal-preview">
              <div class="preview-circle">S1</div>
            </div>
            <span class="element-label">State</span>
          </div>

          <!-- Final State -->
          <div
            class="fsm-element final-state"
            draggable="true"
            @dragstart="onDragStart($event, 'final')"
          >
            <div class="state-preview final-preview">
              <div class="preview-circle">
                <div class="inner-circle"></div>
                End
              </div>
            </div>
            <span class="element-label">Final State</span>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Instructions -->
    <!--<v-card class="ma-4" elevation="1">
      <v-card-text>
        <div class="text-caption">
          <v-icon size="small" class="me-1">mdi-information</v-icon>
          <strong>How to use:</strong>
        </div>
        <ul class="text-caption mt-2" style="padding-left: 16px;">
          <li>Drag elements from here to the canvas</li>
          <li>Connect states by dragging between connection points</li>
          <li>Use one initial state per FSM</li>
          <li>Add multiple final states as needed</li>
        </ul>
      </v-card-text>
    </v-card>-->
  </div>
</template>

<script setup lang="ts">
import useFSMDragAndDrop from './useFSMDragAndDrop'

const { onDragStart } = useFSMDragAndDrop()
</script>

<style scoped>
.fsm-sidebar {
  width: 280px;
  min-width: 280px;
  height: 100%;
  background-color: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(0, 0, 0, 0.12);
  overflow-y: auto;
  flex-shrink: 0;
}

.fsm-elements {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fsm-element {
  display: flex;
  align-items: center;
  padding: 16px 12px;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  gap: 12px;
}

.fsm-element:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.fsm-element:active {
  cursor: grabbing;
  transform: translateY(0);
}

.state-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.preview-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  border: 2px solid;
  position: relative;
  background: #ffffff;
}

.preview-arrow {
  font-size: 12px;
  color: #10b981;
  margin-right: -2px;
}

.element-label {
  font-weight: 500;
  font-size: 14px;
}

/* Initial state styling */
.initial-state {
  border-color: #10b981;
}

.initial-preview .preview-circle {
  border-color: #10b981;
  color: #065f46;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.initial-state .element-label {
  color: #065f46;
}

/* Normal state styling */
.normal-state {
  border-color: #0ea5e9;
}

.normal-preview .preview-circle {
  border-color: #0ea5e9;
  color: #0369a1;
  background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%);
}

.normal-state .element-label {
  color: #0369a1;
}

/* Final state styling */
.final-state {
  border-color: #ef4444;
}

.final-preview .preview-circle {
  border-color: #ef4444;
  color: #dc2626;
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
}

.inner-circle {
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border: 1px solid #ef4444;
  border-radius: 50%;
}

.final-state .element-label {
  color: #dc2626;
}
</style>
