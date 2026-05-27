/**
 * cpntools.ts
 *
 * Exports a ColoredPetriNet to CPN Tools 4.x .cpn XML format.
 *
 * Supported color sets: unit, bool, int (with range), enum
 * Arc inscriptions and guards pass through verbatim — the syntax is the
 * same SML-like notation used by CPN Tools (backtick multisets, brackets
 * for guards).  Arithmetic color expressions such as "n-1" are wrapped
 * in parentheses to satisfy the SML parser.
 */

import type {
  ColoredPetriNet,
  ColorSet,
  CPNArc,
  CPNPlace,
  CPNTransition,
  CPNVariable,
} from "@/contracts/models";

// Helpers

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wrap arithmetic color parts in parens so the SML parser is not confused.
 * "1`n-1" → "1`(n-1)",  "1`n" → "1`n",  "1`()" → "1`()"
 */
function normInscription(s: string): string {
  if (!s) return s;
  return s
    .split("++")
    .map((term) => {
      term = term.trim();
      const bt = term.indexOf("`");
      if (bt === -1) return term;
      const count = term.slice(0, bt).trim();
      const color = term.slice(bt + 1).trim();
      const needsParens = /[+\-*/]/.test(color) && !color.startsWith("(");
      return `${count}\`${needsParens ? `(${color})` : color}`;
    })
    .join(" ++ ");
}

/**
 * For UNIT color sets the only valid token value is `()`.  Replace whatever
 * color token appears after each backtick with `()`.
 */
function normUnitInscription(s: string): string {
  if (!s) return s;
  return s
    .split("++")
    .map((term) => {
      term = term.trim();
      const bt = term.indexOf("`");
      if (bt === -1) return term;
      const count = term.slice(0, bt).trim();
      return `${count}\`()`;
    })
    .join(" ++ ");
}

/**
 * CPN Tools / SML reserved words that cannot be used as color set identifiers.
 * When the user names their color set with one of these, capitalize the first
 * letter so `unit` → `Unit`, `bool` → `Bool`, etc.
 */
const CPN_RESERVED = new Set([
  "unit", "bool", "int", "real", "string", "list", "record", "product",
  "union", "with", "subset", "alias", "declare", "use", "fun", "val",
  "type", "let", "in", "end", "and", "or", "not", "true", "false",
  "if", "then", "else",
]);

function safeCsName(name: string): string {
  return CPN_RESERVED.has(name)
    ? name.charAt(0).toUpperCase() + name.slice(1)
    : name;
}

/**
 * CPN Tools requires every annotation node (type label, initmark, guard,
 * time, code, priority, arc inscription) to have its own id, posattr, and
 * the full fillattr/lineattr/textattr sub-elements, plus a versioned <text>.
 * Without these the file fails to load.
 */
function annotNode(
  tag: string,
  id: string,
  x: number,
  y: number,
  content: string,
): string {
  return [
    `        <${tag} id="${id}">`,
    `          <posattr x="${x.toFixed(1)}" y="${y.toFixed(1)}"/>`,
    `          <fillattr colour="White" pattern="Solid" filled="false"/>`,
    `          <lineattr colour="Black" thick="0" type="Solid"/>`,
    `          <textattr colour="Black" bold="false"/>`,
    `          <text tool="CPN Tools" version="4.0.1">${esc(content)}</text>`,
    `        </${tag}>`,
  ].join("\n");
}

//  serialisers

function serializeColorSet(cs: ColorSet, id: string, name: string): string {
  let typeXml: string;
  let layoutDecl: string;

  switch (cs.type) {
    case "unit":
      typeXml = "        <unit/>";
      layoutDecl = `colset ${name} = unit;`;
      break;
    case "bool":
      typeXml = "        <bool/>";
      layoutDecl = `colset ${name} = bool;`;
      break;
    case "int": {
      const lo = cs.intMin ?? 0;
      const hi = cs.intMax ?? 255;
      typeXml = [
        "        <int>",
        "          <with>",
        `            <id>${lo}</id>`,
        `            <id>${hi}</id>`,
        "          </with>",
        "        </int>",
      ].join("\n");
      layoutDecl = `colset ${name} = int with ${lo}..${hi};`;
      break;
    }
    case "enum": {
      const vals = cs.enumValues ?? [];
      typeXml = [
        "        <enum>",
        ...vals.map((v) => `          <id>${esc(v)}</id>`),
        "        </enum>",
      ].join("\n");
      layoutDecl = `colset ${name} = enumerate with ${vals.join(" | ")};`;
      break;
    }
  }

  return [
    `      <color id="${id}">`,
    `        <id>${esc(name)}</id>`,
    typeXml!,
    `        <layout>${esc(layoutDecl!)}</layout>`,
    `      </color>`,
  ].join("\n");
}

