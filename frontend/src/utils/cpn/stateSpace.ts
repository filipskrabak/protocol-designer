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

const MAX_MARKINGS = 50_000;
const MAX_BINDINGS = 100_000;

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
  /** Whether any integer color set was silently capped to MAX_INT_RANGE values during enumeration. */
  intRangeCapped: boolean;
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
 * @param cpn     The ColoredPetriNet to explore
 * @param options Optional overrides for exploration limits
 * @returns       StateSpaceResult
 */
export function exploreStateSpace(
  cpn: ColoredPetriNet,
  options?: { maxMarkings?: number },
): StateSpaceResult {
  const markingLimit = options?.maxMarkings ?? MAX_MARKINGS;
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

  // Detect if any int color set used in this net exceeds MAX_INT_RANGE
  let intRangeCapped = false;
  for (const cs of colorSetsById.values()) {
    if (cs.type === "int") {
      const lo = cs.intMin ?? 0;
      const hi = cs.intMax ?? 255;
      if (hi - lo + 1 > MAX_INT_RANGE) {
        intRangeCapped = true;
        break;
      }
    }
  }

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
          if (allMarkings.size >= markingLimit) {
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
    intRangeCapped,
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

// ---------------------------------------------------------------------------
// Karp-Miller witness finder
// ---------------------------------------------------------------------------

/** Maximum DFS nodes before reporting inconclusive. */
const KM_MAX_NODES = 50_000;

/**
 * Result of the Karp-Miller unboundedness check.
 *
 * - 'bounded'     : DFS exhausted all reachable states without finding a witness.
 *                   The net is definitively bounded.
 * - 'unbounded'   : Found markings (ancestor, dominated) on a DFS path where
 *                   dominated ≥ ancestor everywhere and strictly greater on at
 *                   least one (place, color). The net is definitively unbounded.
 * - 'inconclusive': KM_MAX_NODES was hit before exhaustion. No verdict.
 */
export type KarpMillerVerdict =
  | { kind: 'bounded' }
  | { kind: 'unbounded'; unboundedPlaceIds: string[]; witness: { ancestor: Marking; dominated: Marking } }
  | { kind: 'inconclusive' };

/**
 * Determine whether `curr` strictly dominates `anc` in the Karp-Miller sense.
 *
 * `curr` dominates `anc` iff:
 *   ∀ place p, ∀ color c : curr(p)(c) ≥ anc(p)(c)    [component-wise ≥]
 *   ∃ place p, ∃ color c : curr(p)(c) > anc(p)(c)    [strictly greater somewhere]
 *
 * Returns the list of place IDs where curr is strictly greater, or null if
 * curr does NOT dominate anc (some component of anc exceeds curr).
 */
function dominancePlaces(curr: Marking, anc: Marking, placeIds: string[]): string[] | null {
  const greaterPlaces: string[] = [];
  for (const pid of placeIds) {
    const currMs = curr.get(pid) ?? new Map<string, number>();
    const ancMs  = anc.get(pid)  ?? new Map<string, number>();
    // If anc has any color where curr is smaller → not dominated
    for (const [color, ancCount] of ancMs) {
      if ((currMs.get(color) ?? 0) < ancCount) return null;
    }
    // Record places where curr is strictly larger
    for (const [color, currCount] of currMs) {
      if (currCount > (ancMs.get(color) ?? 0)) {
        greaterPlaces.push(pid);
        break; // one strict component per place is enough
      }
    }
  }
  // greaterPlaces.length === 0 means curr == anc exactly (not a domination)
  return greaterPlaces.length > 0 ? greaterPlaces : null;
}

/**
 * Check whether the CPN is bounded using a Karp-Miller DFS witness search.
 *
 * Algorithm (Karp & Miller, 1969):
 *   Perform DFS from the initial marking maintaining an ancestor stack.
 *   At each node, before recursing:
 *     1. If the current marking strictly dominates any ancestor marking, that
 *        pair is a witness: the same firing sequence can repeat, accumulating
 *        tokens indefinitely → UNBOUNDED.
 *     2. If the current marking equals an ancestor exactly, this is a cycle with
 *        no token growth → backtrack (bounded on this path).
 *   If DFS finishes without finding a witness → BOUNDED.
 *   If KM_MAX_NODES is exhausted → INCONCLUSIVE.
 *
 * Soundness:
 *   - Unbounded verdict is always correct (witness is a genuine domination).
 *   - Bounded verdict is correct when DFS completes under the node limit.
 *   - Inconclusive means the limit was hit without finding a witness.
 */
export function checkUnboundednessKM(cpn: ColoredPetriNet): KarpMillerVerdict {
  // ---- Setup (mirrors exploreStateSpace) ----
  const colorSetsById = new Map<string, ColorSet>(cpn.colorSets.map(cs => [cs.id, cs]));
  const placesById    = new Map<string, CPNPlace>(cpn.places.map(p => [p.id, p]));
  const variableToColorSet = new Map<string, string>(cpn.variables.map(v => [v.name, v.colorSetId]));

  const inputArcsOf  = new Map<string, CPNArc[]>();
  const outputArcsOf = new Map<string, CPNArc[]>();
  for (const t of cpn.transitions) {
    inputArcsOf.set(t.id, []);
    outputArcsOf.set(t.id, []);
  }
  for (const arc of cpn.arcs) {
    if (arc.arcType === 'place-to-transition') {
      inputArcsOf.get(arc.targetId)!.push(arc);
    } else {
      outputArcsOf.get(arc.sourceId)!.push(arc);
    }
  }

  const placeIds = cpn.places.map(p => p.id);

  // onStack maps canonical key → marking for every node on the current DFS path.
  // Serves dual purpose: ancestor iteration (dominance check) and cycle detection.
  const onStack = new Map<string, Marking>();
  let nodesVisited = 0;

  // Iterative DFS using an explicit work stack to avoid JS call-stack overflow.
  // Each item is either:
  //   { action: 'enter', marking } — explore this marking, push it onto the ancestor set
  //   { action: 'exit',  key }     — remove the given key from the ancestor set (backtrack)
  type WorkItem =
    | { action: 'enter'; marking: Marking }
    | { action: 'exit';  key: string };

  const workStack: WorkItem[] = [{ action: 'enter', marking: computeInitialMarking(cpn) }];

  while (workStack.length > 0) {
    const item = workStack.pop()!;

    if (item.action === 'exit') {
      onStack.delete(item.key);
      continue;
    }

    const current = item.marking;
    nodesVisited++;
    if (nodesVisited > KM_MAX_NODES) return { kind: 'inconclusive' };

    // 1. Dominance check against every ancestor on the current path
    for (const anc of onStack.values()) {
      const places = dominancePlaces(current, anc, placeIds);
      if (places !== null) {
        return {
          kind: 'unbounded',
          unboundedPlaceIds: places,
          witness: { ancestor: anc, dominated: current },
        };
      }
    }

    // 2. Cycle detection: exact same marking already on path → bounded loop here
    const key = markingToKey(current);
    if (onStack.has(key)) continue;

    // 3. Add to ancestor set; schedule removal when this subtree is fully explored
    onStack.set(key, current);
    workStack.push({ action: 'exit', key });

    // 4. Push all successors. LIFO order means the first successor is explored first.
    const successors: Marking[] = [];
    for (const t of cpn.transitions) {
      const inputArcs  = inputArcsOf.get(t.id)  ?? [];
      const outputArcs = outputArcsOf.get(t.id) ?? [];
      const inputPlaces = inputArcs.map(a => placesById.get(a.sourceId)!).filter(Boolean);
      const bindings = enumerateBindings(t, inputArcs, inputPlaces, colorSetsById, variableToColorSet);

      for (const binding of bindings) {
        const consumed = checkEnabled(t, inputArcs, current, binding);
        if (consumed === null) continue;
        successors.push(fireTransition(t, inputArcs, outputArcs, current, binding));
      }
    }
    // Push in reverse so the first successor ends up on top of the stack
    for (let i = successors.length - 1; i >= 0; i--) {
      workStack.push({ action: 'enter', marking: successors[i] });
    }
  }

  return { kind: 'bounded' };
}
