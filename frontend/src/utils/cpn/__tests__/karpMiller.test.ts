/**
 * karpMiller.test.ts
 *
 * Correctness tests for the Karp-Miller DFS unboundedness witness finder
 * (`checkUnboundednessKM` in stateSpace.ts).
 *
 * Proof strategy for each test:
 *   BOUNDED nets  — manual reachability argument: enumerate all markings,
 *                   show the state space is finite and no domination exists.
 *   UNBOUNDED nets — exhibit the exact domination pair the algorithm should find.
 */

import { describe, it, expect } from 'vitest'
import { checkUnboundednessKM, type KarpMillerVerdict } from '../stateSpace'
import type { ColoredPetriNet, ColorSet, CPNPlace, CPNTransition, CPNArc, CPNVariable } from '@/contracts/models'

// ---------------------------------------------------------------------------
// Test net builders
// ---------------------------------------------------------------------------

/** Shared unit color set used across tests. */
const UNIT_CS: ColorSet = { id: 'unit-cs', name: 'UNIT', type: 'unit' }

/** Shared enum color set: two states OPEN / CLOSED. */
const STATE_CS: ColorSet = {
  id: 'state-cs',
  name: 'STATE',
  type: 'enum',
  enumValues: ['OPEN', 'CLOSED'],
}

/** Shared enum color set: color tokens A / B. */
const COLOR_CS: ColorSet = {
  id: 'color-cs',
  name: 'COLOR',
  type: 'enum',
  enumValues: ['A', 'B'],
}

function place(id: string, name: string, csId: string, init: string): CPNPlace {
  return { id, name, colorSetId: csId, initialMarking: init, position: { x: 0, y: 0 } }
}

function transition(id: string, name: string, guard?: string): CPNTransition {
  return { id, name, guard, position: { x: 0, y: 0 } }
}

/** place-to-transition arc */
function arcPT(id: string, src: string, tgt: string, inscription: string): CPNArc {
  return { id, sourceId: src, targetId: tgt, arcType: 'place-to-transition', inscription }
}

/** transition-to-place arc */
function arcTP(id: string, src: string, tgt: string, inscription: string): CPNArc {
  return { id, sourceId: src, targetId: tgt, arcType: 'transition-to-place', inscription }
}

function variable(id: string, name: string, csId: string): CPNVariable {
  return { id, name, colorSetId: csId }
}

function cpn(
  places: CPNPlace[],
  transitions: CPNTransition[],
  arcs: CPNArc[],
  colorSets: ColorSet[],
  variables: CPNVariable[] = [],
): ColoredPetriNet {
  return { id: 'test', name: 'Test', description: '', places, transitions, arcs, colorSets, variables }
}

// ---------------------------------------------------------------------------
// Helper assertions
// ---------------------------------------------------------------------------

function assertBounded(v: KarpMillerVerdict, label: string) {
  expect(v.kind, `${label}: expected bounded, got ${v.kind}`).toBe('bounded')
}

