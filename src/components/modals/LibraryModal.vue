<template>
  <v-dialog v-model="modalRef" width="900">
    <v-card>
      <v-card-title class="text-center">
        <span class="text-h5">Protocol Library</span>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col md="12">
            <v-divider></v-divider>
          </v-col>
        </v-row>

        <!-- Protocol Library -->
        <v-row>
          <v-col md="12">
            <v-data-table
              :headers="[
                { title: 'Name', value: 'name' },
                { title: 'Author', value: 'author' },
                { title: 'Version', value: 'version' },
                { title: 'Created', value: 'created' },
                { title: 'Actions', value: 'actions', sortable: false },
              ]"
              :items="protocolLibraryStore.protocols"
              :items-per-page="5"
              class="elevation-1"
            >
              <template v-slot:top>
                <v-toolbar flat>
                  <v-toolbar-title>Protocol Library</v-toolbar-title>
                  <v-divider class="mx-4" inset vertical></v-divider>
                  <v-spacer></v-spacer>
                </v-toolbar>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-icon small class="mr-2" @click="loadProtocol(item)">
                  mdi-open-in-new
                </v-icon>
                <v-icon small @click="deleteProtocol(item)">
                  mdi-delete
                </v-icon>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="close()">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, computed } from "vue";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useNotificationStore } from "@/store/NotificationStore";
import { useProtocolLibraryStore } from "@/store/ProtocolLibraryStore";
import { useProtocolStore } from "@/store/ProtocolStore";

import { Protocol } from "@/contracts";
import _ from "lodash";
import router from "@/router";

const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();
const protocolLibraryStore = useProtocolLibraryStore();
const protocolStore = useProtocolStore();

const props = defineProps({
  libraryModal: Boolean,
});

const emit = defineEmits(["modal"]);

// Send info about the modal to the parent component
const modalRef = computed({
  get: () => props.libraryModal,
  set: (value: boolean) => {
    emit("modal", value);
  },
});

function close() {
  modalRef.value = false;
}

async function loadProtocol(protocol: Protocol) {
  protocolStore.uploaded = true;
  protocolStore.protocol = _.cloneDeep(protocol);

  await router.push({ path: "/protocols/" + protocol.id });

  protocolRenderStore.rawProtocolData = "";
  protocolRenderStore.protocolData();
  close();

  notificationStore.showNotification({
    message: `Protocol ${protocol.name} loaded`,
    color: "success",
    icon: "mdi-check",
    timeout: 3000,
  });
}

function deleteProtocol(protocol: Protocol) {
  const result = protocolLibraryStore.deleteProtocol(protocol);

  if (!result) {
    notificationStore.showNotification({
      message: `Protocol ${protocol.name} could not be deleted`,
      color: "error",
      icon: "mdi-alert",
      timeout: 3000,
    });
  } else {
    notificationStore.showNotification({
      message: `Protocol ${protocol.name} deleted`,
      color: "success",
      icon: "mdi-check",
      timeout: 3000,
    });
  }
}
</script>
