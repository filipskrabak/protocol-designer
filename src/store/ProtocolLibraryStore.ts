import { defineStore } from "pinia";
import { Protocol } from "@/contracts";
import { v4 } from "uuid";
import axios from "axios";
import _ from "lodash";

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
     * Load all protocols from the database
     *
     * @returns {Protocol[]}
     */
    async loadAllProtocols() {
      try {
        const result = await axios.get("/protocols");

        if (result.status !== 200) {
          console.error(result);
          return false;
        }

        this.protocols = result.data;
      } catch (error) {
        console.error(error);
        return false;
      }

      return true;
    },

    /**
     * Add a protocol to the library
     *
     * @param protocol protocol object to add
     * @returns true if protocol was added, false if it was updated
     */
    async addProtocol(protocol: Protocol) {
      try {
        const result = await axios.post("/protocols", protocol);

        if (result.status !== 201) {
          console.error(result);
          return false;
        }

        protocol.id = result.data.id;

        this.protocols.push(_.cloneDeep(protocol));
      } catch (error) {
        console.error(error);
        return false;
      }

      return true;
    },

    async updateProtocol(protocol: Protocol) {
      try {
        const result = await axios.put(`/protocols/${protocol.id}`, protocol);

        if (result.status !== 200) {
          console.error(result);
          return false;
        }

        const index = this.protocols.findIndex((p) => p.id === protocol.id);

        this.protocols[index] = _.cloneDeep(protocol);
      } catch (error) {
        console.error(error);
        return false;
      }

      return true;
    },

    /**
     * Upload a protocol file to the server
     *
     * @param file
     * @param protocol
     */
    async uploadProtocolToFileServer(file: File, protocol: Protocol) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        await axios.post(`/protocols/${protocol.id}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } catch (error) {
        console.error(error);
      }
    },

    /**
     * Download a protocol file from the server
     *
     * @param protocol
     * @returns base64 encoded string of the file | null
     */
    async downloadProtocolFileFromServer(protocol_id: typeof v4) {
      try {
        const result = await axios.get(`/static/${protocol_id}.svg`);

        console.log(result.data);

        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(result.data)))}`;
      } catch (error) {
        console.error(error);
        return null;
      }
    },

    /**
     * Check if protocol exists in database
     *
     * @param id protocol uuid
     * @returns true if protocol exists, false if it does not
     */
    async checkIfProtocolExists(id: typeof v4) {
      try {
        const result = await axios.get(`/protocols/${id}`);

        return result.status === 200;
      } catch (error) {
        console.error(error);
        return false;
      }
    },

    /**
     * Delete a protocol from the library and API
     *
     * @param id protocol name to delete
     */
    async deleteProtocol(protocol: Protocol) {
      try {
        const result = await axios.delete(`/protocols/${protocol.id}`);

        if (result.status !== 200) {
          console.error(result);
          return false;
        }
      } catch (error) {
        console.error(error);
        return false;
      }

      this.protocols = this.protocols.filter((p) => p.id !== protocol.id);

      return true;
    },
  },

  // Getters
});
