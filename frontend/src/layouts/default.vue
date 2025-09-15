<template>
  <v-app>
    <v-layout class="rounded rounded-md">
      <v-app-bar>
        <v-app-bar-nav-icon
          v-if="protocolStore.uploaded"
          variant="text"
          @click.stop="toggleSidebar"
        ></v-app-bar-nav-icon>

        <v-toolbar-title>
          <v-img max-width="280" src="/images/pdlogo.png"></v-img
        ></v-toolbar-title>
        <v-btn v-if="protocolStore.uploaded" class="d-none d-md-flex">
          <v-icon class="me-2">mdi-plus-circle</v-icon>
          New

          <v-dialog v-model="newProtocolDialog" activator="parent" width="auto">
            <v-card>
              <v-card-text>
                Do you want to create a new protocol? All unsaved changes will
                be lost.
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  color="blue-darken-1"
                  variant="text"
                  @click="newProtocolDialog = false"
                >
                  Cancel
                </v-btn>
                <v-btn
                  color="blue-darken-1"
                  variant="text"
                  @click="
                    newProtocolDialog = false;
                    newProtocol();
                  "
                >
                  Create
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-btn>

        <!-- Mobile version - icon only -->
        <v-btn v-if="protocolStore.uploaded" icon class="d-flex d-md-none">
          <v-icon>mdi-plus-circle</v-icon>
          <v-tooltip activator="parent" location="bottom">New Protocol</v-tooltip>

          <v-dialog v-model="newProtocolDialog" activator="parent" width="auto">
            <v-card>
              <v-card-text>
                Do you want to create a new protocol? All unsaved changes will
                be lost.
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  color="blue-darken-1"
                  variant="text"
                  @click="newProtocolDialog = false"
                >
                  Cancel
                </v-btn>
                <v-btn
                  color="blue-darken-1"
                  variant="text"
                  @click="
                    newProtocolDialog = false;
                    newProtocol();
                  "
                >
                  Create
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-btn>

        <v-btn @click.stop="libraryModal = !libraryModal" class="d-none d-md-flex">
          <v-icon class="me-2">mdi-folder-open</v-icon>
          Library

          <LibraryModal
            v-model="libraryModal"
            @modal="libraryModal = !libraryModal"
          />
        </v-btn>

        <!-- Mobile version - icon only -->
        <v-btn @click.stop="libraryModal = !libraryModal" icon class="d-flex d-md-none">
          <v-icon>mdi-folder-open</v-icon>
          <v-tooltip activator="parent" location="bottom">Library</v-tooltip>

          <LibraryModal
            v-model="libraryModal"
            @modal="libraryModal = !libraryModal"
          />
        </v-btn>

        <template v-if="protocolStore.uploaded">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" class="d-none d-md-flex">
                <v-icon class="me-2">mdi-download</v-icon>
                Export
              </v-btn>
            </template>
            <v-list>
              <v-list-item link>
                <v-list-item-title @click="protocolRenderStore.exportSVG()"
                  >Scalable Vector Graphics (.svg)</v-list-item-title
                >
              </v-list-item>
              <v-list-item link>
                <v-list-item-title @click="protocolRenderStore.exportToP4()"
                  >P4 (.p4)</v-list-item-title
                >
              </v-list-item>
            </v-list>
          </v-menu>

          <!-- Mobile version - icon only -->
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon class="d-flex d-md-none">
                <v-icon>mdi-download</v-icon>
                <v-tooltip activator="parent" location="bottom">Export</v-tooltip>
              </v-btn>
            </template>
            <v-list>
              <v-list-item link>
                <v-list-item-title @click="protocolRenderStore.exportSVG()"
                  >Scalable Vector Graphics (.svg)</v-list-item-title
                >
              </v-list-item>
              <v-list-item link>
                <v-list-item-title @click="protocolRenderStore.exportToP4()"
                  >P4 (.p4)</v-list-item-title
                >
              </v-list-item>
            </v-list>
          </v-menu>

          <v-btn icon @click.stop="settingsModal = !settingsModal">
            <v-icon>mdi-cog</v-icon>
          </v-btn>
        </template>

        <v-menu
          v-model="profileMenu"
          :close-on-content-click="false"
          location="end"
        >
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props">
              <v-icon>mdi-account-circle</v-icon>
            </v-btn>
          </template>

          <v-card min-width="300">
            <v-list>
              <v-list-item
                prepend-avatar="https://cdn.vuetifyjs.com/images/john.jpg"
                :subtitle="authStore.user?.email"
                :title="authStore.user?.name"
              >
                <template v-slot:append>
                  <v-btn
                    icon="mdi-logout-variant"
                    variant="text"
                    @click="logOut"
                  ></v-btn>
                </template>
              </v-list-item>
            </v-list>
            <v-card-actions>
              <v-spacer></v-spacer>

              <v-btn variant="text" @click="profileMenu = false">
                Cancel
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </v-app-bar>

      <!--<v-navigation-drawer v-model="drawerLeft" location="left">
        <v-list>
          <LeftDrawer />
        </v-list>
      </v-navigation-drawer>-->

      <SettingsModal
        v-model="settingsModal"
        @modal="settingsModal = !settingsModal"
      />

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
import SettingsModal from "@/components/modals/SettingsModal.vue";
import LibraryModal from "@/components/modals/LibraryModal.vue";
import { useSidebar } from "@/composables/useSidebar";

import { ref } from "vue";

import { useProtocolStore } from "@/store/ProtocolStore";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useAuthStore } from "@/store/AuthStore";
import { useNotificationStore } from "@/store/NotificationStore";
import router from "@/router";

const { toggleDrawer } = useSidebar();

const settingsModal = ref(false);
const libraryModal = ref(false);
const newProtocolDialog = ref(false);
const profileMenu = ref(false);

const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

function toggleSidebar() {
  toggleDrawer();
}

function newProtocol() {
  protocolRenderStore.rawProtocolData = "";
  protocolRenderStore.loading = false;
  protocolStore.newProtocol();
  router.push("/upload");
}

function logOut() {
  // TODO: bug, cookie is not removed
  authStore.logout();
  router.push("/login");
}
</script>
