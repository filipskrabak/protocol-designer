<template>
  <v-dialog v-model="dialog" width="auto">
    <v-card :title="props.modalTitle">
      <v-card-text>
        <v-autocomplete
          :items="items"
          v-model="selectedItems"
          multiple
          chips
          required
        ></v-autocomplete>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="dialog = false" color="blue-darken-1" variant="text">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, watch, ref } from "vue";

// Props

const selectedItems = ref<string[] | number[]>([]);

const props = defineProps<{
  showModal: boolean;
  modalTitle: string;
  items: { value: string | number; title: string }[];
  alreadySelected: string[] | number[];
}>();

const emit = defineEmits(["save"]);

// Send info about the modal to the parent component
const dialog = computed({
  get: () => props.showModal,
  set: (value: boolean) => {
    // Emit ONLY the selected items to the parent component
    emit("save", selectedItems.value);
  },
});

// Handle already selected items
watch(
  () => props.alreadySelected,
  (newValue) => {
    selectedItems.value = newValue;
  },
);
</script>

<style scoped></style>
