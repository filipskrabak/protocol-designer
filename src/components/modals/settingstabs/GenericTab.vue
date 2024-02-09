<template>
    <h3>Sizing</h3>
    <v-divider class="mb-3 mt-1"></v-divider>
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          label="Bits per row"
          placeholder="Bits per row"
          type="number"
          v-model="settingsStore.bitsPerRow"
          suffix="bits"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          label="Pixels per bit"
          placeholder="Pixels per bit"
          type="number"
          v-model="settingsStore.pixelsPerBit"
          suffix="pixels"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-switch
          v-model="settingsStore.showScale"
          label="Show scale"
          color="primary"
        ></v-switch>
      </v-col>
    </v-row>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/store/SettingsStore';

const settingsStore = useSettingsStore();

</script>
