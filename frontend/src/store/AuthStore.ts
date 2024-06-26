import { User } from "@/contracts";
import { defineStore } from "pinia";
import axios, { Axios, AxiosError } from "axios";
import { useNotificationStore } from "./NotificationStore";

export const useAuthStore = defineStore("AuthStore", {
  // State
  state: () => ({
    _authenticated: false,
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

      await this.isAuthenticated();

      useNotificationStore().showNotification({
        message: "Logged in successfully",
        timeout: 5000,
        color: "success",
        icon: "mdi-check-circle",
      });

      return response;
    },
    async register(email: string, name: string, password: string) {
      // Call the API to register
      let response;

      try {
        response = await axios.post("/register", {
          email: email,
          name: name,
          password: password,
        });
      } catch (error: any) {
        console.error(error);

        useNotificationStore().showNotification({
          message: "Failed to register",
          timeout: 5000,
          color: "error",
          icon: "mdi-alert-circle",
        });
        return error.response;
      }

      useNotificationStore().showNotification({
        message: "Registered successfully",
        timeout: 5000,
        color: "success",
        icon: "mdi-check-circle",
      });

      return true;
    },
    logout() {
      this._authenticated = false;
      this.user = {} as User;

      useNotificationStore().showNotification({
        message: "Logged out successfully",
        timeout: 5000,
        color: "success",
        icon: "mdi-check-circle",
      });
    },
    async isAuthenticated() {
      /*if (this._authenticated) {
        return true;
      } else {*/
      // Try authenticate

      let response;
      try {
        response = await axios.get("/users/current");
      } catch (error) {
        console.error(error);
        return false;
      }

      console.log("SUCCESS!");
      console.log(response.data);

      this.user = response.data;

      this._authenticated = true;
      //this.user = response.data;
      return true;
      //}
    },
  },

  // Getters
  getters: {},
});
