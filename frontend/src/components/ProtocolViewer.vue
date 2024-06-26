<template>
  <ProtocolBreadcrumbs />
  <div class="d-flex justify-center mb-3" v-if="protocolStore.uploaded">
    <h1>{{ protocolStore.protocol.name }}</h1>
  </div>
  <div class="d-flex justify-center align-center">
    <!-- Skeleton -->
    <template v-if="protocolStore.uploaded">
      <v-skeleton-loader
        type="table-row, table-row, table-row, table-row"
        height="240"
        width="380"
        v-if="protocolRenderStore.loading"
      >
      </v-skeleton-loader>
    </template>

    <!-- SVG Wrapper -->
    <div ref="svgWrapper"></div>

    <!-- Single Field Tooltip -->
    <div
      class="tooltip"
      v-if="protocolRenderStore.fieldTooltip.show"
      :style="{
        top: protocolRenderStore.fieldTooltip.y + 'px',
        left: protocolRenderStore.fieldTooltip.x + 'px',
      }"
    >
      <div class="tooltip-inner">
        <div class="tooltip-header">
          <h4>{{ protocolRenderStore.fieldTooltip.field.id }}</h4>
        </div>
        <div class="tooltip-body">Length: {{ getFieldLength() }}</div>
      </div>
    </div>

    <!-- Single Field Context Menu -->
    <v-overlay v-model="protocolRenderStore.fieldContextMenu.show">
      <v-menu
        v-model="protocolRenderStore.fieldContextMenu.show"
        offset-y
        absolute
        location-strategy="static"
        :style="{
          top: protocolRenderStore.fieldContextMenu.y + 'px',
          left: protocolRenderStore.fieldContextMenu.x + 'px',
        }"
      >
        <v-list>
          <v-list-subheader>{{
            protocolRenderStore.fieldTooltip.field.display_name
          }}</v-list-subheader>
          <v-list-item
            prepend-icon="mdi-pencil"
            @click="
              protocolRenderStore.showFieldEditModal(
                protocolRenderStore.fieldTooltip.field,
              )
            "
          >
            <v-list-item-title>Edit Field</v-list-item-title>
          </v-list-item>
          <!-- Add to the left -->
          <v-list-item
            prepend-icon="mdi-arrow-left-thick"
            @click="
              protocolRenderStore.showFieldAddModal(
                protocolRenderStore.fieldTooltip.field,
                AddFieldPosition.Before,
              )
            "
          >
            <v-list-item-title>Add new Field before</v-list-item-title>
          </v-list-item>
          <!-- Add to the right -->
          <v-list-item
            prepend-icon="mdi-arrow-right-thick"
            @click="
              protocolRenderStore.showFieldAddModal(
                protocolRenderStore.fieldTooltip.field,
                AddFieldPosition.After,
              )
            "
          >
            <v-list-item-title>Add new Field after</v-list-item-title>
          </v-list-item>
          <v-list-item
            prepend-icon="mdi-delete"
            @click="
              protocolRenderStore.showFieldDeleteModal(
                protocolRenderStore.fieldTooltip.field,
              )
            "
          >
            <v-list-item-title>Delete Field</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-overlay>
  </div>

  <!-- Append new Field -->
  <v-row class="mt-3" v-if="protocolStore.uploaded">
    <v-col cols="12" class="d-flex justify-center">
      <v-btn
        @click="
          protocolRenderStore.showFieldAddModal(null, AddFieldPosition.End)
        "
        icon="mdi-plus"
        size="small"
      >
        <v-icon>mdi-plus</v-icon>
        <v-tooltip activator="parent" location="top">Add a new Field</v-tooltip>
      </v-btn>
    </v-col>
  </v-row>

  <!-- TIPs alert -->
  <v-row class="d-flex justify-center pt-5">
    <v-col md="4">
      <v-alert
        type="info"
        outlined
        elevation="2"
        icon="mdi-information"
        class="mb-4"
        closable
        v-if="protocolStore.uploaded"
      >
        <strong>Tip:</strong> Right-click on a field to open the context menu.
      </v-alert>
    </v-col>
  </v-row>

  <FieldEditModal
    :fieldEditModal="protocolRenderStore.fieldEditModal"
    @modal="protocolRenderStore.closeFieldModal()"
    @save="protocolRenderStore.initialize()"
  />
  <FieldDeleteModal />
  <FieldEncapsulateModal />
</template>

<script setup lang="ts">
import { ref } from "vue";

import FieldEditModal from "./modals/FieldEditModal.vue";
import FieldDeleteModal from "./modals/FieldDeleteModal.vue";
import FieldEncapsulateModal from "./modals/FieldEncapsulateModal.vue";

import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { onMounted } from "vue";
import { useProtocolStore } from "@/store/ProtocolStore";
import { watch } from "vue";

import { AddFieldPosition, EncapsulatedProtocol } from "@/contracts";
import axios from "axios";
import ProtocolBreadcrumbs from "./breadcrumbs/ProtocolBreadcrumbs.vue";

// Stores
const protocolRenderStore = useProtocolRenderStore();
const protocolStore = useProtocolStore();

// Refs
const svgWrapper = ref<HTMLElement>();

onMounted(async () => {
  if (svgWrapper.value) {
    protocolRenderStore.svgWrapper = svgWrapper.value;
  }

  protocolRenderStore.loading = true;
  await protocolRenderStore.initializeProtocolRaw();
  protocolRenderStore.loading = false;
});

// used when a new protocol is created (clears the old protocol)
watch(
  () => protocolStore.uploaded,
  (newVal) => {
    if (!newVal) {
      if (svgWrapper.value) {
        svgWrapper.value.innerHTML = "";
        svgWrapper.value.style.width = "0";
        svgWrapper.value.style.height = "0";
      }
    }
  },
);

function getFieldLength() {
  if (protocolRenderStore.fieldTooltip.field.is_variable_length) {
    if(protocolRenderStore.fieldTooltip.field.length === 0 && protocolRenderStore.fieldTooltip.field.max_length === 0) {
      return "Unknown length"
     } else {
      return (
        "min: " +
        protocolRenderStore.fieldTooltip.field.length +
        " b, max: " +
        protocolRenderStore.fieldTooltip.field.max_length +
        " b"
      );
    }
  }
  return protocolRenderStore.fieldTooltip.field.length + " b";
}

// Encapsulation

watch(
  () => protocolRenderStore.loading,
  (currentVal, prevVal) => {
    if (protocolStore.protocol?.fields?.length === 0) {
      return;
    }

    if(currentVal == false) {
      onProtocolChange(true);
    }
  },
  { immediate: true },
);

async function onProtocolChange(newProtocol: boolean = false) {
  if (newProtocol) {
    protocolStore.encapsulatedProtocols = [] as EncapsulatedProtocol[];

    try {
      const result = await axios.get(
        `/protocol-encapsulations/${protocolStore.protocol.id}`,
      );

      console.log(result.data);

      result.data.forEach((encapsulation: any) => {
        protocolStore.encapsulatedProtocols.push({
          id: encapsulation.id,
          protocol: encapsulation.protocol,
          used_for_encapsulation_fields: encapsulation.fields ?? [],
        });
      });
    } catch (error) {
      console.log(error);
    }
  }
}
</script>

<style scoped>
.dataElement {
  cursor: pointer;
}

.dataElement:hover rect {
  fill: rgb(216, 216, 216);
}

.tooltip {
  position: fixed;
  z-index: 100;
  background-color: #f9f9f9;
  border-radius: 5px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
  width: 200px;
  padding: 5px;
  transition: all 0.3s;
}
.tooltip-inner {
  text-align: center;
}
</style>
