<template>
  <g>
    <!-- Invisible wider path for easier clicking -->
    <path
      :d="path"
      fill="none"
      stroke="transparent"
      stroke-width="10"
      class="fsm-click-area"
      @click="handleClick"
    />

    <!-- Main edge path -->
    <path
      :id="id"
      :d="path"
      :style="style"
      fill="none"
      class="vue-flow__edge-path fsm-transition-path"
      :class="{ 'fsm-selected': selected }"
      @click="handleClick"
    />

    <!-- Edge label background -->
    <rect
      v-if="showLabel && edgeLabel"
      :x="labelX - labelWidth / 2 - 4"
      :y="labelY - 10"
      :width="labelWidth + 8"
      :height="20"
      rx="4"
      class="edge-label-bg"
      :class="{ 'selected': selected }"
    />

    <!-- Edge label text -->
    <text
      v-if="showLabel && edgeLabel"
      :x="labelX"
      :y="labelY + 3"
      text-anchor="middle"
      class="edge-label-text"
      :class="{ 'selected': selected }"
      @click="handleClick"
    >
      {{ edgeLabel }}
    </text>

    <!-- Arrow marker -->
    <defs>
      <marker
        :id="`arrow-${id}`"
        viewBox="0 0 10 10"
        refX="8"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        class="fsm-arrow-marker"
      >
        <path
          d="M0,0 L0,6 L9,3 z"
          :fill="selected ? '#0ea5e9' : '#374151'"
        />
      </marker>
    </defs>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FSMEdgeData } from '@/contracts/models'

interface Props {
  id: string
  path: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  selected?: boolean
  data?: FSMEdgeData
  style?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edgeClick: [event: MouseEvent, edge: { id: string; source: string; target: string; data?: FSMEdgeData }]
}>()

// Handle click events
function handleClick(event: MouseEvent) {
  event.stopPropagation()
  emit('edgeClick', event, {
    id: props.id,
    source: props.source,
    target: props.target,
    data: props.data
  })
}

// Calculate label content
const edgeLabel = computed(() => {
  const parts = []

  if (props.data?.event) {
    parts.push(props.data.event)
  }

  if (props.data?.condition) {
    parts.push(`[${props.data.condition}]`)
  }

  if (props.data?.action) {
    parts.push(`/ ${props.data.action}`)
  }

  return parts.length > 0 ? parts.join(' ') : null
})

// Show label
const showLabel = computed(() => {
  return edgeLabel.value !== null
})

// Calculate label dimensions and position
const labelWidth = computed(() => {
  return edgeLabel.value ? Math.max(edgeLabel.value.length * 8, 60) : 60
})

const labelX = computed(() => {
  return (props.sourceX + props.targetX) / 2
})

const labelY = computed(() => {
  return (props.sourceY + props.targetY) / 2
})

// Edge styling
const style = computed(() => ({
  ...props.style,
  stroke: props.selected ? '#0ea5e9' : '#374151',
  strokeWidth: props.selected ? 3 : 2,
  markerEnd: `url(#arrow-${props.id})`,
  fill: 'none'
}))
</script>

<style scoped>
.fsm-click-area {
  cursor: pointer;
}

.fsm-transition-path {
  cursor: pointer;
  transition: all 0.2s ease;
  stroke: #374151;
  stroke-width: 2px;
}

.fsm-transition-path:hover {
  stroke-width: 3px !important;
  stroke: #0ea5e9 !important;
}

.fsm-selected {
  stroke: #0ea5e9 !important;
  stroke-width: 3px !important;
}

.edge-label-bg {
  fill: white;
  stroke: #e5e7eb;
  stroke-width: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edge-label-bg:hover,
.edge-label-bg.selected {
  fill: #e7f3ff;
  stroke: #0ea5e9;
  stroke-width: 2;
}

.edge-label-text {
  font-size: 12px;
  font-weight: 500;
  fill: #374151;
  cursor: pointer;
  user-select: none;
  transition: fill 0.2s ease;
}

.edge-label-text:hover,
.edge-label-text.selected {
  fill: #0ea5e9;
}

.fsm-arrow-marker path {
  transition: fill 0.2s ease;
}
</style>
