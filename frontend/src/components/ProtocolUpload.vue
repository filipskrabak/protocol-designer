<template>
  <v-container class="px-4 px-sm-6 py-6">
    <!-- Action Cards Section -->
    <v-row justify="center" class="mb-8">
      <v-col cols="12">
        <v-row>
          <!-- New Project Card -->
          <v-col cols="12" md="6">
            <v-card
              class="action-card"
              :class="{ 'pa-4': $vuetify.display.xs, 'pa-6': !$vuetify.display.xs }"
              elevation="4"
              hover
              @click="newProject()"
            >
              <v-card-text class="text-center" :class="{ 'pa-4': $vuetify.display.xs, 'pa-6': !$vuetify.display.xs }">
                <div class="icon-container mb-4">
                  <v-icon :size="$vuetify.display.xs ? 48 : 64" color="primary">mdi-plus-circle-outline</v-icon>
                </div>
                <h2 :class="$vuetify.display.xs ? 'text-h6' : 'text-h5'" class="font-weight-bold mb-3">Start New Project</h2>
                <p :class="$vuetify.display.xs ? 'text-body-2' : 'text-body-1'" class="text-grey mb-4">
                  Create a new network protocol
                </p>
                <v-btn
                  color="primary"
                  :size="$vuetify.display.xs ? 'default' : 'large'"
                  variant="flat"
                  prepend-icon="mdi-plus"
                  block
                >
                  Create New Protocol
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Upload Protocol Card -->
          <v-col cols="12" md="6">
            <v-card
              class="action-card"
              :class="{ 'pa-4': $vuetify.display.xs, 'pa-6': !$vuetify.display.xs }"
              elevation="4"
              hover
              @click="triggerFileUpload()"
            >
              <v-card-text class="text-center" :class="{ 'pa-4': $vuetify.display.xs, 'pa-6': !$vuetify.display.xs }">
                <div class="icon-container mb-4">
                  <v-icon :size="$vuetify.display.xs ? 48 : 64" color="secondary">mdi-upload-outline</v-icon>
                </div>
                <h2 :class="$vuetify.display.xs ? 'text-h6' : 'text-h5'" class="font-weight-bold mb-3">Import Protocol</h2>
                <p :class="$vuetify.display.xs ? 'text-body-2' : 'text-body-1'" class="text-grey mb-4">
                  Upload an existing protocol SVG file
                </p>
                <v-btn
                  color="secondary"
                  :size="$vuetify.display.xs ? 'default' : 'large'"
                  variant="flat"
                  prepend-icon="mdi-upload"
                  block
                >
                  Choose File
                </v-btn>
              </v-card-text>
            </v-card>
            <!-- Hidden file input -->
            <input
              type="file"
              ref="fileInputElement"
              accept="image/svg+xml"
              @change="uploadProtocol"
              style="display: none;"
            />
          </v-col>
        </v-row>

        <!-- Help Text -->
        <div class="text-center mt-6">
          <v-chip
            prepend-icon="mdi-information"
            color="info"
            variant="outlined"
            :size="$vuetify.display.xs ? 'x-small' : 'small'"
          >
            <span :class="$vuetify.display.xs ? 'text-caption' : ''">
              Only SVG files created with Protocol Designer can be uploaded.
            </span>
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Protocol Library Section -->
    <v-row justify="center">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon size="32" class="mr-3">mdi-folder-open</v-icon>
            <span class="text-h5">Your Protocols</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <ProtocolLibrary />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import router from "@/router";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useProtocolStore } from "@/store/ProtocolStore";
import { onMounted, ref } from "vue";
import axios from "axios";
import { v4 as uuid } from "uuid";
import ProtocolLibrary from "@/components/ProtocolLibrary.vue";

const protocolRenderStore = useProtocolRenderStore();
const protocolStore = useProtocolStore();

const fileInput = ref<File | null>(null);
const fileInputElement = ref<HTMLInputElement | null>(null);

const rules = ref([(v: string) => !!v || "File is required"]);

onMounted(() => {
  // Reset the protocol data (bugfix)
  protocolRenderStore.rawProtocolData = "";
});

function triggerFileUpload() {
  fileInputElement.value?.click();
}

async function uploadProtocol($event: Event) {
  const target = $event.target as HTMLInputElement;
  if (target && target.files) {
    fileInput.value = target.files[0];
  } else {
    return;
  }

  // Read the file and emit contents to protocolData
  const reader = new FileReader();
  reader.readAsDataURL(fileInput.value);
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
    window.location.origin + "/protocols/default.svg",
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
.action-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
}

.action-card:hover {
  transform: translateY(-4px);
}

.icon-container {
  padding: 16px;
  border-radius: 50%;
  display: inline-block;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
}

/* Prevent overflow on small screens */
@media (max-width: 600px) {
  .icon-container {
    padding: 12px;
  }
}
</style>
