import { describe, it, expect } from 'vitest';
import {
  parseInscription,
  parseInitialMarking,
  evaluateGuard,
  addMultisets,
  isSubMultiset,
  subtractMultiset,
  cloneMultiset,
  multisetToString,
  type Multiset,
} from '../tokenEvaluator';

//  parseInscription

describe('parseInscription', () => {
  it('returns empty multiset for empty string', () => {
    expect(parseInscription('')).toEqual(new Map());
  });

  it('returns empty multiset for "empty"', () => {
    expect(parseInscription('empty')).toEqual(new Map());
  });

  it('returns empty multiset for "EMPTY" (case-insensitive)', () => {
    expect(parseInscription('EMPTY')).toEqual(new Map());
  });

  it('parses shorthand single token without count', () => {
    const ms = parseInscription('TOKEN');
    expect(ms.get('TOKEN')).toBe(1);
    expect(ms.size).toBe(1);
  });

  it('parses backtick count`color syntax', () => {
    const ms = parseInscription('3`ACK');
    expect(ms.get('ACK')).toBe(3);
    expect(ms.size).toBe(1);
  });

  it('parses multiset union with ++ operator', () => {
    const ms = parseInscription('2`ACK ++ 1`SYN');
    expect(ms.get('ACK')).toBe(2);
    expect(ms.get('SYN')).toBe(1);
    expect(ms.size).toBe(2);
  });

  it('merges counts when same color appears multiple times', () => {
    const ms = parseInscription('1`A ++ 2`A');
    expect(ms.get('A')).toBe(3);
    expect(ms.size).toBe(1);
  });

  it('evaluates count expression with variable binding', () => {
    const ms = parseInscription('n`TOKEN', { n: 4 });
    expect(ms.get('TOKEN')).toBe(4);
  });

  it('resolves color from string variable binding', () => {
    const ms = parseInscription('1`x', { x: 'RED' });
    expect(ms.get('RED')).toBe(1);
  });

  it('ignores 0-count parts (0`color contributes nothing)', () => {
    const ms = parseInscription('0`A ++ 1`B');
    expect(ms.has('A')).toBe(false);
    expect(ms.get('B')).toBe(1);
  });

  it('evaluates arithmetic in count expression', () => {
    const ms = parseInscription('(1+2)`X');
    expect(ms.get('X')).toBe(3);
  });

  it('throws for negative token count', () => {
    expect(() => parseInscription('-1`A')).toThrow();
  });

  it('parses unit token ()', () => {
    const ms = parseInscription('1`()');
    expect(ms.get('()')).toBe(1);
  });
});

// parseInitialMarking

describe('parseInitialMarking', () => {
  it('returns empty multiset for "0"', () => {
    expect(parseInitialMarking('0')).toEqual(new Map());
  });

  it('returns empty multiset for "empty"', () => {
    expect(parseInitialMarking('empty')).toEqual(new Map());
  });

  it('parses non-zero initial marking', () => {
    const ms = parseInitialMarking('2`ACK');
    expect(ms.get('ACK')).toBe(2);
  });

  it('parses unit initial marking', () => {
    const ms = parseInitialMarking('1`()');
    expect(ms.get('()')).toBe(1);
  });
});

// evaluateGuard (CPN version)

describe('evaluateGuard (CPN)', () => {
  it('returns true for empty guard', () => {
    expect(evaluateGuard('')).toBe(true);
  });

  it('returns true for undefined guard', () => {
    expect(evaluateGuard(undefined)).toBe(true);
  });

  it('evaluates simple numeric comparison (true)', () => {
    expect(evaluateGuard('n > 3', { n: 5 })).toBe(true);
  });

  it('evaluates simple numeric comparison (false)', () => {
    expect(evaluateGuard('n > 3', { n: 2 })).toBe(false);
  });

  it('evaluates AND compound expression', () => {
    expect(evaluateGuard('n > 0 && n < 10', { n: 5 })).toBe(true);
    expect(evaluateGuard('n > 0 && n < 10', { n: 0 })).toBe(false);
    expect(evaluateGuard('n > 0 && n < 10', { n: 10 })).toBe(false);
  });

  it('evaluates OR compound expression', () => {
    expect(evaluateGuard('n == 0 || n == 5', { n: 5 })).toBe(true);
    expect(evaluateGuard('n == 0 || n == 5', { n: 3 })).toBe(false);
  });

  it('substitutes boolean variables correctly', () => {
    expect(evaluateGuard('flag', { flag: true })).toBe(true);
    expect(evaluateGuard('flag', { flag: false })).toBe(false);
  });

  it('handles CPN ML single = as equality (not assignment)', () => {
    // CPN ML uses = for comparison; the function rewrites it to ==
    expect(evaluateGuard('n = 5', { n: 5 })).toBe(true);
    expect(evaluateGuard('n = 5', { n: 3 })).toBe(false);
  });

  it('handles <> as not-equal', () => {
    expect(evaluateGuard('n <> 0', { n: 1 })).toBe(true);
    expect(evaluateGuard('n <> 0', { n: 0 })).toBe(false);
  });
});

