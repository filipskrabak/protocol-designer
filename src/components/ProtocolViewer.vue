<template>
  <div class="d-flex justify-center align-center">
    <v-skeleton-loader type="table-row, table-row, table-row, table-row" height="240" width="380" v-if="svgLoading">
    </v-skeleton-loader>
    <div ref="svgWrapper">
    </div>
  </div>
  <div>
    <button @click="showAddFieldModal = true">+</button>
  </div>


  <ProtocolEditModal :protocolEditModal="protocolEditModal" @modal="toggleModal"/>
  <AddFieldModal v-if="showAddFieldModal" @close="toggleAddFieldModal" @addField="handleAddField"/>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { ref, onMounted } from 'vue';
import ProtocolEditModal from './modals/ProtocolEditModal.vue';
import AddFieldModal from './modals/AddFieldModal.vue';
import { Field, FieldOptions } from '../contracts';
import { Endian } from '../contracts';
import { useProtocolStore } from '@/store/ProtocolStore';

const protocolStore = useProtocolStore();
const svgWrapper = ref<HTMLElement>();
const protocolEditModal = ref(false);
const showAddFieldModal = ref(false);
const svgLoading = ref(true);

const toggleModal = () => {
  protocolEditModal.value = !protocolEditModal.value;
};

const toggleAddFieldModal = () => {
  showAddFieldModal.value = !showAddFieldModal.value;
};

onMounted(() => {
  if(!svgWrapper.value) {
    throw new Error('svgWrapper is not defined');
  }

  const svg = d3.select(svgWrapper.value);

  // create D3 namespace for pd
  d3.namespaces['pd'] = 'http://www.protocoldescription.com';

  d3.xml('https://raw.githubusercontent.com/filipskrabak/protocols/main/eth2/eth2.svg').then((data) => {
    if(!svg) {
      throw new Error('svg is not defined');
    }
    svg.node()?.append(data.documentElement);

    onSvgLoaded();

  });
});

function setSvgSize() {
  let bBox = document.querySelector("svg")?.getBBox();

  if(!svgWrapper.value || !bBox) {
    return;
  }

  svgWrapper.value.style.width = bBox.width + "px";
  svgWrapper.value.style.height = bBox.height + "px";
}

function onSvgLoaded() {
  svgLoading.value = false;

  setSvgSize();

  const metadata = d3.select('metadata').node() as HTMLElement;

  if(!metadata) {
    throw new Error('metadata is not defined');
  }

  // select all pd:field elements inside metadata
  const pdNamespaceURI = d3.namespaces['pd'];
  const fields = metadata.getElementsByTagNameNS(pdNamespaceURI, 'field');

  console.log(fields)

  // iterate over all pd:field elements (HTMLCollection)
  Array.from(fields).forEach((field) => {

    const targetElement = d3.select(`[data-id="${field.getAttribute('pd:id')}"]`);

    const fieldOptions: FieldOptions[] = [];

      const options = field.getElementsByTagNameNS(pdNamespaceURI, 'option');

      Array.from(options).forEach((option) => {
        const d3Option = d3.select(option);

        const optionName = d3Option.attr('pd:name');
        const optionValue: number = parseInt(d3Option.attr('pd:value'));

        fieldOptions.push({
          name: optionName,
          value: optionValue,
        });
      });

    const d3Field = d3.select(field);

    console.log("d3Field", d3Field)

    // print all attributes of the field
    console.log("attributes", d3Field.attr('pd:length'))
    console.log("attributes", d3Field.attr('pd:length_max'))
    console.log("attributes", d3Field.attr('pd:display_name'))

    let is_variable_length = d3Field.attr('pd:length') === '0';

    // Assume big endian if not specified, since that's what most protocols use
    let endian: Endian = Endian.Big;
    if(d3Field.attr('pd:endian') === 'little') {
      endian = Endian.Little;
    }

    let fieldInfo: Field = {
      field_options: fieldOptions,
      length: parseInt(d3Field.attr('pd:length')),
      max_length: parseInt(d3Field.attr('pd:length_max')),
      is_variable_length: is_variable_length,
      endian: endian,
      display_name: d3Field.attr('pd:display_name'),
      id: d3Field.attr('pd:id'),
      description: d3Field.attr('pd:description'),
      encapsulate: d3Field.attr('pd:encapsulate') === 'true' ? true : false,
    };

    protocolStore.addField(fieldInfo);

    targetElement.on('click', function() {
      protocolStore.editingField = fieldInfo;
      protocolStore.editingFieldId = fieldInfo.id;

      toggleModal();
    });

    // add dataElement class to the target element
    targetElement.classed('dataElement', true);
  });
}

function handleAddField(newField: Field) {
  showAddFieldModal.value = false;

  if(!svgWrapper.value) {
    throw new Error('svgWrapper is not defined');
  }

  const svg = d3.select(svgWrapper.value);
  const metadata = d3.select('metadata').node();
  const pdNamespaceURI = d3.namespaces['pd'];
  const newFieldElement = document.createElementNS(pdNamespaceURI, 'pd:field');

  if(!metadata || !(metadata instanceof HTMLElement)) {
    throw new Error('metadata is not defined');
  }

  newFieldElement.setAttribute('pd:display_name', newField.display_name);
  newFieldElement.setAttribute('pd:id', newField.id);
  newFieldElement.setAttribute('pd:length', String(newField.length));
  newFieldElement.setAttribute('pd:length_max', String(newField.length));

  metadata.appendChild(newFieldElement);

  const lastGElement = svg.selectAll('.dataElement').nodes().pop();

  if(!lastGElement || !(lastGElement instanceof HTMLElement)) {
    throw new Error('lastGElement is not defined');
  }

  const lastGElementTransformY = lastGElement.getAttribute('transform')?.split(',')[1].replace(')', '');

  console.log("lastGElementTransform", lastGElementTransformY)

  if(!lastGElementTransformY) {
    throw new Error('lastGElementTransformY is not defined');
  }

  // append to last g element found in the svg
  const newG = svg.select('g:last-of-type').append('g')
    .attr('transform', 'translate(0, ' + (parseInt(lastGElementTransformY) + 40) + ')')
    .attr('data-id', newField.id)
    .classed('dataElement', true);

  newG.append('rect')
    .classed('field', true)
    .attr('width', 256)
    .attr('height', 40);

  newG.append('svg')
    .attr('width', 256)
    .attr('height', 40)
    .append('text')
    .attr('x', '50%')
    .attr('y', '50%')
    .classed('fieldText', true)
    .text(newField.display_name);

  setSvgSize();

  onSvgLoaded();

}
</script>

<style>
  .dataElement {
    cursor: pointer;
  }

  .dataElement:hover rect {
    fill: rgb(216, 216, 216);
  }
</style>
