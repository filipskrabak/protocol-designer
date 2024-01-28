<template>
  <div class="d-flex justify-center align-center">
    <template v-if="protocolUploaded">
      <v-skeleton-loader type="table-row, table-row, table-row, table-row" height="240" width="380" v-if="svgLoading">
      </v-skeleton-loader>
    </template>
    <ProtocolUpload v-else @protocolUploaded="protocolUploaded = true" @protocolData="protocolData" />
    <div ref="svgWrapper">
    </div>
  </div>
  <div>
    <button @click="showAddFieldModal = true">+</button>
  </div>


  <ProtocolEditModal :protocolEditModal="protocolEditModal" @modal="toggleModal" @save="renderSVG"/>
  <AddFieldModal v-if="showAddFieldModal" @close="toggleAddFieldModal" @addField="handleAddField" />

  <!-- button for renderSVG() -->

  <button @click="renderSVG">Render SVG</button>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { ref, onMounted } from 'vue';
import ProtocolEditModal from './modals/ProtocolEditModal.vue';
import AddFieldModal from './modals/AddFieldModal.vue';
import ProtocolUpload from './ProtocolUpload.vue';
import { Field, FieldOptions } from '../contracts';
import { Endian } from '../contracts';
import { useProtocolStore } from '@/store/ProtocolStore';
import { PIXELS_PER_BIT, BITS_PER_LINE, LINE_HEIGHT_PX } from '../constants';

// Stores
const protocolStore = useProtocolStore();

// Refs
const svgWrapper = ref<HTMLElement>();
const protocolEditModal = ref(false);
const showAddFieldModal = ref(false);
const svgLoading = ref(true);
const protocolUploaded = ref(false);

const toggleModal = () => {
  protocolEditModal.value = !protocolEditModal.value;
};

