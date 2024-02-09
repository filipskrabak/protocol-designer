<template>
  <div class="d-flex mb-3" v-if="protocolStore.uploaded">
      <h1>{{ protocolStore.protocol.name }}</h1>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useProtocolStore } from '@/store/ProtocolStore';

// Stores
const protocolStore = useProtocolStore();

// Refs

</script>

<style>
</style>
