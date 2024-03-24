import { defineStore } from "pinia";
import { Protocol } from "@/contracts";
import { v4 } from "uuid";

export const useProtocolLibraryStore = defineStore("ProtocolLibraryStore", {
  // State
  state: () => ({
    protocols: [] as Protocol[],
  }),

  // Actions
  actions: {
    /**
     * Get all protocols in the library
     *
     * @param id protocol uuid
     *
     * @returns {Protocol}
     */
    getProtocolById(id: typeof v4) {
      return this.protocols.find((protocol) => protocol.id === id);
    },

    /**
     * Add a protocol to the library
     *
     * @param protocol protocol object to add
     * @returns true if protocol was added, false if it was updated
     */
    addProtocol(protocol: Protocol) {
      // check if protocol already exists
      const index = this.protocols.findIndex((p) => p.name === protocol.name);
      if (index !== -1) {
        this.protocols[index] = protocol;
        return false;
      }
      this.protocols.push(protocol);

      return true;
    },

    /**
     * Delete a protocol from the library
     *
     * @param id protocol name to delete
     */
    deleteProtocol(id: string) {
      this.protocols = this.protocols.filter(
        (protocol) => protocol.name !== id,
      );
    },
  },

  // Getters
});
