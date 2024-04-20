<template>
  <v-container>
    <v-row>
      <v-col md="12">
        <h2 class="mb-4">Encapsulated field</h2>

        <v-alert
          text="Choose the field that contains child protocols. It's usually the 'data' field"
          title="Field used for encapsulation"
          type="info"
          closable
          class="mb-4"
        ></v-alert>
      </v-col>
      <v-col md="6">
        <v-autocomplete
          :items="
            protocolStore.protocol.fields
              .filter((field) => !field.encapsulate)
              .map((field) => {
                return { value: field.id, title: field.display_name };
              })
          "
          label="Field to encapsulate*"
          hint="Select which field contains encapsulated protocols"
          v-model="fieldToEncapsulate"
          required
          @update:model-value="saveFieldToEncapsulate"
        ></v-autocomplete>
      </v-col>
    </v-row>

    <v-divider class="my-5"></v-divider>
    <v-row>
      <v-col md="12">
        <h2 class="mb-4">Encapsulated protocols</h2>

        <v-alert
          text="Choose the protocols that are encapsulated in the selected field. For example, HTTP is encapsulated in TCP"
          title="Encapsulated protocols"
          type="info"
          closable
          class="mb-4"
        ></v-alert>

        <v-autocomplete
          :items="protocolsArrayItemsNotEncapsulated"
          label="Encapsulated protocol*"
          v-model="encapsulatedProtocol"
          chips
          required
        ></v-autocomplete>

        <v-btn
          @click="addEncapsulatedProtocol"
          color="primary"
          :disabled="!encapsulatedProtocol"
        >
          Add encapsulated protocol
        </v-btn>
      </v-col>
    </v-row>
  </v-container>

  <v-container>
    <v-card
      v-for="encapsulatedProtocol in protocolStore.encapsulatedProtocols"
      :key="encapsulatedProtocol.protocol.id"
      :title="encapsulatedProtocol.protocol.name"
      class="mt-3"
    >
      <v-card-text>
        <v-row>
          <v-col md="12">
            <template
              v-for="field in encapsulatedProtocol.used_for_encapsulation_fields"
              :key="field.id"
            >
              <v-chip
                @click="
                  selectedProtocol = encapsulatedProtocol;
                  selectedField = field;
                  fieldOptionsDialog = true;
                "
                class="mr-2"
                color="primary"
                append-icon="mdi-pencil"
              >
                <v-tooltip activator="parent" location="top">
                  <p
                    v-if="
                      field.field_options.filter(
                        (fieldOption) => fieldOption.used_for_encapsulation,
                      ).length === 0
                    "
                  >
                    No field options added yet! Click to add.
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
                {{ field.display_name }}
              </v-chip>
            </template>

            <v-chip
              v-if="
                encapsulatedProtocol.used_for_encapsulation_fields.length === 0
              "
              color="error"
            >
              No fields have been added yet! Click the button below to add
              fields.
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="
            selectedProtocol = encapsulatedProtocol;
            fieldsDialog = true;
          "
        >
          <!--
                  <v-list select-strategy="classic" lines="one" density="compact">
                    <v-list-subheader>
                      Select fields to add
                    </v-list-subheader>
                    <v-list-item v-for="field in getFieldsOfProtocol()" :key="field.value" :value="field.to_add">
                      <template v-slot:prepend="{ isActive }">
                        <v-list-item-action start>
                          <v-checkbox-btn :model-value="field.to_add"/>
                        </v-list-item-action>
                      </template>
                      <v-list-item-title>{{ field.title  }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
            -->

          Add a field
        </v-btn>
        <v-btn
          @click="removeEncapsulatedProtocol(encapsulatedProtocol.protocol.id)"
          prepend-icon="mdi-delete"
          color="error"
        >
          Remove
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>

  <encapsulation-multiple-select-modal
    :show-modal="fieldsDialog"
    modal-title="Select encapsulated fields"
    :items="fieldsOfProtocol"
    @save="addFieldsToEncapsulatedProtocol"
    :already-selected="selectedFieldsOfProtocol"
  ></encapsulation-multiple-select-modal>
  <encapsulation-multiple-select-modal
    :show-modal="fieldOptionsDialog"
    modal-title="Select field options"
    :items="fieldOptionsOfProtocol"
    @save="addFieldsOptionsToEncapsulatedProtocol"
    :already-selected="selectedFieldOptionsOfProtocol"
  ></encapsulation-multiple-select-modal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useProtocolStore } from "@/store/ProtocolStore";
import { useProtocolLibraryStore } from "@/store/ProtocolLibraryStore";
import { useNotificationStore } from "@/store/NotificationStore";
import { v4 } from "uuid";
import { EncapsulatedProtocol, Field } from "@/contracts";
import { watch } from "vue";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";

import EncapsulationMultipleSelectModal from "@/components/modals/EncapsulationMultipleSelectModal.vue";
import { onMounted } from "vue";
import axios from "axios";

// Stores
const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();
const protocolLibraryStore = useProtocolLibraryStore();

