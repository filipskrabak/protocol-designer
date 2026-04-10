import { describe, it, expect } from 'vitest';
import { findDeadStates, findUnreachableStates, validateStructure, getAllEvents, getStatesWithEvent } from '../validation';
import type { FSMAnalysisNode, FSMAnalysisEdge } from '@/contracts/models';

// helpers

function node(id: string, type: 'initial' | 'normal' | 'final' = 'normal'): FSMAnalysisNode {
  return { id, data: { label: id, type } };
}

function edge(id: string, source: string, target: string, event?: string): FSMAnalysisEdge {
  return { id, source, target, data: { event } };
}

// findDeadStates

describe('findDeadStates', () => {
  it('returns empty when all non-final states have outgoing transitions', () => {
    const nodes = [node('s0', 'initial'), node('s1'), node('s2', 'final')];
    const edges = [edge('e1', 's0', 's1'), edge('e2', 's1', 's2')];
    expect(findDeadStates(nodes, edges)).toHaveLength(0);
  });

  it('identifies non-final state with no outgoing transition', () => {
    // s0→s1→s2 chain; s2 has no outgoing edge → dead
    const nodes = [node('s0', 'initial'), node('s1'), node('s2')];
    const edges = [edge('e1', 's0', 's1'), edge('e2', 's1', 's2')];
    const dead = findDeadStates(nodes, edges);
    expect(dead.map(d => d.id)).toContain('s2');
    expect(dead.map(d => d.id)).not.toContain('s0');
    expect(dead.map(d => d.id)).not.toContain('s1');
  });

  it('does not flag final states as dead even with no outgoing transitions', () => {
    const nodes = [node('s0', 'initial'), node('s1', 'final')];
    const edges = [edge('e1', 's0', 's1')];
    expect(findDeadStates(nodes, edges)).toHaveLength(0);
  });

  it('flags initial state as dead when it has no outgoing transitions', () => {
    const nodes = [node('s0', 'initial')];
    const dead = findDeadStates(nodes, []);
    expect(dead.map(d => d.id)).toContain('s0');
  });

  it('uses node label in the result', () => {
    const n = { id: 's0', data: { label: 'MyState', type: 'normal' as const } };
    const dead = findDeadStates([n], []);
    expect(dead[0].label).toBe('MyState');
  });

  it('falls back to id when label is missing', () => {
    const n: FSMAnalysisNode = { id: 's0' };
    const dead = findDeadStates([n], []);
    expect(dead[0].label).toBe('s0');
  });
});

// findUnreachableStates

describe('findUnreachableStates', () => {
  it('returns empty when all states are reachable from initial', () => {
    const nodes = [node('s0', 'initial'), node('s1'), node('s2', 'final')];
    const edges = [edge('e1', 's0', 's1'), edge('e2', 's1', 's2')];
    expect(findUnreachableStates(nodes, edges)).toHaveLength(0);
  });

  it('identifies isolated state not reachable from initial', () => {
    const nodes = [node('s0', 'initial'), node('s1'), node('s2')];
    const edges = [edge('e1', 's0', 's1')]; // s2 has no incoming edge
    const unreachable = findUnreachableStates(nodes, edges);
    expect(unreachable.map(u => u.id)).toContain('s2');
    expect(unreachable.map(u => u.id)).not.toContain('s0');
    expect(unreachable.map(u => u.id)).not.toContain('s1');
  });

  it('returns all states when no initial state exists', () => {
    const nodes = [node('s0'), node('s1')];
    const edges = [edge('e1', 's0', 's1')];
    const unreachable = findUnreachableStates(nodes, edges);
    expect(unreachable).toHaveLength(2);
  });

  it('combines reachability from multiple initial states', () => {
    // s0 → s2, s1 (another initial) → s3; s4 is isolated
    const nodes = [
      node('s0', 'initial'), node('s1', 'initial'),
      node('s2'), node('s3'), node('s4'),
    ];
    const edges = [edge('e1', 's0', 's2'), edge('e2', 's1', 's3')];
    const unreachable = findUnreachableStates(nodes, edges);
    expect(unreachable.map(u => u.id)).toContain('s4');
    expect(unreachable.map(u => u.id)).not.toContain('s2');
    expect(unreachable.map(u => u.id)).not.toContain('s3');
  });

  it('handles transitive reachability (multi-hop)', () => {
    const nodes = [node('s0', 'initial'), node('s1'), node('s2'), node('s3')];
    const edges = [edge('e1', 's0', 's1'), edge('e2', 's1', 's2'), edge('e3', 's2', 's3')];
    expect(findUnreachableStates(nodes, edges)).toHaveLength(0);
  });
});

