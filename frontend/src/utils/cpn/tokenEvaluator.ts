/**
 * tokenEvaluator.ts
 *
 * Parses and evaluates CPN multiset expressions and guard expressions.
 *
 * Multiset syntax (CPN ML style):
 *   inscription ::= multiset_expr ("++" multiset_expr)*
 *   multiset_expr ::= count_expr "`" color_expr
 *                   | color_expr          // shorthand: 1 token
 *   count_expr    ::= <integer literal>
 *   color_expr    ::= <identifier> | <integer> | true | false
 *
 * Examples:
 *   "1`TOKEN"            → { TOKEN: 1 }
 *   "2`ACK ++ 1`SYN"     → { ACK: 2, SYN: 1 }
 *   "n`x"                → { [value_of_x]: value_of_n }  (variables resolved)
 *   "empty"              → {}
 */

//  Types

/** A multiset maps a color value (string key) to a non-negative count. */
export type Multiset = Map<string, number>;

/** Variable bindings: maps variable name → its current bound value (as string). */
export type Bindings = Record<string, string | number | boolean>;

//  Helpers

/** Merge (add) two multisets together. Mutates `base` in-place. */
export function addMultisets(base: Multiset, addition: Multiset): Multiset {
  for (const [color, count] of addition) {
    base.set(color, (base.get(color) ?? 0) + count);
  }
  return base;
}

/** Return true iff `sub` is a sub-multiset of `sup`. */
export function isSubMultiset(sub: Multiset, sup: Multiset): boolean {
  for (const [color, count] of sub) {
    if ((sup.get(color) ?? 0) < count) return false;
  }
  return true;
}

/** Subtract `sub` from `base` (assumes isSubMultiset is true). Mutates `base`. */
export function subtractMultiset(base: Multiset, sub: Multiset): Multiset {
  for (const [color, count] of sub) {
    const newCount = (base.get(color) ?? 0) - count;
    if (newCount <= 0) {
      base.delete(color);
    } else {
      base.set(color, newCount);
    }
  }
  return base;
}

/** Deep-clone a multiset. */
export function cloneMultiset(ms: Multiset): Multiset {
  return new Map(ms);
}

/** Convert a multiset to a human-readable string, e.g. "2`ACK ++ 1`SYN". */
export function multisetToString(ms: Multiset): string {
  if (ms.size === 0) return "empty";
  return [...ms.entries()]
    .map(([color, count]) => `${count}\`${color}`)
    .join(" ++ ");
}

/** Parse a single color expression token. Returns a string key for the multiset. */
function resolveColor(token: string, bindings: Bindings): string {
  const trimmed = token.trim();
  if (trimmed === "") throw new Error("Empty color expression");
  // If it's a known variable, substitute
  if (trimmed in bindings) {
    return String(bindings[trimmed]);
  }
  // Otherwise treat as a literal (integer, enum name, bool)
  return trimmed;
}

/** Evaluate a simple arithmetic expression consisting only of integer literals,
 *  variable references, +, -, *, /, and parentheses.
 *  Designed for count_expr evaluation.
 */
