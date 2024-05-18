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
} from "../contracts";
import { Endian } from "../contracts";
import { useProtocolStore } from "@/store/ProtocolStore";
import { useSettingsStore } from "@/store/SettingsStore";
import { useNotificationStore } from "./NotificationStore";
import { useProtocolLibraryStore } from "./ProtocolLibraryStore";
import { LINE_HEIGHT_PX } from "../constants";
import { v4 } from "uuid";

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

        // Field options
        field.field_options.forEach((option) => {
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
        } else if (field.is_variable_length && field.length == 0) {
          // Field is variable length, but the minimum length is unknown
          // Stretch to the end of the line OR to max_length
          totalWidthToRender =
            Math.min(
              field.max_length * this.settingsStore.pixelsPerBit,
              this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit,
            ) - renderedPixelsInLine;
        } else if (
          field.is_variable_length &&
          this.settingsStore.truncateVariableLengthFields
        ) {
          // Field is variable length, has set min and max length, but should be truncated
          // Truncate the field to the minimum length
          totalWidthToRender =
            Math.min(
              field.length * this.settingsStore.pixelsPerBit,
              this.settingsStore.bitsPerRow * this.settingsStore.pixelsPerBit,
            ) - renderedPixelsInLine;
        } else {
          totalWidthToRender = field.length * this.settingsStore.pixelsPerBit;
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
          newG
            .append("rect")
            .classed("field", true)
            .attr("width", width)
            .attr("height", LINE_HEIGHT_PX);

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
            rect.style("fill", "rgb(216, 216, 216)");
          });
        });

        dataElements[i].addEventListener("mouseout", function (event) {
          const elementsToHighlight = d3.selectAll(`[data-id]`);

          that.fieldTooltip.show = false;

          elementsToHighlight.each(function () {
            const rect = d3.select(this).select("rect");
            rect.style("fill", "white");
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

      // set rawProtocolData

      this.rawProtocolData = document.querySelector("svg")?.outerHTML ?? "";

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

      this.initialize();

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

    // Exports

    exportSVG() {
      if (!this.svgWrapper) {
        throw new Error("svgWrapper is not defined");
      }

      const svg = this.svgWrapper.querySelector("svg");

      if (!svg) {
        throw new Error("svg is not defined");
      }

      const svgData = new XMLSerializer().serializeToString(svg);

      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = this.protocolStore.protocol.name + ".svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    },

    exportToP4() {
      const protocol = this.protocolStore.protocol;

      const formattedHeaderName = protocol.name.replace(/ /g, "");

      let p4 = `header ${formattedHeaderName}_h {`;
      let fieldCount = 0;

      protocol.fields.forEach((field) => {
        if (field.encapsulate) {
          return;
        }

        if (field.is_variable_length) {
          if (field.max_length == 0) {
            this.notificationStore.showNotification({
              message: `Couldn't export to P4: Field ${field.display_name} is variable length but has no max length`,
              color: "error",
              icon: "mdi-alert",
              timeout: 8000,
            });

            throw new Error(
              `Field ${field.display_name} is variable length but has no max length`,
            );
          }

          p4 += `\n\tvarbit<${field.max_length}> ${field.id};`;
        } else {
          p4 += `\n\tbit<${field.length}> ${field.id};`;
        }
        fieldCount++;
      });

      if (fieldCount == 0) {
        this.notificationStore.showNotification({
          message: `Couldn't export to P4: No fields found`,
          color: "error",
          icon: "mdi-alert",
          timeout: 8000,
        });

        throw new Error(`No fields found`);
      }

      p4 += "\n}";

      // Create a p4 file
      const p4Blob = new Blob([p4], {
        type: "text/plain;charset=utf-8",
      });

      const p4Url = URL.createObjectURL(p4Blob);

      const downloadLink = document.createElement("a");

      downloadLink.href = p4Url;
      downloadLink.download = formattedHeaderName + ".p4";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    },
  },

  // Getters
});
