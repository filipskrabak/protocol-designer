<template>
  <v-dialog v-model="modalRef" width="800">
    <v-card>
      <v-card-title class="text-center">
        <span
          v-if="protocolStore.editingMode == EditingMode.Edit"
          class="text-h5"
          >{{ protocolStore.editingField.display_name }}</span
        >
        <span v-else class="text-h5">New Field</span>
      </v-card-title>
      <v-tabs
        v-model="tab"
        bg-color="grey-lighten-4"
        align-tabs="center"
        style="overflow: visible"
      >
        <v-tab value="one">Field</v-tab>
        <v-tab value="two">Options and Values</v-tab>
      </v-tabs>
      <v-form @submit.prevent="saveEdit()" v-model="form">
        <v-card-text>
          <v-window v-model="tab">
            <v-window-item value="one">
              <FieldTab />
            </v-window-item>

            <v-window-item value="two">
              <OptionTab />
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="modalRef = false">
            Close
          </v-btn>
          <v-btn color="blue-darken-1" variant="text" type="submit">
            Save
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useProtocolStore } from "@/store/ProtocolStore";
import { useNotificationStore } from "@/store/NotificationStore";
import { EditingMode, Endian } from "@/contracts";
import FieldTab from "@/components/modals/fieldedittabs/FieldTab.vue";
import OptionTab from "@/components/modals/fieldedittabs/OptionTab.vue";

const protocolStore = useProtocolStore();
const notificationStore = useNotificationStore();

const tab = ref("one");

const props = defineProps({
  fieldEditModal: Boolean,
});

const form = ref(false);

const emit = defineEmits(["modal", "save"]);

// Send info about the modal to the parent component
const modalRef = computed({
  get: () => props.fieldEditModal,
  set: (value: boolean) => {
    emit("modal", value);
  },
});

// Save edit
function saveEdit() {
  if (!form.value) {
    notificationStore.showNotification({
      message: "Please fix the errors before saving",
      timeout: 3000,
      color: "error",
      icon: "mdi-alert",
    });

    return;
  }

  protocolStore.saveEditingField();
  emit("save");
  modalRef.value = false;

  notificationStore.showNotification({
    message: `The field ${protocolStore.editingField.display_name} has been updated`,
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}
</script>

<style></style>
