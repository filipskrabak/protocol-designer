<template>
  <v-app>
    <v-layout class="rounded rounded-md">
      <v-app-bar title="Protocol Designer"></v-app-bar>

      <v-main class="d-flex align-center justify-center" style="min-height: 300px;">
        <DefaultView />
      </v-main>
    </v-layout>
  </v-app>
</template>

<script lang="ts" setup>
  import DefaultBar from './default/AppBar.vue'
  import DefaultView from './default/View.vue'
</script>
