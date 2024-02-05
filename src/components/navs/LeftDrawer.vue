<template>
  <v-list-item link title="Add Custom Field" prepend-icon="mdi-plus" @click="addField"></v-list-item>
  <v-list-item title="Protocol Fields" subtitle="Drag and drop components" class="mt-3"></v-list-item>
  <v-divider></v-divider>
  <v-list-item link title="MAC Field"></v-list-item>
  <v-list-item link title="IP Field"></v-list-item>
  <v-list-item link title="CRC32 Field"></v-list-item>

</template>

<script lang="ts" setup>
import { useProtocolRenderStore } from '@/store/ProtocolRenderStore';

const protocolRenderStore = useProtocolRenderStore();

function addField() {

  protocolRenderStore.showFieldAddModal();

}
</script>
