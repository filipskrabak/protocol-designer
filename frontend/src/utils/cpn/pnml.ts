/**
 * HL-PNML (ISO 15909-2) import/export for Colored Petri Nets.
 *
 * Supported sorts: finiteenumeration, intrange, bool
 * Arc inscriptions and initial markings are stored as plain text expressions.
 */

import type {
  ColoredPetriNet,
  ColorSet,
  CPNArc,
  CPNPlace,
  CPNTransition,
  CPNVariable,
} from "@/contracts/models";

//  Namespace constants
const PNML_NS = "http://www.pnml.org/version-2009/grammar/pnml";
const HLPNG_NS = "http://www.pnml.org/version-2009/grammar/highlevelnet";

//  Export

/**
 * Serialises a ColoredPetriNet to a HL-PNML XML string.
 */
export function exportToPNML(cpn: ColoredPetriNet): string {
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<pnml xmlns="${PNML_NS}">`,
  );
  lines.push(
    `  <net id="${esc(cpn.id)}" type="${HLPNG_NS}">`,
  );
  lines.push(`    <name><text>${esc(cpn.name)}</text></name>`);
  // Non-standard fields stored in <toolspecific> per ISO 15909-2 §7.3.3
  lines.push(`    <toolspecific tool="protocol-designer" version="1.0">`);
  lines.push(`      <description>${esc(cpn.description ?? "")}</description>`);
  lines.push(`    </toolspecific>`);

  //  Declaration block (color sets + variables)
  lines.push(`    <declaration>`);
  lines.push(`      <structure>`);
  lines.push(`        <declarations>`);

  for (const cs of cpn.colorSets) {
    lines.push(...serializeColorSet(cs));
  }

  for (const v of cpn.variables) {
    const cs = cpn.colorSets.find(c => c.id === v.colorSetId);
    if (!cs) continue;
    lines.push(
      `          <variabledecl id="${esc(v.id)}" name="${esc(v.name)}">`,
    );
    lines.push(`            <type>`);
    lines.push(`              <usersort declaration="${esc(cs.name)}"/>`);
    lines.push(`            </type>`);
    lines.push(`          </variabledecl>`);
  }

  lines.push(`        </declarations>`);
  lines.push(`      </structure>`);
  lines.push(`    </declaration>`);

  //  Page
  lines.push(`    <page id="page0">`);
  lines.push(`      <name><text>Page</text></name>`);

  for (const place of cpn.places) {
    lines.push(...serializePlace(place, cpn));
  }

  for (const tr of cpn.transitions) {
    lines.push(...serializeTransition(tr));
  }

  for (const arc of cpn.arcs) {
    lines.push(...serializeArc(arc));
  }

  lines.push(`    </page>`);
  lines.push(`  </net>`);
  lines.push(`</pnml>`);

  return lines.join("\n");
}

//  Import

export interface PNMLImportResult {
  cpn: ColoredPetriNet;
  warnings: string[];
}

/**
 * Parses a HL-PNML XML string into a ColoredPetriNet object.
 * Returns the parsed CPN and any non-fatal warnings.
 * Throws on fatal parse errors.
 */
export function importFromPNML(xml: string): PNMLImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`PNML XML parse error: ${parseError.textContent}`);
  }

  const warnings: string[] = [];

  const netEl = doc.querySelector("net");
  if (!netEl) throw new Error("No <net> element found in PNML document");

  const id = netEl.getAttribute("id") ?? crypto.randomUUID();
  const name = textContent(netEl, "name > text") ?? id;

  // Read net-level toolspecific (non-standard fields stored by protocol-designer)
  let netDescription = "";
  const netToolspecific = findDirectChildToolspecific(netEl);
  if (netToolspecific) {
    netDescription = netToolspecific.querySelector("description")?.textContent ?? "";
  }

  const colorSets: ColorSet[] = [];
  const variables: CPNVariable[] = [];
  const places: CPNPlace[] = [];
  const transitions: CPNTransition[] = [];
  const arcs: CPNArc[] = [];

  //  Declarations
  for (const decl of Array.from(doc.querySelectorAll("declaration > structure > declarations > *"))) {
    const tag = decl.localName;

    if (tag === "namedsort") {
      const cs = parseNamedSort(decl, warnings);
      if (cs) colorSets.push(cs);
    } else if (tag === "variabledecl") {
      const v = parseVariableDecl(decl, colorSets);
      if (v) variables.push(v);
    }
    // unknown declaration types are silently skipped
  }

  //  Places
  for (const placeEl of Array.from(doc.querySelectorAll("page > place"))) {
    const place = parsePlace(placeEl, colorSets, warnings);
    if (place) places.push(place);
  }

  //  Transitions
  for (const trEl of Array.from(doc.querySelectorAll("page > transition"))) {
    const tr = parseTransition(trEl, warnings);
    if (tr) transitions.push(tr);
  }

  //  Arcs
  for (const arcEl of Array.from(doc.querySelectorAll("page > arc"))) {
    const arc = parseArc(arcEl, places, transitions, warnings);
    if (arc) arcs.push(arc);
  }

  const cpn: ColoredPetriNet = {
    id,
    name,
    description: netDescription,
    places,
    transitions,
    arcs,
    colorSets,
    variables,
  };

  return { cpn, warnings };
}

/**
 * Validates a PNML string.
 * Returns an array of error/warning strings (empty = valid).
 */
export function validatePNML(xml: string): string[] {
  try {
    const { warnings } = importFromPNML(xml);
    return warnings;
  } catch (e) {
    return [String(e)];
  }
}

//  Serialization helpers

function serializeColorSet(cs: ColorSet): string[] {
  const lines: string[] = [];
  lines.push(`          <namedsort id="${esc(cs.id)}" name="${esc(cs.name)}">`);

  switch (cs.type) {
    case "bool":
      lines.push(`            <bool/>`);
      break;

    case "int": {
      const min = cs.intMin ?? 0;
      const max = cs.intMax ?? 255;
      lines.push(`            <intrange>`);
      lines.push(`              <start><value><numberconstant value="${min}"><positive/></numberconstant></value></start>`);
      lines.push(`              <end><value><numberconstant value="${max}"><positive/></numberconstant></value></end>`);
      lines.push(`            </intrange>`);
      break;
    }

    case "enum": {
      lines.push(`            <finiteenumeration>`);
      for (const v of cs.enumValues ?? []) {
        lines.push(`              <feconstant id="${esc(cs.id + "_" + v)}" name="${esc(v)}"/>`);
      }
      lines.push(`            </finiteenumeration>`);
      break;
    }

    case "unit":
    default:
      // Represent 'unit' as a single-element finiteenumeration named "unit"
      lines.push(`            <finiteenumeration>`);
      lines.push(`              <feconstant id="${esc(cs.id + "_unit")}" name="unit"/>`);
      lines.push(`            </finiteenumeration>`);
      break;
  }

  lines.push(`          </namedsort>`);
  return lines;
}

function serializePlace(place: CPNPlace, cpn: ColoredPetriNet): string[] {
  const lines: string[] = [];
  const cs = cpn.colorSets.find(c => c.id === place.colorSetId);
  const x = Math.round(place.position.x);
  const y = Math.round(place.position.y);

  lines.push(`      <place id="${esc(place.id)}">`);
  lines.push(`        <name><text>${esc(place.name)}</text></name>`);
  lines.push(`        <graphics><position x="${x}" y="${y}"/></graphics>`);

  if (cs) {
    lines.push(`        <type>`);
    lines.push(`          <structure>`);
    lines.push(`            <usersort declaration="${esc(cs.name)}"/>`);
    lines.push(`          </structure>`);
    lines.push(`        </type>`);
  }

  if (place.initialMarking && place.initialMarking !== "0" && place.initialMarking !== "") {
    lines.push(`        <initialMarking>`);
    lines.push(`          <structure>`);
    lines.push(`            <useroperator declaration="${esc(place.initialMarking)}"/>`);
    lines.push(`          </structure>`);
    lines.push(`        </initialMarking>`);
  }

  if (place.description) {
    lines.push(`        <toolspecific tool="protocol-designer" version="1.0">`);
    lines.push(`          <description>${esc(place.description)}</description>`);
    lines.push(`        </toolspecific>`);
  }

  lines.push(`      </place>`);
  return lines;
}

function serializeTransition(tr: CPNTransition): string[] {
  const lines: string[] = [];
  const x = Math.round(tr.position.x);
  const y = Math.round(tr.position.y);

  lines.push(`      <transition id="${esc(tr.id)}">`);
  lines.push(`        <name><text>${esc(tr.name)}</text></name>`);
  lines.push(`        <graphics><position x="${x}" y="${y}"/></graphics>`);

  if (tr.guard) {
    lines.push(`        <condition>`);
    lines.push(`          <structure>`);
    lines.push(`            <useroperator declaration="${esc(tr.guard)}"/>`);
    lines.push(`          </structure>`);
    lines.push(`        </condition>`);
  }

  if (tr.description) {
    lines.push(`        <toolspecific tool="protocol-designer" version="1.0">`);
    lines.push(`          <description>${esc(tr.description)}</description>`);
    lines.push(`        </toolspecific>`);
  }

  lines.push(`      </transition>`);
  return lines;
}

function serializeArc(arc: CPNArc): string[] {
  const lines: string[] = [];
  // Store sourceId/targetId as-is so they round-trip correctly back to the
  // same VueFlow edge direction. arcType is stored in <toolspecific> so
  // parseArc does not have to infer it from node types (which breaks when
  // source/target were previously swapped).
  lines.push(`      <arc id="${esc(arc.id)}" source="${esc(arc.sourceId)}" target="${esc(arc.targetId)}">`);
  lines.push(`        <inscription>`);
  lines.push(`          <structure>`);
  lines.push(`            <useroperator declaration="${esc(arc.inscription)}"/>`);
  lines.push(`          </structure>`);
  lines.push(`        </inscription>`);

  // Always write toolspecific so arcType is preserved exactly on round-trip
  lines.push(`        <toolspecific tool="protocol-designer" version="1.0">`);
  lines.push(`          <arcType>${esc(arc.arcType)}</arcType>`);
  if (arc.sourceHandle) lines.push(`          <sourceHandle>${esc(arc.sourceHandle)}</sourceHandle>`);
  if (arc.targetHandle) lines.push(`          <targetHandle>${esc(arc.targetHandle)}</targetHandle>`);
  if (arc.description) lines.push(`          <description>${esc(arc.description)}</description>`);
  lines.push(`        </toolspecific>`);

  lines.push(`      </arc>`);
  return lines;
}

//  Parse helpers

function parseNamedSort(el: Element, warnings: string[]): ColorSet | null {
  const id = el.getAttribute("id") ?? crypto.randomUUID();
  const name = el.getAttribute("name") ?? id;

  const boolEl = el.querySelector("bool");
  if (boolEl) {
    return { id, name, type: "bool" };
  }

  const intrangeEl = el.querySelector("intrange");
  if (intrangeEl) {
    const startVal = intrangeEl.querySelector("start numberconstant")?.getAttribute("value");
    const endVal = intrangeEl.querySelector("end numberconstant")?.getAttribute("value");
    return {
      id,
      name,
      type: "int",
      intMin: startVal != null ? parseInt(startVal, 10) : 0,
      intMax: endVal != null ? parseInt(endVal, 10) : 255,
    };
  }

  const feEl = el.querySelector("finiteenumeration");
  if (feEl) {
    const enumValues = Array.from(feEl.querySelectorAll("feconstant"))
      .map(fe => fe.getAttribute("name") ?? "")
      .filter(v => v !== "");

    // Single-value "unit" enumeration → map back to unit type
    if (enumValues.length === 1 && enumValues[0] === "unit") {
      return { id, name, type: "unit" };
    }

    return { id, name, type: "enum", enumValues };
  }

  warnings.push(`Unsupported sort type for namedsort "${name}" - skipped`);
  return null;
}

function parseVariableDecl(
  el: Element,
  colorSets: ColorSet[],
): CPNVariable | null {
  const id = el.getAttribute("id") ?? crypto.randomUUID();
  const name = el.getAttribute("name") ?? id;
  const sortRef = el.querySelector("usersort")?.getAttribute("declaration");
  const cs = colorSets.find(c => c.name === sortRef);
  if (!cs) return null;
  return { id, name, colorSetId: cs.id };
}

function parsePlace(
  el: Element,
  colorSets: ColorSet[],
  warnings: string[],
): CPNPlace | null {
  const id = el.getAttribute("id");
  if (!id) {
    warnings.push("Place missing id attribute — skipped");
    return null;
  }
  const name = textContent(el, "name > text") ?? id;

  const sortRef = el.querySelector("type structure usersort")?.getAttribute("declaration");
  const cs = colorSets.find(c => c.name === sortRef);
  if (!cs) {
    warnings.push(`Place "${name}": unknown type "${sortRef}" — using first color set or empty`);
  }

  const initialMarking =
    el.querySelector("initialMarking structure useroperator")?.getAttribute("declaration") ?? "";

  const pos = parsePosition(el);

  const description = findDirectChildToolspecific(el)?.querySelector("description")?.textContent ?? undefined;

  return {
    id,
    name,
    colorSetId: cs?.id ?? (colorSets[0]?.id ?? ""),
    initialMarking,
    position: pos,
    description: description || undefined,
  };
}

function parseTransition(el: Element, warnings: string[]): CPNTransition | null {
  const id = el.getAttribute("id");
  if (!id) {
    warnings.push("Transition missing id — skipped");
    return null;
  }
  const name = textContent(el, "name > text") ?? id;
  const guard =
    el.querySelector("condition structure useroperator")?.getAttribute("declaration") ?? undefined;
  const position = parsePosition(el);
  const description = findDirectChildToolspecific(el)?.querySelector("description")?.textContent ?? undefined;
  return { id, name, guard, position, description: description || undefined };
}

function parseArc(
  el: Element,
  places: CPNPlace[],
  transitions: CPNTransition[],
  warnings: string[],
): CPNArc | null {
  const id = el.getAttribute("id") ?? crypto.randomUUID();
  const source = el.getAttribute("source");
  const target = el.getAttribute("target");
  if (!source || !target) {
    warnings.push(`Arc "${id}" missing source/target — skipped`);
    return null;
  }
  const inscription =
    el.querySelector("inscription structure useroperator")?.getAttribute("declaration") ?? "1`x";

  const ts = findDirectChildToolspecific(el);
  const storedArcType = ts?.querySelector("arcType")?.textContent as "place-to-transition" | "transition-to-place" | null | undefined;
  const sourceHandle = ts?.querySelector("sourceHandle")?.textContent ?? undefined;
  const targetHandle = ts?.querySelector("targetHandle")?.textContent ?? undefined;
  const description = ts?.querySelector("description")?.textContent ?? undefined;

  const extra = {
    sourceHandle: sourceHandle || undefined,
    targetHandle: targetHandle || undefined,
    description: description || undefined,
  };

  // Prefer the stored arcType (written by serializeArc) — it preserves the
  // exact VueFlow edge direction without any node-type inference ambiguity.
  if (storedArcType === "place-to-transition" || storedArcType === "transition-to-place") {
    return { id, sourceId: source, targetId: target, arcType: storedArcType, inscription, ...extra };
  }

  // Fallback for PNML not written by this tool: infer from node types.
  const isSourcePlace = places.some(p => p.id === source);
  const isTargetPlace = places.some(p => p.id === target);
  const isSourceTransition = transitions.some(t => t.id === source);

  if (isSourcePlace && !isTargetPlace) {
    return { id, sourceId: source, targetId: target, arcType: "place-to-transition", inscription, ...extra };
  }
  if (isSourceTransition) {
    return { id, sourceId: source, targetId: target, arcType: "transition-to-place", inscription, ...extra };
  }

  // Last resort
  if (isSourcePlace) {
    warnings.push(`Arc "${id}": target not found as transition — assuming place-to-transition`);
    return { id, sourceId: source, targetId: target, arcType: "place-to-transition", inscription, ...extra };
  }

  warnings.push(`Arc "${id}": cannot determine direction — skipped`);
  return null;
}

function parsePosition(el: Element): { x: number; y: number } {
  const posEl = el.querySelector("graphics > position");
  if (!posEl) return { x: 0, y: 0 };
  return {
    x: parseFloat(posEl.getAttribute("x") ?? "0") || 0,
    y: parseFloat(posEl.getAttribute("y") ?? "0") || 0,
  };
}

/**
 * Finds a direct-child <toolspecific tool="protocol-designer"> element.
 * Uses direct child iteration to avoid matching nested toolspecific elements.
 */
function findDirectChildToolspecific(el: Element): Element | null {
  for (const child of Array.from(el.children)) {
    if (child.localName === "toolspecific" && child.getAttribute("tool") === "protocol-designer") {
      return child;
    }
  }
  return null;
}

function textContent(el: Element, selector: string): string | null {
  return el.querySelector(selector)?.textContent ?? null;
}

/**
 * XML-escapes a string for use in attribute values and text nodes.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
