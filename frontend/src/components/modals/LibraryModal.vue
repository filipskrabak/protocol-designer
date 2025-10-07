<template>
  <div>
    <v-dialog v-model="modalRef" width="1200" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon size="32" class="mr-3">mdi-folder-open</v-icon>
          <span class="text-h5">Protocol Library</span>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="close()">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <ProtocolLibrary :onProtocolLoad="close" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, computed } from "vue";
import ProtocolLibrary from "@/components/ProtocolLibrary.vue";

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

// Send info about the modal to the parent component
const modalRef = computed({
  get: () => props.modelValue,
  set: (value: boolean) => {
    emit("update:modelValue", value);
  },
});

function close() {
  modalRef.value = false;
}
</script>

