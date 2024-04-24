<template>
  <div v-if="items.length > 0" class="d-flex justify-center mb-2">
    <v-breadcrumbs :items="items">
      <template v-slot:divider>
        <v-icon icon="mdi-chevron-right"></v-icon>
      </template>
    </v-breadcrumbs>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { useProtocolStore } from "@/store/ProtocolStore";
import { Protocol } from "@/contracts";
import { watch } from "vue";
import axios from "axios";

const protocolStore = useProtocolStore();

const items: any = ref([]);

watch(
  () => protocolStore.protocol,
  async (newProtocol, oldProtocol) => {
    if (newProtocol.id !== oldProtocol.id) {
      // Get breadcrumbs
      try {
        items.value = [];
        const result = await axios.get(
          `/protocol-encapsulations/${protocolStore.protocol.id}/breadcrumbs`,
        );

        // Reverse order of items in result.data

        let breadcrumbsData = result.data.reverse();

        breadcrumbsData.forEach((element: any) => {
          items.value.push({
            title: element.name,
            disabled: false,
            href: `/protocols/${element.id}`,
          });
        });

        items.value.push({
          title: protocolStore.protocol.name,
          disabled: true,
        });
      } catch (error) {
        console.log(error);
      }
    }
  },
);
</script>
