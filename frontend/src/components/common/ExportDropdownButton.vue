<template>
  <v-menu location="bottom end">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        :prepend-icon="icon"
        :color="color"
        :variant="variant"
        :disabled="disabled"
        :class="btnClass"
        append-icon="mdi-chevron-down"
      >
        {{ label }}
      </v-btn>
    </template>

    <v-list density="compact" min-width="180">
      <v-list-item
        v-for="item in items"
        :key="item.id"
        :prepend-icon="item.icon"
        :title="item.label"
        :disabled="item.disabled ?? false"
        @click="item.onClick"
      />
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import type { ExportDropdownItem } from '@/contracts'

withDefaults(
  defineProps<{
    label: string;
    icon?: string;
    color?: string;
    variant?: "flat" | "outlined" | "tonal" | "text" | "elevated" | "plain";
    disabled?: boolean;
    btnClass?: string;
    items: ExportDropdownItem[];
  }>(),
  {
    icon: "mdi-download",
    color: "primary",
    variant: "outlined",
    disabled: false,
    btnClass: "",
  }
);
</script>
