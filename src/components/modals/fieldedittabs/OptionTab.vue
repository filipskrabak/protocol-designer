<template>
  <v-card>
    <v-card-text>
      <v-container>
        <v-row v-for="option in protocolStore.editingField.field_options">
          <v-col
            md="6"
          >
            <v-text-field
              label="Name*"
              required
              v-model="option.name"
              hint="Name of the values (ex. IPv4)"
              :rules="nameRules"
            ></v-text-field>
          </v-col>
          <v-col
            md="5"
          >
            <v-text-field
              label="Value*"
              required
              v-model.number="option.value"
              hint="Value of the option (ex. 0x0800)"
              :rules="valueRules"
              type="number"
            ></v-text-field>
          </v-col>
          <v-col
            md="1"
            class="d-flex justify-center"
            @click="removeOption(option)"
          >
            <v-btn icon="mdi-delete" size="small" width="35px" height="35px" class="mt-2"></v-btn>
          </v-col>
        </v-row>
        <!-- Add new option -->
        <v-col cols="auto" class="d-flex justify-center" @click="addNewOption()">
          <v-btn icon="mdi-plus" size="small"></v-btn>
        </v-col>

      </v-container>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { EditingMode, Endian } from '@/contracts';
import { useProtocolStore } from '@/store/ProtocolStore';
import { useNotificationStore } from '@/store/NotificationStore';
import { nextTick } from 'vue';

const protocolStore = useProtocolStore();
const notificationStore = useNotificationStore();

async function addNewOption() {
  protocolStore.editingField.field_options.push({
    name: '',
    value: 0
  });

  notificationStore.showNotification({
    message: `A new option has been added`,
    timeout: 3000,
    color: 'success',
    icon: 'mdi-check'
  });
}

async function removeOption(option: any) {
  const index = protocolStore.editingField.field_options.indexOf(option);
  protocolStore.editingField.field_options.splice(index, 1);

  notificationStore.showNotification({
    message: `The option ${option.name} has been removed`,
    timeout: 3000,
    color: 'success',
    icon: 'mdi-check'
  });
}

// Rules
const nameRules = [
  // No empty names
  (v: string) => !!v || 'Name is required'
];

// Rules
const valueRules = [
  // No empty names
  (v: number) => !!v || 'Value is required',
  // Unique names
  (v: number) => {
    const values = protocolStore.editingField.field_options.map((option) => option.value);
    console.log(values);
    const value = values.filter((value) => value === v);
    console.log(value);
    return value.length == 1 || 'Value must be unique';
  }
];


</script>

<style>

</style>
