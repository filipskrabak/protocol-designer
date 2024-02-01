import * as d3 from 'd3';

import { defineStore } from 'pinia'
import { Field, FieldOptions } from '../contracts';
import { Endian } from '../contracts';
import { useProtocolStore } from '@/store/ProtocolStore';
import { useSettingsStore } from '@/store/SettingsStore';
import { LINE_HEIGHT_PX } from '../constants';

import { ref } from 'vue';


export const useProtocolRenderStore = defineStore('ProtocolRenderStore', {
  // State
  state: () => ({
    svgWrapper: null as HTMLElement | null,
    loading: false,
    protocolStore: useProtocolStore(),
    settingsStore: useSettingsStore(),

    // Modals
    protocolEditModal: ref(false),
  }),

  // Actions
  actions: {
    initialize() {
      this.renderSVG();
      this.renderScale();
      this.setSvgSize();
      this.getMetadata();
    },


    /**
     * Renders the SVG based on the protocolStore fields array
     * the whole SVG is re-rendered every time a field is added or edited
     * Metadata is also completely re-written!
     */
    renderSVG() {
      if(!this.svgWrapper) {
        throw new Error('svgWrapper is not defined');
      }

      const svg = d3.select(this.svgWrapper);
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
      this.protocolStore.fields.forEach((field) => {
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
            totalWidthToRender = (this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit) - renderedPixelsInLine;
          }
        } else {
          totalWidthToRender = field.length * this.settingsStore.pixelsPerBit;
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

          if(renderedPixelsInLine + totalWidthToRender > this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit) {
            width = (this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit) - renderedPixelsInLine;
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

          if(renderedPixelsInLine >= this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit) {
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
    },

    /**
     * Renders the arrow and the text for the scale above the protocol header
     * Does take the pixels per bit and bits per row settings into account
     */
    renderScale() {
      if(!this.svgWrapper) {
        throw new Error('svgWrapper is not defined');
      }

      const svg = d3.select(this.svgWrapper);

      // remove all children from data-scale g element
      svg.select('g[data-scale]').selectAll('*').remove();

      // append a new svg element to the data-scale g element
      const newSvgEl = svg.select('g[data-scale]').append('svg')
        .attr('width', this.settingsStore.pixelsPerBit * this.settingsStore.bitsPerRow)
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
        .attr('x', (this.settingsStore.pixelsPerBit * this.settingsStore.bitsPerRow) / 2 - 50)
        .attr('y', '0')
        .attr('height', '40')
        .attr('width', '100')
        .attr('fill', 'rgb(255,255,255)');

      // append a new text element to the svg element
      newSvgEl.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .classed('fieldText', true)
        .text(this.settingsStore.bitsPerRow + ' bits');
    },

    /**
     * Sets the size of the svgWrapper based on the bounding box of the SVG
     */
    setSvgSize() {
      let bBox = document.querySelector("svg")?.getBBox();

      if(!this.svgWrapper || !bBox) {
        return;
      }

      this.svgWrapper.style.width = bBox.width + "px";
      this.svgWrapper.style.height = bBox.height + "px";
    },

    /**
     * Handles the loading of metadata from the SVG into the protocolStore
     */
    getMetadata() {
      this.loading = false;

      // Clear protocolStore fields array
      this.protocolStore.clearProtocol();

      this.setSvgSize();

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

        this.protocolStore.addField(fieldInfo);

        targetElement.on('click', () => {
          this.protocolStore.editingField = fieldInfo;
          this.protocolStore.editingFieldId = fieldInfo.id;

          this.toggleModal();
        });

        // add dataElement class to the target element
        targetElement.classed('dataElement', true);
      });
    },

    /**
     * Handles uploading a protocol file (.svg) and subsequently calls getMetadata()
     * @param data Base64 encoded SVG string
     */
    protocolData(data: string) {
      console.log('protocolData', data);
      if(!this.svgWrapper) {
        throw new Error('svgWrapper is not defined');
      }

      const svg = d3.select(this.svgWrapper);

      // create D3 namespace for pd
      d3.namespaces['pd'] = 'http://www.protocoldescription.com';

      // Decode the base64 string
      svg.node()?.append(new DOMParser().parseFromString(atob(data.split(',')[1]), 'image/svg+xml').documentElement);

      this.getMetadata();
    },

    // Modal stuff
    toggleModal() {
      this.protocolEditModal = !this.protocolEditModal;
    },
  },

  // Getters

})