function serializeVariable(
  v: CPNVariable,
  cs: ColorSet | undefined,
  id: string,
  csName: string,
): string {
  if (!cs) return "";
  return [
    `      <var id="${id}">`,
    `        <type><id>${esc(csName)}</id></type>`,
    `        <id>${esc(v.name)}</id>`,
    `        <layout>var ${esc(v.name)} : ${esc(csName)};</layout>`,
    `      </var>`,
  ].join("\n");
}

function serializePlace(
  p: CPNPlace,
  cs: ColorSet | undefined,
  placeId: string,
  nextId: () => string,
  csName: string,
): string {
  const x = p.position.x;
  const y = -p.position.y; // flip Y axis
  const rawMarking = p.initialMarking ?? "";
  const initmark =
    rawMarking && rawMarking !== "0" && rawMarking !== ""
      ? cs?.type === "unit"
        ? normUnitInscription(rawMarking)
        : normInscription(rawMarking)
      : "";

  return [
    `      <place id="${placeId}">`,
    `        <posattr x="${x.toFixed(1)}" y="${y.toFixed(1)}"/>`,
    `        <fillattr colour="White" pattern="" filled="false"/>`,
    `        <lineattr colour="Black" thick="1" type="Solid"/>`,
    `        <textattr colour="Black" bold="false"/>`,
    `        <text>${esc(p.name)}</text>`,
    `        <ellipse w="60.0" h="40.0"/>`,
    `        <token x="0.0" y="0.0"><text>0</text></token>`,
    `        <marking x="0.0" y="0.0" hidden="false"><text></text></marking>`,
    annotNode("type", nextId(), x + 50, y - 20, csName),
    annotNode("initmark", nextId(), x - 20, y + 30, initmark),
    `      </place>`,
  ].join("\n");
}

function serializeTransition(
  t: CPNTransition,
  transId: string,
  nextId: () => string,
): string {
  const x = t.position.x;
  const y = -t.position.y;
  const guard = t.guard ? normInscription(t.guard.replace(/==/g, "=")) : "";

  return [
    `      <trans id="${transId}" explicit="false">`,
    `        <posattr x="${x.toFixed(1)}" y="${y.toFixed(1)}"/>`,
    `        <fillattr colour="White" pattern="" filled="false"/>`,
    `        <lineattr colour="Black" thick="1" type="Solid"/>`,
    `        <textattr colour="Black" bold="false"/>`,
    `        <text>${esc(t.name)}</text>`,
    `        <box w="80.0" h="40.0"/>`,
    `        <binding x="7.2" y="-3.0"/>`,
    annotNode("cond", nextId(), x - 30, y + 25, guard),
    annotNode("time", nextId(), x + 50, y + 25, ""),
    annotNode("code", nextId(), x + 50, y - 25, ""),
    annotNode("priority", nextId(), x - 30, y - 25, ""),
    `      </trans>`,
  ].join("\n");
}

