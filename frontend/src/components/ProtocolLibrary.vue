<template>
  <div>
    <!-- Search and Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search protocols"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          label="Sort by"
          variant="outlined"
          density="comfortable"
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="authorFilter"
          :items="authorOptions"
          label="Filter by author"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
        ></v-select>
      </v-col>
    </v-row>

    <!-- Protocol Cards Grid -->
    <v-row v-if="paginatedProtocols.length > 0">
      <v-col
        v-for="protocol in paginatedProtocols"
        :key="String(protocol.id)"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          class="protocol-card"
          elevation="2"
          hover
          @click="loadProtocol(protocol)"
        >
          <!-- SVG Preview -->
          <div class="svg-preview-container">
            <v-img
              v-if="svgPreviews[String(protocol.id)]"
              :src="svgPreviews[String(protocol.id)]"
              :alt="protocol.name"
              contain
              height="180"
              class="svg-preview"
            >
              <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular
                    indeterminate
                    color="primary"
                  ></v-progress-circular>
                </div>
              </template>
            </v-img>
            <div
              v-else
              class="svg-placeholder d-flex align-center justify-center"
            >
              <v-icon size="64" color="grey-lighten-1">
                mdi-file-document-outline
              </v-icon>
            </div>
          </div>

          <!-- Protocol Info -->
          <v-card-title class="text-h6 pb-2">
            {{ protocol.name }}
          </v-card-title>

          <v-card-subtitle class="pb-1">
            <v-icon size="16" class="mr-1">mdi-account</v-icon>
            {{ protocol.author }}
          </v-card-subtitle>

          <v-card-text class="pt-2 pb-2">
            <div class="d-flex align-center mb-1">
              <v-chip size="x-small" color="primary" variant="outlined">
                v{{ protocol.version }}
              </v-chip>
            </div>
            <div class="text-caption text-grey">
              <v-icon size="14">mdi-clock-outline</v-icon>
              {{ formatDate(protocol.created_at) }}
            </div>
          </v-card-text>

          <!-- Actions -->
          <v-card-actions>
            <v-btn
              size="small"
              variant="text"
              color="primary"
              prepend-icon="mdi-open-in-new"
              @click.stop="loadProtocol(protocol)"
            >
              Open
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              size="small"
              icon
              variant="text"
              color="error"
              @click.stop="confirmDelete(protocol)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else>
      <v-col cols="12" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-library-shelves</v-icon>
        <p class="text-h6 text-grey mt-4">No protocols found</p>
        <p class="text-body-2 text-grey">
          {{ searchQuery ? 'Try adjusting your search or filters' : 'Your library is empty' }}
        </p>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <v-row v-if="totalPages > 1" class="mt-4">
      <v-col cols="12" class="d-flex justify-center align-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          rounded="circle"
        ></v-pagination>
      </v-col>
    </v-row>

    <!-- Results Info -->
    <v-row v-if="filteredProtocols.length > 0" class="mt-2">
      <v-col cols="12" class="text-center text-caption text-grey">
        Showing {{ startIndex + 1 }}-{{ Math.min(endIndex, filteredProtocols.length) }}
        of {{ filteredProtocols.length }} protocol{{ filteredProtocols.length !== 1 ? 's' : '' }}
      </v-col>
    </v-row>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Delete Protocol?</v-card-title>
        <v-card-text>
          Are you sure you want to delete <strong>{{ protocolToDelete?.name }}</strong>?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="text" @click="deleteProtocol()">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted } from "vue";
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";
import { useNotificationStore } from "@/store/NotificationStore";
import { useProtocolLibraryStore } from "@/store/ProtocolLibraryStore";
import { useProtocolStore } from "@/store/ProtocolStore";
import { Protocol } from "@/contracts";
import _ from "lodash";
import router from "@/router";

const props = defineProps<{
  onProtocolLoad?: () => void;
}>();

const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();
const protocolLibraryStore = useProtocolLibraryStore();
const protocolStore = useProtocolStore();