// Refs
const fieldToEncapsulate = ref("");
const encapsulatedProtocol = ref<typeof v4 | null>();

const selectedProtocol = ref<EncapsulatedProtocol | null>(null);
const selectedField = ref<Field | null>(null);
const fieldsDialog = ref(false);
const fieldOptionsDialog = ref(false);

// Lifecycle hooks

onMounted(() => {
  watch(
    () => protocolStore.protocol,
    () => {
      const field = currentEncapsulatedField.value;
      if (field) {
        fieldToEncapsulate.value = field.id;
      }
    },
    { immediate: true },
  );
});

async function addEncapsulatedProtocol() {
  if (encapsulatedProtocol.value != null) {
    const protocol = protocolLibraryStore.getProtocolById(
      encapsulatedProtocol.value,
    );

    if (!protocol) {
      notificationStore.showNotification({
        message: "Protocol not found in library",
        timeout: 3000,
        color: "error",
        icon: "mdi-alert-circle",
      });
      return;
    }

    try {
      let result = await axios.post("/protocol-encapsulation", {
        protocol_id: protocol.id,
        parent_protocol_id: protocolStore.protocol.id,
      });
    } catch (error) {
      notificationStore.showNotification({
        message: "Error adding encapsulated protocol",
        timeout: 3000,
        color: "error",
        icon: "mdi-alert-circle",
      });
      console.log(error);
      return;
    }

    protocolStore.encapsulatedProtocols.push({
      protocol: protocol,
      used_for_encapsulation_fields: [],
    });

    encapsulatedProtocol.value = null;

    notificationStore.showNotification({
      message: "Protocol has been added",
      timeout: 3000,
      color: "success",
      icon: "mdi-check",
    });
  }
}

function removeEncapsulatedProtocol(id: typeof v4) {
  protocolStore.encapsulatedProtocols =
    protocolStore.encapsulatedProtocols.filter(
      (protocol) => protocol.protocol.id !== id,
    );
  notificationStore.showNotification({
    message: "This protocol is no longer encapsulated",
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}

/**
 * Add fields to encapsulated protocol
 *
 * @param selectedItems Array of IDs of selected fields
 */
function addFieldsToEncapsulatedProtocol(selectedItems: String[]) {
  // Close dialog first
  fieldsDialog.value = false;

  if (!selectedProtocol.value) {
    throw new Error("No protocol selected");
  }

  selectedProtocol.value.used_for_encapsulation_fields =
    protocolStore.protocol.fields.filter((field) =>
      selectedItems.includes(field.id),
    );

  notificationStore.showNotification({
    message: "Field have been set",
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}

/**
 * Add field options to encapsulated protocol
 *
 * @param selectedItems Array of values of selected field options
 */
function addFieldsOptionsToEncapsulatedProtocol(selectedItems: Number[]) {
  // Close dialog first
  fieldOptionsDialog.value = false;

  if (!selectedField.value) {
    throw new Error("No field selected");
  }

  // set field_options.used_for_encapsulation to true if they are in selectedItems

  selectedField.value.field_options.forEach((fieldOption) => {
    fieldOption.used_for_encapsulation = selectedItems.includes(
      fieldOption.value,
    );
  });

  notificationStore.showNotification({
    message: "Field options have been set",
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}

/**
 * Set field to encapsulate inside CURRENT protocol
 *
 * @returns void
 */
function saveFieldToEncapsulate() {
  // Save encapsulated flag

  protocolStore.protocol.fields.forEach((field) => {
    if (field.id === fieldToEncapsulate.value) {
      field.encapsulate = true;
    } else {
      field.encapsulate = false;
    }
  });

  protocolRenderStore.initialize();

  notificationStore.showNotification({
    message: "Changes have been saved",
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}

// Computed

const protocolsArrayItemsNotEncapsulated = computed(() => {
  return protocolLibraryStore.protocols
    .filter((protocol) => {
      return !protocolStore.encapsulatedProtocols.some(
        (encapsulatedProtocol) =>
          encapsulatedProtocol.protocol.id === protocol.id,
      );
    })
    .map((protocol) => {
      return { value: protocol.id, title: protocol.name };
    });
});

const fieldsOfProtocol = computed(() => {
  return protocolStore.protocol.fields.map((field) => {
    return { value: field.id, title: field.display_name };
  });
});

const selectedFieldsOfProtocol = computed(() => {
  return (
    selectedProtocol.value?.used_for_encapsulation_fields.map(
      (field) => field.id,
    ) || []
  );
});

const fieldOptionsOfProtocol = computed(() => {
  return (
    selectedField.value?.field_options.map((fieldOption) => {
      return { value: fieldOption.value, title: fieldOption.name };
    }) || []
  );
});

const selectedFieldOptionsOfProtocol = computed(() => {
  return (
    selectedField.value?.field_options
      .filter((fieldOption) => fieldOption.used_for_encapsulation)
      .map((fieldOption) => fieldOption.value) || []
  );
});

const currentEncapsulatedField = computed(() => {
  return protocolStore.protocol.fields.find((field) => field.encapsulate);
});
</script>

<style></style>
