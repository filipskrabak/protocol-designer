<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="460">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2" color="purple">mdi-arrow-right</v-icon>
        Edit Arc Inscription
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="form.inscription"
          label="Inscription"
          variant="outlined"
          density="compact"
          hint='Multiset expression: e.g.  1`x  or  2`ACK ++ 1`SYN  or  n`p'
          persistent-hint
          class="mb-3"
          style="font-family: monospace"
          :error-messages="inscriptionError ? [inscriptionError] : []"
        />

        <v-textarea
          v-model="form.description"
          label="Description (optional)"
          variant="outlined"
          density="compact"
          rows="2"
          auto-grow
        />
      </v-card-text>

      <v-card-actions>
        <v-btn color="error" variant="text" @click="$emit('delete', edgeId)">Delete Arc</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { CPNArcEdgeData } from '@/contracts/models'
import type { CPNVariable } from '@/contracts/models'
import { parseInscription } from '@/utils/cpn/tokenEvaluator'

const props = defineProps<{
  modelValue: boolean
  edgeId: string
  edgeData: CPNArcEdgeData | null
  variables?: CPNVariable[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [edgeId: string, data: CPNArcEdgeData]
  delete: [edgeId: string]
}>()



const form = ref<CPNArcEdgeData>({
  inscription: '1`x',
  description: '',
})

watch(
  () => props.edgeData,
  (data) => {
    if (!data) return
    form.value = {
      inscription: data.inscription ?? '1`x',
      description: data.description ?? '',
    }
  },
  { immediate: true },
)

// Fake bindings to detect undeclated vars
const dummyBindings = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const v of (props.variables ?? [])) {
    out[v.name] = '0'
  }
  return out
})

/**
 * Returns an error string if the inscription is invalid, otherwise null.
 * Checks:
 *   1. Syntax / parse errors (malformed expressions)
 *   2. Identifier tokens that are not declared variables or numeric/bool literals
 */
const inscriptionError = computed<string | null>(() => {
  const insc = form.value.inscription?.trim()
  if (!insc || insc.toLowerCase() === 'empty') return null

  // Try to parse, this catches syntax errors
  try {
    parseInscription(insc, dummyBindings.value)
  } catch (e: any) {
    return e?.message ?? 'Invalid inscription'
  }
  // Get all identifier tokens from color positions
  const declaredNames = new Set(Object.keys(dummyBindings.value))
  const parts = insc.split('++')
  const undeclared: string[] = []

  for (const part of parts) {
    const p = part.trim()
    if (!p) continue
    const btIdx = p.indexOf('`')
    const colorToken = (btIdx === -1 ? p : p.slice(btIdx + 1)).trim()
    // Skip numeric literals, bool literals, and declared variables
    const isNumeric = /^-?\d+(\.\d+)?$/.test(colorToken)
    const isBool = colorToken === 'true' || colorToken === 'false'
    const isUnit = colorToken === '()'
    // Allow arithmetic expressions that reference only declared variables (e.g. n-1, n+1)
    const isArith = (() => {
      let test = colorToken
      for (const name of declaredNames) {
        test = test.replace(new RegExp(`\\b${name}\\b`, 'g'), '0')
      }
      return /^[\d\s()+\-*/.]+$/.test(test)
    })()
    if (!isNumeric && !isBool && !isUnit && !isArith && !declaredNames.has(colorToken)) {
      undeclared.push(colorToken)
    }
  }

  if (undeclared.length > 0) {
    return `Undeclared variable${undeclared.length > 1 ? 's' : ''}: ${undeclared.join(', ')} - add ${undeclared.length > 1 ? 'them' : 'it'} in the Variable Editor`
  }

  return null
})

function save() {
  emit('save', props.edgeId, { ...form.value })
  emit('update:modelValue', false)
}
</script>