// State
const searchQuery = ref("");
const sortBy = ref("created_desc");
const authorFilter = ref<string | null>(null);
const currentPage = ref(1);
const itemsPerPage = ref(8);
const svgPreviews = ref<Record<string, string>>({});
const deleteDialog = ref(false);
const protocolToDelete = ref<Protocol | null>(null);

// Sort options
const sortOptions = [
  { title: "Newest first", value: "created_desc" },
  { title: "Oldest first", value: "created_asc" },
  { title: "Name A-Z", value: "name_asc" },
  { title: "Name Z-A", value: "name_desc" },
  { title: "Author A-Z", value: "author_asc" },
];

// Compute unique authors for filter
const authorOptions = computed(() => {
  const authors = [...new Set(protocolLibraryStore.protocols.map(p => p.author))];
  return authors.sort();
});

// Filter and search protocols
const filteredProtocols = computed(() => {
  let filtered = [...protocolLibraryStore.protocols];

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.author.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }

  // Apply author filter
  if (authorFilter.value) {
    filtered = filtered.filter(p => p.author === authorFilter.value);
  }

  // Apply sorting
  switch (sortBy.value) {
    case "created_desc":
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case "created_asc":
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case "name_asc":
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name_desc":
      filtered.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "author_asc":
      filtered.sort((a, b) => a.author.localeCompare(b.author));
      break;
  }

  return filtered;
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredProtocols.value.length / itemsPerPage.value));

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() => currentPage.value * itemsPerPage.value);

const paginatedProtocols = computed(() => {
  return filteredProtocols.value.slice(startIndex.value, endIndex.value);
});

// Reset to page 1 when filters change
watch([searchQuery, authorFilter, sortBy], () => {
  currentPage.value = 1;
});

// Load SVG previews
async function loadSvgPreviews() {
  for (const protocol of protocolLibraryStore.protocols) {
    try {
      const svgData = await protocolLibraryStore.downloadProtocolFileFromServer(protocol.id);
      if (svgData) {
        svgPreviews.value[String(protocol.id)] = svgData;
      }
    } catch (error) {
      console.error(`Failed to load SVG for protocol ${protocol.name}:`, error);
    }
  }
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

async function loadProtocol(protocol: Protocol) {
  await router.push({ path: "/protocols/" + protocol.id });

  protocolStore.uploaded = true;
  protocolStore.protocol = _.cloneDeep(protocol);

  if (protocolRenderStore.loading == false) {
    protocolRenderStore.rawProtocolData = "";
    await protocolRenderStore.initializeProtocolRaw();
  }

  // Call the callback if provided (e.g., to close modal)
  if (props.onProtocolLoad) {
    props.onProtocolLoad();
  }
}

function confirmDelete(protocol: Protocol) {
  protocolToDelete.value = protocol;
  deleteDialog.value = true;
}

async function deleteProtocol() {
  if (!protocolToDelete.value) return;

  const result = await protocolLibraryStore.deleteProtocol(protocolToDelete.value);

  if (!result) {
    notificationStore.showNotification({
      message: `Protocol ${protocolToDelete.value.name} could not be deleted`,
      color: "error",
      icon: "mdi-alert",
      timeout: 3000,
    });
  } else {
    // Remove from SVG previews
    delete svgPreviews.value[String(protocolToDelete.value.id)];

    notificationStore.showNotification({
      message: `Protocol ${protocolToDelete.value.name} deleted`,
      color: "success",
      icon: "mdi-check",
      timeout: 3000,
    });
  }

  deleteDialog.value = false;
  protocolToDelete.value = null;
}

onMounted(async () => {
  await loadSvgPreviews();
});
</script>

<style scoped>
.protocol-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.protocol-card:hover {
  transform: translateY(-4px);
}

.svg-preview-container {
  position: relative;
  height: 180px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
}

.svg-preview {
  background-color: white;
}

.svg-placeholder {
  height: 180px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%);
}
</style>
