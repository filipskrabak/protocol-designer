/**
 * properties.ts
 *
 * Checks CPN verification properties against a StateSpaceResult:
 *   1. Reachability - is a target marking reachable from the initial marking?
 *   2. Deadlock-freedom - no reachable marking has zero enabled transitions
 *   3. Boundedness - every place has at most k tokens in all reachable markings
 *   4. Liveness - for each transition, is it enabled in at least one reachable marking?
 */

import type { ColoredPetriNet, TargetMarkingCondition } from "@/contracts/models";
import type { CPNPropertyResult } from "@/store/CPNStore";
import {
  type StateSpaceResult,
  type Marking,
  markingToObject,
  tokensOnPlace,
  checkUnboundednessKM,
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

/**
 * Check if any reachable marking satisfies ALL given conditions
 * (conjunction of per-place token-count lower bounds).
 *
 * @param stateSpace  Exploration result
 * @param cpn         Needed for place names in the result message
 * @param conditions  One or more per-place conditions (all must hold simultaneously)
 */
export function checkTargetReachability(
  stateSpace: StateSpaceResult,
  cpn: ColoredPetriNet,
  conditions: TargetMarkingCondition[],
): CPNPropertyResult {
  if (conditions.length === 0) {
    return {
      passed: true,
      message: "No target conditions specified.",
    };
  }
  const placeNameById = new Map(cpn.places.map((p) => [p.id, p.name]));
  const description = conditions
    .map((c) => `${placeNameById.get(c.placeId) ?? c.placeId} \u2265 ${c.minTokens}`)
    .join(" \u2227 ");
  return checkReachability(
    stateSpace,
    (marking) => conditions.every((c) => tokensOnPlace(marking, c.placeId) >= c.minTokens),
    description,
  );
}

//  2. Deadlock-freedom

/**
 * Reports dead markings (markings with no enabled transitions) as a neutral
 * observation, matching CPN Tools behaviour. Dead markings are expected for
 * procedure nets that terminate - they are not treated as failures.
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
 *
 * If BFS completed the full state space, the observed per-place max is exact.
 * If BFS was truncated, runs a Karp-Miller DFS to search for a domination
 * witness (definitively unbounded) or confirm boundedness (no witness found
 * within the node limit).
 *
 * @param cpn        The CPN (for place names)
 * @param stateSpace Exploration result from exploreStateSpace()
 * @param k          Bound to verify (default: Infinity — just measure)
 */
export function checkBoundedness(
  cpn: ColoredPetriNet,
  stateSpace: StateSpaceResult,
  k: number = Infinity,
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

  const maxOverall = Math.max(0, ...bounds.map((b) => b.maxTokens));

  // BFS completed the full state space: observed max is the exact bound.
  if (!stateSpace.truncated && !stateSpace.bindingLimitHit) {
    const unbounded = k < Infinity ? bounds.filter((b) => b.maxTokens > k) : [];
    if (unbounded.length === 0) {
      return {
        passed: true,
        message: `All places are bounded (max ${maxOverall} token${maxOverall !== 1 ? "s" : ""} observed across ${stateSpace.stateCount} reachable marking${stateSpace.stateCount !== 1 ? "s" : ""})`,
        bounds,
      };
    }
    return {
      passed: false,
      message: `${unbounded.length} place${unbounded.length > 1 ? "s are" : " is"} not ${k}-bounded: ${unbounded.map((b) => `${b.placeName} (max ${b.maxTokens})`).join(", ")}`,
      bounds,
      counterexample: unbounded.map((b) => ({ place: b.placeName, maxTokens: b.maxTokens })),
    };
  }

  // BFS was truncated: run Karp-Miller DFS to get a definitive answer.
  const km = checkUnboundednessKM(cpn);

  if (km.kind === "unbounded") {
    const placeNames = km.unboundedPlaceIds
      .map((id) => cpn.places.find((p) => p.id === id)?.name ?? id)
      .join(", ");
    return {
      passed: false,
      message: `Unbounded (Karp-Miller DFS): ${placeNames} grows without bound`,
      bounds,
      counterexample: km.unboundedPlaceIds.map((id) => ({
        place: cpn.places.find((p) => p.id === id)?.name ?? id,
      })),
    };
  }

  if (km.kind === "bounded") {
    return {
      passed: true,
      message: `All places bounded (Karp-Miller DFS)`,
      bounds,
    };
  }

  // inconclusive: KM hit the node limit — report as a warning.
  const truncationReason = stateSpace.bindingLimitHit
    ? `binding limit hit`
    : `marking limit hit at ${stateSpace.stateCount}`;
  return {
    passed: false,
    message: `BFS incomplete (${truncationReason}). Karp-Miller search also exceeded node limit; boundedness is inconclusive.`,
    bounds,
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
        ? `Transition "${t.name}" is L1 live (enabled in at least one reachable marking)`
        : stateSpace.truncated
          ? `Transition "${t.name}" was never enabled in the explored ${stateSpace.stateCount} markings (exploration was truncated)`
          : `Transition "${t.name}" is dead - never enabled in any of the ${stateSpace.stateCount} reachable markings`,
    };
  }

  return results;
}

//  Run all properties

export interface CPNVerificationResults {
  reachability: CPNPropertyResult;
  deadlockFreedom: CPNPropertyResult;
  boundedness: CPNPropertyResult & { bounds: PlaceBounds[] };
  liveness: Record<string, CPNPropertyResult>;
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
  targetConditions: TargetMarkingCondition[] = [],
): CPNVerificationResults {
  const reachability =
    targetConditions.length > 0
      ? checkTargetReachability(stateSpace, cpn, targetConditions)
      : {
          passed: true,
          message: `${stateSpace.stateCount} marking${
            stateSpace.stateCount !== 1 ? "s" : ""
          } reachable from initial marking. No target specified, please add conditions to query a specific state.`,
        };

  const deadlockFreedom = checkDeadlockFreedom(cpn, stateSpace);

  const boundedness = checkBoundedness(cpn, stateSpace, Infinity);

  const liveness = checkLiveness(cpn, stateSpace);

  return {
    reachability,
    deadlockFreedom,
    boundedness,
    liveness,
    stateCount: stateSpace.stateCount,
    truncated: stateSpace.truncated,
    bindingLimitHit: stateSpace.bindingLimitHit,
    runAt: new Date().toISOString(),
  };
}
