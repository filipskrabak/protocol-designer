import { describe, it, expect } from 'vitest';
import {
  checkReachability,
  checkDeadlockFreedom,
  checkBoundedness,
  checkLiveness,
  checkAllProperties,
} from '../properties';
import type {
  ColoredPetriNet,
  CPNPlace,
  CPNTransition,
  CPNArc,
  ColorSet,
} from '@/contracts/models';
import type { StateSpaceResult, Marking } from '../stateSpace';

// helpers

const UNIT_CS: ColorSet = { id: 'cs-unit', name: 'UNIT', type: 'unit' };

function place(id: string, name: string, init = '0'): CPNPlace {
  return { id, name, colorSetId: 'cs-unit', initialMarking: init, position: { x: 0, y: 0 } };
}

function transition(id: string, name: string): CPNTransition {
  return { id, name, position: { x: 0, y: 0 } };
}

function makeCPN(
  places: CPNPlace[],
  transitions: CPNTransition[],
  arcs: CPNArc[] = [],
): ColoredPetriNet {
  return {
    id: 'test-cpn',
    name: 'Test',
    description: '',
    places,
    transitions,
    arcs,
    colorSets: [UNIT_CS],
    variables: [],
  };
}

/** Build a Marking from a plain {placeId: {color: count}} map. */
function marking(placeTokens: Record<string, Record<string, number>>): Marking {
  const m: Marking = new Map();
  for (const [placeId, tokens] of Object.entries(placeTokens)) {
    m.set(placeId, new Map(Object.entries(tokens)));
  }
  return m;
}

/**
 * Build a minimal StateSpaceResult from an array of [key, Marking] pairs and
 * an enabled-transitions map: { markingKey → transitionId[] }.
 */
function makeStateSpace(
  markingsArr: [string, Marking][],
  enabledMap: Record<string, string[]> = {},
  opts: { truncated?: boolean; bindingLimitHit?: boolean } = {},
): StateSpaceResult {
  const markings = new Map(markingsArr);
  const enabledTransitions = new Map<string, Set<string>>(
    Object.entries(enabledMap).map(([k, v]) => [k, new Set(v)]),
  );
  return {
    markings,
    initialKey: markingsArr[0]?.[0] ?? '',
    edges: [],
    enabledTransitions,
    truncated: opts.truncated ?? false,
    bindingLimitHit: opts.bindingLimitHit ?? false,
    stateCount: markingsArr.length,
  };
}

//  checkReachability

describe('checkReachability', () => {
  it('returns passed:true when predicate matches a marking', () => {
    const m0 = marking({ p1: { '()': 1 } });
    const m1 = marking({ p1: {} }); // empty place
    const ss = makeStateSpace([['m0', m0], ['m1', m1]]);
    const result = checkReachability(ss, m => (m.get('p1')?.size ?? 0) === 0);
    expect(result.passed).toBe(true);
  });

  it('returns passed:false when predicate never matches', () => {
    const m0 = marking({ p1: { '()': 1 } });
    const ss = makeStateSpace([['m0', m0]]);
    const result = checkReachability(ss, () => false);
    expect(result.passed).toBe(false);
  });

  it('includes a witness when the target is found', () => {
    const m0 = marking({ p1: { '()': 1 } });
    const ss = makeStateSpace([['m0', m0]]);
    const result = checkReachability(ss, () => true);
    expect(result.witness).toBeDefined();
  });

  it('mentions state count in the success message', () => {
    const m0 = marking({ p1: { '()': 1 } });
    const m1 = marking({ p1: { '()': 2 } });
    const ss = makeStateSpace([['m0', m0], ['m1', m1]]);
    const result = checkReachability(ss, () => true);
    expect(result.message).toMatch(/2/);
  });

  it('mentions truncation in message when exploration was truncated and target not found', () => {
    const m0 = marking({ p1: {} });
    const ss = makeStateSpace([['m0', m0]], {}, { truncated: true });
    const result = checkReachability(ss, () => false);
    expect(result.message).toMatch(/truncated/i);
  });

  it('message is exhaustive when not truncated and target not found', () => {
    const m0 = marking({ p1: {} });
    const ss = makeStateSpace([['m0', m0]]);
    const result = checkReachability(ss, () => false);
    expect(result.message).not.toMatch(/truncated/i);
    expect(result.message).toMatch(/not reachable/i);
  });
});

