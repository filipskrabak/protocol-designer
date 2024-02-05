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


      <v-main class="d-flex align-center justify-center" style="min-height: 300px;">
        <DefaultView />
      </v-main>
    </v-layout>
  </v-app>
</template>

<script lang="ts" setup>
  import DefaultBar from './default/AppBar.vue'
  import DefaultView from './default/View.vue'
  import LeftDrawer from '@/components/navs/LeftDrawer.vue'
  import SettingsModal from '@/components/modals/SettingsModal.vue'

  import { ref } from 'vue'

  import { useProtocolStore } from '@/store/ProtocolStore'
  import { useProtocolRenderStore } from '@/store/ProtocolRenderStore'

  const drawerLeft = ref(false)
  const settingsModal = ref(false)
  const newProtocolDialog = ref(false)

  const protocolStore = useProtocolStore()
  const protocolRenderStore = useProtocolRenderStore()

  function newProtocol() {
    protocolStore.newProtocol()
  }
</script>
