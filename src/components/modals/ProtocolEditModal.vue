<template>
    <v-dialog
      v-model="modalRef"
      width="800"
    >
      <!--<v-card>
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
          <v-btn color="primary" block @click="modalRef = false">Close</v-btn>
        </v-card-actions>
      </v-card>-->
      <v-card>
        <v-card-title>
          <span class="text-h5">Field: {{ protocolStore.editingField.display_name }}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col
                md="6"
              >
                <v-text-field
                  label="Display name*"
                  required
                  v-model="protocolStore.editingField.display_name"
                  hint="Name displayed to the user (ex. Destination Port)"
                ></v-text-field>
              </v-col>
              <v-col
                md="6"
              >
                <v-text-field
                  label="ID (internal name)*"
                  required
                  v-model="protocolStore.editingField.id"
                  hint="Name used in the protocol definition (ex. dst_port)"
                ></v-text-field>
              </v-col>
              <v-col
                md="12"
                class="py-0"
              >
                <v-switch label="Variable length" v-model="protocolStore.editingField.is_variable_length" color="primary">
                </v-switch>
              </v-col>
              <v-col
                md="6"
              >
                <v-text-field
                    :label="protocolStore.editingField.is_variable_length ? 'Minimum length*' : 'Length*'"
                    required
                    v-model="protocolStore.editingField.length"
                    hint="If variable length is enabled, this is the minimum length"
                    suffix="bits"
                  ></v-text-field>
              </v-col>
              <v-col
                md="6"
              >
                <v-text-field v-if="protocolStore.editingField.is_variable_length"
                    label="Maximum length*"
                    required
                    v-model="protocolStore.editingField.max_length"
                    hint="Maximum possible length"
                    suffix="bits"
                  ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-select
                  :items="[Endian.Big, Endian.Little]"
                  label="Endianity*"
                  v-model="protocolStore.editingField.endian"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  auto-grow
                  label="Description"
                  rows="2"
                  row-height="20"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="modalRef = false"
          >
            Close
          </v-btn>
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="saveEdit()"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { Field, Endian } from '@/contracts';
import { PropType, computed} from 'vue';
import { useProtocolStore } from '@/store/ProtocolStore';

const protocolStore = useProtocolStore();

const props = defineProps({
    protocolEditModal: Boolean,
});

const emit = defineEmits(['modal']);

// Send info about the modal to the parent component
const modalRef = computed({
    get: () => props.protocolEditModal,
    set: (value: boolean) => {
        emit('modal', value);
    },
});

// Save edit
function saveEdit() {

}

</script>

<style>
dt {
    font-weight: bold;
    margin-top: 10px;
}
</style>
