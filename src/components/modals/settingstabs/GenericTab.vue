<template>
    <v-text-field
      label="Bits per row"
      placeholder="Bits per row"
      type="number"
      v-model="settingsStore.bitsPerRow"
      suffix="bits"
    ></v-text-field>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store/SettingsStore';

const settingsStore = useSettingsStore();

</script>
