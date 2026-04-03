<template>
  <div class="cpn-transition-node" title="Click to edit transition">
    <!-- Transition rectangle -->
    <div class="transition-rect">
      <div class="transition-label">{{ data.label }}</div>

      <!-- Guard expression badge -->
      <div v-if="data.guard" class="guard-badge" :title="data.guard">
        [{{ data.guard }}]
      </div>
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

export interface CPNTransitionNodeData {
  label: string
  guard?: string
  description?: string
  /** Node kind - used by isValidConnection to enforce bipartiteness */
  kind: 'transition'
}

type CPNTransitionNodeProps = NodeProps<CPNTransitionNodeData>

defineProps<CPNTransitionNodeProps>()
</script>

<style scoped>
.cpn-transition-node {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transition-rect {
  position: relative;
  width: 50px;
  height: 100px;
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
  border: 2px solid #388e3c;
  transition: box-shadow 0.2s ease, transform 0.1s ease;
}

.transition-rect:hover {
  box-shadow: 0 4px 14px rgba(76, 175, 80, 0.6);
  transform: scale(1.04);
}

.transition-label {
  color: white;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  padding: 0 4px;
  max-width: 46px;
  word-break: break-word;
  white-space: normal;
  line-height: 1.2;
  overflow-wrap: break-word;
}

.guard-badge {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #7b1fa2;
  color: white;
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 8px;
  font-weight: 600;
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid #6a1b9a;
}

.connection-handle {
  width: 8px;
  height: 8px;
  background: #388e3c;
  border: 2px solid white;
  border-radius: 50%;
}
</style>
