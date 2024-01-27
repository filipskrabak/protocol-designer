import { defineStore } from 'pinia'
import { Field, Protocol } from '@/contracts'

export const useProtocolStore = defineStore('ProtocolStore', {
  // State
  state: () => ({
    fields: [] as Field[],
    protocol: {} as Protocol,
    editingField: {} as Field,
    editingFieldId: '', // Used to track which field is being edited to update it later
  }),

  // Actions
  actions: {
    setProtocol(protocol: Protocol) {
      this.protocol = protocol
    },
    addField(field: Field) {
      this.fields.push(field)
    },
    clearProtocol() {
      this.fields = []
      this.protocol = {} as Protocol
    },
    saveEditingField() {
      // replace the field being edited with the new one
      const index = this.fields.findIndex(field => field.id === this.editingFieldId)
      this.fields[index] = this.editingField

    },

    findFieldById(id: string) {
      return this.fields.find(field => field.id === id)
    }

  },

  // Getters

})
