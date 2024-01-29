<template>
  <div class="wrapper w-md-100">
    <v-file-input
    :rules="rules"
    accept="image/svg+xml"
    placeholder="Upload a protocol (.svg)"
    label="Drag and drop a protocol file here or click to browse"
    variant="outlined"
    @change="uploadProtocol"
    ref="file"
    prepend-icon="mdi-ip-network"
    style="height: 100%;"
    ></v-file-input>
  </div>
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

<style scoped>
  .wrapper {
    margin: 0 auto;
    width: 50%;
    height: 300px;
  }

  @media screen and (max-width: 768px) {
    .wrapper {
      width: 100%;
      padding: 0 1rem;
    }
  }
</style>
