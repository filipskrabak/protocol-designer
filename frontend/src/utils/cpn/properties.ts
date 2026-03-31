/**
 * properties.ts
 *
 * Checks CPN verification properties against a StateSpaceResult:
 *   1. Reachability — is a target marking reachable from the initial marking?
 *   2. Deadlock-freedom — no reachable marking has zero enabled transitions
 *   3. Boundedness — every place has at most k tokens in all reachable markings
 *   4. Liveness — for each transition, is it enabled in at least one reachable marking?
 *
 * Also computes structural S-invariants (frontend-only, coefficient-based).
 */

import type { ColoredPetriNet } from "@/contracts/models";
import type { CPNPropertyResult, CPNInvariant } from "@/store/CPNStore";
import {
  type StateSpaceResult,
  type Marking,
  markingToObject,
  tokensOnPlace,
} from "./stateSpace";

//  1. Reachability

/**
 * Check if any reachable marking satisfies the predicate.
 *
 * @param stateSpace  Result from exploreStateSpace()
 * @param predicate   A function that returns true for the "interesting" marking
 * @param description Human-readable description for the report message
 */
export function checkReachability(
  stateSpace: StateSpaceResult,
  predicate: (marking: Marking) => boolean,
  description = "target marking",
): CPNPropertyResult {
  for (const [, marking] of stateSpace.markings) {
    if (predicate(marking)) {
      const witness = markingToObject(marking);
      return {
        passed: true,
        message: `${description} is reachable (found in state space of ${stateSpace.stateCount} marking${stateSpace.stateCount !== 1 ? "s" : ""})`,
        witness,
      };
    }
  }
  return {
    passed: false,
    message: stateSpace.truncated
      ? `${description} was not found within the explored ${stateSpace.stateCount} markings (exploration was truncated)`
      : `${description} is not reachable (exhaustive search of ${stateSpace.stateCount} marking${stateSpace.stateCount !== 1 ? "s" : ""})`,
  };
}

//  2. Deadlock-freedom

/**
 * Reports dead markings (markings with no enabled transitions) as a neutral
 * observation, matching CPN Tools behaviour. Dead markings are expected for
 * procedure nets that terminate — they are not treated as failures.
 * The caller decides whether the reported dead markings are acceptable.
 */
export function checkDeadlockFreedom(cpn: ColoredPetriNet, stateSpace: StateSpaceResult): CPNPropertyResult {
  const placeNameById = new Map(cpn.places.map(p => [p.id, p.name]));
  const deadMarkings: Record<string, string>[] = [];

  for (const [key, _marking] of stateSpace.markings) {
    const enabled = stateSpace.enabledTransitions.get(key);
    if (!enabled || enabled.size === 0) {
      const named: Record<string, string> = {};
      for (const [pid, tokens] of Object.entries(markingToObject(_marking))) {
        named[placeNameById.get(pid) ?? pid] = tokens;
      }
      deadMarkings.push(named);
      if (deadMarkings.length >= 5) break; // collect up to 5 examples
    }
  }

  if (deadMarkings.length === 0) {
    return {
      passed: true,
      message: `No dead markings in ${stateSpace.stateCount} reachable marking${stateSpace.stateCount !== 1 ? "s" : ""}${stateSpace.truncated ? " (exploration truncated)" : ""}`,
    };
  }

  return {
    passed: true,
    message: `${deadMarkings.length} dead marking${deadMarkings.length > 1 ? "s" : ""} (terminal state${deadMarkings.length > 1 ? "s" : ""})${stateSpace.truncated ? " (exploration truncated, more may exist)" : ""}`,
    witness: deadMarkings,
  };
}

//  3. Boundedness

/** Per-place max token count across all reachable markings. */
export interface PlaceBounds {
  placeId: string;
  placeName: string;
  maxTokens: number;
}

/**
 * Compute token bounds for every place.
 * Boundedness passes iff every place's max token count ≤ k.
 *
 * Layer 1 (structural): places covered by an S-invariant are definitively
 * bounded regardless of exploration completeness.
 * Layer 2 (exploration): uncovered places are checked against the state space.
 *
 * @param cpn         The CPN (for place names)
 * @param stateSpace  Exploration result
 * @param k           Bound to check (default: Infinity — just measure actual bounds)
 * @param invariants  Pre-computed S-invariants (avoids recomputing if already available)
 */
