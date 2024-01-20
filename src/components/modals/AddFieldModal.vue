<template>
  <div class="backdrop" @click.self="closeModal">
      <div class="modal">
          <input type="text" v-model="newField.display_name" placeholder="Name" />
          <input type="text" v-model="newField.id" placeholder="ID" />
          <input type="text" v-model="newField.length" placeholder="Length" />
          <input type="text" v-model="newField.length_max" placeholder="Max Length" />

          <button @click="addField">Add Field</button>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const newField = ref({
  display_name: '',
  id: '',
  length: '',
  length_max: '',
});

const emit = defineEmits(['close', 'addField']);
function closeModal() {
  emit('close');
}

function addField() {
  emit('addField', newField.value);
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
