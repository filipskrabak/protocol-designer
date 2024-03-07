import * as d3 from 'd3';

import { Buffer } from 'buffer';
import { defineStore } from 'pinia'
import { AddFieldPosition, EditingMode, Field, FieldOptions, FloatingFieldWindow } from '../contracts';
import { Endian } from '../contracts';
import { useProtocolStore } from '@/store/ProtocolStore';
import { useSettingsStore } from '@/store/SettingsStore';
import { useNotificationStore } from './NotificationStore';
import { LINE_HEIGHT_PX } from '../constants';

import { ref } from 'vue';


export const useProtocolRenderStore = defineStore('ProtocolRenderStore', {
  // State
  state: () => ({
    rawProtocolData: '',
    svgWrapper: null as HTMLElement | null,
    loading: false,

    // Stores
    protocolStore: useProtocolStore(),
    settingsStore: useSettingsStore(),
    notificationStore: useNotificationStore(),

    fieldTooltip: {} as FloatingFieldWindow,
    fieldContextMenu: {} as FloatingFieldWindow,

    // Modals
    fieldEditModal: ref(false),
    fieldDeleteModal: ref(false),
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

      // remove all children from the root g element
      svg.select('g[data-table]').selectAll('*').remove();

      // remove all children from the metadata element
      metadata.innerHTML = '';

      // render pd:info element
      const newInfoElement = document.createElementNS(pdNamespaceURI, 'pd:info');

      const newNameElement = document.createElementNS(pdNamespaceURI, 'pd:name');
      newNameElement.textContent = this.protocolStore.protocol.name;
      newInfoElement.appendChild(newNameElement);

      const newAuthorElement = document.createElementNS(pdNamespaceURI, 'pd:author');
      newAuthorElement.textContent = this.protocolStore.protocol.author;
      newInfoElement.appendChild(newAuthorElement);

      const newDescriptionElement = document.createElementNS(pdNamespaceURI, 'pd:description');
      newDescriptionElement.textContent = this.protocolStore.protocol.description;
      newInfoElement.appendChild(newDescriptionElement);

      const newVersionElement = document.createElementNS(pdNamespaceURI, 'pd:version');
      newVersionElement.textContent = this.protocolStore.protocol.version;
      newInfoElement.appendChild(newVersionElement);

      const newLastUpdateElement = document.createElementNS(pdNamespaceURI, 'pd:last_update');
      newLastUpdateElement.textContent = this.protocolStore.protocol.last_update;
      newInfoElement.appendChild(newLastUpdateElement);

      const newCreatedElement = document.createElementNS(pdNamespaceURI, 'pd:created');
      newCreatedElement.textContent = this.protocolStore.protocol.created;
      newInfoElement.appendChild(newCreatedElement);

      metadata.appendChild(newInfoElement);


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

        // Mandatory attributes
        newFieldElement.setAttribute('pd:display_name', field.display_name);
        newFieldElement.setAttribute('pd:id', field.id);
        newFieldElement.setAttribute('pd:length', String(field.length));

        // Optional attributes
        if(field.is_variable_length) {
          newFieldElement.setAttribute('pd:length_max', String(field.max_length));
        }

        if(field.endian) {
          newFieldElement.setAttribute('pd:endian', field.endian);
        }

        if(field.description) {
          newFieldElement.setAttribute('pd:description', field.description);
        }

        // Field options
        field.field_options.forEach((option) => {
          const newOptionElement = document.createElementNS(pdNamespaceURI, 'pd:option');
          newOptionElement.setAttribute('pd:name', option.name);
          newOptionElement.setAttribute('pd:value', String(option.value));
          newFieldElement.appendChild(newOptionElement);
        });

        metadata.appendChild(newFieldElement);

        // Field is variable length, but the max length is unknown
        if(field.is_variable_length && !field.max_length) {
          // Stretch to the end of the line
          totalWidthToRender = (this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit) - renderedPixelsInLine;
        } else if(field.is_variable_length && field.length == 0) { // Field is variable length, but the minimum length is unknown
          // Stretch to the end of the line OR to max_length
          totalWidthToRender = Math.min(field.max_length * this.settingsStore.pixelsPerBit, this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit) - renderedPixelsInLine;
        } else if(field.is_variable_length && this.settingsStore.truncateVariableLengthFields) { // Field is variable length, has set min and max length, but should be truncated
          // Truncate the field to the minimum length
          totalWidthToRender = Math.min(field.length * this.settingsStore.pixelsPerBit, this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit) - renderedPixelsInLine;
        } else {
          totalWidthToRender = field.length * this.settingsStore.pixelsPerBit;
        }

        console.log("totalWidthToRender", totalWidthToRender)
        console.log("field length", field.length)

        if(renderedPixelsInLine == 0) {
          lastWrapperHeight += lastInnerHeight;

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
          console.log("lastInnerHeight", lastInnerHeight)
        }
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

      const dataScale = svg.select('g[data-scale]')

      // remove all children from data-scale g element
      dataScale.selectAll('*').remove();

      const tableGroup = svg.select('g[data-table]');
      const lineHeight = this.settingsStore.showScale ? LINE_HEIGHT_PX : 0;
      tableGroup.attr('transform', `translate(0, ${lineHeight})`);

      if(!this.settingsStore.showScale) {
        return;
      }

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
      const bBox = document.querySelector("svg")?.getBBox();

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
      const fields = metadata.querySelectorAll('field');

      console.log(fields)

      // iterate over all pd:field elements (HTMLCollection)
      Array.from(fields).forEach((field) => {

        const targetElements = d3.selectAll(`[data-id="${field.getAttribute('pd:id')}"]`);

        const fieldOptions: FieldOptions[] = [];

          const options = field.querySelectorAll('option');

          console.log("options", options)

          Array.from(options).forEach((option) => {
            const optionName = option.getAttribute('pd:name') ?? "";
            const optionValue: number = parseInt(option.getAttribute('pd:value') ?? "0");

            fieldOptions.push({
              name: optionName,
              value: optionValue,
            });
          });

        // print all attributes of the field
        console.log("attributes", field.attributes.getNamedItem('pd:length')?.value)
        console.log("attributes", field.attributes.getNamedItem('pd:length_max')?.value)
        console.log("attributes", field.attributes.getNamedItem('pd:display_name')?.value)

        const is_variable_length = (field.attributes.getNamedItem('pd:length')?.value === '0' || field.attributes.getNamedItem('pd:length_max')) ? true : false;

        // Assume big endian if not specified, since that's what most protocols use
        let endian: Endian = Endian.Big;
        if(field.attributes.getNamedItem('pd:endian')?.value === 'little') {
          endian = Endian.Little;
        }

        const fieldInfo: Field = {
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

        targetElements.on('click', () => {
          this.showFieldEditModal(fieldInfo)
        });

        targetElements.on('contextmenu', (e) => {
          e.preventDefault();

          this.fieldContextMenu = {
            show: true,
            x: e.clientX,
            y: e.clientY,
            field: fieldInfo,
          };

          console.log("contextmenu", fieldInfo.id)
        });

        // add dataElement class to the target element
        targetElements.classed('dataElement', true);
      });

      const dataElements = document.getElementsByClassName('dataElement');

      // elements with same attribute "data-id" will be highlighted
      for (let i = 0; i < dataElements.length; i++) {
        let that = this;
        dataElements[i].addEventListener('mouseover', function(event) {
          const dataId = dataElements[i].getAttribute('data-id');
          const elementsToHighlight = d3.selectAll(`[data-id="${dataId}"]`);

          if(!dataId) {
            return;
          }

          // Tooltip stuff

          let field = that.protocolStore.findFieldById(dataId);

          if(!field) {
            return;
          }

          let firstHighlightedEl = elementsToHighlight.nodes()[0];

          if(!firstHighlightedEl || !(firstHighlightedEl instanceof SVGElement)) {
            return;
          }

          // Calculate X based in field position
          let x = firstHighlightedEl.getBoundingClientRect().left + firstHighlightedEl.getBoundingClientRect().width / 2 - 100;
          let y = firstHighlightedEl.getBoundingClientRect().top - firstHighlightedEl.getBoundingClientRect().height - 30;

          that.fieldTooltip = {
            show: true,
            x: x,
            y: y,
            field: field,
          };


          elementsToHighlight.each(function() {
            const rect = d3.select(this).select('rect');
            rect.style('fill', 'rgb(216, 216, 216)');
          });
        });

        dataElements[i].addEventListener('mouseout', function() {
          const dataId = dataElements[i].getAttribute('data-id');
          const elementsToHighlight = d3.selectAll(`[data-id="${dataId}"]`);

          that.fieldTooltip.show = false;

          elementsToHighlight.each(function() {
            const rect = d3.select(this).select('rect');
            rect.style('fill', 'white');
          });
        });
      }

      // Load protocol information

      const protocolInfo = metadata.querySelector('info')

      if(!protocolInfo) {
        throw new Error('protocolInfo is not defined');
      }

      console.log("protocolInfo", protocolInfo)

      // get element by tag name
      this.protocolStore.protocol.name = protocolInfo.querySelector('name')?.textContent ?? "";
      this.protocolStore.protocol.author = protocolInfo.querySelector('author')?.textContent ?? "";
      this.protocolStore.protocol.description = protocolInfo.querySelector('description')?.textContent ?? "";
      this.protocolStore.protocol.version = protocolInfo.querySelector('version')?.textContent ?? "";
      this.protocolStore.protocol.last_update = protocolInfo.querySelector('last_update')?.textContent ?? "";
      this.protocolStore.protocol.created = protocolInfo.querySelector('created')?.textContent ?? "";

      console.log("protocolStore", this.protocolStore.protocol)
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
      svg.node()?.append(new DOMParser().parseFromString(Buffer.from(data.split(',')[1], 'base64').toString('utf-8'), 'image/svg+xml').documentElement);

      this.getMetadata();

      this.initialize();

      this.notificationStore.showNotification({
        message: 'Protocol successfully uploaded',
        timeout: 5000,
        color: 'green',
        icon: 'mdi-check',
      });
    },

    // Modal stuff
    showFieldEditModal(field: Field) {
      this.protocolStore.editingField = field;
      this.protocolStore.editingFieldId = field.id;

      this.protocolStore.editingMode = EditingMode.Edit;
      this.fieldEditModal = !this.fieldEditModal;
    },
    showFieldAddModal(relativeFieldPosition: Field | null = null, position: AddFieldPosition = AddFieldPosition.End) {
      this.protocolStore.editingMode = EditingMode.Add;

      // Relative add
      if(relativeFieldPosition && position) {
        this.protocolStore.addFieldPosition = position;
        this.protocolStore.addFieldPositionFieldId = relativeFieldPosition.id;
      }

      // clean up the editingField
      this.protocolStore.editingField = {
        field_options: [],
        length: 0,
        max_length: 0,
        is_variable_length: false,
        endian: Endian.Big,
        display_name: '',
        id: '',
        description: '',
        encapsulate: false,
      };

      this.fieldEditModal = !this.fieldEditModal;
    },
    showFieldDeleteModal(field: Field) {
      this.protocolStore.editingField = field;
      this.protocolStore.editingFieldId = field.id;

      this.protocolStore.editingMode = EditingMode.Edit;
      this.fieldDeleteModal = !this.fieldDeleteModal;
    },
    closeFieldModal() {
      this.fieldEditModal = false;
    },


    // Exports

    exportSVG() {
      if(!this.svgWrapper) {
        throw new Error('svgWrapper is not defined');
      }

      const svg = this.svgWrapper.querySelector('svg');

      if(!svg) {
        throw new Error('svg is not defined');
      }

      const svgData = new XMLSerializer().serializeToString(svg);

      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const svgUrl = URL.createObjectURL(svgBlob);

      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = this.protocolStore.protocol.name + '.svg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  },

  // Getters

})
