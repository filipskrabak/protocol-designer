<template>
  <v-app>
    <v-layout class="rounded rounded-md">
      <v-app-bar>
        <v-app-bar-nav-icon variant="text" @click.stop="drawerLeft = !drawerLeft"></v-app-bar-nav-icon>

        <v-toolbar-title>Protocol Designer</v-toolbar-title>
        <v-btn icon>
          <v-icon>mdi-upload</v-icon>
        </v-btn>

        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
            >
              <v-icon>mdi-download</v-icon>
              Export
            </v-btn>
          </template>
          <v-list>
            <v-list-item
            >
              <v-list-item-title>Scalable Vector Graphics (.svg)</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-btn icon @click.stop="drawerRight = !drawerRight">
          <v-icon>mdi-cog</v-icon>
        </v-btn>
      </v-app-bar>


      <v-navigation-drawer
        v-model="drawerLeft"
        location="left"
      >
        <v-list

        ></v-list>
      </v-navigation-drawer>

      <v-navigation-drawer
        v-model="drawerRight"
        location="right"
      >
        <v-list>

        </v-list>
      </v-navigation-drawer>


      <v-main class="d-flex align-center justify-center" style="min-height: 300px;">
        <DefaultView />
      </v-main>
    </v-layout>
  </v-app>
</template>

<script lang="ts" setup>
  import DefaultBar from './default/AppBar.vue'
  import DefaultView from './default/View.vue'

  import { ref } from 'vue'

  const drawerLeft = ref(false)
  const drawerRight = ref(false)
</script>