// validateStructure

describe('validateStructure', () => {
  it('reports correct counts for a well-formed FSM', () => {
    const nodes = [node('s0', 'initial'), node('s1'), node('s2', 'final')];
    const result = validateStructure(nodes);
    expect(result.hasInitialState).toBe(true);
    expect(result.hasFinalState).toBe(true);
    expect(result.initialStateCount).toBe(1);
    expect(result.finalStateCount).toBe(1);
  });

  it('detects missing initial state', () => {
    const nodes = [node('s0'), node('s1', 'final')];
    const result = validateStructure(nodes);
    expect(result.hasInitialState).toBe(false);
    expect(result.initialStateCount).toBe(0);
  });

  it('detects missing final state', () => {
    const nodes = [node('s0', 'initial'), node('s1')];
    const result = validateStructure(nodes);
    expect(result.hasFinalState).toBe(false);
    expect(result.finalStateCount).toBe(0);
  });

  it('reports multiple initial states', () => {
    const nodes = [node('s0', 'initial'), node('s1', 'initial'), node('s2', 'final')];
    const result = validateStructure(nodes);
    expect(result.hasInitialState).toBe(true);
    expect(result.initialStateCount).toBe(2);
  });

  it('handles empty node list gracefully', () => {
    const result = validateStructure([]);
    expect(result.hasInitialState).toBe(false);
    expect(result.hasFinalState).toBe(false);
    expect(result.initialStateCount).toBe(0);
    expect(result.finalStateCount).toBe(0);
  });
});

// getAllEvents

describe('getAllEvents', () => {
  it('returns empty set when there are no edges', () => {
    expect(getAllEvents([])).toEqual(new Set());
  });

  it('collects unique event names', () => {
    const edges = [
      edge('e1', 's0', 's1', 'CONNECT'),
      edge('e2', 's1', 's2', 'DATA'),
      edge('e3', 's2', 's0', 'CONNECT'), // duplicate
    ];
    const events = getAllEvents(edges);
    expect(events.size).toBe(2);
    expect(events.has('CONNECT')).toBe(true);
    expect(events.has('DATA')).toBe(true);
  });

  it('ignores edges with no event', () => {
    const edges = [edge('e1', 's0', 's1', undefined), edge('e2', 's1', 's2', 'ACK')];
    const events = getAllEvents(edges);
    expect(events.has('ACK')).toBe(true);
    expect(events.size).toBe(1);
  });
});

// getStatesWithEvent

describe('getStatesWithEvent', () => {
  it('returns source states that can trigger the given event', () => {
    const edges = [
      edge('e1', 's0', 's1', 'CONNECT'),
      edge('e2', 's1', 's2', 'DATA'),
      edge('e3', 's2', 's0', 'CONNECT'),
    ];
    const states = getStatesWithEvent(edges, 'CONNECT');
    expect(states.has('s0')).toBe(true);
    expect(states.has('s2')).toBe(true);
    expect(states.has('s1')).toBe(false);
  });

  it('returns empty set when no edge has the event', () => {
    const edges = [edge('e1', 's0', 's1', 'DATA')];
    expect(getStatesWithEvent(edges, 'NONSUCH').size).toBe(0);
  });
});
