import { defineStore } from "pinia";
import { Notification } from "@/contracts";

export const useNotificationStore = defineStore("NotificationStore", {
  // State
  state: () => ({
    snackbar: false,
    notification: {} as Notification,
  }),

  // Actions
  actions: {
    showNotification(notification: Notification) {
      this.notification = notification;
      this.snackbar = true;
    },
    closeNotification() {
      this.snackbar = false;
    },
  },

  // Getters
});
