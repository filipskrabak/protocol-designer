<template>
  <v-container>
    <div class="d-flex justify-center align-center">
      <v-btn
        class="mt-5"
        color="primary"
        @click="newProject()"
        prepend-icon="mdi-plus"
        >Start a new project</v-btn
      >
    </div>
  </v-container>

  <!-- OR text -->

  <v-divider class="my-5"></v-divider>

  <h3 class="text-center mb-4">
    <v-icon>mdi-upload</v-icon>
    Or upload an existing protocol (.svg)
  </h3>

  <div class="wrapper w-md-100">
    <v-file-input
      :rules="rules"
      accept="image/svg+xml"
      placeholder="Upload a protocol (.svg)"
      label="Drag and drop a protocol file here or click to browse"
      variant="outlined"
      @change="uploadProtocol"
      ref="file"
      prepend-icon="mdi-file-upload"
      style="height: 100%"
    ></v-file-input>
  </div>
</template>

<script lang="ts" setup>
import router from "@/router";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useProtocolStore } from "@/store/ProtocolStore";
import { onMounted, ref } from "vue";
import axios from "axios";
import { v4 as uuid } from "uuid";
import { on } from "events";

const protocolRenderStore = useProtocolRenderStore();
const protocolStore = useProtocolStore();

const file = ref<File | null>(null);

const rules = ref([(v: string) => !!v || "File is required"]);

onMounted(() => {
  // Reset the protocol data (bugfix)
  protocolRenderStore.rawProtocolData = "";
});

async function uploadProtocol($event: Event) {
  const target = $event.target as HTMLInputElement;
  if (target && target.files) {
    file.value = target.files[0];
  } else {
    return;
  }

  // Read the file and emit contents to protocolData
  const reader = new FileReader();
  reader.readAsDataURL(file.value);
  reader.onload = (e) => {
    if (!e.target) return;

    protocolRenderStore.rawProtocolData = e.target.result as string;
    protocolStore.uploaded = true;
    protocolRenderStore.loading = true;

    router.push("/");
  };
}

async function newProject() {
  const response = await axios.get(
    "http://localhost:80/protocols/default.svg",
  );

  // replace %CURRENT_DATE% with current date (format DD.MM.YYYY)
  const currentDate = new Date().toLocaleDateString("sk-SK");
  response.data = response.data.replaceAll("%CURRENT_DATE%", currentDate);

  // replace %PROTOCOL_ID% with an uuid
  response.data = response.data.replaceAll("%PROTOCOL_ID%", uuid());

  // base64 encode the response data
  protocolRenderStore.rawProtocolData = `data:image/svg+xml;base64,${btoa(response.data)}`;
  protocolStore.uploaded = true;
  protocolRenderStore.loading = true;

  router.push("/");
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
