<template>
    <v-dialog
      v-model="protocolInfoModalRef"
      width="500"
    >
      <v-card>
        <v-card-text>
          <h2>Field: {{ protocolInfo?.display_name }}</h2>
            <dl>
                <dt>Name</dt>
                <dd>{{ protocolInfo?.display_name }}</dd>

                <dt>Internal Name</dt>
                <dd>{{ protocolInfo?.id }}</dd>

                <dt>Length</dt>
                <dd>{{ protocolInfo?.length }}b or {{ protocolInfo?.length / 8 }}B</dd>

                <div v-if="protocolInfo?.encapsulate != null">
                    <dt>Encapsulate</dt>
                    <dd>{{ protocolInfo?.encapsulate }}</dd>
                </div>

                <div v-if="protocolInfo?.options.length != 0">
                    <dt>Possible Values</dt>
                    <dd>
                        <dl>
                            <dd v-for="option in protocolInfo?.options" :key="option.id">{{ option.value }} - {{ option.name }}</dd>
                        </dl>
                    </dd>
                </div>
          </dl>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="protocolInfoModalRef = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    protocolInfoModal: Boolean,
    protocolInfo: Object,
});

const emit = defineEmits(['modal']);

// Send info about the modal to the parent component
const protocolInfoModalRef = computed({
    get: () => props.protocolInfoModal,
    set: (value: boolean) => {
        emit('modal', value);
    },
});
</script>

<style>
dt {
    font-weight: bold;
    margin-top: 10px;
}
</style>
