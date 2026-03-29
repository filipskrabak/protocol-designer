/**
 * stateSpace.ts
 *
 * Bounded state-space exploration (BFS) for Colored Petri Nets.
 *
 * Explores reachable markings up to MAX_MARKINGS, enumerating all enabled
 * bindings for each transition at each marking.  Returns a StateSpaceGraph
 * that can be analyzed by properties.ts.
 *
 * Limitations (by design for frontend bounded verification):
 *   - MAX_MARKINGS = 10 000 markings
 *   - MAX_BINDINGS = 20 000 total fired bindings across the exploration
 *   - Color sets must be finite (unit, bool, int range ≤ 256, enum)
 *   - Arc inscriptions must be ground multisets after binding substitution
 */

import type { ColoredPetriNet, CPNPlace, CPNTransition, CPNArc, ColorSet } from "@/contracts/models";
import {
  parseInscription,
  parseInitialMarking,
  evaluateGuard,
  isSubMultiset,
  subtractMultiset,
  addMultisets,
  cloneMultiset,
  multisetToString,
  totalTokens,
  type Multiset,
  type Bindings,
} from "./tokenEvaluator";

//  Constants

const MAX_MARKINGS = 10_000;
const MAX_BINDINGS = 20_000;

/**
 * Max integer range size to enumerate.
 * Ranges larger than this are capped at 0..MAX_INT_RANGE-1 for variable enumeration.
 */
const MAX_INT_RANGE = 256;

//  Types

/** A CPN marking is a map from place ID → multiset of tokens on that place. */
export type Marking = Map<string, Multiset>;

/**
 * A step taken during state-space exploration:
 * which transition fired and with which binding.
 */
export interface FiredStep {
  transitionId: string;
  binding: Bindings;
}

/** An edge in the state-space graph: from marking → to marking via a firing. */
export interface StateSpaceEdge {
  from: string; // key of source marking
  to: string;   // key of target marking
  step: FiredStep;
}

/** Full state-space exploration result. */
export interface StateSpaceResult {
  /** All reachable markings, keyed by their canonical string key. */
  markings: Map<string, Marking>;
  /** Initial marking key. */
  initialKey: string;
  /** Reachability edges. */
  edges: StateSpaceEdge[];
  /**
   * For each marking key, the set of transition IDs that are enabled
   * (have at least one enabled binding) in that marking.
   */
  enabledTransitions: Map<string, Set<string>>;
  /** Whether the exploration was truncated (hit MAX_MARKINGS). */
  truncated: boolean;
  /** Whether all possible bindings could not be enumerated (hit MAX_BINDINGS). */
  bindingLimitHit: boolean;
  /** Total number of markings explored. */
  stateCount: number;
}

//  Color value enumeration

/**
 * Enumerate all possible values of a colour set as strings.
 * Returns null if the color set cannot be finitely enumerated.
 */
function enumerateColorSet(cs: ColorSet): string[] | null {
  switch (cs.type) {
    case "unit":
      return ["()"];
    case "bool":
      return ["true", "false"];
    case "int": {
      const lo = cs.intMin ?? 0;
      const hi = cs.intMax ?? 255;
      if (hi - lo + 1 > MAX_INT_RANGE) {
        // Cap range to first MAX_INT_RANGE values
        return Array.from({ length: MAX_INT_RANGE }, (_, i) => String(lo + i));
      }
      return Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
    }
    case "enum":
      return cs.enumValues ?? [];
    default:
      return null;
  }
}

//  Binding enumeration

/**
 * Generate all possible bindings for the variables used in a transition's
 * input arc inscriptions, given the current color sets.
 */
function enumerateBindings(
  transition: CPNTransition,
  inputArcs: CPNArc[],
  _inputPlaces: CPNPlace[], // unused, for future extensions
  colorSetsById: Map<string, ColorSet>,
  variableToColorSet: Map<string, string>, // variable name → colorSetId
): Bindings[] {
  // Collect unique variable names referenced in input arc inscriptions
  const variables = new Set<string>();
  for (const arc of inputArcs) {
    const varsInArc = extractVariableNames(arc.inscription, variableToColorSet);
    for (const v of varsInArc) variables.add(v);
  }
  // Also collect from guard
  if (transition.guard) {
    const varsInGuard = extractVariableNames(transition.guard, variableToColorSet);
    for (const v of varsInGuard) variables.add(v);
  }

  if (variables.size === 0) {
    // No variables: single empty binding
    return [{}];
  }

  // For each variable, enumerate its color set values
  const varList = [...variables];
  const domains: string[][] = [];
  for (const v of varList) {
    const csId = variableToColorSet.get(v);
    const cs = csId ? colorSetsById.get(csId) : undefined;
    if (!cs) {
      // Unknown variable — bind to a single empty-string sentinel
      domains.push([""]);
    } else {
      const vals = enumerateColorSet(cs);
      if (!vals || vals.length === 0) {
        domains.push([""]);
      } else {
        domains.push(vals);
      }
    }
  }

  // Cartesian product of all domains
  return cartesianProduct(varList, domains);
}

