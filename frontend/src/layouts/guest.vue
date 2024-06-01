<template>
  <v-app>
    <v-layout class="rounded rounded-md">
      <DefaultView />
    </v-layout>

    <v-footer class="bg-grey-lighten-4" style="max-height: 150px">
      <v-row justify="center" no-gutters>
        <v-row>
          <v-col class="text-center mt-4" cols="12">
            {{ new Date().getFullYear() }} — <strong>Protocol Designer</strong>
          </v-col>
          <v-col class="text-center" cols="12">
            <v-btn
              icon="mdi-github"
              class="mx-4"
              variant="text"
              href="https://github.com/filipskrabak/protocol-designer"
              target="_blank"

            ></v-btn>
            <v-btn
              class="mx-4"
              href="https://www.fiit.stuba.sk"
              target="_blank"
              variant="text"
            >
              <v-img src="/images/STU-FIIT-zcv.png" width="60"></v-img>
          </v-btn>
          </v-col>
        </v-row>
      </v-row>
    </v-footer>

    <v-snackbar
      v-model="notificationStore.snackbar"
      :timeout="notificationStore.notification.timeout"
      :color="notificationStore.notification.color"
    >
      <v-icon
        class="mb-1"
        v-if="notificationStore.notification.icon"
        :icon="notificationStore.notification.icon"
      />

      {{ notificationStore.notification.message }}

      <template v-slot:actions>
        <v-btn variant="text" @click="notificationStore.snackbar = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts" setup>
import DefaultView from "./default/View.vue";

import { ref } from "vue";

import { useProtocolStore } from "@/store/ProtocolStore";
import { useNotificationStore } from "@/store/NotificationStore";
import router from "@/router";

const protocolStore = useProtocolStore();
const notificationStore = useNotificationStore();

function newProtocol() {
  protocolStore.newProtocol();
  router.push("/upload");
}
</script>
