import { describe, it, expect } from 'vitest';
import { evaluateGuard, executeAction, parseGuardExpression } from '../guardEvaluator';
import type { EFSMVariable } from '@/contracts/models';

//  helpers

function intVar(name: string, min = 0, max = 100): EFSMVariable {
  return { id: name, name, type: 'int', minValue: min, maxValue: max };
}

function boolVar(name: string): EFSMVariable {
  return { id: name, name, type: 'bool' };
}

function enumVar(name: string, values: string[]): EFSMVariable {
  return { id: name, name, type: 'enum', enumValues: values };
}

//  evaluateGuard

describe('evaluateGuard', () => {
  it('returns true for empty expression', () => {
    expect(evaluateGuard('', {}, [])).toBe(true);
  });

  it('returns true for whitespace-only expression', () => {
    expect(evaluateGuard('   ', {}, [])).toBe(true);
  });

  it('evaluates simple numeric comparison (true)', () => {
    const vars = [intVar('n', 0, 10)];
    expect(evaluateGuard('n > 3', { n: 5 }, vars)).toBe(true);
  });

  it('evaluates simple numeric comparison (false)', () => {
    const vars = [intVar('n', 0, 10)];
    expect(evaluateGuard('n > 3', { n: 2 }, vars)).toBe(false);
  });

  it('coerces boolean true variable to 1 for numeric comparisons', () => {
    const vars = [boolVar('flag')];
    expect(evaluateGuard('flag == 1', { flag: true }, vars)).toBe(true);
  });

  it('coerces boolean false variable to 0 for numeric comparisons', () => {
    const vars = [boolVar('flag')];
    expect(evaluateGuard('flag == 1', { flag: false }, vars)).toBe(false);
  });

  it('coerces boolean in inequality comparison', () => {
    const vars = [boolVar('active')];
    expect(evaluateGuard('active > 0', { active: true }, vars)).toBe(true);
    expect(evaluateGuard('active > 0', { active: false }, vars)).toBe(false);
  });

  it('returns unknown for variable not in variable list', () => {
    const vars = [intVar('n')];
    expect(evaluateGuard('x > 0', { n: 5 }, vars)).toBe('unknown');
  });

  it('returns unknown when variable in list but missing from state', () => {
    const vars = [intVar('n'), intVar('m')];
    // m is defined but has no value in the state
    expect(evaluateGuard('m > 0', { n: 5 }, vars)).toBe('unknown');
  });

  it('returns unknown for invalid expression syntax', () => {
    const vars = [intVar('n')];
    expect(evaluateGuard('n >>>>', { n: 5 }, vars)).toBe('unknown');
  });

  it('evaluates compound AND expression', () => {
    const vars = [intVar('n'), intVar('k')];
    expect(evaluateGuard('n > 0 and k < 10', { n: 1, k: 5 }, vars)).toBe(true);
    expect(evaluateGuard('n > 0 and k < 10', { n: 1, k: 15 }, vars)).toBe(false);
  });

  it('evaluates not-equal comparison', () => {
    const vars = [intVar('n')];
    expect(evaluateGuard('n != 0', { n: 1 }, vars)).toBe(true);
    expect(evaluateGuard('n != 0', { n: 0 }, vars)).toBe(false);
  });
});

//  executeAction

describe('executeAction', () => {
  it('returns unchanged state for empty action', () => {
    expect(executeAction('', { n: 5 }, [intVar('n')])).toEqual({ n: 5 });
  });

  it('returns unchanged state for whitespace-only action', () => {
    expect(executeAction('   ', { n: 5 }, [intVar('n')])).toEqual({ n: 5 });
  });

  it('assigns the result of an integer expression', () => {
    const vars = [intVar('n', 0, 100)];
    const result = executeAction('n = n + 1', { n: 5 }, vars);
    expect(result.n).toBe(6);
  });

  it('applies multiple semicolon-separated assignments', () => {
    const vars = [intVar('n', 0, 100), intVar('k', 0, 100)];
    const result = executeAction('n = n + 1; k = k - 1', { n: 3, k: 7 }, vars);
    expect(result.n).toBe(4);
    expect(result.k).toBe(6);
  });

  it('clamps integer value at maxValue', () => {
    const vars = [intVar('n', 0, 10)];
    const result = executeAction('n = 15', { n: 5 }, vars);
    expect(result.n).toBe(10);
  });

  it('clamps integer value at minValue', () => {
    const vars = [intVar('n', 0, 10)];
    const result = executeAction('n = -5', { n: 5 }, vars);
    expect(result.n).toBe(0);
  });

  it('assigns boolean true when result is truthy', () => {
    const vars = [boolVar('flag')];
    const result = executeAction('flag = 1', { flag: false }, vars);
    expect(result.flag).toBe(true);
  });

  it('assigns boolean false when result is falsy', () => {
    const vars = [boolVar('flag')];
    const result = executeAction('flag = 0', { flag: true }, vars);
    expect(result.flag).toBe(false);
  });

  it('returns unchanged state for invalid expression (no-op)', () => {
    const vars = [intVar('n')];
    const result = executeAction('n = !!!', { n: 5 }, vars);
    expect(result.n).toBe(5);
  });

  it('returns unchanged state for assignment to undefined variable', () => {
    const vars = [intVar('n')];
    const result = executeAction('x = 10', { n: 5 }, vars);
    expect(result).toEqual({ n: 5 });
  });

  it('does not mutate the original state object', () => {
    const vars = [intVar('n', 0, 100)];
    const original = { n: 5 };
    const result = executeAction('n = 10', original, vars);
    expect(original.n).toBe(5);
    expect(result.n).toBe(10);
  });
});

//  parseGuardExpression

describe('parseGuardExpression', () => {
  it('returns valid for empty expression', () => {
    const result = parseGuardExpression('', []);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.variables).toHaveLength(0);
  });

  it('returns valid and lists variables for well-formed expression', () => {
    const vars = [intVar('n'), intVar('k')];
    const result = parseGuardExpression('n > k', vars);
    expect(result.isValid).toBe(true);
    expect(result.variables).toContain('n');
    expect(result.variables).toContain('k');
  });

  it('returns invalid and adds error for undefined variable', () => {
    const vars = [intVar('n')];
    const result = parseGuardExpression('x > 0', vars);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('x'))).toBe(true);
    expect(result.warnings.some(w => w.type === 'undefined_variable')).toBe(true);
  });

  it('returns invalid and adds error for parse failure', () => {
    const result = parseGuardExpression('n >>>>', [intVar('n')]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/parse error/i);
  });

  it('is valid when all referenced variables are defined', () => {
    const vars = [intVar('a'), intVar('b'), intVar('c')];
    const result = parseGuardExpression('a + b > c', vars);
    expect(result.isValid).toBe(true);
  });
});