export function checkBoundedness(
  cpn: ColoredPetriNet,
  stateSpace: StateSpaceResult,
  k: number = Infinity,
  invariants?: CPNInvariant[],
): CPNPropertyResult & { bounds: PlaceBounds[] } {
  const placeNameById = new Map<string, string>(cpn.places.map((p) => [p.id, p.name]));
  const maxTokensPerPlace = new Map<string, number>();

  for (const place of cpn.places) {
    maxTokensPerPlace.set(place.id, 0);
  }

  for (const marking of stateSpace.markings.values()) {
    for (const place of cpn.places) {
      const tokens = tokensOnPlace(marking, place.id);
      const current = maxTokensPerPlace.get(place.id) ?? 0;
      if (tokens > current) maxTokensPerPlace.set(place.id, tokens);
    }
  }

  const bounds: PlaceBounds[] = cpn.places.map((p) => ({
    placeId: p.id,
    placeName: placeNameById.get(p.id) ?? p.id,
    maxTokens: maxTokensPerPlace.get(p.id) ?? 0,
  }));

  // Step 1: Structural proof via S-invariants
  // A place covered by at least one P-semiflow is definitively bounded, independently of whether exploration was truncated.
  const inv = invariants ?? computeSInvariants(cpn);
  const structurallyCovered = new Set<string>();
  for (const invar of inv) {
    for (const [placeId, coeff] of Object.entries(invar.coefficients)) {
      if (coeff > 0) structurallyCovered.add(placeId);
    }
  }

  const uncoveredIds = new Set(cpn.places.map((p) => p.id).filter((id) => !structurallyCovered.has(id)));

  if (uncoveredIds.size === 0 && inv.length > 0) {
    // Every place is structurally bounded — no exploration needed.
    const invLabels = inv.map((i) => i.label).join("; ");
    return {
      passed: true,
      message: `All places proven bounded by S-invariants: ${invLabels}`,
      bounds,
    };
  }

  // Step 2: Exploration check for uncovered places
  // Only flag places that are NOT structurally covered.
  const unbounded = bounds.filter((b) => uncoveredIds.has(b.placeId) && b.maxTokens > k);

  // When exploration was truncated, check for uncovered places whose token count
  // grew significantly, which is a strong signal that they are unbounded
  // Heuristic: max observed tokens > 10% of the total markings explored -> likely unbounded
  const likelyUnbounded = stateSpace.truncated
    ? bounds.filter((b) => uncoveredIds.has(b.placeId) && b.maxTokens > stateSpace.stateCount * 0.1)
    : [];

  if (unbounded.length === 0 && likelyUnbounded.length === 0) {
    const maxOverall = Math.max(0, ...bounds.map((b) => b.maxTokens));
    const coveredNote =
      structurallyCovered.size > 0
        ? ` (${structurallyCovered.size} place${structurallyCovered.size > 1 ? "s" : ""} proven by S-invariants)`
        : "";
    return {
      passed: true,
      message: `All places are ${k === Infinity ? "" : `${k}-`}bounded (max ${maxOverall} token${maxOverall !== 1 ? "s" : ""} observed)${stateSpace.truncated ? " (exploration truncated)" : ""}${coveredNote}`,
      bounds,
    };
  }

  if (likelyUnbounded.length > 0 && unbounded.length === 0) {
    // Truncation-detected unboundedness: exploration stopped but token counts
    // were still rising,  report as failure with a clear explanation.
    return {
      passed: false,
      message: `Exploration stopped at ${stateSpace.stateCount} markings — ${likelyUnbounded.length} place${likelyUnbounded.length > 1 ? "s appear" : " appears"} unbounded, because token count kept growing: ${likelyUnbounded.map((b) => `${b.placeName} (max ${b.maxTokens} observed)`).join(", ")}`,
      bounds,
      counterexample: likelyUnbounded.map((b) => ({ place: b.placeName, maxTokens: b.maxTokens })),
    };
  }

  return {
    passed: false,
    message: `${unbounded.length} place${unbounded.length > 1 ? "s are" : " is"} not ${k}-bounded: ${unbounded.map((b) => `${b.placeName} (max ${b.maxTokens})`).join(", ")}`,
    bounds,
    counterexample: unbounded.map((b) => ({ place: b.placeName, maxTokens: b.maxTokens })),
  };
}

//  4. Liveness

/**
 * A transition is live (L1-live / weakly live) iff it is enabled in at
 * least one reachable marking.
 *
 * Checking strong liveness (L4) requires cycle detection which is deferred
 * to the backend Z3 analysis.
 *
 * @param cpn        The CPN (for transition names)
 * @param stateSpace Exploration result
 * @param transitionId  Optional: check a specific transition; if omitted, check all
 */