function serializeArc(
  a: CPNArc,
  arcId: string,
  resolveId: (modelId: string) => string,
  nextId: () => string,
  placeColorSet: ColorSet | undefined,
): string {
  const orientation = a.arcType === "place-to-transition" ? "PtoT" : "TtoP";
  const transModelId = a.arcType === "place-to-transition" ? a.targetId : a.sourceId;
  const placeModelId = a.arcType === "place-to-transition" ? a.sourceId : a.targetId;

  return [
    `      <arc id="${arcId}" orientation="${orientation}" order="1">`,
    `        <posattr x="0.0" y="0.0"/>`,
    `        <fillattr colour="White" pattern="" filled="false"/>`,
    `        <lineattr colour="Black" thick="1" type="Solid"/>`,
    `        <textattr colour="Black" bold="false"/>`,
    `        <arrowattr headsize="1.2" currentcyckle="2"/>`,
    `        <transend idref="${resolveId(transModelId)}"/>`,
    `        <placeend idref="${resolveId(placeModelId)}"/>`,
    annotNode("annot", nextId(), 0, 0,
      placeColorSet?.type === "unit"
        ? normUnitInscription(a.inscription)
        : normInscription(a.inscription),
    ),
    `        <text></text>`,
    `      </arc>`,
  ].join("\n");
}

// main export

/**
 * Serialises a ColoredPetriNet to a CPN Tools 4.x .cpn XML string.
 */
export function exportToCPNTools(cpn: ColoredPetriNet): string {
  // Assign short sequential IDs — CPN Tools rejects UUIDs with dashes
  let counter = 1;
  const idMap = new Map<string, string>();
  const resolveId = (modelId: string): string => {
    if (!idMap.has(modelId)) idMap.set(modelId, `ID${counter++}`);
    return idMap.get(modelId)!;
  };
  const nextId = () => `ID${counter++}`;

  const blockId = nextId();
  const pageId = nextId();

  // Build a safe-name map so reserved ML words don't appear as identifiers
  const csNameMap = new Map(cpn.colorSets.map((cs) => [cs.id, safeCsName(cs.name)]));

  const colorSetLines = cpn.colorSets.map((cs) =>
    serializeColorSet(cs, resolveId(cs.id), csNameMap.get(cs.id)!),
  );

  const varLines = cpn.variables
    .map((v) => {
      const cs = cpn.colorSets.find((c) => c.id === v.colorSetId);
      return serializeVariable(v, cs, resolveId(v.id), csNameMap.get(v.colorSetId) ?? "");
    })
    .filter(Boolean);

  const placeLines = cpn.places.map((p) => {
    const cs = cpn.colorSets.find((c) => c.id === p.colorSetId);
    const csName = csNameMap.get(p.colorSetId ?? "") ?? "UNIT";
    return serializePlace(p, cs, resolveId(p.id), nextId, csName);
  });

  const transLines = cpn.transitions.map((t) =>
    serializeTransition(t, resolveId(t.id), nextId),
  );

  const arcLines = cpn.arcs.map((a) => {
    const placeModelId = a.arcType === "place-to-transition" ? a.sourceId : a.targetId;
    const place = cpn.places.find((p) => p.id === placeModelId);
    const placeCs = cpn.colorSets.find((c) => c.id === place?.colorSetId);
    return serializeArc(a, nextId(), resolveId, nextId, placeCs);
  });

  const instanceId = nextId();

  return [
    `<?xml version="1.0" encoding="iso-8859-1"?>`,
    `<!DOCTYPE workspaceElements PUBLIC "-//CPN//DTD CPNXML 1.0//EN" "http://cpntools.org/DTD/6/cpn.dtd">`,
    `<workspaceElements>`,
    `  <generator tool="CPN Tools" version="4.0.1" format="6"/>`,
    `  <cpnet>`,
    `    <globbox>`,
    `      <block id="${blockId}">`,
    `        <id>Declarations</id>`,
    ...colorSetLines,
    ...varLines,
    `      </block>`,
    `    </globbox>`,
    `    <page id="${pageId}">`,
    `      <pageattr name="${esc(cpn.name)}"/>`,
    ...placeLines,
    ...transLines,
    ...arcLines,
    `      <constraints/>`,
    `    </page>`,
    `    <instances>`,
    `      <instance id="${instanceId}" page="${pageId}"/>`,
    `    </instances>`,
    `    <options/>`,
    `    <binders/>`,
    `    <monitorblock name="Monitors"/>`,
    `    <IndexNode id="0" expanded="false"/>`,
    `  </cpnet>`,
    `</workspaceElements>`,
  ].join("\n");
}
