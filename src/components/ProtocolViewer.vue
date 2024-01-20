<template>
  <div ref="svgWrapper">
  </div>
  <div>
    <button @click="showAddFieldModal = true">+</button>
  </div>


  <ProtocolInfoModal v-if="showModal" @close="toggleModal" :protocolInfo="protocolInfo" />
  <AddFieldModal v-if="showAddFieldModal" @close="toggleAddFieldModal" @addField="handleAddField"/>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { ref, onMounted } from 'vue';
import ProtocolInfoModal from './modals/ProtocolInfoModal.vue';
import AddFieldModal from './modals/AddFieldModal.vue';
import { Field, FieldOptions } from '../contracts';

const svgWrapper = ref<HTMLElement>();
const showModal = ref(false);
const protocolInfo = ref({});
const showAddFieldModal = ref(false);

const toggleModal = () => {
  showModal.value = !showModal.value;
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
  setSvgSize();

  const metadata = d3.select('metadata').node() as HTMLElement;

  if(!metadata) {
    throw new Error('metadata is not defined');
  }

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

    targetElement.on('click', function() {
      const fieldOptions: FieldOptions[] = [];

      const options = field.getElementsByTagNameNS(pdNamespaceURI, 'option');

      Array.from(options).forEach((option) => {
        const D3option = d3.select(option);

        const optionName = D3option.attr('pd:name');
        const optionValue: number = parseInt(D3option.attr('pd:value'));

        fieldOptions.push({
          name: optionName,
          value: optionValue,
        });
      });

      const D3field = d3.select(field);

      console.log("D3field", D3field)

      // print all attributes of the field
      console.log("attributes", D3field.attr('pd:length'))
      console.log("attributes", D3field.attr('pd:length_max'))
      console.log("attributes", D3field.attr('pd:display_name'))

      protocolInfo.value = {
        length: D3field.attr('pd:length'),
        length_max: D3field.attr('pd:length_max'),
        display_name: D3field.attr('pd:display_name'),
        id: D3field.attr('pd:id'),
        encapsulate: D3field.attr('pd:encapsulate'),
        options: fieldOptions,
      };


      console.log("protocolInfo", protocolInfo.value)

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

  // add new g element to the svg

  // example of drawn svg:
  /*
  <g transform="translate(0, 160)" data-id="fcs" class="dataElement">
            <rect class="field" width="256" height="40"></rect>
            <svg width="256" height="40">
                <text x="50%" y="50%" class="fieldText">FCS</text>
            </svg>
        </g>
  */

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
    fill: grey;
  }
</style>