// addMultisets

describe('addMultisets', () => {
  it('merges disjoint multisets in-place', () => {
    const a: Multiset = new Map([['A', 1]]);
    const b: Multiset = new Map([['B', 2]]);
    addMultisets(a, b);
    expect(a.get('A')).toBe(1);
    expect(a.get('B')).toBe(2);
  });

  it('sums overlapping entries', () => {
    const a: Multiset = new Map([['A', 2]]);
    const b: Multiset = new Map([['A', 3]]);
    addMultisets(a, b);
    expect(a.get('A')).toBe(5);
  });

  it('mutates base and returns it', () => {
    const a: Multiset = new Map([['X', 1]]);
    const returned = addMultisets(a, new Map([['X', 2]]));
    expect(returned).toBe(a); // same reference
    expect(a.get('X')).toBe(3);
  });

  it('handles empty addition multiset', () => {
    const a: Multiset = new Map([['A', 1]]);
    addMultisets(a, new Map());
    expect(a.get('A')).toBe(1);
    expect(a.size).toBe(1);
  });
});

// isSubMultiset

describe('isSubMultiset', () => {
  it('returns true when sub is a proper subset', () => {
    const sub: Multiset = new Map([['A', 1]]);
    const sup: Multiset = new Map([['A', 3], ['B', 1]]);
    expect(isSubMultiset(sub, sup)).toBe(true);
  });

  it('returns true for equal multisets', () => {
    const ms: Multiset = new Map([['A', 2], ['B', 1]]);
    expect(isSubMultiset(ms, new Map([['A', 2], ['B', 1]]))).toBe(true);
  });

  it('returns false when count exceeds', () => {
    const sub: Multiset = new Map([['A', 5]]);
    const sup: Multiset = new Map([['A', 3]]);
    expect(isSubMultiset(sub, sup)).toBe(false);
  });

  it('returns false for missing key', () => {
    const sub: Multiset = new Map([['B', 1]]);
    const sup: Multiset = new Map([['A', 3]]);
    expect(isSubMultiset(sub, sup)).toBe(false);
  });

  it('empty multiset is always a subset of any multiset', () => {
    expect(isSubMultiset(new Map(), new Map([['A', 1]]))).toBe(true);
    expect(isSubMultiset(new Map(), new Map())).toBe(true);
  });
});

// subtractMultiset

describe('subtractMultiset', () => {
  it('removes elements from base in-place', () => {
    const base: Multiset = new Map([['A', 3], ['B', 2]]);
    subtractMultiset(base, new Map([['A', 1]]));
    expect(base.get('A')).toBe(2);
    expect(base.get('B')).toBe(2);
  });

  it('deletes key when count reaches 0', () => {
    const base: Multiset = new Map([['A', 1]]);
    subtractMultiset(base, new Map([['A', 1]]));
    expect(base.has('A')).toBe(false);
  });

  it('deletes key when result would be negative (treated as empty)', () => {
    const base: Multiset = new Map([['A', 2]]);
    subtractMultiset(base, new Map([['A', 3]]));
    expect(base.has('A')).toBe(false);
  });

  it('mutates base and returns it', () => {
    const base: Multiset = new Map([['A', 3]]);
    const returned = subtractMultiset(base, new Map([['A', 1]]));
    expect(returned).toBe(base);
    expect(base.get('A')).toBe(2);
  });
});

// cloneMultiset

describe('cloneMultiset', () => {
  it('creates an independent copy', () => {
    const original: Multiset = new Map([['A', 2], ['B', 1]]);
    const clone = cloneMultiset(original);
    clone.set('A', 99);
    expect(original.get('A')).toBe(2); // original is unchanged
  });

  it('clone has same entries as original', () => {
    const original: Multiset = new Map([['X', 3]]);
    const clone = cloneMultiset(original);
    expect(clone.get('X')).toBe(3);
  });
});

// multisetToString

describe('multisetToString', () => {
  it('returns "empty" for empty multiset', () => {
    expect(multisetToString(new Map())).toBe('empty');
  });

  it('formats single entry correctly', () => {
    expect(multisetToString(new Map([['ACK', 2]]))).toBe('2`ACK');
  });

  it('produces count`color format for each entry', () => {
    const result = multisetToString(new Map([['A', 1], ['B', 3]]));
    expect(result).toContain('1`A');
    expect(result).toContain('3`B');
    expect(result).toContain('++');
  });
});
