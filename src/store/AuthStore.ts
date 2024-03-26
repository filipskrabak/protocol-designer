import { User } from "@/contracts";
import { defineStore } from "pinia";
import axios from "axios";
import { useNotificationStore } from "./NotificationStore";

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

        useNotificationStore().showNotification({
          message: "Invalid email or password",
          timeout: 5000,
          color: "error",
          icon: "mdi-alert-circle",
        });
        return;
      }

      this.authenticated = true;
      this.user = response.data;

      useNotificationStore().showNotification({
        message: "Logged in successfully",
        timeout: 5000,
        color: "success",
        icon: "mdi-check-circle",
      });

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
