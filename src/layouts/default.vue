<template>
  <v-app>
    <v-layout class="rounded rounded-md">
      <v-app-bar>
        <v-app-bar-nav-icon variant="text" @click.stop="drawerLeft = !drawerLeft"></v-app-bar-nav-icon>

        <v-toolbar-title>Protocol Designer</v-toolbar-title>
        <v-btn>
          <v-icon class="me-2">mdi-plus-circle</v-icon>
          New

          <v-dialog
            v-model="newProtocolDialog"
            activator="parent"
            width="auto"
          >
            <v-card>
              <v-card-text>
                Do you want to create a new protocol? All unsaved changes will be lost.
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
                  @click="newProtocolDialog = false; newProtocol()"
                >
                  Create
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-btn>

        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
            >
              <v-icon class="me-2">mdi-download</v-icon>
              Export
            </v-btn>
          </template>
          <v-list>
            <v-list-item link
            >
              <v-list-item-title @click="protocolRenderStore.exportSVG()">Scalable Vector Graphics (.svg)</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-btn icon @click.stop="settingsModal = !settingsModal">
          <v-icon>mdi-cog</v-icon>
        </v-btn>
      </v-app-bar>


      <v-navigation-drawer
        v-model="drawerLeft"
        location="left"
      >
        <v-list>
          <LeftDrawer />
        </v-list>
      </v-navigation-drawer>

      <SettingsModal
        v-model="settingsModal"
        @modal="settingsModal = !settingsModal"
      />


      <DefaultView />
    </v-layout>

    <v-footer class="bg-grey-lighten-4" style="max-height: 150px;">
        <v-row justify="center" no-gutters>
          <v-col class="text-center mt-4" cols="12">
            {{ new Date().getFullYear() }} — <strong>Protocol Designer</strong>
          </v-col>
        </v-row>
      </v-footer>

    <v-snackbar
      v-model="notificationStore.snackbar"
      :timeout="notificationStore.notification.timeout"
      :color="notificationStore.notification.color"
    >
      <v-icon class="mb-1" v-if="notificationStore.notification.icon" :icon="notificationStore.notification.icon"/>

      {{ notificationStore.notification.message }}

      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="notificationStore.snackbar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts" setup>
  import DefaultView from './default/View.vue'
  import LeftDrawer from '@/components/navs/LeftDrawer.vue'
  import SettingsModal from '@/components/modals/SettingsModal.vue'

  import { ref } from 'vue'

  import { useProtocolStore } from '@/store/ProtocolStore'
  import { useProtocolRenderStore } from '@/store/ProtocolRenderStore'
  import { useNotificationStore } from '@/store/NotificationStore'

  const drawerLeft = ref(false)
  const settingsModal = ref(false)
  const newProtocolDialog = ref(false)
  const links = ['About', 'Contact', 'Legal']

  const protocolStore = useProtocolStore()
  const protocolRenderStore = useProtocolRenderStore()
  const notificationStore = useNotificationStore()

  function newProtocol() {
    protocolStore.newProtocol()
  }
</script>
