import { defineStore } from "pinia";
import {
  Field,
  Protocol,
  EditingMode,
  AddFieldPosition,
  EncapsulatedProtocol,
} from "@/contracts";

export const useProtocolStore = defineStore("ProtocolStore", {
  // State
  state: () => ({
    protocol: {} as Protocol,
    encapsulatedProtocols: [] as EncapsulatedProtocol[], // list of protocols that are encapsulated
    editingField: {} as Field,
    editingFieldId: "", // Used to track which field is being edited to update it later
    uploaded: false,
    editingMode: EditingMode.Add as EditingMode,
    addFieldPosition: AddFieldPosition.End as AddFieldPosition,
    addFieldPositionFieldId: "", // Used to track the field where the new field will be added
  }),

  // Actions
  actions: {
    setProtocol(protocol: Protocol) {
      this.protocol = protocol;
    },
    newProtocol() {
      this.uploaded = false;
    },
    addField(field: Field) {
      if (this.protocol.fields === undefined) {
        this.protocol.fields = [];
      }
      this.protocol.fields.push(field);
    },
    deleteField(id: string) {
      this.protocol.fields = this.protocol.fields.filter(
        (field) => field.id !== id,
      );
    },
    clearProtocol() {
      this.protocol.fields = [];
      this.protocol = {} as Protocol;
      this.uploaded = false;
    },
    saveEditingField() {
      // replace the field being edited with the new one
      if (this.editingMode === EditingMode.Add) {
        if (this.addFieldPosition === AddFieldPosition.End) {
          this.addField(this.editingField);
        } else if (this.addFieldPosition === AddFieldPosition.Before) {
          const index = this.protocol.fields.findIndex(
            (field) => field.id === this.addFieldPositionFieldId,
          );
          this.protocol.fields.splice(index, 0, this.editingField);
        } else if (this.addFieldPosition === AddFieldPosition.After) {
          const index = this.protocol.fields.findIndex(
            (field) => field.id === this.addFieldPositionFieldId,
          );
          this.protocol.fields.splice(index + 1, 0, this.editingField);
        }
      } else {
        const index = this.protocol.fields.findIndex(
          (field) => field.id === this.editingFieldId,
        );
        this.protocol.fields[index] = this.editingField;
      }
    },
    findFieldById(id: string) {
      return this.protocol.fields.find((field) => field.id === id);
    },

    /**
     * Sets encapsulate flag of the field to true, and false to all other fields
     *
     * @param id field id to encapsulate
     */
    encapsulateField(id: string) {
      const field = this.findFieldById(id);
      if (field) {
        field.encapsulate = true;
      }

      // set all other fields to not encapsulate
      this.protocol.fields.forEach((field) => {
        if (field.id !== id) {
          field.encapsulate = false;
        }
      });
    },
  },

  // Getters
});
