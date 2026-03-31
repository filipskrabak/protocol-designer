<template>
  <div class="cpn-place-node">
    <!-- Place circle -->
    <div class="place-circle" title="Click to edit place">
      <!-- Place name -->
      <div class="place-label">{{ data.label }}</div>

      <!-- Initial marking badge -->
      <div v-if="data.initialMarking && data.initialMarking !== '0' && data.initialMarking !== ''" class="marking-badge">
        {{ data.initialMarking }}
      </div>
    </div>

    <!-- Color set label below circle -->
    <div v-if="data.colorSetName" class="colorset-label">
      {{ data.colorSetName }}
    </div>

    <!-- Connection handles on all 4 sides -->
    <Handle id="left"   type="source" :position="Position.Left"   class="connection-handle" />
    <Handle id="right"  type="source" :position="Position.Right"  class="connection-handle" />
    <Handle id="top"    type="source" :position="Position.Top"    class="connection-handle" />
    <Handle id="bottom" type="source" :position="Position.Bottom" class="connection-handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

export interface CPNPlaceNodeData {
  label: string
  colorSetId: string
  colorSetName?: string
  initialMarking: string
  description?: string
  /** Node kind — used by isValidConnection to enforce bipartiteness */
  kind: 'place'
}

type CPNPlaceNodeProps = NodeProps<CPNPlaceNodeData>

defineProps<CPNPlaceNodeProps>()
</script>

<style scoped>
.cpn-place-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.place-circle {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);
  transition: box-shadow 0.2s ease, transform 0.1s ease;
  border: 2px solid #1976d2;
}

.place-circle:hover {
  box-shadow: 0 4px 14px rgba(33, 150, 243, 0.6);
  transform: scale(1.04);
}

.place-label {
  color: white;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  padding: 0 6px;
  max-width: 64px;
  word-break: break-word;
  white-space: normal;
  line-height: 1.2;
  overflow-wrap: break-word;
}

.marking-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff9800;
  color: white;
  border-radius: 10px;
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid #f57c00;
}

.colorset-label {
  margin-top: 4px;
  font-size: 9px;
  color: #1565c0;
  font-weight: 500;
  max-width: 80px;
  text-align: center;
  word-break: break-word;
  white-space: normal;
}

.connection-handle {
  width: 8px;
  height: 8px;
  background: #1976d2;
  border: 2px solid white;
  border-radius: 50%;
}
</style>
