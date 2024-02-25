<template>
  <div class="d-flex justify-center mb-3" v-if="protocolStore.uploaded">
      <h1>{{ protocolStore.protocol.name }}</h1>
  </div>
  <div class="d-flex justify-center align-center">
    <template v-if="protocolStore.uploaded">
      <v-skeleton-loader type="table-row, table-row, table-row, table-row" height="240" width="380" v-if="protocolRenderStore.loading">
      </v-skeleton-loader>
    </template>
    <ProtocolUpload v-else class="mt-5" @protocolUploaded="protocolStore.uploaded = true" @protocolData="protocolRenderStore.protocolData" />
    <div ref="svgWrapper">
    </div>
  </div>

  <FieldEditModal :fieldEditModal="protocolRenderStore.fieldEditModal" @modal="protocolRenderStore.closeFieldModal()" @save="protocolRenderStore.initialize()"/>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import FieldEditModal from './modals/FieldEditModal.vue';
import ProtocolUpload from './ProtocolUpload.vue';

import { useProtocolRenderStore } from '@/store/ProtocolRenderStore';
import { onMounted } from 'vue';
import { useProtocolStore } from '@/store/ProtocolStore';
import { watch } from 'vue';
import { onUpdated } from 'vue';

// Stores
const protocolRenderStore = useProtocolRenderStore();
const protocolStore = useProtocolStore();

// Refs
const svgWrapper = ref<HTMLElement>();

onMounted(() => {
  if (svgWrapper.value) {
    protocolRenderStore.svgWrapper = svgWrapper.value;
  }
});

// used when a new protocol is created (clears the old protocol)
watch(() => protocolStore.uploaded, (newVal) => {
  if (!newVal) {
    if(svgWrapper.value) {
      svgWrapper.value.innerHTML = '';
      svgWrapper.value.style.width = '0';
      svgWrapper.value.style.height = '0';
    }

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