function assertUnbounded(v: KarpMillerVerdict, label: string, expectedPlaceIds?: string[]) {
  expect(v.kind, `${label}: expected unbounded, got ${v.kind}`).toBe('unbounded')
  if (v.kind !== 'unbounded') return // type narrowing

  // Witness correctness: dominated must dominate ancestor component-wise with strict increase
  const { ancestor, dominated } = v.witness
  let anyStrictlyGreater = false
  for (const [pid, dominatedMs] of dominated) {
    const ancMs = ancestor.get(pid) ?? new Map<string, number>()
    for (const [color, count] of dominatedMs) {
      const ancCount = ancMs.get(color) ?? 0
      expect(count, `${label}: dominated[${pid}][${color}] must be >= ancestor`).toBeGreaterThanOrEqual(ancCount)
      if (count > ancCount) anyStrictlyGreater = true
    }
    // Ancestor must not have any color that dominated lacks
    for (const [color, ancCount] of ancMs) {
      const domCount = dominatedMs.get(color) ?? 0
      expect(domCount, `${label}: dominated[${pid}][${color}] must be >= ancestor[${pid}][${color}]`).toBeGreaterThanOrEqual(ancCount)
    }
  }
  expect(anyStrictlyGreater, `${label}: dominated must be STRICTLY greater in at least one component`).toBe(true)

  if (expectedPlaceIds) {
    for (const pid of expectedPlaceIds) {
      expect(v.unboundedPlaceIds, `${label}: ${pid} should be in unboundedPlaceIds`).toContain(pid)
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkUnboundednessKM — bounded nets', () => {

  it('empty net (no places, no transitions) is bounded', () => {
    const net = cpn([], [], [], [])
    assertBounded(checkUnboundednessKM(net), 'empty net')
  })

  it('isolated place with no transitions is bounded', () => {
    // State space = { M0 = {A: 3`()} }. No transitions, no successor markings.
    const net = cpn(
      [place('pA', 'A', 'unit-cs', "3`()")],
      [],
      [],
      [UNIT_CS],
    )
    assertBounded(checkUnboundednessKM(net), 'isolated place')
  })

  it('two-place cycle is 1-bounded', () => {
    // A=1, B=0.  T1: A→B.  T2: B→A.
    // Reachable markings: M0={A:1,B:0}, M1={A:0,B:1}.
    // Neither dominates the other (M0 has more A, M1 has more B).
    const net = cpn(
      [
        place('pA', 'A', 'unit-cs', "1`()"),
        place('pB', 'B', 'unit-cs', "0"),
      ],
      [transition('t1', 'T1'), transition('t2', 'T2')],
      [
        arcPT('a1', 'pA', 't1', "1`x"), arcTP('a2', 't1', 'pB', "1`x"),
        arcPT('a3', 'pB', 't2', "1`x"), arcTP('a4', 't2', 'pA', "1`x"),
      ],
      [UNIT_CS],
      [variable('vx', 'x', 'unit-cs')],
    )
    assertBounded(checkUnboundednessKM(net), '2-state cycle')
  })

  it('three-place cycle is 1-bounded', () => {
    // A=1, B=0, C=0.  T1:A→B, T2:B→C, T3:C→A.  Token circulates.
    const net = cpn(
      [
        place('pA', 'A', 'unit-cs', "1`()"),
        place('pB', 'B', 'unit-cs', "0"),
        place('pC', 'C', 'unit-cs', "0"),
      ],
      [transition('t1', 'T1'), transition('t2', 'T2'), transition('t3', 'T3')],
      [
        arcPT('a1', 'pA', 't1', "1`x"), arcTP('a2', 't1', 'pB', "1`x"),
        arcPT('a3', 'pB', 't2', "1`x"), arcTP('a4', 't2', 'pC', "1`x"),
        arcPT('a5', 'pC', 't3', "1`x"), arcTP('a6', 't3', 'pA', "1`x"),
      ],
      [UNIT_CS],
      [variable('vx', 'x', 'unit-cs')],
    )
    assertBounded(checkUnboundednessKM(net), '3-place cycle')
  })

  it('producer-consumer with equal rates is bounded', () => {
    // Buffer B (init 0), Idle I (init 1).
    // T_produce: I → B+I (produces to buffer, keeps idle token)  -- wait, that would grow B
    // Use proper consumer: T_produce: I → B, T_consume: B → I.
    // Same as two-place cycle essentially.
    const net = cpn(
      [
        place('pI', 'Idle',   'unit-cs', "1`()"),
        place('pB', 'Buffer', 'unit-cs', "0"),
      ],
      [transition('tp', 'Produce'), transition('tc', 'Consume')],
      [
        arcPT('a1', 'pI', 'tp',  "1`x"), arcTP('a2', 'tp', 'pB', "1`x"),
        arcPT('a3', 'pB', 'tc',  "1`x"), arcTP('a4', 'tc', 'pI', "1`x"),
      ],
      [UNIT_CS],
      [variable('vx', 'x', 'unit-cs')],
    )
    assertBounded(checkUnboundednessKM(net), 'producer-consumer balanced')
  })

  it('enum-colored two-state alternator is bounded', () => {
    // Place S (STATE, init: 1`OPEN).
    // T_close: consumes 1`OPEN from S, produces 1`CLOSED to S.
    // T_open:  consumes 1`CLOSED from S, produces 1`OPEN to S.
    // No variables needed: constant inscriptions.
    // Reachable: {OPEN:1} and {CLOSED:1}. Neither dominates the other.
    const net = cpn(
      [place('pS', 'S', 'state-cs', "1`OPEN")],
      [transition('tc', 'Close'), transition('to', 'Open')],
      [
        arcPT('a1', 'pS', 'tc', "1`OPEN"),  arcTP('a2', 'tc', 'pS', "1`CLOSED"),
        arcPT('a3', 'pS', 'to', "1`CLOSED"), arcTP('a4', 'to', 'pS', "1`OPEN"),
      ],
      [STATE_CS],
    )
    assertBounded(checkUnboundednessKM(net), 'enum alternator')
  })

  it('silent (no-arc) self-loop transition does not create unboundedness', () => {
    // Place A (init 1`()). Transition T has NO arcs — it fires but changes nothing.
    // Firing T from M0 produces M0 again → exact cycle on first step → bounded.
    const net = cpn(
      [place('pA', 'A', 'unit-cs', "1`()")],
      [transition('t', 'Silent')],
      [], // no arcs
      [UNIT_CS],
    )
    assertBounded(checkUnboundednessKM(net), 'silent self-loop')
  })

  it('two-token cycle with multiple tokens in flight is bounded', () => {
    // A=2, B=0. T1: A→B (consumes 1, produces 1). Token pool of 2 circulates.
    // Reachable: {A:2,B:0}, {A:1,B:1}, {A:0,B:2}. Always sums to 2.
    const net = cpn(
      [
        place('pA', 'A', 'unit-cs', "2`()"),
        place('pB', 'B', 'unit-cs', "0"),
      ],
      [transition('t1', 'A→B'), transition('t2', 'B→A')],
      [
        arcPT('a1', 'pA', 't1', "1`x"), arcTP('a2', 't1', 'pB', "1`x"),
        arcPT('a3', 'pB', 't2', "1`x"), arcTP('a4', 't2', 'pA', "1`x"),
      ],
      [UNIT_CS],
      [variable('vx', 'x', 'unit-cs')],
    )
    assertBounded(checkUnboundednessKM(net), '2-token cycling')
  })
})

describe('checkUnboundednessKM — unbounded nets', () => {

  it('place with only a source transition (producer) is unbounded', () => {
    // T has no inputs; always enabled. Each firing adds 1`() to A.
    // M0={A:0} → M1={A:1} → M1 dominates M0 (A:1 > A:0).
    const net = cpn(
      [place('pA', 'A', 'unit-cs', "0")],
      [transition('t', 'Produce')],
      [arcTP('a1', 't', 'pA', "1`()")],
      [UNIT_CS],
    )
    assertUnbounded(checkUnboundednessKM(net), 'source transition', ['pA'])
  })

  it('duplicating transition (consumes 1, produces 2) is unbounded', () => {
    // A=1. T: consume 1`(), produce 2`().  A grows by 1 each firing.
    // M0={A:1} → M1={A:2}.  M1 dominates M0 on A.
    const net = cpn(
      [place('pA', 'A', 'unit-cs', "1`()")],
      [transition('t', 'Dup')],
      [
        arcPT('a1', 'pA', 't', "1`x"),
        arcTP('a2', 't',  'pA', "2`()"),
      ],
      [UNIT_CS],
      [variable('vx', 'x', 'unit-cs')],
    )
    assertUnbounded(checkUnboundednessKM(net), 'duplicator', ['pA'])
  })

  it('mixed net: one bounded place, one unbounded place', () => {
    // A=1 (bounded), B=0 (unbounded).
    // T: consume 1`() from A, produce 1`() to A and 1`() to B.
    // Each firing: A stays at 1, B gains 1.
    // M0={A:1,B:0} → M1={A:1,B:1}. M1 dominates M0 on B (A stays equal).
    const net = cpn(
      [
        place('pA', 'A', 'unit-cs', "1`()"),
        place('pB', 'B', 'unit-cs', "0"),
      ],
      [transition('t', 'Step')],
      [
        arcPT('a1', 'pA', 't',  "1`x"),
        arcTP('a2', 't',  'pA', "1`()"),
        arcTP('a3', 't',  'pB', "1`()"),
      ],
      [UNIT_CS],
      [variable('vx', 'x', 'unit-cs')],
    )
    const v = checkUnboundednessKM(net)
    assertUnbounded(v, 'mixed net', ['pB'])
    if (v.kind === 'unbounded') {
      // A should NOT be in unboundedPlaceIds — it stays constant
      expect(v.unboundedPlaceIds).not.toContain('pA')
    }
  })

  it('two independent unbounded places', () => {
    // T has no inputs. Each firing adds 1`() to both A and B.
    const net = cpn(
      [
        place('pA', 'A', 'unit-cs', "0"),
        place('pB', 'B', 'unit-cs', "0"),
      ],
      [transition('t', 'Produce')],
      [
        arcTP('a1', 't', 'pA', "1`()"),
        arcTP('a2', 't', 'pB', "1`()"),
      ],
      [UNIT_CS],
    )
    assertUnbounded(checkUnboundednessKM(net), 'two unbounded places')
  })

  it('enum-colored net: token count grows via production', () => {
    // Place P (COLOR, init: 1`A).
    // T: consume 1`A, produce 1`A ++ 1`B.
    // M0={A:1,B:0} → M1={A:1,B:1}. B grows. Unbounded.
    const net = cpn(
      [place('pP', 'P', 'color-cs', "1`A")],
      [transition('t', 'Split')],
      [
        arcPT('a1', 'pP', 't', "1`A"),
        arcTP('a2', 't', 'pP', "1`A"),
        arcTP('a3', 't', 'pP', "1`B"),
      ],
      [COLOR_CS],
    )
    assertUnbounded(checkUnboundednessKM(net), 'enum token growth', ['pP'])
  })

  it('chain of places with unbounded tail', () => {
    // A=1. T_src (no input) produces to A — A is unbounded.
    // T_move transfers A→B with no return — once T_move+T_src alternate, B also grows.
    // Both pA and pB are genuinely unbounded; DFS will find whichever domination
    // appears first on the explored path. We assert the net IS unbounded without
    // constraining which place the witness names.
    const net = cpn(
      [
        place('pA', 'A', 'unit-cs', "1`()"),
        place('pB', 'B', 'unit-cs', "0"),
      ],
      [
        transition('t_move', 'Move'),   // A→B
        transition('t_src',  'Source'), // source: always produces to A
      ],
      [
        arcPT('a1', 'pA', 't_move', "1`x"), arcTP('a2', 't_move', 'pB', "1`x"),
        arcTP('a3', 't_src', 'pA', "1`()"),
      ],
      [UNIT_CS],
      [variable('vx', 'x', 'unit-cs')],
    )
    assertUnbounded(checkUnboundednessKM(net), 'chain with source')
  })
})

describe('checkUnboundednessKM — witness validity (mathematical proof)', () => {

  it('witness satisfies the domination condition: dominated >= ancestor everywhere', () => {
    // Generic property test across all unbounded nets above
    const unboundedNets: Array<[string, ColoredPetriNet]> = [
      ['producer',   cpn([place('pA','A','unit-cs','0')], [transition('t','P')], [arcTP('a','t','pA',"1`()")], [UNIT_CS])],
      ['duplicator', cpn([place('pA','A','unit-cs',"1`()")], [transition('t','D')], [arcPT('a1','pA','t',"1`x"), arcTP('a2','t','pA',"2`()")], [UNIT_CS], [variable('vx','x','unit-cs')])],
    ]

    for (const [label, net] of unboundedNets) {
      const v = checkUnboundednessKM(net)
      expect(v.kind, `${label} should be unbounded`).toBe('unbounded')
      if (v.kind !== 'unbounded') continue

      const { ancestor, dominated } = v.witness
      let strictFound = false

      for (const [pid, domMs] of dominated) {
        const ancMs = ancestor.get(pid) ?? new Map<string, number>()
        // Every color of ancestor must be <= dominated
        for (const [color, ancCount] of ancMs) {
          expect(domMs.get(color) ?? 0).toBeGreaterThanOrEqual(ancCount)
        }
        // Check for strict component
        for (const [color, domCount] of domMs) {
          if (domCount > (ancMs.get(color) ?? 0)) strictFound = true
        }
      }

      expect(strictFound, `${label}: witness must have at least one strictly greater component`).toBe(true)
      expect(v.unboundedPlaceIds.length, `${label}: must report at least one unbounded place`).toBeGreaterThan(0)
    }
  })

  it('bounded verdict is stable: calling KM twice gives the same result', () => {
    const net = cpn(
      [place('pA','A','unit-cs',"1`()"), place('pB','B','unit-cs',"0")],
      [transition('t1','T1'), transition('t2','T2')],
      [
        arcPT('a1','pA','t1',"1`x"), arcTP('a2','t1','pB',"1`x"),
        arcPT('a3','pB','t2',"1`x"), arcTP('a4','t2','pA',"1`x"),
      ],
      [UNIT_CS],
      [variable('vx','x','unit-cs')],
    )
    const v1 = checkUnboundednessKM(net)
    const v2 = checkUnboundednessKM(net)
    expect(v1.kind).toBe(v2.kind)
    expect(v1.kind).toBe('bounded')
  })

  it('unbounded verdict is stable: calling KM twice gives the same result', () => {
    const net = cpn(
      [place('pA','A','unit-cs','0')],
      [transition('t','P')],
      [arcTP('a','t','pA',"1`()")],
      [UNIT_CS],
    )
    const v1 = checkUnboundednessKM(net)
    const v2 = checkUnboundednessKM(net)
    expect(v1.kind).toBe(v2.kind)
    expect(v1.kind).toBe('unbounded')
  })
})