const toggleAddFieldModal = () => {
  showAddFieldModal.value = !showAddFieldModal.value;
};
/*
onMounted(() => {
  if(!svgWrapper.value) {
    throw new Error('svgWrapper is not defined');
  }

  const svg = d3.select(svgWrapper.value);

  // create D3 namespace for pd
  d3.namespaces['pd'] = 'http://www.protocoldescription.com';

  d3.xml('https://raw.githubusercontent.com/filipskrabak/protocols/main/udp/udp.svg').then((data) => {
    if(!svg) {
      throw new Error('svg is not defined');
    }
    svg.node()?.append(data.documentElement);

    onSvgLoaded();

  });
});
*/
function protocolData(data: string) {
  console.log('protocolData', data);
  if(!svgWrapper.value) {
    throw new Error('svgWrapper is not defined');
  }

  const svg = d3.select(svgWrapper.value);

  // create D3 namespace for pd
  d3.namespaces['pd'] = 'http://www.protocoldescription.com';

  // Decode the base64 string
  svg.node()?.append(new DOMParser().parseFromString(atob(data.split(',')[1]), 'image/svg+xml').documentElement);

  onSvgLoaded();
}

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

  // Clear protocolStore fields array
  protocolStore.clearProtocol();

  setSvgSize();

  const metadata = d3.select('metadata').node() as HTMLElement;

  if(!metadata) {
    throw new Error('metadata is not defined');
  }

  // select all pd:field elements inside metadata
  const pdNamespaceURI = d3.namespaces['pd'];
  const fields = metadata.querySelectorAll('field');

  console.log(fields)

  // iterate over all pd:field elements (HTMLCollection)
  Array.from(fields).forEach((field) => {

    const targetElement = d3.select(`[data-id="${field.getAttribute('pd:id')}"]`);

    const fieldOptions: FieldOptions[] = [];

      const options = field.querySelectorAll('option');

      Array.from(options).forEach((option) => {
        const d3Option = d3.select(option);

        const optionName = d3Option.attr('pd:name');
        const optionValue: number = parseInt(d3Option.attr('pd:value'));

        fieldOptions.push({
          name: optionName,
          value: optionValue,
        });
      });

    // print all attributes of the field
    console.log("attributes", field.attributes.getNamedItem('pd:length')?.value)
    console.log("attributes", field.attributes.getNamedItem('pd:length_max')?.value)
    console.log("attributes", field.attributes.getNamedItem('pd:display_name')?.value)

    let is_variable_length = field.attributes.getNamedItem('pd:length')?.value === '0';

    // Assume big endian if not specified, since that's what most protocols use
    let endian: Endian = Endian.Big;
    if(field.attributes.getNamedItem('pd:endian')?.value === 'little') {
      endian = Endian.Little;
    }

    let fieldInfo: Field = {
      field_options: fieldOptions,
      length: parseInt(field.attributes.getNamedItem('pd:length')?.value ?? "0"),
      max_length: parseInt(field.attributes.getNamedItem('pd:length_max')?.value ?? "0"),
      is_variable_length: is_variable_length,
      endian: endian,
      display_name: field.attributes.getNamedItem('pd:display_name')?.value ?? "",
      id: field.attributes.getNamedItem('pd:id')?.value ?? "",
      description: field.attributes.getNamedItem('pd:description')?.value ?? "",
      encapsulate: field.attributes.getNamedItem('pd:encapsulate')?.value === 'true' ? true : false,
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

/**
 * Renders the SVG based on the protocolStore fields array
 * the whole SVG is re-rendered every time a field is added or edited
 */
function renderSVG() {
  if(!svgWrapper.value) {
    throw new Error('svgWrapper is not defined');
  }

  const svg = d3.select(svgWrapper.value);
  const metadata = d3.select('metadata').node();
  const pdNamespaceURI = d3.namespaces['pd'];

  if(!metadata || !(metadata instanceof Element)) {
    throw new Error('metadata is not defined');
  }

  // remove all children from the root g element (g element without attribute data-scale)
  svg.select('g[data-table]').selectAll('*').remove();

  // remove all children from the metadata element
  metadata.innerHTML = '';

  let lastWrapperHeight = 0;
  let renderedPixelsInLine = 0;
  let lastWrapperGElement: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let lastInnerHeight = 0;
  let lastInnerWidth = 0;

  // iterate over all fields in the protocolStore
  protocolStore.fields.forEach((field) => {
    let rendered = false;
    let totalWidthToRender = 0;

    // append a new pd:field element to the metadata element
    const newFieldElement = document.createElementNS(pdNamespaceURI, 'pd:field');

    newFieldElement.setAttribute('pd:display_name', field.display_name);
    newFieldElement.setAttribute('pd:id', field.id);
    newFieldElement.setAttribute('pd:length', String(field.length));
    newFieldElement.setAttribute('pd:length_max', String(field.length));

    metadata.appendChild(newFieldElement);


    if(field.is_variable_length) {
      if(!field.max_length) {
        // Stretch to the end of the line
        totalWidthToRender = (BITS_PER_LINE * PIXELS_PER_BIT) - renderedPixelsInLine;
      }
    } else {
      totalWidthToRender = field.length * PIXELS_PER_BIT;
    }

    console.log("totalWidthToRender", totalWidthToRender)
    console.log("field length", field.length)

    if(renderedPixelsInLine == 0) {
      lastWrapperGElement = svg.select('g[data-table]').append('g')
        .attr('transform', 'translate(0, ' + (lastWrapperHeight) + ')')

        lastInnerHeight = 0;
    }

    while(!rendered) {
      if(!lastWrapperGElement) {
        throw new Error('lastWrapperGElement is not defined');
      }

      // append a new g element to the root g element
      const newG = lastWrapperGElement.append('g')
        .attr('transform', 'translate(' + (lastInnerWidth) + ', ' + (lastInnerHeight) + ')')
        .attr('data-id', field.id)
        .classed('dataElement', true);

      let width = totalWidthToRender;

      if(renderedPixelsInLine + totalWidthToRender > BITS_PER_LINE * PIXELS_PER_BIT) {
        width = (BITS_PER_LINE * PIXELS_PER_BIT) - renderedPixelsInLine;
      }


      // append a new rect element to the new g element
      newG.append('rect')
        .classed('field', true)
        .attr('width', width)
        .attr('height', LINE_HEIGHT_PX);

      // append a new svg element to the new g element
      newG.append('svg')
        .attr('width', width)
        .attr('height', LINE_HEIGHT_PX)
        .append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .classed('fieldText', true)
        .text(field.is_variable_length ? field.display_name + ' ...' : field.display_name);

      renderedPixelsInLine += width;

      if(renderedPixelsInLine >= BITS_PER_LINE * PIXELS_PER_BIT) {
        renderedPixelsInLine = 0;
        lastInnerWidth = 0;
        lastInnerHeight += LINE_HEIGHT_PX;
      } else {
        lastInnerWidth += width;
      }

      totalWidthToRender -= width;

      if(totalWidthToRender <= 0) {
        rendered = true;
      }
    }
    lastWrapperHeight += lastInnerHeight;
  });

  renderScale();

  setSvgSize();

  onSvgLoaded();
}

function renderScale() {
  if(!svgWrapper.value) {
    throw new Error('svgWrapper is not defined');
  }

  const svg = d3.select(svgWrapper.value);

  // remove all children from data-scale g element
  svg.select('g[data-scale]').selectAll('*').remove();

  // append a new svg element to the data-scale g element
  const newSvgEl = svg.select('g[data-scale]').append('svg')
    .attr('width', PIXELS_PER_BIT * BITS_PER_LINE)
    .attr('height', LINE_HEIGHT_PX);


  // append defs
  const defs = newSvgEl.append('defs');

  // append a new marker element to the defs element
  const newMarker = defs.append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', '10')
    .attr('refY', '5')
    .attr('markerWidth', '6')
    .attr('markerHeight', '6')
    .attr('orient', 'auto-start-reverse');

  // append a new path element to the marker element
  newMarker.append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10')
    .attr('fill', 'transparent')
    .attr('stroke', 'black')
    .attr('stroke-width', '2px');

  // append a new g element to the svg element
  const newG = newSvgEl.append('g')
    .attr('transform', 'translate(0, 20)');

  // append a new line element to the g element
  newG.append('line')
    .attr('x1', '0')
    .attr('y1', '0')
    .attr('x2', '100%')
    .attr('y2', '0')
    .attr('stroke', 'black')
    .attr('stroke-width', '2')
    .attr('marker-end', 'url(#arrow)')
    .attr('marker-start', 'url(#arrow)');

  // append a new rect element to the svg element
  newSvgEl.append('rect')
    .attr('x', (PIXELS_PER_BIT * BITS_PER_LINE) / 2 - 50)
    .attr('y', '0')
    .attr('height', '40')
    .attr('width', '100')
    .attr('fill', 'rgb(255,255,255)');

  // append a new text element to the svg element
  newSvgEl.append('text')
    .attr('x', '50%')
    .attr('y', '50%')
    .classed('fieldText', true)
    .text(BITS_PER_LINE + ' bits');
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
