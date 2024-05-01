<template>
  <div v-if="items.length > 0" class="d-flex justify-center mb-2">
    <span v-for="(item, index) in items" :key="index">
      <v-icon v-if="index !== 0" icon="mdi-chevron-right"></v-icon>
      <v-chip
        v-if="!item.disabled"
        color="primary"
        class="mx-2"
        @click="onBreadcrumbClick(item)"
      >
        {{ item.title }}
      </v-chip>
      <v-chip v-else class="mx-2">
        {{ item.title }}
      </v-chip>
    </span>
    <v-dialog v-model="dialog" width="auto">
      <v-card
        max-width="400"
        prepend-icon="mdi-folder-open"
        title="Select a protocol to view"
      >
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="protocol in currentItem?.protocols"
              :key="protocol.id"
              @click="
                onBreadcrumbClick({
                  title: protocol.name,
                  protocols: [protocol],
                })
              "
            >
              <v-list-item-title>{{ protocol.name }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { useProtocolStore } from "@/store/ProtocolStore";
import { Protocol } from "@/contracts";
import { watch } from "vue";
import axios from "axios";
import router from "@/router";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";

const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();

const items = ref<BreadcrumbItem[]>([]);
const dialog = ref(false);
const currentItem = ref<BreadcrumbItem | null>(null);

interface BreadcrumbItem {
  title: string;
  protocols: Protocol[];
  disabled?: boolean;
}

async function onBreadcrumbClick(item: BreadcrumbItem) {
  if (item.protocols.length == 1) {
    const protocol = item.protocols[0];
    await router.push({ path: "/protocols/" + protocol.id });

    protocolRenderStore.rawProtocolData = "";
    await protocolRenderStore.initializeProtocolRaw();
    dialog.value = false;
  } else {
    currentItem.value = item;
    dialog.value = true;
  }
}

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

        breadcrumbsData.forEach((element: Protocol[]) => {
          let title = "";

          if (element.length <= 2) {
            for (let i = 0; i < element.length; i++) {
              title += element[i].name + " ";

              if (i < element.length - 1) {
                title += ", ";
              }
            }
          } else {
            title = element[0].name + ", ...";
          }

          items.value.push({
            title: title,
            protocols: element,
          });
        });

        items.value.push({
          title: protocolStore.protocol.name,
          protocols: [protocolStore.protocol],
          disabled: true,
        });
      } catch (error) {
        console.log(error);
      }
    }
  },
);
</script>
