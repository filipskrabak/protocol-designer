<template>
  <div class="text-center pa-4">
    <v-dialog
      v-model="protocolRenderStore.fieldDeleteModal"
      max-width="400"
      persistent
    >
      <v-card
        prepend-icon="mdi-delete"
        :title="`Delete field ${protocolStore.editingField.display_name}?`"
        text="This action cannot be undone. Are you sure?"
      >
        <template v-slot:actions>
          <v-spacer></v-spacer>

          <v-btn
            @click="protocolRenderStore.fieldDeleteModal = false"
            color="blue darken-1"
            dark
          >
            Cancel
          </v-btn>

          <v-btn @click="deleteField()" color="red darken-1" dark>
            Delete
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

// Stores
const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();

function deleteField() {
  protocolRenderStore.fieldDeleteModal = false;
  protocolStore.deleteField(protocolStore.editingField.id);
  protocolRenderStore.initialize();

  notificationStore.showNotification({
    message: `Field ${protocolStore.editingField.display_name} has been deleted`,
    timeout: 3000,
    color: "green",
    icon: "mdi-check",
  });
}
</script>
