<template>
  <v-file-input
  :rules="rules"
  accept="image/svg+xml"
  placeholder="Pick an avatar"
  prepend-icon="mdi-camera"
  label="Avatar"
  @change="uploadProtocol"
  ref="file"
></v-file-input>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const file = ref<File | null>(null);

const rules = ref([
  (v: string) => !!v || 'File is required'
]);

const emit = defineEmits(['protocolUploaded', 'protocolData']);


async function uploadProtocol($event: Event) {

  const target = $event.target as HTMLInputElement;
  if(target && target.files) {
    file.value = target.files[0];
  }
  else {
    // TODO: FAIL STATE
    return;
  }

  // Read the file and emit contents to protocolData
  const reader = new FileReader();
  reader.readAsDataURL(file.value);
  reader.onload = (e) => {
    if(!e.target) return;

    // TODO: cleanup protocolUploaded
    emit('protocolData', e.target.result);
    emit('protocolUploaded');
  };
}

</script>