/**
 * Extract variable names from an expression string.
 * A token is considered a variable if it appears in variableToColorSet.
 */
function extractVariableNames(expr: string, variableToColorSet: Map<string, string>): string[] {
  const words = new Set<string>(expr.match(/[a-zA-Z_][a-zA-Z_0-9]*/g) ?? []);
  const result: string[] = [];
  for (const w of words) {
    if (variableToColorSet.has(w)) result.push(w);
  }
  return result;
}

/**
 * Compute the Cartesian product of variable domains and return Bindings[].
 */
function cartesianProduct(varList: string[], domains: string[][]): Bindings[] {
  if (varList.length === 0) return [{}];
  const results: Bindings[] = [];
  const indices = new Array(varList.length).fill(0);

  let running = true;
  while (running) {
    const binding: Bindings = {};
    for (let i = 0; i < varList.length; i++) {
      binding[varList[i]] = domains[i][indices[i]];
    }
    results.push(binding);

    // Increment indices (right-most first)
    let pos = varList.length - 1;
    while (pos >= 0) {
      indices[pos]++;
      if (indices[pos] < domains[pos].length) break;
      indices[pos] = 0;
      pos--;
    }
    if (pos < 0) running = false; // overflow → end
  }

  return results;
}

//  Marking utilities

/** Compute the initial marking from the CPN's place initial markings. */
function computeInitialMarking(cpn: ColoredPetriNet): Marking {
  const marking: Marking = new Map();
  for (const place of cpn.places) {
    try {
      const ms = parseInitialMarking(place.initialMarking ?? "");
      marking.set(place.id, ms);
    } catch {
      // Default to empty if unparseable
      marking.set(place.id, new Map());
    }
  }
  return marking;
}

/**
 * Return a canonical string key for a marking, for use as Map key.
 * Deterministic: sorts place IDs, then color keys within each place.
 */
export function markingToKey(marking: Marking): string {
  const parts: string[] = [];
  const placeIds = [...marking.keys()].sort();
  for (const pid of placeIds) {
    const ms = marking.get(pid)!;
    const tokens = [...ms.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([, count]) => count > 0)
      .map(([color, count]) => `${count}:${color}`)
      .join(",");
    if (tokens) parts.push(`${pid}={${tokens}}`);
  }
  return parts.join("|");
}

/** Deep-clone a marking. */
function cloneMarking(m: Marking): Marking {
  const clone: Marking = new Map();
  for (const [pid, ms] of m) {
    clone.set(pid, cloneMultiset(ms));
  }
  return clone;
}

/** Convert marking to a plain object for JSON serialization (counterexamples/witnesses). */
export function markingToObject(marking: Marking): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [pid, ms] of marking) {
    obj[pid] = multisetToString(ms);
  }
  return obj;
}

//  Transition firing

/**
 * Check if a transition can fire with a specific binding in a given marking.
 * Returns the consumed multisets (from input places) if enabled, or null if not.
 */
function checkEnabled(
  transition: CPNTransition,
  inputArcs: CPNArc[],
  marking: Marking,
  binding: Bindings,
): Map<string, Multiset> | null {
  // Evaluate guard
  try {
    if (!evaluateGuard(transition.guard, binding)) return null;
  } catch {
    return null;
  }

  // Check that each input arc's inscription is satisfied by the current marking
  const consumed: Map<string, Multiset> = new Map();
  for (const arc of inputArcs) {
    let inscription: Multiset;
    try {
      inscription = parseInscription(arc.inscription, binding);
    } catch {
      return null;
    }
    const available = marking.get(arc.sourceId) ?? new Map();
    if (!isSubMultiset(inscription, available)) return null;
    consumed.set(arc.sourceId, inscription);
  }
  return consumed;
}

/**
 * Fire a transition: consume from input places, produce on output places.
 * Returns a new marking (does not mutate `marking`).
 */
function fireTransition(
  transition: CPNTransition,
  inputArcs: CPNArc[],
  outputArcs: CPNArc[],
  marking: Marking,
  binding: Bindings,
): Marking {
  const newMarking = cloneMarking(marking);

  // Consume input tokens
  for (const arc of inputArcs) {
    const inscription = parseInscription(arc.inscription, binding);
    const ms = newMarking.get(arc.sourceId)!;
    subtractMultiset(ms, inscription);
  }

  // Produce output tokens
  for (const arc of outputArcs) {
    let inscription: Multiset;
    try {
      inscription = parseInscription(arc.inscription, binding);
    } catch {
      inscription = new Map(); // treat parse error as empty production
    }
    const ms = newMarking.get(arc.targetId) ?? new Map();
    addMultisets(ms, inscription);
    newMarking.set(arc.targetId, ms);
  }

  return newMarking;
}

