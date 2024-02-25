<template>
  <v-card>
    <v-card-text>
      <v-container>
        <v-row v-for="option in protocolStore.editingField.field_options" :key="option.name">
          <v-col
            md="6"
          >
            <v-text-field
              label="Name*"
              required
              v-model="option.name"
              hint="Name of the values (ex. IPv4)"
            ></v-text-field>
          </v-col>
          <v-col
            md="6"
          >
            <v-text-field
              label="Value*"
              required
              v-model="option.value"
              hint="Value of the option (ex. 0x0800)"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { EditingMode, Endian } from '@/contracts';
import { useProtocolStore } from '@/store/ProtocolStore';

const protocolStore = useProtocolStore();
</script>

<style>

</style>
