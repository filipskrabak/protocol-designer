<template>
  <v-container class="tab-container">
    <template v-if="protocolStore.uploaded">
      <v-skeleton-loader
        type="table-row, table-row, table-row, table-row"
        height="240"
        width="380"
        v-if="protocolRenderStore.loading"
      >
      </v-skeleton-loader>
    </template>
    <ProtocolUpload v-else />
  </v-container>
</template>

<script lang="ts" setup>
import ProtocolUpload from "@/components/ProtocolUpload.vue";

import { useProtocolStore } from "@/store/ProtocolStore";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { onMounted } from "vue";

const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();

// onmounted

onMounted(() => {
  protocolStore.clearProtocol();
});

</script>

<style scoped>
@media only screen and (min-width: 960px) {
  .tab-container {
    max-width: 960px;
  }
}
</style>
