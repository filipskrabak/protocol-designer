<template>
  <div class="d-flex justify-center align-center">
    <template v-if="protocolUploaded">
      <v-skeleton-loader type="table-row, table-row, table-row, table-row" height="240" width="380" v-if="protocolRenderStore.loading">
      </v-skeleton-loader>
    </template>
    <ProtocolUpload v-else @protocolUploaded="protocolUploaded = true" @protocolData="protocolRenderStore.protocolData" />
    <div ref="svgWrapper">
    </div>
  </div>

  <ProtocolEditModal :protocolEditModal="protocolRenderStore.protocolEditModal" @modal="protocolRenderStore.toggleModal()" @save="protocolRenderStore.initialize()"/>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import ProtocolEditModal from './modals/ProtocolEditModal.vue';
import ProtocolUpload from './ProtocolUpload.vue';

import { useProtocolRenderStore } from '@/store/ProtocolRenderStore';
import { onMounted } from 'vue';

// Stores
const protocolRenderStore = useProtocolRenderStore();

// Refs
const svgWrapper = ref<HTMLElement>();
const protocolUploaded = ref(false);

onMounted(() => {
  if (svgWrapper.value) {
    protocolRenderStore.svgWrapper = svgWrapper.value;
  }
});

</script>

<style>
  .dataElement {
    cursor: pointer;
  }

  .dataElement:hover rect {
    fill: rgb(216, 216, 216);
  }
</style>
