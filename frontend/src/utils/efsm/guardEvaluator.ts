// Guard Expression Parser and Evaluator using expr-eval

import * as ExprEval from 'expr-eval';
import type { EFSMVariable, VariableState, GuardWarning, Field, ProtocolFieldCondition } from '@/contracts/models';

const { Parser } = ExprEval;

/**
 * Parse and validate a guard expression
 */
export function parseGuardExpression(expression: string, variables: EFSMVariable[]): {
  isValid: boolean;
  errors: string[];
  warnings: GuardWarning[];
  variables: string[];
} {
  const errors: string[] = [];
  const warnings: GuardWarning[] = [];
  const usedVariables: Set<string> = new Set();

  if (!expression || expression.trim() === '') {
    return { isValid: true, errors: [], warnings: [], variables: [] };
  }

  try {
    const parser = new Parser();
    const parsedExpression = parser.parse(expression);

    // Get all variables used in the expression
    const exprVariables = parsedExpression.variables();

    // Validate that all variables exist
    const variableMap = new Map(variables.map(v => [v.name, v]));

    for (const varName of exprVariables) {
      usedVariables.add(varName);

      if (!variableMap.has(varName)) {
        errors.push(`Undefined variable: ${varName}`);
        warnings.push({
          type: 'undefined_variable',
          severity: 'error',
          location: {
            variableName: varName,
            expression
          },
          message: `Variable '${varName}' is not defined`,
          suggestion: `Define variable '${varName}' in the EFSM variables panel`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      variables: Array.from(usedVariables)
    };
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    warnings.push({
      type: 'invalid_expression',
      severity: 'error',
      location: { expression },
      message: `Invalid expression: ${error instanceof Error ? error.message : String(error)}`,
      suggestion: 'Check syntax and variable names'
    });

    return {
      isValid: false,
      errors,
      warnings,
      variables: []
    };
  }
}

/**
 * Evaluate a guard expression with given variable values
 */
export function evaluateGuard(
  expression: string | any,
  variableValues: VariableState,
  variables: EFSMVariable[]
): boolean | 'unknown' {
  // Convert to string and check
  const exprStr = typeof expression === 'string' ? expression : '';
  if (!exprStr || exprStr.trim() === '') {
    return true; // Empty guard is always true
  }

  try {
    const parser = new Parser();
    const parsedExpression = parser.parse(exprStr);

    // Validate all variables are defined
    const exprVariables = parsedExpression.variables();
    const variableMap = new Map(variables.map(v => [v.name, v]));

    for (const varName of exprVariables) {
      if (!variableMap.has(varName)) {
        console.warn(`Guard evaluation: undefined variable ${varName}`);
        return 'unknown';
      }

      if (!(varName in variableValues)) {
        console.warn(`Guard evaluation: no value for variable ${varName}`);
        return 'unknown';
      }
    }

    // Evaluate the expression
    const result = parsedExpression.evaluate(variableValues);

    // Convert result to boolean
    return Boolean(result);
  } catch (error) {
    console.error(`Guard evaluation error: ${error}`);
    return 'unknown';
  }
}

/**
 * Build guard expression from protocol field conditions
 */
export function buildGuardFromProtocolConditions(
  conditions: ProtocolFieldCondition[],
  fields: Field[]
): string {
  if (!conditions || conditions.length === 0) {
    return '';
  }

  const fieldMap = new Map(fields.map(f => [f.id, f]));
  const expressions: string[] = [];

  for (const condition of conditions) {
    const field = fieldMap.get(condition.field_id);
    if (!field) continue;

    const fieldName = sanitizeVariableName(field.display_name);
    let value: string;

    if (condition.field_option_name) {
      // Reference a specific field option
      const option = field.field_options?.find(opt => opt.name === condition.field_option_name);
      value = option ? String(option.value) : String(condition.value ?? 0);
    } else {
      value = String(condition.value ?? 0);
    }

    // Build expression based on operator
    switch (condition.operator) {
      case 'equals':
        expressions.push(`${fieldName} == ${value}`);
        break;
      case 'not_equals':
        expressions.push(`${fieldName} != ${value}`);
        break;
      case 'greater_than':
        expressions.push(`${fieldName} > ${value}`);
        break;
      case 'less_than':
        expressions.push(`${fieldName} < ${value}`);
        break;
      case 'greater_or_equal':
        expressions.push(`${fieldName} >= ${value}`);
        break;
      case 'less_or_equal':
        expressions.push(`${fieldName} <= ${value}`);
        break;
    }
  }

  return expressions.join(' && ');
}

/**
 * Parse action expression and extract variable assignments
 */
export function parseActionExpression(action: string, variables: EFSMVariable[]): {
  isValid: boolean;
  errors: string[];
  warnings: GuardWarning[];
  assignments: Array<{ variable: string; expression: string }>;
} {
  const errors: string[] = [];
  const warnings: GuardWarning[] = [];
  const assignments: Array<{ variable: string; expression: string }> = [];

  if (!action || action.trim() === '') {
    return { isValid: true, errors: [], warnings, assignments: [] };
  }

  const variableMap = new Map(variables.map(v => [v.name, v]));

  // Split by semicolon to handle multiple assignments
  const statements = action.split(';').map(s => s.trim()).filter(s => s.length > 0);

  for (const statement of statements) {
    // Parse assignment: variable = expression
    const assignMatch = statement.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)\s*$/);

    if (!assignMatch) {
      errors.push(`Invalid assignment: ${statement}`);
      warnings.push({
        type: 'invalid_expression',
        severity: 'error',
        location: { expression: statement },
        message: `Invalid action statement: ${statement}`,
        suggestion: 'Actions should be in format: variable = expression'
      });
      continue;
    }

    const [, varName, expr] = assignMatch;

    // Check if variable exists
    if (!variableMap.has(varName)) {
      errors.push(`Undefined variable in assignment: ${varName}`);
      warnings.push({
        type: 'undefined_variable',
        severity: 'error',
        location: { variableName: varName, expression: statement },
        message: `Variable '${varName}' is not defined`,
        suggestion: `Define variable '${varName}' before using it in actions`
      });
      continue;
    }

    // Validate the expression on the right side
    const parseResult = parseGuardExpression(expr, variables);
    if (!parseResult.isValid) {
      errors.push(...parseResult.errors);
      warnings.push(...parseResult.warnings);
      continue;
    }

    assignments.push({ variable: varName, expression: expr });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    assignments
  };
}

/**
 * Execute action expression and update variable values
 */
export function executeAction(
  action: string | any,
  currentState: VariableState,
  variables: EFSMVariable[]
): VariableState {
  const newState = { ...currentState };

  // Convert to string and check
  const actionStr = typeof action === 'string' ? action : '';
  if (!actionStr || actionStr.trim() === '') {
    return newState;
  }

  const parseResult = parseActionExpression(actionStr, variables);
  if (!parseResult.isValid) {
    console.warn(`Action execution failed: ${parseResult.errors.join(', ')}`);
    return newState;
  }

  const parser = new Parser();
  const variableMap = new Map(variables.map(v => [v.name, v]));

  for (const { variable, expression } of parseResult.assignments) {
    try {
      const parsedExpr = parser.parse(expression);
      const result = parsedExpr.evaluate(currentState);

      // Type checking and bounds checking
      const varDef = variableMap.get(variable);
      if (!varDef) continue;

      switch (varDef.type) {
        case 'int':
          const intValue = Math.floor(Number(result));
          if (varDef.minValue !== undefined && intValue < varDef.minValue) {
            console.warn(`Variable ${variable} underflow: ${intValue} < ${varDef.minValue}`);
            newState[variable] = varDef.minValue;
          } else if (varDef.maxValue !== undefined && intValue > varDef.maxValue) {
            console.warn(`Variable ${variable} overflow: ${intValue} > ${varDef.maxValue}`);
            newState[variable] = varDef.maxValue;
          } else {
            newState[variable] = intValue;
          }
          break;

        case 'bool':
          newState[variable] = Boolean(result);
          break;

        case 'enum':
          const strValue = String(result);
          if (varDef.enumValues?.includes(strValue)) {
            newState[variable] = strValue;
          } else {
            console.warn(`Invalid enum value for ${variable}: ${strValue}`);
          }
          break;
      }
    } catch (error) {
      console.error(`Action execution error for ${variable}: ${error}`);
    }
  }

  return newState;
}

/**
 * Sanitize field name to valid variable name
 */
function sanitizeVariableName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&');
}

/**
 * Get initial variable state from variable definitions
 */
export function getInitialVariableState(variables: EFSMVariable[]): VariableState {
  const state: VariableState = {};

  for (const variable of variables) {
    if (variable.initialValue !== undefined) {
      state[variable.name] = variable.initialValue;
    } else {
      // Set default initial values
      switch (variable.type) {
        case 'int':
          state[variable.name] = variable.minValue ?? 0;
          break;
        case 'bool':
          state[variable.name] = false;
          break;
        case 'enum':
          state[variable.name] = variable.enumValues?.[0] ?? '';
          break;
      }
    }
  }

  return state;
}