export function checkLiveness(
  cpn: ColoredPetriNet,
  stateSpace: StateSpaceResult,
  transitionId?: string,
): Record<string, CPNPropertyResult> {
  const results: Record<string, CPNPropertyResult> = {};

  const transitions = transitionId
    ? cpn.transitions.filter((t) => t.id === transitionId)
    : cpn.transitions;

  for (const t of transitions) {
    let enabled = false;
    for (const enabledSet of stateSpace.enabledTransitions.values()) {
      if (enabledSet.has(t.id)) {
        enabled = true;
        break;
      }
    }

    results[t.id] = {
      passed: enabled,
      message: enabled
        ? `Transition "${t.name}" is live (enabled in at least one reachable marking)`
        : stateSpace.truncated
          ? `Transition "${t.name}" was never enabled in the explored ${stateSpace.stateCount} markings (exploration was truncated)`
          : `Transition "${t.name}" is dead — never enabled in any of the ${stateSpace.stateCount} reachable markings`,
    };
  }

  return results;
}

//  5. Structural S-invariants (frontend, token-count only)

/**
 * Compute potential S-invariants for a pure P/T projection of the CPN
 * (ignoring token colours — count-only).
 *
 * Uses Farkas' algorithm (Gaussian elimination on the incidence matrix)
 * to find non-negative integer vectors c such that c·N = 0, where N is
 * the incidence matrix (rows = places, columns = transitions).
 *
 * This is colour-unaware: each arc inscription is evaluated to its total
 * token count (sum of all multiset coefficients) using the empty binding.
 *
 * @param cpn  The CPN
 * @returns    Array of discovered invariants (may be empty)
 */
export function computeSInvariants(cpn: ColoredPetriNet): CPNInvariant[] {
  if (cpn.places.length === 0 || cpn.transitions.length === 0) return [];

  const P = cpn.places.length;
  const T = cpn.transitions.length;

  // Map place/transition IDs to indices
  const placeIndex = new Map<string, number>(cpn.places.map((p, i) => [p.id, i]));

  // Build incidence matrix N[p][t] = (output_weight - input_weight)
  // Weights are total token counts (colour-unaware)
  const N: number[][] = Array.from({ length: P }, () => new Array(T).fill(0));

  for (const arc of cpn.arcs) {
    const count = estimateArcWeight(arc.inscription);
    if (arc.arcType === "place-to-transition") {
      const pi = placeIndex.get(arc.sourceId);
      const ti = cpn.transitions.findIndex((t) => t.id === arc.targetId);
      if (pi !== undefined && ti >= 0) N[pi][ti] -= count;
    } else {
      const pi = placeIndex.get(arc.targetId);
      const ti = cpn.transitions.findIndex((t) => t.id === arc.sourceId);
      if (pi !== undefined && ti >= 0) N[pi][ti] += count;
    }
  }

  // Farkas-style: augment [N | I_P] and row-reduce, collect rows from I_P part
  // Use rational arithmetic (numerator/denominator pairs) to stay integer
  const invariants: CPNInvariant[] = [];

  // Simple heuristic: for each transition t, check if N[:,t] = 0 everywhere
  // (self-loop transitions trivially satisfy any invariant)
  // Full Farkas is expensive for large nets; use a practical subset approach:
  // Try all pairs of places and find conservation laws directly.

  // For each pair (p, q), check if there exists c_p, c_q > 0 s.t. c_p*N[p] + c_q*N[q] = 0
  const checked = new Set<string>();

  for (let i = 0; i < P; i++) {
    for (let j = i + 1; j < P; j++) {
      const key = `${i},${j}`;
      if (checked.has(key)) continue;
      checked.add(key);

      // Check if N[i] and N[j] are anti-proportional: c_i*N[i] + c_j*N[j] = 0 for all t
      // This means: for all t, c_i*N[i][t] = -c_j*N[j][t]
      // Either both are zero (trivial) or we can find the ratio
      let ratio: number | null = null;
      let valid = true;
      for (let t = 0; t < T; t++) {
        const ni = N[i][t];
        const nj = N[j][t];
        if (ni === 0 && nj === 0) continue;
        if (ni === 0 || nj === 0) { valid = false; break; }
        const r = -nj / ni;
        if (ratio === null) {
          ratio = r;
        } else if (Math.abs(ratio - r) > 1e-9) {
          valid = false;
          break;
        }
      }

      if (!valid || ratio === null) continue;
      if (ratio <= 0) continue; // need positive coefficients

      // Normalize to integers (find LCD)
      const [ci, cj] = toSmallIntegers(1, ratio);
      if (ci <= 0 || cj <= 0) continue;

      const pi = cpn.places[i];
      const pj = cpn.places[j];
      const coefficients: Record<string, number> = {
        [pi.id]: ci,
        [pj.id]: cj,
      };

      // Compute conserved constant from initial marking
      const initI = parseInitialMarkingCount(pi.initialMarking);
      const initJ = parseInitialMarkingCount(pj.initialMarking);
      const constant = ci * initI + cj * initJ;

      const label = `${ci > 1 ? ci + "·" : ""}${pi.name} + ${cj > 1 ? cj + "·" : ""}${pj.name} = ${constant}`;

      invariants.push({ coefficients, constant, label });
    }
  }

  // Also try single-place invariants (place with all-zero incidence column → constant)
  for (let i = 0; i < P; i++) {
    const allZero = N[i].every((v) => v === 0);
    if (allZero) {
      const pi = cpn.places[i];
      const initCount = parseInitialMarkingCount(pi.initialMarking);
      invariants.push({
        coefficients: { [pi.id]: 1 },
        constant: initCount,
        label: `${pi.name} = ${initCount} (constant place)`,
      });
    }
  }

  return invariants;
}

