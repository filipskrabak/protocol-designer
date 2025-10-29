<template>
  <v-dialog
    v-model="localModelValue"
    max-width="800px"
    @update:model-value="updateModelValue"
  >
    <v-card>
      <v-card-title class="text-h5">
        <v-icon class="me-2">mdi-download</v-icon>
        Export Protocol
      </v-card-title>

      <v-card-text>
        <v-container>
          <!-- Format Selection -->
          <v-row>
            <v-col cols="12">
              <h6 class="text-h6 mb-3">Select Export Format</h6>
              <v-row>
                <v-col
                  v-for="format in availableFormats"
                  :key="format.id"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <v-card
                    :class="{ 'v-card--outlined': selectedFormat?.id !== format.id, 'elevation-4': selectedFormat?.id === format.id }"
                    :color="selectedFormat?.id === format.id ? 'primary' : ''"
                    class="format-card"
                    height="120"
                    @click="selectFormat(format)"
                    style="cursor: pointer;"
                  >
                    <v-card-text class="text-center">
                      <v-icon
                        :color="selectedFormat?.id === format.id ? 'white' : 'primary'"
                        size="32"
                        class="mb-2"
                      >
                        {{ format.icon }}
                      </v-icon>
                      <div
                        :class="selectedFormat?.id === format.id ? 'text-white' : ''"
                        class="text-subtitle-2 font-weight-bold"
                      >
                        {{ format.name }}
                      </div>
                      <div
                        :class="selectedFormat?.id === format.id ? 'text-white' : 'text-medium-emphasis'"
                        class="text-caption"
                      >
                        .{{ format.fileExtension }}
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-col>
          </v-row>

          <!-- Format Description -->
          <v-row v-if="selectedFormat">
            <v-col cols="12">
              <v-alert
                type="info"
                variant="tonal"
                class="mb-4"
              >
                <div v-html="selectedFormat.description"></div>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Format Configuration -->
          <v-row v-if="selectedFormat && needsConfiguration(selectedFormat)">
            <v-col cols="12">
              <h6 class="text-h6 mb-3">Configuration</h6>

              <!-- Lua-specific configuration -->
              <div v-if="selectedFormat.id === 'lua'" class="mb-4">
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="exportConfig.udpPort"
                      label="UDP Port"
                      type="number"
                      hint="Port number of your UDP protocol"
                      persistent-hint
                      :rules="[(v: any) => !v || (v >= 1 && v <= 65535) || 'Port must be between 1 and 65535']"
                      min="1"
                      max="65535"
                    >
                      <template #prepend-inner>
                        <v-icon>mdi-network</v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>
              </div>
            </v-col>
          </v-row>

          <!-- Validation Errors -->
          <v-row v-if="validationErrors.length > 0">
            <v-col cols="12">
              <v-alert
                type="error"
                variant="tonal"
                class="mb-4"
              >
                <div class="text-subtitle-2 mb-2">Issues found:</div>
                <ul class="ml-4">
                  <li v-for="error in validationErrors" :key="error">
                    {{ error }}
                  </li>
                </ul>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Preview Section -->
          <v-row v-if="selectedFormat?.supportsPreview && previewContent">
            <v-col cols="12">
              <h6 class="text-h6 mb-3">Preview</h6>
              <v-card class="mb-4">
                <v-card-text>
                  <pre class="export-preview"><code>{{ previewContent }}</code></pre>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn
                    variant="text"
                    @click="copyToClipboard"
                    :disabled="!previewContent"
                  >
                    <v-icon class="me-1">mdi-content-copy</v-icon>
                    Copy
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey-darken-1"
          variant="text"
          @click="closeModal"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="generatePreview"
          :disabled="!selectedFormat || isGenerating"
          :loading="isGenerating"
        >
          <v-icon class="me-1">mdi-eye</v-icon>
          Preview
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="downloadExport"
          :disabled="!selectedFormat || validationErrors.length > 0 || isExporting"
          :loading="isExporting"
        >
          <v-icon class="me-1">mdi-download</v-icon>
          Download
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import { ExportFormat } from '@/contracts';
import { exportManager, SvgExportHandler, P4ExportHandler, LuaExportHandler } from '@/utils/exports';
import { useProtocolStore } from '@/store/ProtocolStore';
import { useProtocolRenderStore } from '@/store/ProtocolRenderStore';
import { useNotificationStore } from '@/store/NotificationStore';

// Props and emits
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  modal: [];
}>();

// Stores
const protocolStore = useProtocolStore();
const protocolRenderStore = useProtocolRenderStore();
const notificationStore = useNotificationStore();

// Local state
const localModelValue = ref(props.modelValue);
const selectedFormat = ref<ExportFormat | null>(null);
const availableFormats = ref<ExportFormat[]>([]);
const validationErrors = ref<string[]>([]);
const previewContent = ref<string>('');
const isGenerating = ref(false);
const isExporting = ref(false);
const exportConfig = ref<Record<string, any>>({
  udpPort: 12345 // Default UDP port
});

