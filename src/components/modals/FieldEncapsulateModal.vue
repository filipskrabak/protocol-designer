<template>
  <div class="text-center pa-4">
    <v-dialog
      v-model="protocolRenderStore.fieldEncapsulateModal"
      max-width="800"
    >
      <v-card
        prepend-icon="mdi-alert"
        :title="`Field ${protocolStore.editingField.display_name} contains child protocols`"
      >
        <v-card-text>
          <!-- Alert -->
          <v-alert
            type="warning"
            outlined
            elevation="2"
            icon="mdi-alert"
            class="mb-4"
          >
            <strong>Encapsulation Warning:</strong> This field contains child
            protocols. You can select a protocol to load it and edit it, or you
            can edit this field directly.
          </v-alert>

          <v-list
            v-for="protocol in allEncapsulatedProtocols"
            :key="protocol.id"
            elevation="2"
          >
            <v-list-item @click="selectProtocol(protocol)">
              <template v-slot:append>
                <v-icon color="red darken-1">mdi-folder-open</v-icon>
              </template>

              <v-list-item-title>{{ protocol.name }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>

        <!-- OR just edit the field -->

        <v-spacer></v-spacer>

        <v-btn
          color="blue-darken-1"
          variant="text"
          @click="
            protocolRenderStore.fieldEditModal = true;
            protocolRenderStore.fieldEncapsulateModal = false;
          "
          prepend-icon="mdi-pencil"
        >
          Edit Field Instead
        </v-btn>

        <template v-slot:actions>
          <v-spacer></v-spacer>

          <v-btn
            @click="protocolRenderStore.fieldEncapsulateModal = false"
            color="blue darken-1"
            dark
          >
            Cancel
          </v-btn>
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useProtocolStore } from "@/store/ProtocolStore";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useProtocolLibraryStore } from "@/store/ProtocolLibraryStore";
import { useNotificationStore } from "@/store/NotificationStore";
import { Protocol } from "@/contracts";
import { computed } from "vue";
import { v4 } from "uuid";
import _ from "lodash";
import router from "@/router";

// Stores
const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();
const protocolLibraryStore = useProtocolLibraryStore();

async function selectProtocol(protocol: Protocol) {
  protocolStore.uploaded = true;
  protocolStore.protocol = _.cloneDeep(protocol);

  await router.push({ path: "/protocols/" + protocol.id });

  protocolRenderStore.rawProtocolData = "";
  await protocolRenderStore.initializeProtocolRaw();

  protocolRenderStore.fieldEncapsulateModal = false;

  notificationStore.showNotification({
    message: `Protocol ${protocol.name} has been loaded`,
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}

function libraryProtocolById(id: typeof v4) {
  return protocolLibraryStore.protocols.find((protocol) => protocol.id === id);
}

const allEncapsulatedProtocols = computed(() => {
  return protocolStore.encapsulatedProtocols
    .map((protocol) => {
      return libraryProtocolById(protocol.protocol.id);
    })
    .filter((protocol) => protocol !== undefined) as Protocol[];
});
</script>
