import { defineStore } from "pinia";
import {
  Field,
  Protocol,
  EditingMode,
  AddFieldPosition,
  EncapsulatedProtocol,
  FiniteStateMachine,
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
    currentFSMId: null as string | null, // Currently active FSM being edited
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
      this.protocol.updated_at = new Date().toLocaleDateString("sk-SK");
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

    /**
     * FSM Management Actions
     */

    // Initialize FSM array if not exists
    ensureFSMArray() {
      if (!this.protocol.finite_state_machines) {
        this.protocol.finite_state_machines = [];
      }
    },

    // Add a new FSM to the protocol
    addFSM(fsm: FiniteStateMachine) {
      this.ensureFSMArray();
      this.protocol.finite_state_machines!.push(fsm);
      this.currentFSMId = fsm.id;
      this.protocol.updated_at = new Date().toLocaleDateString("sk-SK");
    },

    // Update an existing FSM
    updateFSM(fsmId: string, fsm: FiniteStateMachine) {
      this.ensureFSMArray();
      const index = this.protocol.finite_state_machines!.findIndex(f => f.id === fsmId);
      if (index !== -1) {
        this.protocol.finite_state_machines![index] = fsm;
        this.protocol.updated_at = new Date().toLocaleDateString("sk-SK");
      }
    },

    // Delete an FSM
    deleteFSM(fsmId: string) {
      if (!this.protocol.finite_state_machines) return;
      this.protocol.finite_state_machines = this.protocol.finite_state_machines.filter(
        f => f.id !== fsmId
      );
      if (this.currentFSMId === fsmId) {
        this.currentFSMId = this.protocol.finite_state_machines.length > 0
          ? this.protocol.finite_state_machines[0].id
          : null;
      }
      this.protocol.updated_at = new Date().toLocaleDateString("sk-SK");
    },

    // Get FSM by ID
    getFSMById(fsmId: string): FiniteStateMachine | undefined {
      return this.protocol.finite_state_machines?.find(f => f.id === fsmId);
    },

    // Set current active FSM
    setCurrentFSM(fsmId: string | null) {
      this.currentFSMId = fsmId;
    },

    // Get current active FSM
    getCurrentFSM(): FiniteStateMachine | undefined {
      if (!this.currentFSMId) return undefined;
      return this.getFSMById(this.currentFSMId);
    },
  },

  // Getters
});
