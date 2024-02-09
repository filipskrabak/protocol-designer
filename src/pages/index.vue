<template>

    <v-tabs
      v-model="tab"
      align-tabs="center"
      class="mb-3"
      v-if="protocolStore.uploaded"
      bg-color="grey-lighten-4"
    >
      <v-tab :value="1">Protocol Header</v-tab>
      <v-tab :value="2">Properties</v-tab>
      <v-tab :value="3">Encapsulation</v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item :value="1">
        <v-container fluid>
          <ProtocolViewer />
        </v-container>
      </v-window-item>
      <v-window-item :value="2">
        <v-container class="tab-container">
          <ProtocolProperties />
        </v-container>
      </v-window-item>
      <v-window-item :value="3">

      </v-window-item>
    </v-window>

</template>

<script lang="ts" setup>
import ProtocolViewer from '@/components/ProtocolViewer.vue';

import { ref } from 'vue';
import { useProtocolStore } from '@/store/ProtocolStore';

const protocolStore = useProtocolStore();

const tab = ref<number>(1);
</script>

<style scoped>
@media only screen and (min-width: 960px) {
  .tab-container {
    max-width: 960px;
  }
}
</style>
