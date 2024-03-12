<template>
  <v-container>
    <div class="d-flex mb-3" v-if="protocolStore.uploaded">
        <h1>{{ protocolStore.protocol.name }}</h1>
    </div>

    <v-row>
      <v-col
        md="6"
      >
      <v-autocomplete
        :items="fieldArrayItems"
        label="Field to encapsulate*"
        v-model="fieldToEncapsulate"
        required
      ></v-autocomplete>
      </v-col>
    </v-row>

    <v-divider class="my-5"></v-divider>

    <v-row>
      <v-col
        md="6"
      >
      <v-autocomplete
        :items="protocolsArrayItems"
        label="Encapsulated protocols*"
        v-model="encapsulatedProtocols"
        chips
        required
        multiple
      ></v-autocomplete>
      </v-col>
    </v-row>

    <v-row>
      <v-col
        md="12"
      >
        <v-btn
          color="primary"
          @click="save()"
          :loading="loading"
        >
          Save
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProtocolStore } from '@/store/ProtocolStore';
import { useProtocolRenderStore } from '@/store/ProtocolRenderStore';
import { useProtocolLibraryStore } from '@/store/ProtocolLibraryStore';
import { useNotificationStore } from '@/store/NotificationStore';

// Stores
const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();
const protocolLibraryStore = useProtocolLibraryStore();

// Refs
const fieldToEncapsulate = ref('');
const encapsulatedProtocols = ref([]);
const loading = ref(false);

function save() {
  // Save encapsulated flag
  const field = protocolStore.protocol.fields.find((field) => field.id === fieldToEncapsulate.value);
  if(field) {
    field.encapsulate = true;
  }

  protocolStore.encapsulated_protocols = encapsulatedProtocols.value;
  console.log(protocolStore.encapsulated_protocols);

  loading.value = true;
  protocolRenderStore.initialize();
  loading.value = false;

  notificationStore.showNotification({
    message: 'Changes have been saved',
    timeout: 3000,
    color: 'success',
    icon: 'mdi-check'
  });

}

const protocolsArrayItems = computed(() => {
  return protocolLibraryStore.protocols.map((protocol) => {
    return { value: protocol.id, title: protocol.name };
  });
});

const fieldArrayItems = computed(() => {
  return protocolStore.protocol.fields.map((field) => {
    return { value: field.id, title: field.display_name };
  });
});

</script>

<style>
</style>
