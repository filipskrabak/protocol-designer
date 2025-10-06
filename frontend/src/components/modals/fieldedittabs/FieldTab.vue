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
              :rules="[(v: string) => !!v || 'Display name is required']"
              variant="outlined"
            ></v-text-field>
          </v-col>
          <v-col md="6">
            <v-text-field
              label="ID (internal name)*"
              required
              v-model="protocolStore.editingField.id"
              hint="Name used in the protocol definition (ex. dst_port)"
              :rules="fieldIdRules"
              variant="outlined"
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
              :suffix="protocolStore.editingField.length_unit || 'bits'"
              variant="outlined"
            ></v-text-field>
          </v-col>
          <v-col md="6">
            <v-select
              :items="[LengthUnit.Bits, LengthUnit.Bytes]"
              label="Length unit*"
              v-model="protocolStore.editingField.length_unit"
              hint="Unit for length values (bits or bytes)"
              :rules="[(v: string) => !!v || 'Length unit is required']"
              required
              variant="outlined"
            ></v-select>
          </v-col>
          <v-col md="6">
            <v-text-field
              v-if="protocolStore.editingField.is_variable_length"
              label="Maximum length*"
              required
              v-model.number="protocolStore.editingField.max_length"
              hint="Maximum possible length"
              :rules="maximumLengthRules"
              :suffix="protocolStore.editingField.length_unit || 'bits'"
              variant="outlined"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-select
              :items="[Endian.Big, Endian.Little]"
              label="Endianity*"
              v-model="protocolStore.editingField.endian"
              :rules="[(v: string) => !!v || 'Endianity is required']"
              required
              variant="outlined"
            ></v-select>
          </v-col>
          <v-col cols="12">
            <v-combobox
              :items="groupOptions"
              label="Group"
              v-model="groupModel"
              hint="Select from common groups or type a custom group name"
              clearable
              persistent-hint
              prepend-inner-icon="mdi-tag"
              item-title="title"
              item-value="value"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              auto-grow
              label="Description"
              rows="2"
              row-height="20"
              v-model="protocolStore.editingField.description"
              variant="outlined"
            ></v-textarea>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { Endian, LengthUnit, EditingMode } from "@/contracts";
import { useProtocolStore } from "@/store/ProtocolStore";
import { getFieldEditGroupOptions } from "@/utils/groupUtils";
import { watch, computed } from "vue";

const protocolStore = useProtocolStore();

// Helper to handle combobox value changes (since combobox returns objects when selected)
const groupModel = computed({
  get() {
    return protocolStore.editingField.group_id || ''
  },
  set(value: any) {
    // If it's an object (selected from dropdown), extract the value property
    if (typeof value === 'object' && value !== null && value.value) {
      protocolStore.editingField.group_id = value.value
    } else {
      // If it's a string (typed manually), use it directly
      protocolStore.editingField.group_id = value || undefined
    }
  }
});

// Group options for the field edit - focus on common groups plus existing custom ones
const groupOptions = computed(() => {
  return getFieldEditGroupOptions(protocolStore.protocol.fields)
});

// Watch for unit changes and convert values
watch(() => protocolStore.editingField.length_unit, (newUnit, oldUnit) => {
  if (oldUnit && newUnit !== oldUnit) {
    if (newUnit === LengthUnit.Bytes && oldUnit === LengthUnit.Bits) {
      // Convert from bits to bytes (divide by 8)
      protocolStore.editingField.length = Math.ceil(protocolStore.editingField.length / 8);
      if (protocolStore.editingField.is_variable_length && protocolStore.editingField.max_length) {
        protocolStore.editingField.max_length = Math.ceil(protocolStore.editingField.max_length / 8);
      }
    } else if (newUnit === LengthUnit.Bits && oldUnit === LengthUnit.Bytes) {
      // Convert from bytes to bits (multiply by 8)
      protocolStore.editingField.length = protocolStore.editingField.length * 8;
      if (protocolStore.editingField.is_variable_length && protocolStore.editingField.max_length) {
        protocolStore.editingField.max_length = protocolStore.editingField.max_length * 8;
      }
    }
  }
});

// Rules
const fieldIdRules = [
  (v: string) => !!v || 'ID is required',
  (v: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v) || 'Invalid ID format (must start with letter or underscore, contain only letters, numbers, and underscores)',
  (v: string) => {
    // Check for duplicates, excluding the current field being edited
    const isDuplicate = protocolStore.protocol.fields?.some(field => {
      // If we're editing an existing field, exclude it from duplicate check
      if (protocolStore.editingMode === EditingMode.Edit && field.id === protocolStore.editingFieldId) {
        return false;
      }
      // Check if any other field has the same ID
      return field.id === v;
    });
    return !isDuplicate || 'Field ID must be unique within the protocol';
  }
];

const minimumLengthRules = [
  (v: number) => v === 0 || !!v || "Length is required",
  (v: number) => v >= 0 || "Must be a positive number",
  (v: number) =>
    (v && v > 0) ||
    protocolStore.editingField.is_variable_length ||
    "Must be greater than 0",
];

const maximumLengthRules = [
  (v: number) => v === 0 || !!v || "Maximum length is required",
  (v: number) => v >= 0 || "Maximum length must be a positive number",
  // Must be equal or greater than minimum length
  (v: number) =>
    v >= protocolStore.editingField.length ||
    "Maximum length must be equal or greater than minimum length",
];
</script>

<style></style>
