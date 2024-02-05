<template>
    <v-dialog
      v-model="modalRef"
      width="800"
    >
      <v-card>
        <v-card-title>
          <span v-if="protocolStore.editingMode == EditingMode.Edit" class="text-h5">Field: {{ protocolStore.editingField.display_name }}</span>
          <span v-else class="text-h5">New Field</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col
                md="6"
              >
                <v-text-field
                  label="Display name*"
                  required
                  v-model="protocolStore.editingField.display_name"
                  hint="Name displayed to the user (ex. Destination Port)"
                ></v-text-field>
              </v-col>
              <v-col
                md="6"
              >
                <v-text-field
                  label="ID (internal name)*"
                  required
                  v-model="protocolStore.editingField.id"
                  hint="Name used in the protocol definition (ex. dst_port)"
                ></v-text-field>
              </v-col>
              <v-col
                md="12"
                class="py-0"
              >
                <v-switch label="Variable length" v-model="protocolStore.editingField.is_variable_length" color="primary">
                </v-switch>
              </v-col>
              <v-col
                md="6"
              >
                <v-text-field
                    :label="protocolStore.editingField.is_variable_length ? 'Minimum length*' : 'Length*'"
                    required
                    v-model="protocolStore.editingField.length"
                    hint="If variable length is enabled, this is the minimum length"
                    suffix="bits"
                  ></v-text-field>
              </v-col>
              <v-col
                md="6"
              >
                <v-text-field v-if="protocolStore.editingField.is_variable_length"
                    label="Maximum length*"
                    required
                    v-model="protocolStore.editingField.max_length"
                    hint="Maximum possible length"
                    suffix="bits"
                  ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-select
                  :items="[Endian.Big, Endian.Little]"
                  label="Endianity*"
                  v-model="protocolStore.editingField.endian"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  auto-grow
                  label="Description"
                  rows="2"
                  row-height="20"
                  v-model="protocolStore.editingField.description"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-container>
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
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="saveEdit()"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { EditingMode, Endian } from '@/contracts';
import { computed } from 'vue';
import { useProtocolStore } from '@/store/ProtocolStore';

const protocolStore = useProtocolStore();

const props = defineProps({
    fieldEditModal: Boolean,
});

const emit = defineEmits(['modal', 'save']);

// Send info about the modal to the parent component
const modalRef = computed({
    get: () => props.fieldEditModal,
    set: (value: boolean) => {
        emit('modal', value);
    },
});

// Save edit
function saveEdit() {
    protocolStore.saveEditingField();
    emit('save');
    modalRef.value = false;
}

</script>

<style>
dt {
    font-weight: bold;
    margin-top: 10px;
}
</style>