function evalArith(expr: string, bindings: Bindings): number {
  // Replace variable references with their numeric values
  let substituted = expr.trim();
  // Sort variable names longest-first to avoid partial replacement
  const varNames = Object.keys(bindings).sort((a, b) => b.length - a.length);
  for (const v of varNames) {
    const val = bindings[v];
    const numVal = Number(val);
    if (!Number.isNaN(numVal)) {
      substituted = substituted.replace(new RegExp(`\\b${v}\\b`, "g"), String(numVal));
    }
  }
  // Only allow safe numeric expression characters
  if (!/^[\d\s()+\-*/.]+$/.test(substituted)) {
    throw new Error(`Invalid expression: "${substituted}"`);
  }
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${substituted})`)();
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(`Count expression "${expr}" did not evaluate to a finite number`);
  }
  return Math.round(result);
}

//  Primary API

/**
 * Parse a CPN arc inscription into a Multiset.
 *
 * @param inscription  The inscription string, e.g. "2`ACK ++ 1`SYN"
 * @param bindings     Current variable bindings
 * @returns            The resulting multiset
 * @throws             If the inscription cannot be parsed
 */
export function parseInscription(inscription: string, bindings: Bindings = {}): Multiset {
  const result: Multiset = new Map();
  const trimmed = inscription.trim();

  if (trimmed === "" || trimmed.toLowerCase() === "empty") {
    return result;
  }

  // Split on "++" (multiset union operator)
  const parts = trimmed.split("++");

  for (const part of parts) {
    const p = part.trim();
    if (p === "") continue;

    const backtickIdx = p.indexOf("`");
    if (backtickIdx === -1) {
      // No backtick: shorthand for 1`<color>
      const color = resolveColor(p, bindings);
      result.set(color, (result.get(color) ?? 0) + 1);
    } else {
      const countPart = p.slice(0, backtickIdx);
      const colorPart = p.slice(backtickIdx + 1);
      const count = evalArith(countPart, bindings);
      if (count < 0) throw new Error(`Negative token count in inscription "${inscription}"`);
      if (count === 0) continue; // 0`x contributes nothing
      const color = resolveColor(colorPart, bindings);
      result.set(color, (result.get(color) ?? 0) + count);
    }
  }

  return result;
}

/**
 * Parse an initial marking string.
 * Same syntax as arc inscriptions, but 0 means empty
 */
export function parseInitialMarking(marking: string, bindings: Bindings = {}): Multiset {
  const trimmed = marking.trim();
  // 0 = empty marking
  if (trimmed === "0") return new Map();
  return parseInscription(marking, bindings);
}

/**
 * Evaluate a guard expression.
 *
 * Guards are boolean expressions without the backtick multiset syntax.
 * Supported: comparison operators (=, !=, <, <=, >, >=), logical operators
 * (&&, ||, !), integer arithmetic, variable references, true/false literals.
 *
 * @param guard     The guard expression string, e.g. "n > 0 && n < 8"
 * @param bindings  Current variable bindings
 * @returns         true if guard passes (or if guard is empty/undefined)
 */
export function evaluateGuard(guard: string | undefined, bindings: Bindings = {}): boolean {
  if (!guard || guard.trim() === "") return true;

  let expr = guard.trim();
  // Substitute variables (longest names first to avoid partial matches)
  const varNames = Object.keys(bindings).sort((a, b) => b.length - a.length);
  for (const v of varNames) {
    const val = bindings[v];
    let replacement: string;
    if (typeof val === "boolean") {
      replacement = String(val);
    } else if (typeof val === "number") {
      replacement = String(val);
    } else {
      // String value: if it looks like a boolean literal, substitute unquoted
      // so guards like "will == true" evaluate correctly.
      if (val === "true" || val === "false") {
        replacement = val;
      } else {
        // Wrap in quotes for string comparison expressions
        replacement = JSON.stringify(val);
      }
    }
    expr = expr.replace(new RegExp(`\\b${v}\\b`, "g"), replacement);
  }

  // Support CPN ML equality: single = is comparison, not assignment
  // Replace = with == but don't convert == to ===
  expr = expr.replace(/([^!=<>])=([^=])/g, "$1==$2");
  // Replace <> with !=
  expr = expr.replace(/<>/g, "!=");

  // Validate only safe guard characters
  if (!/^[\w\s"'()+\-*/.!=<>&|!,]+$/.test(expr)) {
    console.warn(`Potentially unsafe guard expression: "${guard}"`);
    return true; // fail-open: if we can't parse, allow the transition
  }

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return !!(${expr})`)();
    return Boolean(result);
  } catch {
    console.warn(`Failed to evaluate guard "${guard}": ${expr}`);
    return true; // fail-open
  }
}

/**
 * Count total tokens in a multiset (sum of all counts).
 */
export function totalTokens(ms: Multiset): number {
  let sum = 0;
  for (const count of ms.values()) sum += count;
  return sum;
}
