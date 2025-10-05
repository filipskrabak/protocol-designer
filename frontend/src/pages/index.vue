<template>
  <v-layout>
    <!-- Left Sidebar Navigation -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      :width="280"
      class="border-e"
    >
      <v-list
        v-model:selected="selectedNavItem"
        color="primary"
        nav
        density="comfortable"
      >
        <!-- Protocol Design Category -->
        <v-list-subheader>Protocol Design</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-file-document-outline"
          title="Protocol Header"
          value="header"
          @click="selectTab(1)"
        />
        <v-list-item
          prepend-icon="mdi-cog-outline"
          title="Properties"
          value="properties"
          @click="selectTab(2)"
        />
        <v-list-item
          prepend-icon="mdi-layers-outline"
          title="Encapsulation"
          value="encapsulation"
          @click="selectTab(3)"
        />

        <!-- Behavior Category -->
        <v-list-subheader class="mt-4">Behavior</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-state-machine"
          title="Finite State Machine"
          value="fsm"
          @click="selectTab(4)"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <v-main>
      <v-window v-model="tab">
        <v-window-item :value="1">
          <v-container fluid>
            <ProtocolViewer />
          </v-container>
        </v-window-item>
        <v-window-item :value="2">
          <v-container class="tab-container">
            <ProtocolProperties />
          </v-container>
        </v-window-item>
        <v-window-item :value="3">
          <v-container class="tab-container">
            <ProtocolEncapsulation />
          </v-container>
        </v-window-item>
        <v-window-item :value="4">
          <v-container fluid>
            <FSMEditor />
          </v-container>
        </v-window-item>
      </v-window>
    </v-main>
  </v-layout>
</template>

<script lang="ts" setup>
import ProtocolViewer from "@/components/ProtocolViewer.vue";
import ProtocolProperties from "@/components/ProtocolProperties.vue";
import ProtocolEncapsulation from "@/components/ProtocolEncapsulation.vue";
import FSMEditor from "@/components/behavior/FiniteStateMachine.vue";
import { useSidebar } from "@/composables/useSidebar";

import { ref } from "vue";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { nextTick } from "vue";
import { useDisplay } from "vuetify";

const protocolRenderStore = useProtocolRenderStore();
const { mobile } = useDisplay();
const { drawer, rail } = useSidebar();

const tab = ref<number>(1);
const selectedNavItem = ref<string[]>(['header']);

async function selectTab(tabNumber: number) {
  tab.value = tabNumber;

  // Update selected nav item
  switch (tabNumber) {
    case 1:
      selectedNavItem.value = ['header'];
      await updateProtocolViewer();
      break;
    case 2:
      selectedNavItem.value = ['properties'];
      break;
    case 3:
      selectedNavItem.value = ['encapsulation'];
      break;
    case 4:
      selectedNavItem.value = ['fsm'];
      break;
  }

  // Close drawer on mobile after selection
  if (mobile.value) {
    drawer.value = false;
  }
}

async function updateProtocolViewer() {
  // Fix for SVG size not being set correctly
  await nextTick();
  protocolRenderStore.setSvgSize();
}

</script>

<style scoped>
@media only screen and (min-width: 960px) {
  .tab-container {
    max-width: 960px;
  }
}
</style>