//  Main exploration

/**
 * Run bounded BFS state-space exploration for the given CPN.
 *
 * @param cpn  The ColoredPetriNet to explore
 * @returns    StateSpaceResult
 */
export function exploreStateSpace(cpn: ColoredPetriNet): StateSpaceResult {
  // Build lookup tables
  const colorSetsById = new Map<string, ColorSet>(cpn.colorSets.map((cs) => [cs.id, cs]));
  const placesById = new Map<string, CPNPlace>(cpn.places.map((p) => [p.id, p]));

  // variable name → colorSetId
  const variableToColorSet = new Map<string, string>(
    cpn.variables.map((v) => [v.name, v.colorSetId]),
  );

  // Precompute per-transition arc lists
  const inputArcsOf = new Map<string, CPNArc[]>();
  const outputArcsOf = new Map<string, CPNArc[]>();
  for (const t of cpn.transitions) {
    inputArcsOf.set(t.id, []);
    outputArcsOf.set(t.id, []);
  }
  for (const arc of cpn.arcs) {
    if (arc.arcType === "place-to-transition") {
      const list = inputArcsOf.get(arc.targetId);
      if (list) list.push(arc);
    } else {
      const list = outputArcsOf.get(arc.sourceId);
      if (list) list.push(arc);
    }
  }

  // State-space graph state
  const allMarkings = new Map<string, Marking>();
  const edges: StateSpaceEdge[] = [];
  const enabledTransitions = new Map<string, Set<string>>();
  const queue: string[] = [];

  let truncated = false;
  let bindingLimitHit = false;
  let totalBindingsFired = 0;

  // Bootstrap initial marking
  const initialMarking = computeInitialMarking(cpn);
  const initialKey = markingToKey(initialMarking);
  allMarkings.set(initialKey, initialMarking);
  queue.push(initialKey);

  // BFS
  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    const currentMarking = allMarkings.get(currentKey)!;
    const enabledHere = new Set<string>();
    enabledTransitions.set(currentKey, enabledHere);

    for (const transition of cpn.transitions) {
      const inputArcs = inputArcsOf.get(transition.id) ?? [];
      const outputArcs = outputArcsOf.get(transition.id) ?? [];
      const inputPlaces = inputArcs.map((a) => placesById.get(a.sourceId)!).filter(Boolean);

      // Enumerate all possible variable bindings
      const bindings = enumerateBindings(
        transition,
        inputArcs,
        inputPlaces,
        colorSetsById,
        variableToColorSet,
      );

      for (const binding of bindings) {
        // Check limit
        if (totalBindingsFired >= MAX_BINDINGS) {
          bindingLimitHit = true;
          break;
        }

        const consumed = checkEnabled(transition, inputArcs, currentMarking, binding);
        if (consumed === null) continue;

        // Mark as enabled
        enabledHere.add(transition.id);

        // Fire
        const nextMarking = fireTransition(
          transition,
          inputArcs,
          outputArcs,
          currentMarking,
          binding,
        );
        totalBindingsFired++;

        const nextKey = markingToKey(nextMarking);

        // Record edge
        edges.push({ from: currentKey, to: nextKey, step: { transitionId: transition.id, binding } });

        // Add to graph if new
        if (!allMarkings.has(nextKey)) {
          if (allMarkings.size >= MAX_MARKINGS) {
            truncated = true;
            continue; // Don't add but continue exploring current marking's transitions
          }
          allMarkings.set(nextKey, nextMarking);
          queue.push(nextKey);
        }
      }

      if (bindingLimitHit) break;
    }
  }

  // Ensure initial marking has an entry in enabledTransitions
  if (!enabledTransitions.has(initialKey)) {
    enabledTransitions.set(initialKey, new Set());
  }

  return {
    markings: allMarkings,
    initialKey,
    edges,
    enabledTransitions,
    truncated,
    bindingLimitHit,
    stateCount: allMarkings.size,
  };
}

//  Utility: format a binding for display

export function formatBinding(binding: Bindings): string {
  const entries = Object.entries(binding);
  if (entries.length === 0) return "{}";
  return "{" + entries.map(([k, v]) => `${k}=${v}`).join(", ") + "}";
}

/** Return total token count for a place across a marking (helper for boundedness). */
export function tokensOnPlace(marking: Marking, placeId: string): number {
  const ms = marking.get(placeId);
  if (!ms) return 0;
  return totalTokens(ms);
}
