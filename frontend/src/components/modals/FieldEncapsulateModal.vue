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
            v-for="encapsulatedProtocol in protocolStore.encapsulatedProtocols"
            :key="encapsulatedProtocol.id"
            elevation="2"
          >
            <v-list-item @click="selectProtocol(encapsulatedProtocol.protocol)">
              <template v-slot:append>
                <v-icon color="red darken-1">mdi-folder-open</v-icon>
              </template>

              <v-list-item-title
                >{{ encapsulatedProtocol.protocol.name }}
                <v-chip
                  v-for="field in encapsulatedProtocol.used_for_encapsulation_fields"
                  :key="field.id"
                  color="blue darken-1"
                  class="ml-2"
                >
                  {{ field.display_name }}

                  <v-tooltip activator="parent" location="top">
                    <p
                      v-if="
                        field.field_options.filter(
                          (fieldOption) => fieldOption.used_for_encapsulation,
                        ).length === 0
                      "
                    >
                      No field options added yet! Use the Encapsulation tab to
                      add one.
                    </p>
                    <p
                      v-for="fieldOption in field.field_options.filter(
                        (fieldOption) => fieldOption.used_for_encapsulation,
                      )"
                      :key="fieldOption.value"
                    >
                      {{ fieldOption.name }} ({{ fieldOption.value }})
                    </p>
                  </v-tooltip>
                </v-chip>
              </v-list-item-title>
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
import { useNotificationStore } from "@/store/NotificationStore";
import { Protocol } from "@/contracts";
import _ from "lodash";
import router from "@/router";

// Stores
const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();

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
</script>
