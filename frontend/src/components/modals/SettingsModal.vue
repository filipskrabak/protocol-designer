<template>
  <v-dialog v-model="modalRef" width="900">
    <v-card>
      <v-card-title class="text-center">
        <span class="text-h5">Settings</span>
      </v-card-title>
      <v-tabs
        v-model="tab"
        bg-color="grey-lighten-4"
        style="overflow: visible"
        align-tabs="center"
      >
        <v-tab value="one">Protocol</v-tab>
      </v-tabs>

      <v-card-text>
        <v-window v-model="tab">
          <v-window-item value="one">
            <GenericTab />
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="save()">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, computed, ref } from "vue";
import GenericTab from "@/components/modals/settingstabs/GenericTab.vue";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useNotificationStore } from "@/store/NotificationStore";

const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();

const tab = ref("one");

const props = defineProps({
  settingsModal: Boolean,
});

const emit = defineEmits(["modal"]);

// Send info about the modal to the parent component
const modalRef = computed({
  get: () => props.settingsModal,
  set: (value: boolean) => {
    emit("modal", value);
  },
});

function save() {
  modalRef.value = false;
  protocolRenderStore.initialize();

  notificationStore.showNotification({
    message: "Settings have been saved",
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}
</script>