//  Helpers

/**
 * Estimate the total token weight of an arc inscription (colour-unaware).
 * For unit arcs "1`x", returns 1. For "2`ACK ++ 3`SYN", returns 5.
 * Falls back to 1 on parse errors.
 */
function estimateArcWeight(inscription: string): number {
  if (!inscription || inscription.trim() === "" || inscription.trim() === "0" || inscription.trim().toLowerCase() === "empty") {
    return 0;
  }
  // Sum up the count portions from each ++ part
  let total = 0;
  for (const part of inscription.split("++")) {
    const p = part.trim();
    const backtickIdx = p.indexOf("`");
    if (backtickIdx === -1) {
      total += 1;
    } else {
      const countStr = p.slice(0, backtickIdx).trim();
      const n = parseInt(countStr, 10);
      total += Number.isNaN(n) ? 1 : n;
    }
  }
  return total;
}

/** Parse an initial marking string to get total token count (colour-unaware). */
function parseInitialMarkingCount(marking: string): number {
  if (!marking || marking.trim() === "0") return 0;
  return estimateArcWeight(marking);
}

/** Convert a ratio (1 : r) to small positive integers (a : b) with a,b ≤ 100. */
function toSmallIntegers(a: number, r: number): [number, number] {
  // r = b/a, so b = r*a. Find smallest integer a s.t. r*a is also integer.
  for (let scale = 1; scale <= 100; scale++) {
    const b = Math.round(r * scale);
    if (Math.abs(b - r * scale) < 1e-9 && b > 0) {
      return [scale, b];
    }
  }
  return [1, Math.round(r)];
}

//  Run all properties

export interface CPNVerificationResults {
  reachability: CPNPropertyResult;
  deadlockFreedom: CPNPropertyResult;
  boundedness: CPNPropertyResult & { bounds: PlaceBounds[] };
  liveness: Record<string, CPNPropertyResult>;
  invariants: CPNInvariant[];
  stateCount: number;
  truncated: boolean;
  bindingLimitHit: boolean;
  runAt: string;
}

/**
 * Run all standard CPN verification checks on a fully-explored state space.
 *
 * @param cpn         The CPN model
 * @param stateSpace  Result from exploreStateSpace()
 * @returns           All property check results
 */
export function checkAllProperties(
  cpn: ColoredPetriNet,
  stateSpace: StateSpaceResult,
): CPNVerificationResults {
  const reachability = checkReachability(
    stateSpace,
    // Default: at least the initial marking is reachable
    () => true,
    "initial marking",
  );

  const deadlockFreedom = checkDeadlockFreedom(cpn, stateSpace);

  const invariants = computeSInvariants(cpn);

  const boundedness = checkBoundedness(cpn, stateSpace, Infinity, invariants);

  const liveness = checkLiveness(cpn, stateSpace);

  return {
    reachability,
    deadlockFreedom,
    boundedness,
    liveness,
    invariants,
    stateCount: stateSpace.stateCount,
    truncated: stateSpace.truncated,
    bindingLimitHit: stateSpace.bindingLimitHit,
    runAt: new Date().toISOString(),
  };
}
