<template>
  <v-dialog
      v-model="modalRef"
      width="auto"
  >
    <v-card>
    <v-tabs
      v-model="tab"
      grow
    >
      <v-tab value="one">Item One</v-tab>
      <v-tab value="two">Item Two</v-tab>
      <v-tab value="three">Item Three</v-tab>
    </v-tabs>

    <v-card-text>
      <v-window v-model="tab">
        <v-window-item value="one">
          <GenericTab />
        </v-window-item>

        <v-window-item value="two">
          Two
        </v-window-item>

        <v-window-item value="three">
          Three
        </v-window-item>
      </v-window>
    </v-card-text>
    <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="modalRef = false"
          >
            Close
          </v-btn>
      </v-card-actions>
  </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>

import { defineProps, defineEmits, computed, ref } from 'vue';
import GenericTab from '@/components/modals/settingstabs/GenericTab.vue';

const tab = ref('one');

const props = defineProps({
    settingsModal: Boolean,
});

const emit = defineEmits(['modal']);

// Send info about the modal to the parent component
const modalRef = computed({
    get: () => props.settingsModal,
    set: (value: boolean) => {
        emit('modal', value);
    },
});

</script>
