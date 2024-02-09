import { defineStore } from 'pinia'
import { Field, Protocol } from '@/contracts'

export const useSettingsStore = defineStore('SettingsStore', {
  // State
  state: () => ({
    bitsPerRow: 32,
    pixelsPerBit: 32,
    showScale: true,
  }),

  // Actions
  actions: {
    //
  },

  // Getters

})
