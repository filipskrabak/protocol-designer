<template>
    <div class="backdrop" @click.self="closeModal">
        <div class="modal">
            <h2>Protocol Info</h2>
            <dl>
                <dt>Length</dt>
                <dd>{{ protocolInfo?.length }}b or {{ protocolInfo?.length / 8 }}B</dd>

                <dt>Display Name</dt>
                <dd>{{ protocolInfo?.display_name }}</dd>

                <dt>Internal Name</dt>
                <dd>{{ protocolInfo?.id }}</dd>

                <div v-if="protocolInfo?.encapsulate != null">
                    <dt>Encapsulate</dt>
                    <dd>{{ protocolInfo?.encapsulate }}</dd>
                </div>

                <div v-if="protocolInfo?.options.length != 0">
                    <dt>Possible Values</dt>
                    <dd>
                        <dl>
                            <dd v-for="option in protocolInfo?.options">{{ option.value }} - {{ option.name }}</dd>
                        </dl>
                    </dd>
                </div>
            </dl>

        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
    protocolInfo: Object,
});

const emit = defineEmits(['close']);
function closeModal() {
    emit('close');
}
</script>

<style>
.backdrop {
    position: fixed;
    top: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.5);
    width: 100%;
    height: 100%;
}
.modal {
    width: 400px;
    background: white;
    padding: 30px;
    margin: 100px auto;
    border-radius: 10px;
}
dt {
    font-weight: bold;
    margin-top: 10px;
}
</style>
