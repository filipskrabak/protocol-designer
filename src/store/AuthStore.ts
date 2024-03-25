import { User } from "@/contracts";
import { defineStore } from "pinia";
import axios from "axios";

export const useAuthStore = defineStore("AuthStore", {
  // State
  state: () => ({
    authenticated: false,
    user: {} as User,
  }),

  // Actions
  actions: {
    async login(email: string, password: string) {
      // Call the API to login
      let response;

      try {
        response = await axios.post(
          "/login",
          new URLSearchParams({ username: email, password: password }),
        );
      } catch (error) {
        console.error(error);
        return;
      }

      this.authenticated = true;
      this.user = response.data;

      return response;
    },
    logout() {
      // Call the API to logout
      this.authenticated = false;
      this.user = {} as User;
    },
  },

  // Getters
});
