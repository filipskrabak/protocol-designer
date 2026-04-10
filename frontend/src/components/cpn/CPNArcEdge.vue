<template>
  <g>
    <!-- Invisible wider path for easier clicking -->
    <path
      :d="path"
      fill="none"
      stroke="transparent"
      stroke-width="10"
      class="cpn-click-area"
      @click="handleClick"
    />

    <!-- Arrow marker definition -->
    <defs>
      <marker
        :id="`cpn-arrow-${id}`"
        viewBox="0 0 10 10"
        refX="8"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M0,0 L0,6 L9,3 z" :fill="selected ? '#7b1fa2' : '#374151'" />
      </marker>
    </defs>

    <!-- Main edge path -->
    <path
      :id="id"
      :d="path"
      fill="none"
      :stroke="selected ? '#7b1fa2' : '#374151'"
      stroke-width="2"
      :stroke-dasharray="data?.arcType === 'inhibitor' ? '6,3' : undefined"
      :marker-end="`url(#cpn-arrow-${id})`"
      class="cpn-arc-path"
      :class="{ 'cpn-selected': selected }"
      @click="handleClick"
    />

    <!-- Inscription label background -->
    <rect
      v-if="inscriptionLabel"
      :x="labelX - labelTextWidth / 2 - 4"
      :y="labelY - 26"
      :width="labelTextWidth + 8"
      :height="20"
      rx="4"
      :fill="selected ? '#f3e5f5' : '#f5f5f5'"
      :stroke="selected ? '#7b1fa2' : '#bdbdbd'"
      stroke-width="1"
    />

    <!-- Inscription label text -->
    <text
      v-if="inscriptionLabel"
      :x="labelX"
      :y="labelY - 12"
      text-anchor="middle"
      class="inscription-text"
      :class="{ 'selected': selected }"
      @click="handleClick"
    >
      {{ inscriptionLabel }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getBezierPath, type Position } from '@vue-flow/core'
import type { CPNArcEdgeData } from '@/contracts/models'

interface Props {
  id: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  selected?: boolean
  data?: CPNArcEdgeData
  style?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edgeClick: [
    event: MouseEvent,
    edge: { id: string; source: string; target: string; data?: CPNArcEdgeData },
  ]
}>()

const bezier = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }),
)

const path = computed(() => bezier.value[0])
const labelX = computed(() => bezier.value[1])
const labelY = computed(() => bezier.value[2])

function handleClick(event: MouseEvent) {
  event.stopPropagation()
  emit('edgeClick', event, {
    id: props.id,
    source: props.source,
    target: props.target,
    data: props.data,
  })
}

const inscriptionLabel = computed(() => props.data?.inscription ?? '')

// Approximate text width for the label background rectangle
const labelTextWidth = computed(() => Math.max(30, inscriptionLabel.value.length * 7))
</script>

<style scoped>
.cpn-arc-path {
  cursor: pointer;
  transition: stroke 0.15s ease;
}

.cpn-arc-path:hover {
  stroke: #7b1fa2;
}

.cpn-selected {
  stroke: #7b1fa2 !important;
}

.inscription-text {
  font-size: 11px;
  fill: #374151;
  font-family: 'Courier New', monospace;
  pointer-events: none;
  font-weight: 500;
}

.inscription-text.selected {
  fill: #6a1b9a;
  font-weight: 700;
}
</style>