// checkDeadlockFreedom

describe('checkDeadlockFreedom', () => {
  it('returns passed:true with no witness when all markings have enabled transitions', () => {
    const p = place('p1', 'P1', '1`()');
    const t = transition('t1', 'T');
    const cpn = makeCPN([p], [t]);
    const m0 = marking({ p1: { '()': 1 } });
    const ss = makeStateSpace([['m0', m0]], { m0: ['t1'] });
    const result = checkDeadlockFreedom(cpn, ss);
    expect(result.passed).toBe(true);
    expect(result.witness).toBeUndefined();
  });

  it('returns passed:true WITH witness when a dead marking exists', () => {
    // Dead markings are expected terminal states — passed stays true per design
    const p = place('p1', 'P1');
    const t = transition('t1', 'T');
    const cpn = makeCPN([p], [t]);
    const m0 = marking({ p1: {} }); // empty place → dead
    const ss = makeStateSpace([['m0', m0]], { m0: [] }); // no enabled transitions
    const result = checkDeadlockFreedom(cpn, ss);
    expect(result.passed).toBe(true);
    expect(result.witness).toBeDefined();
    expect(result.message).toMatch(/dead marking/i);
  });

  it('collects at most 5 dead marking examples', () => {
    const p = place('p1', 'P1');
    const cpn = makeCPN([p], []);
    // 7 markings all with no enabled transitions
    const markingsArr: [string, Marking][] = Array.from({ length: 7 }, (_, i) => [
      `m${i}`,
      marking({ p1: {} }),
    ]);
    const ss = makeStateSpace(markingsArr, {});
    const result = checkDeadlockFreedom(cpn, ss);
    // witness is the array of dead markings (capped at 5)
    expect(Array.isArray(result.witness)).toBe(true);
    expect((result.witness as unknown[]).length).toBeLessThanOrEqual(5);
  });
});

// checkBoundedness

describe('checkBoundedness', () => {
  it('passes when all places stay within observed max (full exploration)', () => {
    const p = place('p1', 'P1');
    const cpn = makeCPN([p], []);
    const m0 = marking({ p1: { '()': 1 } });
    const ss = makeStateSpace([['m0', m0]]);
    const result = checkBoundedness(cpn, ss);
    expect(result.passed).toBe(true);
    expect(result.bounds[0].maxTokens).toBe(1);
  });

  it('fails when a place exceeds the requested k bound', () => {
    const p = place('p1', 'P1');
    const cpn = makeCPN([p], []);
    const m0 = marking({ p1: { '()': 3 } });
    const ss = makeStateSpace([['m0', m0]]);
    const result = checkBoundedness(cpn, ss, 2);
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/not 2-bounded/i);
    expect(result.counterexample).toBeDefined();
  });

  it('passes when all places are within k-bound', () => {
    const p = place('p1', 'P1');
    const cpn = makeCPN([p], []);
    const m0 = marking({ p1: { '()': 1 } });
    const ss = makeStateSpace([['m0', m0]]);
    const result = checkBoundedness(cpn, ss, 1);
    expect(result.passed).toBe(true);
  });

  it('reports correct per-place maxTokens across multiple markings', () => {
    const p1 = place('p1', 'P1');
    const p2 = place('p2', 'P2');
    const cpn = makeCPN([p1, p2], []);
    // p1 starts at 2, drops to 1; p2 stays at 1
    const m0 = marking({ p1: { '()': 2 }, p2: { '()': 1 } });
    const m1 = marking({ p1: { '()': 1 }, p2: { '()': 1 } });
    const ss = makeStateSpace([['m0', m0], ['m1', m1]]);
    const result = checkBoundedness(cpn, ss);
    const b1 = result.bounds.find(b => b.placeId === 'p1');
    const b2 = result.bounds.find(b => b.placeId === 'p2');
    expect(b1?.maxTokens).toBe(2);
    expect(b2?.maxTokens).toBe(1);
  });

  it('reports zero maxTokens for places never populated', () => {
    const p = place('p1', 'P1');
    const cpn = makeCPN([p], []);
    const m0 = marking({ p1: {} }); // no tokens
    const ss = makeStateSpace([['m0', m0]]);
    const result = checkBoundedness(cpn, ss);
    expect(result.bounds[0].maxTokens).toBe(0);
  });
});

