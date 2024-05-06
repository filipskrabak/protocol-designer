<template>
  <v-card>
    <v-card-text>
      <v-container>
        <v-row>
          <v-col md="6">
            <v-text-field
              label="Display name*"
              required
              v-model="protocolStore.editingField.display_name"
              hint="Name displayed to the user (ex. Destination Port)"
              :rules="[(v) => !!v || 'Display name is required']"
            ></v-text-field>
          </v-col>
          <v-col md="6">
            <v-text-field
              label="ID (internal name)*"
              required
              v-model="protocolStore.editingField.id"
              hint="Name used in the protocol definition (ex. dst_port)"
              :rules="[
                (v) => !!v || 'ID is required',
                (v) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v) || 'Invalid ID',
              ]"
            ></v-text-field>
          </v-col>
          <v-col md="12" class="py-0">
            <v-switch
              label="Variable length"
              v-model="protocolStore.editingField.is_variable_length"
              color="primary"
            >
            </v-switch>
          </v-col>
          <v-col cols="12" v-if="protocolStore.editingField.is_variable_length">
            <v-alert
              type="info"
              outlined
              elevation="2"
              icon="mdi-information"
              class="mb-4"
            >
              You can set any length to 0 if it is not defined.
            </v-alert>
          </v-col>
          <v-col md="6">
            <v-text-field
              :label="
                protocolStore.editingField.is_variable_length
                  ? 'Minimum length*'
                  : 'Length*'
              "
              required
              v-model.number="protocolStore.editingField.length"
              hint="If variable length is enabled, this is the minimum length"
              :rules="minimumLengthRules"
              suffix="bits"
            ></v-text-field>
          </v-col>
          <v-col md="6">
            <v-text-field
              v-if="protocolStore.editingField.is_variable_length"
              label="Maximum length*"
              required
              v-model.number="protocolStore.editingField.max_length"
              hint="Maximum possible length"
              :rules="maximumLengthRules"
              suffix="bits"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-select
              :items="[Endian.Big, Endian.Little]"
              label="Endianity*"
              v-model="protocolStore.editingField.endian"
              :rules="[(v) => !!v || 'Endianity is required']"
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
  </v-card>
</template>

<script setup lang="ts">
import { EditingMode, Endian } from "@/contracts";
import { useProtocolStore } from "@/store/ProtocolStore";

const protocolStore = useProtocolStore();

// Rules

let minimumLengthRules = [
  (v: number) => v === 0 || !!v || "Length is required",
  (v: number) => v >= 0 || "Must be a positive number",
  (v: number) =>
    (v && v > 0) ||
    protocolStore.editingField.is_variable_length ||
    "Must be greater than 0",
];

let maximumLengthRules = [
  (v: number) => v === 0 || !!v || "Maximum length is required",
  (v: number) => v >= 0 || "Maximum length must be a positive number",
  // Must be equal or greater than minimum length
  (v: number) =>
    v >= protocolStore.editingField.length ||
    "Maximum length must be equal or greater than minimum length",
];
</script>

<style></style>
