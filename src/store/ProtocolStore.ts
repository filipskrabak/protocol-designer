import { defineStore } from 'pinia'
import { Field, Protocol, EditingMode, AddFieldPosition } from '@/contracts'

export const useProtocolStore = defineStore('ProtocolStore', {
  // State
  state: () => ({
    fields: [] as Field[],
    protocol: {} as Protocol,
    editingField: {} as Field,
    editingFieldId: '', // Used to track which field is being edited to update it later
    uploaded: false,
    editingMode: EditingMode.Add as EditingMode,
    addFieldPosition: AddFieldPosition.End as AddFieldPosition,
    addFieldPositionFieldId: '' // Used to track the field where the new field will be added

  }),

  // Actions
  actions: {
    setProtocol(protocol: Protocol) {
      this.protocol = protocol
    },
    newProtocol() {
      this.uploaded = false
    },
    addField(field: Field) {
      this.fields.push(field)
    },
    deleteField(id: string) {
      this.fields = this.fields.filter(field => field.id !== id)
    },
    clearProtocol() {
      this.fields = []
      this.protocol = {} as Protocol
    },
    saveEditingField() {
      // replace the field being edited with the new one
      if(this.editingMode === EditingMode.Add) {
        if(this.addFieldPosition === AddFieldPosition.End) {
          this.addField(this.editingField)
        } else if(this.addFieldPosition === AddFieldPosition.Before) {
          const index = this.fields.findIndex(field => field.id === this.addFieldPositionFieldId)
          this.fields.splice(index, 0, this.editingField)
        } else if(this.addFieldPosition === AddFieldPosition.After) {
          const index = this.fields.findIndex(field => field.id === this.addFieldPositionFieldId)
          this.fields.splice(index + 1, 0, this.editingField)
        }
      } else {
        const index = this.fields.findIndex(field => field.id === this.editingFieldId)
        this.fields[index] = this.editingField
      }

    },
    findFieldById(id: string) {
      return this.fields.find(field => field.id === id)
    }

  },

  // Getters

})