// checkLiveness

describe('checkLiveness', () => {
  it('marks a transition as live when it is enabled in at least one marking', () => {
    const t = transition('t1', 'T');
    const cpn = makeCPN([], [t]);
    const ss = makeStateSpace([['m0', new Map()]], { m0: ['t1'] });
    const results = checkLiveness(cpn, ss);
    expect(results['t1'].passed).toBe(true);
    expect(results['t1'].message).toMatch(/live/i);
  });

  it('marks a transition as dead when never enabled', () => {
    const t = transition('t1', 'T');
    const cpn = makeCPN([], [t]);
    const ss = makeStateSpace([['m0', new Map()]], { m0: [] });
    const results = checkLiveness(cpn, ss);
    expect(results['t1'].passed).toBe(false);
    expect(results['t1'].message).toMatch(/dead/i);
  });

  it('checks only the specified transitionId when provided', () => {
    const t1 = transition('t1', 'T1');
    const t2 = transition('t2', 'T2');
    const cpn = makeCPN([], [t1, t2]);
    const ss = makeStateSpace([['m0', new Map()]], { m0: ['t1'] });
    const results = checkLiveness(cpn, ss, 't1');
    expect(Object.keys(results)).toHaveLength(1);
    expect(results['t1'].passed).toBe(true);
  });

  it('checks all transitions when no transitionId provided', () => {
    const t1 = transition('t1', 'T1');
    const t2 = transition('t2', 'T2');
    const cpn = makeCPN([], [t1, t2]);
    const ss = makeStateSpace(
      [['m0', new Map()], ['m1', new Map()]],
      { m0: ['t1'], m1: ['t2'] },
    );
    const results = checkLiveness(cpn, ss);
    expect(Object.keys(results)).toHaveLength(2);
    expect(results['t1'].passed).toBe(true);
    expect(results['t2'].passed).toBe(true);
  });

  it('mentions truncation in message when space was truncated and transition never enabled', () => {
    const t = transition('t1', 'T');
    const cpn = makeCPN([], [t]);
    const ss = makeStateSpace([['m0', new Map()]], { m0: [] }, { truncated: true });
    const results = checkLiveness(cpn, ss);
    expect(results['t1'].message).toMatch(/truncated/i);
  });
});

// checkAllProperties

describe('checkAllProperties', () => {
  it('runs all checks and returns a CPNVerificationResults object', () => {
    const p = place('p1', 'P1');
    const t = transition('t1', 'T');
    const cpn = makeCPN([p], [t]);
    const m0 = marking({ p1: { '()': 1 } });
    const ss = makeStateSpace([['m0', m0]], { m0: ['t1'] });

    const results = checkAllProperties(cpn, ss, []);
    expect(results).toHaveProperty('reachability');
    expect(results).toHaveProperty('deadlockFreedom');
    expect(results).toHaveProperty('boundedness');
    expect(results).toHaveProperty('liveness');
    expect(results).toHaveProperty('stateCount', 1);
    expect(results).toHaveProperty('truncated', false);
    expect(results.runAt).toBeDefined();
  });

  it('passes default reachability message when no target conditions given', () => {
    const cpn = makeCPN([], []);
    const ss = makeStateSpace([['m0', new Map()]], {});
    const results = checkAllProperties(cpn, ss, []);
    expect(results.reachability.passed).toBe(true);
    expect(results.reachability.message).toMatch(/no target/i);
  });
});
