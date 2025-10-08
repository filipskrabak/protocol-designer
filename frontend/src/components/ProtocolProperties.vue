<template>
  <v-container>
    <div class="d-flex mb-3" v-if="protocolStore.uploaded">
      <h1>{{ protocolStore.protocol.name }}</h1>
    </div>

    <v-row>
      <v-col md="6">
        <v-text-field
          label="Protocol Name*"
          required
          v-model="protocolStore.protocol.name"
          hint="Name of the protocol (ex. TCP)"
          variant="outlined"
        ></v-text-field>
      </v-col>
      <v-col md="6">
        <v-text-field
          label="Author*"
          required
          v-model="protocolStore.protocol.author"
          hint="Full name of the author of the protocol"
          variant="outlined"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col md="6">
        <v-text-field
          label="Created"
          v-model="protocolStore.protocol.created_at"
          hint="Date of the protocol creation"
          disabled
          variant="outlined"
        ></v-text-field>
      </v-col>
      <v-col md="6">
        <v-text-field
          label="Last Update"
          v-model="protocolStore.protocol.updated_at"
          hint="Date of the last modification"
          disabled
          variant="outlined"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col md="6">
        <v-text-field
          label="Version*"
          required
          v-model="protocolStore.protocol.version"
          hint="Version of the protocol (ex. 1.0)"
          variant="outlined"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col md="12">
        <v-textarea
          label="Description*"
          auto-grow
          v-model="protocolStore.protocol.description"
          hint="Description of the protocol"
          variant="outlined"
        ></v-textarea>
      </v-col>
    </v-row>

    <v-row>
      <v-col md="12">
        <v-btn color="primary" @click="save()" :loading="loading"> Save </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useProtocolStore } from "@/store/ProtocolStore";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useNotificationStore } from "@/store/NotificationStore";

// Stores
const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();

// Refs
const loading = ref(false);

function save() {
  loading.value = true;
  protocolRenderStore.initialize();
  loading.value = false;

  notificationStore.showNotification({
    message: "Changes have been saved",
    timeout: 3000,
    color: "success",
    icon: "mdi-check",
  });
}
</script>

<style></style>