// Initialize export handlers
onMounted(() => {
  exportManager.registerHandler(new SvgExportHandler());
  exportManager.registerHandler(new P4ExportHandler());
  exportManager.registerHandler(new LuaExportHandler());
  availableFormats.value = exportManager.getAvailableFormats();
});

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  localModelValue.value = newValue;
  if (newValue) {
    resetModal();
  }
});

// Methods
const updateModelValue = (value: boolean) => {
  emit('update:modelValue', value);
};

const closeModal = () => {
  localModelValue.value = false;
  updateModelValue(false);
  emit('modal');
};

const resetModal = () => {
  selectedFormat.value = null;
  validationErrors.value = [];
  previewContent.value = '';
  isGenerating.value = false;
  isExporting.value = false;
  exportConfig.value = {
    udpPort: 12345 // Reset to default
  };
};

const needsConfiguration = (format: ExportFormat): boolean => {
  return format.id === 'lua'; // Only Lua export needs configuration for now
};

const selectFormat = async (format: ExportFormat) => {
  selectedFormat.value = format;
  previewContent.value = '';
  await validateSelection();
};

const validateSelection = async () => {
  if (!selectedFormat.value) {
    validationErrors.value = [];
    return;
  }

  const validation = await exportManager.validateForExport(
    protocolStore.protocol,
    selectedFormat.value.id
  );

  validationErrors.value = validation.errors || [];
};

const getExportContext = () => {
  return {
    svgWrapper: protocolRenderStore.svgWrapper || undefined,
    lengthToBits: protocolRenderStore.lengthToBits.bind(protocolRenderStore),
    maxLengthToBits: protocolRenderStore.maxLengthToBits.bind(protocolRenderStore),
    showNotification: notificationStore.showNotification.bind(notificationStore),
    configuration: { ...exportConfig.value }
  };
};

const generatePreview = async () => {
  if (!selectedFormat.value || validationErrors.value.length > 0) {
    return;
  }

  isGenerating.value = true;
  try {
    const result = await exportManager.generateExport(
      protocolStore.protocol,
      selectedFormat.value.id,
      getExportContext()
    );

    if (result.success) {
      previewContent.value = result.content || '';
      if (selectedFormat.value.supportsPreview && !previewContent.value) {
        notificationStore.showNotification({
          message: 'Preview not available for this format',
          color: 'warning',
          icon: 'mdi-alert',
          timeout: 3000
        });
      }
    } else {
      notificationStore.showNotification({
        message: `Preview failed: ${result.error}`,
        color: 'error',
        icon: 'mdi-alert',
        timeout: 5000
      });
    }
  } catch (error) {
    notificationStore.showNotification({
      message: 'Failed to generate preview',
      color: 'error',
      icon: 'mdi-alert',
      timeout: 3000
    });
  } finally {
    isGenerating.value = false;
  }
};

const downloadExport = async () => {
  if (!selectedFormat.value || validationErrors.value.length > 0) {
    return;
  }

  isExporting.value = true;
  try {
    const result = await exportManager.exportAndDownload(
      protocolStore.protocol,
      selectedFormat.value.id,
      getExportContext()
    );

    if (result.success) {
      const fsmCount = protocolStore.protocol.finite_state_machines?.length || 0;
      const fsmMessage = fsmCount > 0 ? ` with ${fsmCount} FSM${fsmCount > 1 ? 's' : ''}` : '';

      notificationStore.showNotification({
        message: `${selectedFormat.value.name} exported successfully${fsmMessage}`,
        color: 'success',
        icon: 'mdi-check',
        timeout: 3000
      });
      closeModal();
    } else {
      notificationStore.showNotification({
        message: `Export failed: ${result.error}`,
        color: 'error',
        icon: 'mdi-alert',
        timeout: 5000
      });
    }
  } catch (error) {
    notificationStore.showNotification({
      message: 'Failed to export protocol',
      color: 'error',
      icon: 'mdi-alert',
      timeout: 3000
    });
  } finally {
    isExporting.value = false;
  }
};

const copyToClipboard = async () => {
  if (previewContent.value) {
    try {
      await navigator.clipboard.writeText(previewContent.value);
      notificationStore.showNotification({
        message: 'Copied to clipboard',
        color: 'success',
        icon: 'mdi-check',
        timeout: 2000
      });
    } catch (error) {
      notificationStore.showNotification({
        message: 'Failed to copy to clipboard',
        color: 'error',
        icon: 'mdi-alert',
        timeout: 3000
      });
    }
  }
};

// Watch for protocol changes to revalidate
watch(() => protocolStore.protocol, validateSelection, { deep: true });
</script>

<style scoped>
.format-card {
  transition: all 0.2s ease-in-out;
}

.format-card:hover {
  transform: translateY(-2px);
}

.export-preview {
  background-color: rgb(var(--v-theme-surface-variant));
  border-radius: 4px;
  padding: 16px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: white;
}
</style>
