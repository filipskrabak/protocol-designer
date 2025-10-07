<template>
  <v-avatar :color="color" :size="size">
    <span :class="textClass">{{ initials }}</span>
  </v-avatar>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
  name?: string;
  size?: string | number;
  color?: string;
}>();

// Extract initials from name
const initials = computed(() => {
  if (!props.name) return '?';

  const words = props.name.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word: take first two characters
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple words: take first character of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  }
});

// Determine text size based on avatar size
const textClass = computed(() => {
  const sizeNum = typeof props.size === 'number' ? props.size : parseInt(props.size || '40');

  if (sizeNum <= 32) return 'text-caption';
  if (sizeNum <= 48) return 'text-body-2';
  if (sizeNum <= 64) return 'text-h6';
  return 'text-h5';
});
</script>

<style scoped>
span {
  color: white;
  font-weight: 500;
  user-select: none;
}
</style>
