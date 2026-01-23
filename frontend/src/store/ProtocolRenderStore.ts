import * as d3 from "d3";

import { Buffer } from "buffer";
import { defineStore } from "pinia";
import {
  AddFieldPosition,
  EditingMode,
  EncapsulatedProtocol,
  Field,
  FieldOption,
  FloatingFieldWindow,
  LengthUnit,
} from "../contracts";
import { Endian } from "../contracts";
import { useProtocolStore } from "@/store/ProtocolStore";
import { useSettingsStore } from "@/store/SettingsStore";
import { useNotificationStore } from "./NotificationStore";
import { useProtocolLibraryStore } from "./ProtocolLibraryStore";
import { LINE_HEIGHT_PX } from "../constants";
import { v4 } from "uuid";
import { generateGroupColor, hexToRgba } from "@/utils/groupUtils";

import { ref } from "vue";

import router from "@/router";
import _ from "lodash";

export const useProtocolRenderStore = defineStore("ProtocolRenderStore", {
  // State
  state: () => ({
    rawProtocolData: "",
    svgWrapper: null as HTMLElement | null,
    loading: false,

    // Stores
    protocolStore: useProtocolStore(),
    settingsStore: useSettingsStore(),
    notificationStore: useNotificationStore(),
    protocolLibraryStore: useProtocolLibraryStore(),

    fieldTooltip: {} as FloatingFieldWindow,
    fieldContextMenu: {} as FloatingFieldWindow,

    // Modals
    fieldEditModal: ref(false),
    fieldDeleteModal: ref(false),
    exportModal: ref(false),

    fieldEncapsulateModal: ref(false),
  }),

  // Actions
  actions: {
    async initialize() {
      this.loading = true;
      this.renderSVG();
      this.renderScale();
      this.setSvgSize();
      this.getMetadata();
      await this.saveCurrentProtocol();

      await router.push("/protocols/" + this.protocolStore.protocol.id);

      this.loading = false;
    },

    // Helper function to convert length to bits for rendering
    lengthToBits(field: Field): number {
      if (field.length_unit === LengthUnit.Bytes) {
        return field.length * 8;
      }
      return field.length;
    },

    // Helper function to convert max length to bits for rendering
    maxLengthToBits(field: Field): number {
      if (field.length_unit === LengthUnit.Bytes) {
        return (field.max_length ?? 0) * 8;
      }
      return field.max_length ?? 0;
    },

    /**
     * Renders the SVG based on the protocolStore fields array
     * the whole SVG is re-rendered every time a field is added or edited
     * Metadata is also completely re-written!
     */
    renderSVG() {
      if (!this.svgWrapper) {
        throw new Error("svgWrapper is not defined");
      }

      console.log("rendering SVG");
      console.log("protocol fields", this.protocolStore.protocol.fields);

      const svg = d3.select(this.svgWrapper);

      // Ensure SCXML namespace is declared on SVG root
      svg.attr("xmlns:scxml", "http://www.w3.org/2005/07/scxml");

      const metadata = d3.select("metadata").node();
      const pdNamespaceURI = d3.namespaces["pd"];

      if (!metadata || !(metadata instanceof Element)) {
        throw new Error("metadata is not defined");
      }

      // remove all children from the root g element
      svg.select("g[data-table]").selectAll("*").remove();

      // remove all children from the metadata element
      metadata.innerHTML = "";

      // render pd:info element
      const newInfoElement = document.createElementNS(
        pdNamespaceURI,
        "pd:info",
      );

      // iterate over all properties of the protocol object
      for (const [key, value] of Object.entries(this.protocolStore.protocol)) {
        // Skip fields, since they are handled separately
        if (key === "fields") {
          continue;
        }

        // Create a new namespace element, set its value and append it
        const newElement = document.createElementNS(
          pdNamespaceURI,
          `pd:${key}`,
        );
        newElement.textContent = String(value);
        newInfoElement.appendChild(newElement);
      }

      metadata.appendChild(newInfoElement);

      let lastWrapperHeight = 0;
      let renderedPixelsInLine = 0;
      let lastWrapperGElement: d3.Selection<
        SVGGElement,
        unknown,
        null,
        undefined
      > | null = null;
      let lastInnerHeight = 0;
      let lastInnerWidth = 0;

      // Sometimes, the fields array is undefined
      if (this.protocolStore.protocol.fields === undefined) {
        this.protocolStore.protocol.fields = [];
      }

      // iterate over all fields in the protocolStore
      this.protocolStore.protocol.fields.forEach((field) => {
        let rendered = false;
        let totalWidthToRender = 0;

        // append a new pd:field element to the metadata element
        const newFieldElement = document.createElementNS(
          pdNamespaceURI,
          "pd:field",
        );

        // Mandatory attributes
        newFieldElement.setAttribute("pd:display_name", field.display_name);
        newFieldElement.setAttribute("pd:id", field.id);
        newFieldElement.setAttribute("pd:length", String(field.length));
        newFieldElement.setAttribute("pd:length_unit", field.length_unit || LengthUnit.Bits);

        // Optional attributes
        if (field.is_variable_length) {
          newFieldElement.setAttribute(
            "pd:length_max",
            String(field.max_length),
          );
        }

        if (field.endian) {
          newFieldElement.setAttribute("pd:endian", field.endian);
        }

        if (field.description) {
          newFieldElement.setAttribute("pd:description", field.description);
        }

        if (field.encapsulate) {
          newFieldElement.setAttribute("pd:encapsulate", "true");
        }

        // Group attributes
        if (field.group_id) {
          newFieldElement.setAttribute("pd:group_id", field.group_id);
          // Store the color for the group_id (predefined or generated)
          const groupColor = generateGroupColor(field.group_id);
          newFieldElement.setAttribute("pd:group_color", groupColor);
        }

        // Field options
        field.field_options?.forEach((option) => {
          const newOptionElement = document.createElementNS(
            pdNamespaceURI,
            "pd:option",
          );
          newOptionElement.setAttribute("pd:name", option.name);
          newOptionElement.setAttribute("pd:value", String(option.value));
          newFieldElement.appendChild(newOptionElement);
        });

        metadata.appendChild(newFieldElement);

        // Field is variable length, but the max length is unknown
        if (field.is_variable_length && !field.max_length) {
          // Stretch to the end of the line
          totalWidthToRender =
            this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit -
            renderedPixelsInLine;
        } else if (field.is_variable_length && !this.settingsStore.truncateVariableLengthFields) {
          // Field is variable length, has set min and max length, but should not be truncated
          totalWidthToRender = this.maxLengthToBits(field) * this.settingsStore.pixelsPerBit;

        } else if (field.is_variable_length)
        {
          // Field is variable length, has set min and max length, but should be truncated
          // Truncate the field to the minimum length

          const rowWidth = this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit;
          const fieldLengthPx = Math.max(this.lengthToBits(field), this.maxLengthToBits(field)) * this.settingsStore.pixelsPerBit;

          if(rowWidth < fieldLengthPx) {
            totalWidthToRender = rowWidth - renderedPixelsInLine;
          }
          else {
            totalWidthToRender = fieldLengthPx;
          }
        } else {
          totalWidthToRender = this.lengthToBits(field) * this.settingsStore.pixelsPerBit;
        }

        console.log("totalWidthToRender", totalWidthToRender);
        console.log("field length", field.length);

        if (renderedPixelsInLine == 0) {
          lastWrapperHeight += lastInnerHeight;

          lastWrapperGElement = svg
            .select("g[data-table]")
            .append("g")
            .attr("transform", "translate(0, " + lastWrapperHeight + ")");

          lastInnerHeight = 0;
        }

        while (!rendered) {
          if (!lastWrapperGElement) {
            throw new Error("lastWrapperGElement is not defined");
          }

          // append a new g element to the root g element
          const newG = lastWrapperGElement
            .append("g")
            .attr(
              "transform",
              "translate(" + lastInnerWidth + ", " + lastInnerHeight + ")",
            )
            .attr("data-id", field.id)
            .classed("dataElement", true);

          let width = totalWidthToRender;

          if (
            renderedPixelsInLine + totalWidthToRender >
            this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit
          ) {
            width =
              this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit -
              renderedPixelsInLine;
          }

          // append a new rect element to the new g element
          const rect = newG
            .append("rect")
            .classed("field", true)
            .attr("width", width)
            .attr("height", LINE_HEIGHT_PX);

          // Apply group background styling if group_id is specified
          if (field.group_id) {
            const groupColor = generateGroupColor(field.group_id);
            console.log(`Applying group color for field ${field.display_name}, group: ${field.group_id}, color: ${groupColor}`);

            const rgbaColor = hexToRgba(groupColor, 0.08);
            rect.style("fill", rgbaColor);

            rect.attr("data-original-style-fill", rgbaColor); // Store original style for hover effects
          }

          // append a new svg element to the new g element
          newG
            .append("svg")
            .attr("width", width)
            .attr("height", LINE_HEIGHT_PX)
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .classed("fieldText", true)
            .text(
              field.is_variable_length
                ? field.display_name + " ..."
                : field.display_name,
            );

          renderedPixelsInLine += width;

          if (
            renderedPixelsInLine >=
            this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit
          ) {
            renderedPixelsInLine = 0;
            lastInnerWidth = 0;
            lastInnerHeight += LINE_HEIGHT_PX;
          } else {
            lastInnerWidth += width;
          }

          totalWidthToRender -= width;

          if (totalWidthToRender <= 0) {
            rendered = true;
          }
          console.log("lastInnerHeight", lastInnerHeight);
        }
      });

      // Remove any existing SCXML elements before adding new ones
      if (this.svgWrapper) {
        const svgNode = d3.select(this.svgWrapper).node();
        if (svgNode) {
          const metadata = svgNode.querySelector("metadata");
          if (metadata) {
            const existingScxmlElements = metadata.querySelectorAll("scxml");
            existingScxmlElements.forEach(el => el.remove());
          }
        }
      }

      // Add FSMs to SVG as SCXML elements
      this.addFSMsToSVG();
    },

    /**
     * Renders the arrow and the text for the scale above the protocol header
     * Does take the pixels per bit and bits per row settings into account
     */
    renderScale() {
      if (!this.svgWrapper) {
        throw new Error("svgWrapper is not defined");
      }

      const svg = d3.select(this.svgWrapper);

      const dataScale = svg.select("g[data-scale]");

      // remove all children from data-scale g element
      dataScale.selectAll("*").remove();

      const tableGroup = svg.select("g[data-table]");
      const lineHeight = this.settingsStore.showScale ? LINE_HEIGHT_PX : 0;
      tableGroup.attr("transform", `translate(0, ${lineHeight})`);

      if (!this.settingsStore.showScale) {
        return;
      }

      // append a new svg element to the data-scale g element
      const newSvgEl = svg
        .select("g[data-scale]")
        .append("svg")
        .attr(
          "width",
          this.settingsStore.pixelsPerBit * this.settingsStore.bitsPerRow,
        )
        .attr("height", LINE_HEIGHT_PX);

      // append defs
      const defs = newSvgEl.append("defs");

      // append a new marker element to the defs element
      const newMarker = defs
        .append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "10")
        .attr("refY", "5")
        .attr("markerWidth", "6")
        .attr("markerHeight", "6")
        .attr("orient", "auto-start-reverse");

      // append a new path element to the marker element
      newMarker
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10")
        .attr("fill", "transparent")
        .attr("stroke", "black")
        .attr("stroke-width", "2px");

      // append a new g element to the svg element
      const newG = newSvgEl.append("g").attr("transform", "translate(0, 20)");

      // append a new line element to the g element
      newG
        .append("line")
        .attr("x1", "0")
        .attr("y1", "0")
        .attr("x2", "100%")
        .attr("y2", "0")
        .attr("stroke", "black")
        .attr("stroke-width", "2")
        .attr("marker-end", "url(#arrow)")
        .attr("marker-start", "url(#arrow)");

      // append a new rect element to the svg element
      newSvgEl
        .append("rect")
        .attr(
          "x",
          (this.settingsStore.pixelsPerBit * this.settingsStore.bitsPerRow) /
            2 -
            50,
        )
        .attr("y", "0")
        .attr("height", "40")
        .attr("width", "100")
        .attr("fill", "rgb(255,255,255)");

      // append a new text element to the svg element
      newSvgEl
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .classed("fieldText", true)
        .text(this.settingsStore.bitsPerRow + " bits");
    },

    /**
     * Sets the size of the svgWrapper based on the bounding box of the SVG
     */
    setSvgSize() {
      const bBox = document.querySelector("svg")?.getBBox();

      if (!this.svgWrapper || !bBox) {
        return;
      }

      this.svgWrapper.style.width = bBox.width + 1 + "px";
      this.svgWrapper.style.height = bBox.height + 1 + "px";

      // Also set the height and width of the SVG element
      const svg = d3.select(this.svgWrapper).select("svg");

      svg.attr("width", bBox.width + 1);
      svg.attr("height", bBox.height + 1);
    },

    /**
     * Handles the loading of metadata from the SVG into the protocolStore
     */
    getMetadata() {
      // Clear protocolStore fields array
      this.protocolStore.clearProtocol();

      this.protocolStore.uploaded = true;

      this.setSvgSize();

      const metadata = d3.select("metadata").node() as HTMLElement;

      if (!metadata) {
        throw new Error("metadata is not defined");
      }

      // select all pd:field elements inside metadata
      const fields = metadata.querySelectorAll("field");

      console.log(fields);

      // iterate over all pd:field elements (HTMLCollection)
      Array.from(fields).forEach((field) => {
        const targetElements = d3.selectAll(
          `[data-id="${field.getAttribute("pd:id")}"]`,
        );

        const fieldOptions: FieldOption[] = [];

        const options = field.querySelectorAll("option");

        console.log("options", options);

        Array.from(options).forEach((option) => {
          const optionName = option.getAttribute("pd:name") ?? "";
          const optionValue: number = parseInt(
            option.getAttribute("pd:value") ?? "0",
          );

          fieldOptions.push({
            name: optionName,
            value: optionValue,
          });
        });

        // print all attributes of the field
        console.log(
          "attributes",
          field.attributes.getNamedItem("pd:length")?.value,
        );
        console.log(
          "attributes",
          field.attributes.getNamedItem("pd:length_max")?.value,
        );
        console.log(
          "attributes",
          field.attributes.getNamedItem("pd:display_name")?.value,
        );

        const is_variable_length =
          field.attributes.getNamedItem("pd:length")?.value === "0" ||
          field.attributes.getNamedItem("pd:length_max")
            ? true
            : false;

        // Assume big endian if not specified, since that's what most protocols use
        let endian: Endian = Endian.Big;
        if (field.attributes.getNamedItem("pd:endian")?.value === "little") {
          endian = Endian.Little;
        }

        const fieldInfo: Field = {
          field_options: fieldOptions,
          length: parseInt(
            field.attributes.getNamedItem("pd:length")?.value ?? "0",
          ),
          max_length: parseInt(
            field.attributes.getNamedItem("pd:length_max")?.value ?? "0",
          ),
          is_variable_length: is_variable_length,
          endian: endian,
          display_name:
            field.attributes.getNamedItem("pd:display_name")?.value ?? "",
          id: field.attributes.getNamedItem("pd:id")?.value ?? "",
          description:
            field.attributes.getNamedItem("pd:description")?.value ?? "",
          encapsulate:
            field.attributes.getNamedItem("pd:encapsulate")?.value === "true"
              ? true
              : false,
          length_unit: field.attributes.getNamedItem("pd:length_unit")?.value === "bytes"
            ? LengthUnit.Bytes
            : LengthUnit.Bits,
          group_id: field.attributes.getNamedItem("pd:group_id")?.value ?? undefined,
        };

        this.protocolStore.addField(fieldInfo);

        targetElements.on("click", () => {
          this.showFieldEditModal(fieldInfo);
        });

        targetElements.on("contextmenu", (e) => {
          e.preventDefault();

          this.fieldContextMenu = {
            show: true,
            x: e.clientX,
            y: e.clientY,
            field: fieldInfo,
          };

          console.log("contextmenu", fieldInfo.id);
        });

        // add dataElement class to the target element
        targetElements.classed("dataElement", true);
      });

      const dataElements = document.getElementsByClassName("dataElement");

      // elements with same attribute "data-id" will be highlighted
      for (let i = 0; i < dataElements.length; i++) {
        const that = this;
        dataElements[i].addEventListener("mouseover", function () {
          const dataId = dataElements[i].getAttribute("data-id");
          const elementsToHighlight = d3.selectAll(`[data-id="${dataId}"]`);

          if (!dataId) {
            return;
          }

          // Tooltip stuff

          const field = that.protocolStore.findFieldById(dataId);

          if (!field) {
            return;
          }

          if (field.encapsulate) {
            const encapsulationRelatedFieldIds: String[] = [];

            that.protocolStore.encapsulatedProtocols.forEach(
              (encapsulatedProtocol: EncapsulatedProtocol) => {
                encapsulatedProtocol.used_for_encapsulation_fields.forEach(
                  (field: Field) => {
                    encapsulationRelatedFieldIds.push(field.id);
                  },
                );
              },
            );

            if (encapsulationRelatedFieldIds.length > 0) {
              const encapsulationRelatedFieldsToHighlight = d3.selectAll(
                encapsulationRelatedFieldIds
                  .map((id) => `[data-id="${id}"]`)
                  .join(", "),
              );

              encapsulationRelatedFieldsToHighlight.each(function () {
                const rect = d3.select(this).select("rect");
                rect.style("fill", "rgb(135,206,250)");
              });
            }
          }

          const firstHighlightedEl = elementsToHighlight.nodes()[0];

          if (
            !firstHighlightedEl ||
            !(firstHighlightedEl instanceof SVGElement)
          ) {
            return;
          }

          // Calculate X based in field position
          const x =
            firstHighlightedEl.getBoundingClientRect().left +
            firstHighlightedEl.getBoundingClientRect().width / 2 -
            100;
          const y =
            firstHighlightedEl.getBoundingClientRect().top -
            firstHighlightedEl.getBoundingClientRect().height -
            30;

          that.fieldTooltip = {
            show: true,
            x: x,
            y: y,
            field: field,
          };

          elementsToHighlight.each(function () {
            const rect = d3.select(this).select("rect");
            const rectNode = rect.node();

            if (!rectNode) {
              return;
            }

            let originalStyleFill = "white";
            if (field.group_id) {
              const groupColor = generateGroupColor(field.group_id);
              originalStyleFill = hexToRgba(groupColor, 0.08);
            }
            rect.attr("data-original-style-fill", originalStyleFill);
            rect.style("fill", "rgb(216, 216, 216)");
          });
        });

        dataElements[i].addEventListener("mouseout", function () {
          const elementsToHighlight = d3.selectAll(`[data-id]`);

          that.fieldTooltip.show = false;

          elementsToHighlight.each(function () {
            const rect = d3.select(this).select("rect");
            const rectNode = rect.node();

            if (!rectNode) {
              return;
            }

            const originalStyleFill = rect.attr("data-original-style-fill") || "white";
            rect.style("fill", originalStyleFill);
          });
        });
      }

      // Load protocol information

      const protocolInfo = metadata.querySelector("info");

      if (!protocolInfo) {
        throw new Error("protocolInfo is not defined");
      }

      console.log("protocolInfo", protocolInfo);

      // Getting all the protocol information, probably cannot be automated
      this.protocolStore.protocol.id =
        (protocolInfo.querySelector("id")
          ?.textContent as unknown as typeof v4) ?? "";
      this.protocolStore.protocol.name =
        protocolInfo.querySelector("name")?.textContent ?? "";
      this.protocolStore.protocol.author =
        protocolInfo.querySelector("author")?.textContent ?? "";
      this.protocolStore.protocol.description =
        protocolInfo.querySelector("description")?.textContent ?? "";
      this.protocolStore.protocol.version =
        protocolInfo.querySelector("version")?.textContent ?? "";
      this.protocolStore.protocol.updated_at =
        protocolInfo.querySelector("updated_at")?.textContent ?? "";
      this.protocolStore.protocol.created_at =
        protocolInfo.querySelector("created_at")?.textContent ?? "";

      // Load FSMs from SVG (SCXML elements)
      const fsms = this.getFSMsFromSVG();
      if (fsms.length > 0) {
        this.protocolStore.protocol.finite_state_machines = fsms;
        // Set currentFSMId to the first FSM when loading a protocol
        this.protocolStore.currentFSMId = fsms[0].id;
        console.log(`Loaded ${fsms.length} FSM(s) from protocol`);
      } else {
        // No FSMs in this protocol, clear the selection
        this.protocolStore.currentFSMId = null;
      }

      // Ensure SCXML namespace is set before capturing outerHTML
      const svgElement = document.querySelector("svg");
      if (svgElement) {
        svgElement.setAttribute("xmlns:scxml", "http://www.w3.org/2005/07/scxml");
      }

      // set rawProtocolData
      this.rawProtocolData = svgElement?.outerHTML ?? "";

      console.log("protocolStore", this.protocolStore.protocol);
    },

    /**
     * Wrapper function to save the current protocol to the library
     *
     * @returns void
     */
    async saveCurrentProtocol() {
      // Maybe the protocol is already in the library (it's UUID)
      if (
        useProtocolLibraryStore().getProtocolById(
          useProtocolStore().protocol.id,
        )
      ) {
        const result = await useProtocolLibraryStore().updateProtocol(
          useProtocolStore().protocol,
        );

        if (!result) {
          useNotificationStore().showNotification({
            message: "Protocol could not be updated to the server",
            color: "error",
            icon: "mdi-alert",
            timeout: 3000,
          });
        }

        const protocolFile: File = new File(
          [useProtocolRenderStore().rawProtocolData],
          `${useProtocolStore().protocol.id}.svg`,
        );

        useProtocolLibraryStore().uploadProtocolToFileServer(
          protocolFile,
          useProtocolStore().protocol,
        );

        return;
      }

      // Otherwise let's add it
      const result = await useProtocolLibraryStore().addProtocol(
        useProtocolStore().protocol,
      );

      if (
        result !== true &&
        result !== false &&
        result.status == 401 &&
        result.data.detail == "Sorry, that protocol already exists."
      ) {
        console.log("Protocol already exists, updating instead.");

        const newProtocol = _.cloneDeep(this.protocolStore.protocol);

        newProtocol.id = v4() as unknown as typeof v4; // generate a new id

        this.protocolStore.protocol = newProtocol;

        // Again initialize
        this.initialize();
      }

      const protocolFile: File = new File(
        [useProtocolRenderStore().rawProtocolData],
        `${useProtocolStore().protocol.id}.svg`,
      );

      useProtocolLibraryStore().uploadProtocolToFileServer(
        protocolFile,
        useProtocolStore().protocol,
      );

      if (!result) {
        useNotificationStore().showNotification({
          message: "Protocol could not be saved to the server",
          color: "error",
          icon: "mdi-alert",
          timeout: 3000,
        });
      }
    },

    /**
     * Handles uploading a protocol file (.svg) and subsequently calls getMetadata()
     */
    async initializeProtocolRaw() {
      console.log("protocolData", this.rawProtocolData);
      if (!this.svgWrapper) {
        throw new Error("svgWrapper is not defined");
      }

      const svg = d3.select(this.svgWrapper);

      // create D3 namespace for pd
      d3.namespaces["pd"] = "http://www.protocoldescription.com";
      // create D3 namespace for scxml
      d3.namespaces["scxml"] = "http://www.w3.org/2005/07/scxml";

      const svgNode = svg.node();

      if (!svgNode) {
        throw new Error("svgNode is not defined");
      }

      // First clear the SVG
      svgNode.innerHTML = "";

      // Check if rawProtocolData is empty
      if (this.rawProtocolData == "") {
        // Get protocol from API
        // Get ID from URL
        const id = router.currentRoute.value.params.id;

        const encodedSvg =
          await this.protocolLibraryStore.downloadProtocolFileFromServer(
            id as unknown as typeof v4,
          );

        if (encodedSvg) {
          this.rawProtocolData = encodedSvg;
          this.protocolStore.uploaded = true;
        } else {
          this.notificationStore.showNotification({
            message: "Protocol could not be loaded from the server",
            color: "error",
            icon: "mdi-alert",
            timeout: 3000,
          });

          router.push("/upload");
        }
      }

      // Decode the base64 string
      const svgDoc = new DOMParser().parseFromString(
        Buffer.from(this.rawProtocolData.split(",")[1], "base64").toString(
          "utf-8",
        ),
        "image/svg+xml",
      );

      // Error checking
      if (
        svgDoc.documentElement.tagName !== "svg" ||
        svgDoc.getElementsByTagName("parsererror").length > 0 ||
        svgDoc.documentElement.namespaceURI !== "http://www.w3.org/2000/svg" ||
        !svgDoc.documentElement.querySelector("metadata")
      ) {
        this.notificationStore.showNotification({
          message: "Invalid protocol file",
          color: "error",
          icon: "mdi-alert",
          timeout: 3000,
        });

        router.push("/upload");

        return;
      }

      svgNode?.append(svgDoc.documentElement);

      this.getMetadata();

      this.setSvgSize();

      this.notificationStore.showNotification({
        message: "Protocol successfully loaded",
        timeout: 5000,
        color: "green",
        icon: "mdi-check",
      });
    },

    // Modal stuff
    showFieldEditModal(field: Field) {
      this.protocolStore.editingField = _.cloneDeep(field);
      this.protocolStore.editingFieldId = field.id;

      this.protocolStore.editingMode = EditingMode.Edit;

      // If the field is encapsulated, show the encapsulate modal first
      if (field.encapsulate) {
        this.fieldEncapsulateModal = !this.fieldEncapsulateModal;

        return;
      }

      this.fieldEditModal = !this.fieldEditModal;
    },
    showFieldAddModal(
      relativeFieldPosition: Field | null = null,
      position: AddFieldPosition = AddFieldPosition.End,
    ) {
      this.protocolStore.editingMode = EditingMode.Add;

      // Relative add
      if (relativeFieldPosition && position) {
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
        display_name: "",
        id: "",
        description: "",
        encapsulate: false,
        length_unit: LengthUnit.Bits,
      };

      this.fieldEditModal = !this.fieldEditModal;
    },
    showFieldDeleteModal(field: Field) {
      this.protocolStore.editingField = _.cloneDeep(field);
      this.protocolStore.editingFieldId = field.id;

      this.protocolStore.editingMode = EditingMode.Edit;
      this.fieldDeleteModal = !this.fieldDeleteModal;
    },
    closeFieldModal() {
      this.fieldEditModal = false;
    },

    // Export functionality
    showExportModal() {
      this.exportModal = true;
    },

    closeExportModal() {
      this.exportModal = false;
    },

    /**
     * Saves FSM changes to the SVG and updates the protocol file on the server
     * Called when FSMs are modified in the FSM editor
     */
    async saveFSMChanges() {
      if (!this.svgWrapper) {
        console.warn("Cannot save FSM changes: svgWrapper not defined");
        return;
      }

      // Get SVG element
      const svgElement = document.querySelector("svg");
      if (!svgElement) {
        console.warn("SVG element not found");
        return;
      }

      // Ensure SCXML namespace is set
      svgElement.setAttribute("xmlns:scxml", "http://www.w3.org/2005/07/scxml");

      // Get metadata element
      const metadata = svgElement.querySelector("metadata");
      if (!metadata) {
        console.warn("metadata element not found");
        return;
      }

      // Remove existing SCXML elements
      const existingScxmlElements = metadata.querySelectorAll("scxml");
      existingScxmlElements.forEach(el => el.remove());

      // Add updated FSM SCXML elements
      const fsms = this.protocolStore.protocol.finite_state_machines;
      if (fsms && fsms.length > 0) {
        fsms.forEach(fsm => {
          const scxmlElement = this.serializeFSMToSCXML(fsm);
          metadata.appendChild(scxmlElement);
        });
        console.log(`Added ${fsms.length} FSM(s) to SVG as SCXML`);
      }

      // Update raw protocol data
      this.rawProtocolData = svgElement.outerHTML;

      // Save to server
      await this.saveCurrentProtocol();

      console.log("FSM changes saved to SVG and server");
    },

    /**
     * Serializes a FiniteStateMachine object to SCXML DOM element
     * Maps FSM nodes to <scxml:state> and edges to <scxml:transition>
     *
     * @param fsm - The finite state machine to serialize
     * @returns SVG element containing the SCXML representation
     */
    serializeFSMToSCXML(fsm: import("@/contracts/models").FiniteStateMachine): Element {
      const scxmlNamespace = "http://www.w3.org/2005/07/scxml";
      const pdNamespace = "http://www.protocoldescription.com";

      // Create root <scxml:scxml> element
      const scxmlElement = document.createElementNS(scxmlNamespace, "scxml:scxml");
      scxmlElement.setAttribute("version", "1.0");
      scxmlElement.setAttribute("name", fsm.name);
      scxmlElement.setAttribute("xmlns:pd", pdNamespace);

      // Find and set initial state
      const initialNode = fsm.nodes.find(n => n.data.isInitial);
      if (initialNode) {
        scxmlElement.setAttribute("initial", initialNode.id);
      }

      // Create <scxml:datamodel> for FSM metadata
      const datamodel = document.createElementNS(scxmlNamespace, "scxml:datamodel");

      // Add FSM metadata as data elements
      const metadataMap: Record<string, any> = {
        fsm_id: fsm.id,
        description: fsm.description,
        author: fsm.author,
        version: fsm.version,
        created_at: fsm.created_at,
        updated_at: fsm.updated_at,
        protocol_id: fsm.protocol_id || ''
      };

      Object.entries(metadataMap).forEach(([key, value]) => {
        const dataElement = document.createElementNS(scxmlNamespace, "scxml:data");
        dataElement.setAttribute("id", key);
        dataElement.setAttribute("expr", String(value));
        datamodel.appendChild(dataElement);
      });

      // Add EFSM variables to datamodel
      if (fsm.variables && fsm.variables.length > 0) {
        console.log('Serializing variables:', fsm.variables);
        fsm.variables.forEach(variable => {
          const dataElement = document.createElementNS(scxmlNamespace, "scxml:data");
          dataElement.setAttribute("id", variable.name);
          dataElement.setAttribute("pd:variable_id", variable.id);
          dataElement.setAttribute("pd:variable_type", variable.type);
          console.log(`  Variable ${variable.name}: minValue=${variable.minValue}, maxValue=${variable.maxValue}, initialValue=${variable.initialValue}`);

          if (variable.description) {
            dataElement.setAttribute("pd:description", variable.description);
          }

          // Type-specific attributes
          if (variable.type === 'int') {
            if (variable.minValue !== undefined) {
              dataElement.setAttribute("pd:min_value", String(variable.minValue));
            }
            if (variable.maxValue !== undefined) {
              dataElement.setAttribute("pd:max_value", String(variable.maxValue));
            }
          } else if (variable.type === 'enum' && variable.enumValues) {
            dataElement.setAttribute("pd:enum_values", JSON.stringify(variable.enumValues));
          }

          // Initial value
          if (variable.initialValue !== undefined) {
            dataElement.setAttribute("expr", String(variable.initialValue));
          }

          datamodel.appendChild(dataElement);
        });
      }

      scxmlElement.appendChild(datamodel);

      // Serialize states
      fsm.nodes.forEach(node => {
        const stateElement = document.createElementNS(scxmlNamespace, "scxml:state");
        stateElement.setAttribute("id", node.id);

        // Mark final states
        if (node.data.isFinal) {
          stateElement.setAttribute("final", "true");
        }

        // Add state description if present
        if (node.data.description) {
          stateElement.setAttribute("pd:description", node.data.description);
        }

        // Store node position and label for reconstruction
        stateElement.setAttribute("pd:label", node.data.label);
        stateElement.setAttribute("pd:position_x", String(node.position.x));
        stateElement.setAttribute("pd:position_y", String(node.position.y));

        // Store state metadata if present
        if (node.data.metadata) {
          stateElement.setAttribute("pd:metadata", JSON.stringify(node.data.metadata));
        }

        // Find and add transitions from this state
        const outgoingEdges = fsm.edges.filter(e => e.source === node.id);
        outgoingEdges.forEach(edge => {
          const transitionElement = document.createElementNS(scxmlNamespace, "scxml:transition");
          transitionElement.setAttribute("target", edge.target);
          transitionElement.setAttribute("pd:id", edge.id);

          // Add event trigger
          if (edge.data?.event) {
            transitionElement.setAttribute("event", edge.data.event);
          }

          // Add action
          if (edge.data?.action) {
            transitionElement.setAttribute("pd:action", edge.data.action);
          }

          // Add description
          if (edge.data?.description) {
            transitionElement.setAttribute("pd:description", edge.data.description);
          }

          // Store handle information for reconstruction
          if (edge.sourceHandle) {
            transitionElement.setAttribute("pd:source_handle", edge.sourceHandle);
          }
          if (edge.targetHandle) {
            transitionElement.setAttribute("pd:target_handle", edge.targetHandle);
          }

          // Handle conditions
          if (edge.data?.use_protocol_conditions && edge.data?.protocol_conditions) {
            // Use structured protocol conditions
            transitionElement.setAttribute("pd:use_protocol_conditions", "true");

            edge.data.protocol_conditions.forEach(pc => {
              const condElement = document.createElementNS(pdNamespace, "pd:protocol_condition");
              condElement.setAttribute("field_id", pc.field_id);
              condElement.setAttribute("operator", pc.operator);

              if (pc.value !== undefined) {
                condElement.setAttribute("value", String(pc.value));
              }
              if (pc.field_option_name) {
                condElement.setAttribute("field_option_name", pc.field_option_name);
              }

              transitionElement.appendChild(condElement);
            });
          } else if (edge.data?.condition) {
            // Use manual/freeform condition
            transitionElement.setAttribute("cond", edge.data.condition);
          }

          stateElement.appendChild(transitionElement);
        });

        scxmlElement.appendChild(stateElement);
      });

      return scxmlElement;
    },

    /**
     * Adds all FSMs from the protocol to the SVG as SCXML elements
     * Called after metadata is written to SVG
     */
    addFSMsToSVG() {
      if (!this.svgWrapper) {
        throw new Error("svgWrapper is not defined");
      }

      const fsms = this.protocolStore.protocol.finite_state_machines;
      if (!fsms || fsms.length === 0) {
        return;
      }

      const svg = d3.select(this.svgWrapper);
      const svgNode = svg.node();
      if (!svgNode) {
        throw new Error("svgNode is not defined");
      }

      const metadata = svgNode.querySelector("metadata");
      if (!metadata) {
        throw new Error("metadata element not found");
      }

      // Add each FSM as a separate <scxml:scxml> element inside metadata
      fsms.forEach(fsm => {
        const scxmlElement = this.serializeFSMToSCXML(fsm);

        // Append directly to metadata element
        metadata.appendChild(scxmlElement);
      });

      console.log(`Added ${fsms.length} FSM(s) to SVG as SCXML`);
    },

    /**
     * Parses an SCXML DOM element back into a FiniteStateMachine object
     *
     * @param scxmlElement - The SCXML element to parse
     * @returns FiniteStateMachine object
     */
    parseSCXMLToFSM(scxmlElement: Element): import("@/contracts/models").FiniteStateMachine {
      const name = scxmlElement.getAttribute("name") || "Unnamed FSM";
      const initialStateId = scxmlElement.getAttribute("initial");

      // Parse datamodel for metadata and EFSM variables
      const datamodel = scxmlElement.querySelector("datamodel");
      let fsmId = v4();
      let description = "";
      let author = "";
      let version = "1.0";
      let created_at = new Date().toISOString();
      let updated_at = new Date().toISOString();
      let protocol_id = "";
      const variables: import("@/contracts/models").EFSMVariable[] = [];

      if (datamodel) {
        const dataElements = datamodel.querySelectorAll("data");
        dataElements.forEach(dataEl => {
          const id = dataEl.getAttribute("id");
          const expr = dataEl.getAttribute("expr");
          const variableType = dataEl.getAttribute("pd:variable_type") as 'int' | 'bool' | 'enum' | null;

          // Check if this is a variable (has pd:variable_type)
          if (variableType) {
            const variableId = dataEl.getAttribute("pd:variable_id") || v4();
            const variableDesc = dataEl.getAttribute("pd:description") || undefined;

            const variable: import("@/contracts/models").EFSMVariable = {
              id: variableId,
              name: id || '',
              type: variableType,
              description: variableDesc
            };

            // Parse type-specific attributes
            if (variableType === 'int') {
              const minValue = dataEl.getAttribute("pd:min_value");
              const maxValue = dataEl.getAttribute("pd:max_value");
              if (minValue !== null) variable.minValue = parseInt(minValue);
              if (maxValue !== null) variable.maxValue = parseInt(maxValue);
            } else if (variableType === 'enum') {
              const enumValuesStr = dataEl.getAttribute("pd:enum_values");
              if (enumValuesStr) {
                try {
                  variable.enumValues = JSON.parse(enumValuesStr);
                } catch (e) {
                  console.error("Failed to parse enum values:", e);
                }
              }
            }

            // Parse initial value
            if (expr !== null) {
              if (variableType === 'int') {
                variable.initialValue = parseInt(expr);
              } else if (variableType === 'bool') {
                variable.initialValue = expr === 'true';
              } else if (variableType === 'enum') {
                variable.initialValue = expr;
              }
            }

            variables.push(variable);
            console.log(`  Parsed variable ${variable.name}: minValue=${variable.minValue}, maxValue=${variable.maxValue}, initialValue=${variable.initialValue}`);
          } else if (id && expr) {
            // This is metadata
            switch(id) {
              case "fsm_id": fsmId = expr; break;
              case "description": description = expr; break;
              case "author": author = expr; break;
              case "version": version = expr; break;
              case "created_at": created_at = expr; break;
              case "updated_at": updated_at = expr; break;
              case "protocol_id": protocol_id = expr; break;
            }
          }
        });
      }

      const nodes: import("@/contracts/models").FSMNode[] = [];
      const edges: import("@/contracts/models").FSMEdge[] = [];
      const events: import("@/contracts/models").FSMEvent[] = [];
      const eventSet = new Set<string>();

      // Parse states
      const states = scxmlElement.querySelectorAll("state");
      states.forEach(stateEl => {
        const stateId = stateEl.getAttribute("id");
        if (!stateId) return;

        const isFinal = stateEl.getAttribute("final") === "true";
        const isInitial = stateId === initialStateId;
        const label = stateEl.getAttribute("pd:label") || stateId;
        const stateDescription = stateEl.getAttribute("pd:description") || undefined;
        const posX = parseFloat(stateEl.getAttribute("pd:position_x") || "0");
        const posY = parseFloat(stateEl.getAttribute("pd:position_y") || "0");
        const metadataStr = stateEl.getAttribute("pd:metadata");

        let metadata: Record<string, any> | undefined;
        if (metadataStr) {
          try {
            metadata = JSON.parse(metadataStr);
          } catch (e) {
            console.error("Failed to parse state metadata:", e);
          }
        }

        const node: import("@/contracts/models").FSMNode = {
          id: stateId,
          type: 'fsmState',
          position: { x: posX, y: posY },
          data: {
            label,
            isInitial,
            isFinal,
            description: stateDescription,
            metadata
          }
        };

        nodes.push(node);

        // Parse transitions from this state
        const transitions = stateEl.querySelectorAll("transition");
        transitions.forEach(transEl => {
          const edgeId = transEl.getAttribute("pd:id") || v4();
          const target = transEl.getAttribute("target");
          if (!target) return;

          const event = transEl.getAttribute("event") || undefined;
          const action = transEl.getAttribute("pd:action") || undefined;
          const edgeDescription = transEl.getAttribute("pd:description") || undefined;
          const sourceHandle = transEl.getAttribute("pd:source_handle") || undefined;
          const targetHandle = transEl.getAttribute("pd:target_handle") || undefined;
          const useProtocolConditions = transEl.getAttribute("pd:use_protocol_conditions") === "true";

          // Track events
          if (event && !eventSet.has(event)) {
            eventSet.add(event);
            events.push({
              id: v4(),
              name: event,
              description: `Event: ${event}`
            });
          }

          const edgeData: import("@/contracts/models").FSMEdgeData = {
            event,
            action,
            description: edgeDescription,
            use_protocol_conditions: useProtocolConditions
          };

          // Parse conditions
          if (useProtocolConditions) {
            const protocolConditions: import("@/contracts/models").ProtocolFieldCondition[] = [];
            const condElements = transEl.querySelectorAll("protocol_condition");

            condElements.forEach(condEl => {
              const fieldId = condEl.getAttribute("field_id");
              const operator = condEl.getAttribute("operator") as any;
              const value = condEl.getAttribute("value");
              const fieldOptionName = condEl.getAttribute("field_option_name") || undefined;

              if (fieldId && operator) {
                protocolConditions.push({
                  field_id: fieldId,
                  operator,
                  value: value ? (isNaN(Number(value)) ? value : Number(value)) : undefined,
                  field_option_name: fieldOptionName
                });
              }
            });

            if (protocolConditions.length > 0) {
              edgeData.protocol_conditions = protocolConditions;
            }
          } else {
            // Manual condition
            const cond = transEl.getAttribute("cond");
            if (cond) {
              edgeData.condition = cond;
            }
          }

          const edge: import("@/contracts/models").FSMEdge = {
            id: edgeId,
            source: stateId,
            target,
            sourceHandle,
            targetHandle,
            data: edgeData,
            type: 'smoothstep',
            animated: false
          };

          edges.push(edge);
        });
      });

      return {
        id: fsmId,
        name,
        description,
        author,
        version,
        created_at,
        updated_at,
        protocol_id,
        nodes,
        edges,
        events,
        variables,
        metadata: {}
      };
    },

    /**
     * Extracts all FSMs from the SVG document by parsing SCXML elements
     *
     * @returns Array of FiniteStateMachine objects
     */
    getFSMsFromSVG(): import("@/contracts/models").FiniteStateMachine[] {
      if (!this.svgWrapper) {
        return [];
      }

      const svg = d3.select(this.svgWrapper);
      const svgNode = svg.node();
      if (!svgNode) {
        return [];
      }

      // Look for SCXML elements inside metadata
      const metadata = svgNode.querySelector("metadata");
      if (!metadata) {
        console.warn("metadata element not found");
        return [];
      }

      const scxmlElements = metadata.querySelectorAll("scxml");
      const fsms: import("@/contracts/models").FiniteStateMachine[] = [];

      scxmlElements.forEach(scxmlEl => {
        try {
          const fsm = this.parseSCXMLToFSM(scxmlEl);
          fsms.push(fsm);
        } catch (error) {
          console.error("Failed to parse SCXML element:", error);
        }
      });

      console.log(`Loaded ${fsms.length} FSM(s) from SVG`);
      return fsms;
    },
  },

  // Getters
});
