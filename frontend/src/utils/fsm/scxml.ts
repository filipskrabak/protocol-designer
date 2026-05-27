/**
 * SCXML (State Chart XML) export for Finite State Machines.
 *
 * Produces a standalone SCXML document conformant to the W3C SCXML
 * Recommendation (https://www.w3.org/TR/scxml/).
 *
 * Protocol-Designer-specific metadata that has no direct SCXML equivalent
 * (node positions, variable bounds, event registry, etc.) is stored in the
 * "pd" namespace (xmlns:pd="http://www.protocoldescription.com") using the
 * <toolspecific> convention recommended by SCXML §B.1.
 *
 * Final states are mapped to SCXML <final> elements instead of plain
 * <state> elements, which is the standard SCXML encoding.
 */

import type { FiniteStateMachine } from "@/contracts/models";
import xmlFormatter from "xml-formatter";

const SCXML_NS = "http://www.w3.org/2005/07/scxml";
const PD_NS = "http://www.protocoldescription.com";

/**
 * Serialises a FiniteStateMachine to a standalone SCXML XML string.
 *
 * @param fsm - The FSM to export.
 * @returns A formatted SCXML XML string.
 */
export function exportToSCXML(fsm: FiniteStateMachine): string {
  const scxmlEl = buildSCXMLElement(fsm);

  // Serialise DOM element → string
  const rawXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    new XMLSerializer().serializeToString(scxmlEl);

  try {
    return xmlFormatter(rawXml, {
      indentation: "  ",
      collapseContent: true,
      lineSeparator: "\n",
    });
  } catch {
    return rawXml;
  }
}

/**
 * Builds the SCXML DOM element that represents a single FSM.
 * This mirrors `ProtocolRenderStore.serializeFSMToSCXML()` but is
 * self-contained so it can be used without the store.
 */
function buildSCXMLElement(fsm: FiniteStateMachine): Element {
  const doc = document.implementation.createDocument(SCXML_NS, null, null);

  const scxmlEl = doc.createElementNS(SCXML_NS, "scxml");
  scxmlEl.setAttribute("xmlns", SCXML_NS);
  scxmlEl.setAttribute("xmlns:pd", PD_NS);
  scxmlEl.setAttribute("version", "1.0");
  // xs:NMTOKEN forbids spaces - __ (space placeholder) and any remaining
  // non-NMTOKEN chars are replaced with '_' for schema compliance.
  scxmlEl.setAttribute("name", fsm.name.replace(/[^a-zA-Z0-9._\-:]/g, "_"));

  // Set initial state
  const initialNode = fsm.nodes.find((n) => n.data.isInitial);
  if (initialNode) {
    scxmlEl.setAttribute("initial", initialNode.id);
  }

  //  datamodel

  const datamodel = doc.createElementNS(SCXML_NS, "datamodel");

  // FSM metadata stored as <data> elements
  const metadataMap: Record<string, string> = {
    fsm_id: fsm.id,
    description: fsm.description ?? "",
    author: fsm.author ?? "",
    version: fsm.version ?? "1.0",
    created_at: fsm.created_at ?? "",
    updated_at: fsm.updated_at ?? "",
    protocol_id: fsm.protocol_id ?? "",
  };

  for (const [key, value] of Object.entries(metadataMap)) {
    const dataEl = doc.createElementNS(SCXML_NS, "data");
    dataEl.setAttribute("id", key);
    dataEl.setAttribute("expr", `'${value.replace(/'/g, "\\'")}'`);
    datamodel.appendChild(dataEl);
  }

  // EFSM variables as <data> elements with pd:* attributes
  for (const variable of fsm.variables ?? []) {
    const dataEl = doc.createElementNS(SCXML_NS, "data");
    dataEl.setAttribute("id", variable.name);
    dataEl.setAttributeNS(PD_NS, "pd:variable_id", variable.id);
    dataEl.setAttributeNS(PD_NS, "pd:variable_type", variable.type);

    if (variable.description) {
      dataEl.setAttributeNS(PD_NS, "pd:description", variable.description);
    }
    if (variable.type === "int") {
      if (variable.minValue !== undefined) {
        dataEl.setAttributeNS(PD_NS, "pd:min_value", String(variable.minValue));
      }
      if (variable.maxValue !== undefined) {
        dataEl.setAttributeNS(PD_NS, "pd:max_value", String(variable.maxValue));
      }
    } else if (variable.type === "enum" && variable.enumValues) {
      dataEl.setAttributeNS(
        PD_NS,
        "pd:enum_values",
        JSON.stringify(variable.enumValues)
      );
    }
    if (variable.initialValue !== undefined) {
      dataEl.setAttribute("expr", String(variable.initialValue));
    }
    datamodel.appendChild(dataEl);
  }

  scxmlEl.appendChild(datamodel);

  //  event registry (pd:events)

  if (fsm.events && fsm.events.length > 0) {
    const eventsEl = doc.createElementNS(PD_NS, "pd:events");
    for (const event of fsm.events) {
      const eventEl = doc.createElementNS(PD_NS, "pd:event");
      eventEl.setAttribute("name", event.name);
      eventEl.setAttribute("type", event.type);
      if (event.description) {
        eventEl.setAttribute("description", event.description);
      }
      eventsEl.appendChild(eventEl);
    }
    scxmlEl.appendChild(eventsEl);
  }

  //  states

  for (const node of fsm.nodes) {
    // Final states → <final>, all others → <state>
    const tag = node.data.isFinal ? "final" : "state";
    const stateEl = doc.createElementNS(SCXML_NS, tag);
    stateEl.setAttribute("id", node.id);

    if (node.data.description) {
      stateEl.setAttributeNS(PD_NS, "pd:description", node.data.description);
    }
    stateEl.setAttributeNS(PD_NS, "pd:label", node.data.label);
    stateEl.setAttributeNS(PD_NS, "pd:position_x", String(node.position.x));
    stateEl.setAttributeNS(PD_NS, "pd:position_y", String(node.position.y));
    // Outgoing transitions (not placed inside <final> — SCXML <final> nodes
    // have no outgoing transitions by definition, so we only add them to
    // <state> nodes)
    if (!node.data.isFinal) {
      const outEdges = fsm.edges.filter((e) => e.source === node.id);
      for (const edge of outEdges) {
        const transEl = doc.createElementNS(SCXML_NS, "transition");
        transEl.setAttribute("target", edge.target);
        transEl.setAttributeNS(PD_NS, "pd:id", edge.id);

        if (edge.data?.event) {
          transEl.setAttribute("event", edge.data.event);
        }
        if (edge.data?.action) {
          transEl.setAttributeNS(PD_NS, "pd:action", edge.data.action);
        }
        if (edge.data?.description) {
          transEl.setAttributeNS(PD_NS, "pd:description", edge.data.description);
        }
        if (edge.sourceHandle) {
          transEl.setAttributeNS(PD_NS, "pd:source_handle", edge.sourceHandle);
        }
        if (edge.targetHandle) {
          transEl.setAttributeNS(PD_NS, "pd:target_handle", edge.targetHandle);
        }

        if (edge.data?.condition) {
          transEl.setAttribute("cond", edge.data.condition);
        }

        stateEl.appendChild(transEl);
      }
    }

    scxmlEl.appendChild(stateEl);
  }

  return scxmlEl;
}
