// Variable Analysis and Constraint Checking for EFSM

import type {
  EFSMVariable,
  FSMEdge,
  FSMNode,
  GuardWarning,
  VariableState,
} from '@/contracts/models';
import { parseGuardExpression, parseActionExpression, evaluateGuard } from './guardEvaluator';

/**
 * Analyze all guards and actions in the FSM for potential issues
 */
export function analyzeEFSM(
  nodes: FSMNode[],
  edges: FSMEdge[],
  variables: EFSMVariable[]
): {
  warnings: GuardWarning[];
  stats: {
    totalGuards: number;
    totalActions: number;
    validGuards: number;
    validActions: number;
    undefinedVariableReferences: number;
    potentialOverflows: number;
    contradictions: number;
  };
} {
  const warnings: GuardWarning[] = [];
  const stats = {
    totalGuards: 0,
    totalActions: 0,
    validGuards: 0,
    validActions: 0,
    undefinedVariableReferences: 0,
    potentialOverflows: 0,
    contradictions: 0,
  };

  // Validate variable definitions
  warnings.push(...validateVariableDefinitions(variables));

  // Analyze each transition
  for (const edge of edges) {
    const guard = typeof edge.data?.condition === 'string' ? edge.data.condition : '';
    const action = typeof edge.data?.action === 'string' ? edge.data.action : '';

    // Analyze guard
    if (guard && guard.trim()) {
      stats.totalGuards++;
      const guardResult = parseGuardExpression(guard, variables);

      if (guardResult.isValid) {
        stats.validGuards++;
      } else {
        warnings.push(...guardResult.warnings.map(w => ({
          ...w,
          location: {
            ...w.location,
            transitionId: edge.id,
          }
        })));
        stats.undefinedVariableReferences += guardResult.warnings.filter(
          w => w.type === 'undefined_variable'
        ).length;
      }

      // Check for potential contradictions
      const contradictionWarnings = checkGuardContradictions(guard, variables, edge.id);
      warnings.push(...contradictionWarnings);
      stats.contradictions += contradictionWarnings.length;
    }

    // Analyze action
    if (action && action.trim()) {
      stats.totalActions++;
      const actionResult = parseActionExpression(action, variables);

      if (actionResult.isValid) {
        stats.validActions++;
      } else {
        warnings.push(...actionResult.warnings.map(w => ({
          ...w,
          location: {
            ...w.location,
            transitionId: edge.id,
          }
        })));
        stats.undefinedVariableReferences += actionResult.warnings.filter(
          w => w.type === 'undefined_variable'
        ).length;
      }

      // Check for potential overflows/underflows
      const overflowWarnings = checkActionOverflows(action, variables, edge.id);
      warnings.push(...overflowWarnings);
      stats.potentialOverflows += overflowWarnings.length;
    }
  }

  // Check for unreachable transitions due to guards
  const unreachableWarnings = findUnreachableTransitions(nodes, edges, variables);
  warnings.push(...unreachableWarnings);

  return { warnings, stats };
}

/**
 * Validate variable definitions for completeness
 */
function validateVariableDefinitions(variables: EFSMVariable[]): GuardWarning[] {
  const warnings: GuardWarning[] = [];
  const nameSet = new Set<string>();

  for (const variable of variables) {
    // Check for duplicate names
    if (nameSet.has(variable.name)) {
      warnings.push({
        type: 'ambiguous',
        severity: 'error',
        location: { variableName: variable.name },
        message: `Duplicate variable name: ${variable.name}`,
        suggestion: 'Variable names must be unique'
      });
    }
    nameSet.add(variable.name);

    // Check type-specific requirements
    switch (variable.type) {
      case 'int':
        if (variable.minValue === undefined || variable.maxValue === undefined) {
          warnings.push({
            type: 'unbounded',
            severity: 'error',
            location: { variableName: variable.name },
            message: `Integer variable ${variable.name} must have min and max bounds`,
            suggestion: 'Set minValue and maxValue for integer variables'
          });
        } else if (variable.minValue > variable.maxValue) {
          warnings.push({
            type: 'contradiction',
            severity: 'error',
            location: { variableName: variable.name },
            message: `Integer variable ${variable.name} has invalid bounds: min > max`,
            suggestion: 'Ensure minValue <= maxValue'
          });
        }

        // Check if initial value is within bounds
        if (variable.initialValue !== undefined) {
          const initVal = Number(variable.initialValue);
          if (variable.minValue !== undefined && initVal < variable.minValue) {
            warnings.push({
              type: 'underflow',
              severity: 'warning',
              location: { variableName: variable.name },
              message: `Initial value ${initVal} is less than minimum ${variable.minValue}`,
              suggestion: 'Set initial value within bounds'
            });
          }
          if (variable.maxValue !== undefined && initVal > variable.maxValue) {
            warnings.push({
              type: 'overflow',
              severity: 'warning',
              location: { variableName: variable.name },
              message: `Initial value ${initVal} exceeds maximum ${variable.maxValue}`,
              suggestion: 'Set initial value within bounds'
            });
          }
        }
        break;

      case 'enum':
        if (!variable.enumValues || variable.enumValues.length === 0) {
          warnings.push({
            type: 'unbounded',
            severity: 'error',
            location: { variableName: variable.name },
            message: `Enum variable ${variable.name} must have at least one value`,
            suggestion: 'Define enum values for this variable'
          });
        }

        // Check if initial value is valid
        if (variable.initialValue !== undefined && variable.enumValues) {
          if (!variable.enumValues.includes(String(variable.initialValue))) {
            warnings.push({
              type: 'type_mismatch',
              severity: 'warning',
              location: { variableName: variable.name },
              message: `Initial value '${variable.initialValue}' is not in enum values`,
              suggestion: `Choose from: ${variable.enumValues.join(', ')}`
            });
          }
        }
        break;

      case 'bool':
        // Boolean validation is straightforward
        if (variable.initialValue !== undefined && typeof variable.initialValue !== 'boolean') {
          warnings.push({
            type: 'type_mismatch',
            severity: 'warning',
            location: { variableName: variable.name },
            message: `Initial value for boolean variable should be true or false`,
            suggestion: 'Set initial value to true or false'
          });
        }
        break;
    }
  }

  return warnings;
}

/**
 * Check for contradictory guard conditions
 */
function checkGuardContradictions(
  guard: string,
  variables: EFSMVariable[],
  transitionId: string
): GuardWarning[] {
  const warnings: GuardWarning[] = [];

  // Simple pattern matching for obvious contradictions
  // e.g., "x > 5 && x < 3" or "flag && !flag"

  // Check for variable compared to itself with impossible conditions
  const patterns = [
    /(\w+)\s*>\s*(\d+)\s*&&\s*\1\s*<\s*(\d+)/g,  // x > 5 && x < 3
    /(\w+)\s*==\s*(\w+)\s*&&\s*\1\s*!=\s*\2/g,   // x == y && x != y
    /(\w+)\s*&&\s*!\1/g,                          // flag && !flag
    /!(\w+)\s*&&\s*\1/g,                          // !flag && flag
  ];

  for (const pattern of patterns) {
    const matches = guard.matchAll(pattern);
    for (const match of matches) {
      warnings.push({
        type: 'contradiction',
        severity: 'warning',
        location: {
          transitionId,
          expression: guard
        },
        message: `Potential contradiction in guard: ${match[0]}`,
        suggestion: 'Review guard logic for impossible conditions'
      });
    }
  }

  return warnings;
}

/**
 * Check for potential overflows in actions
 */
function checkActionOverflows(
  action: string,
  variables: EFSMVariable[],
  transitionId: string
): GuardWarning[] {
  const warnings: GuardWarning[] = [];
  const variableMap = new Map(variables.map(v => [v.name, v]));

  // Parse action to get assignments
  const result = parseActionExpression(action, variables);
  if (!result.isValid) return warnings;

  for (const { variable, expression } of result.assignments) {
    const varDef = variableMap.get(variable);
    if (!varDef || varDef.type !== 'int') continue;

    // Check for operations that might cause overflow
    // e.g., "x = x + 1" where x is at max value
    if (expression.includes('+') || expression.includes('*')) {
      warnings.push({
        type: 'overflow',
        severity: 'info',
        location: {
          transitionId,
          variableName: variable,
          expression: action
        },
        message: `Action may cause overflow for variable '${variable}'`,
        suggestion: `Ensure operations stay within bounds [${varDef.minValue}, ${varDef.maxValue}]`
      });
    }

    // Check for operations that might cause underflow
    if (expression.includes('-') || expression.includes('/')) {
      warnings.push({
        type: 'underflow',
        severity: 'info',
        location: {
          transitionId,
          variableName: variable,
          expression: action
        },
        message: `Action may cause underflow for variable '${variable}'`,
        suggestion: `Ensure operations stay within bounds [${varDef.minValue}, ${varDef.maxValue}]`
      });
    }
  }

  return warnings;
}

/**
 * Find transitions that are unreachable due to impossible guards
 */
function findUnreachableTransitions(
  nodes: FSMNode[],
  edges: FSMEdge[],
  variables: EFSMVariable[]
): GuardWarning[] {
  const warnings: GuardWarning[] = [];

  // Group edges by source state
  const edgesBySource = new Map<string, FSMEdge[]>();
  for (const edge of edges) {
    const list = edgesBySource.get(edge.source) || [];
    list.push(edge);
    edgesBySource.set(edge.source, list);
  }

  // For each state, check if any outgoing transitions can never be taken
  for (const [sourceId, outgoingEdges] of edgesBySource.entries()) {
    // Check for mutually exclusive guards
    for (let i = 0; i < outgoingEdges.length; i++) {
      for (let j = i + 1; j < outgoingEdges.length; j++) {
        const edge1 = outgoingEdges[i];
        const edge2 = outgoingEdges[j];

        // Only check edges with the same event
        if (edge1.data?.event && edge2.data?.event && edge1.data.event === edge2.data.event) {
          const guard1 = edge1.data.condition;
          const guard2 = edge2.data.condition;

          if (guard1 && guard2 && areGuardsMutuallyExclusive(guard1, guard2)) {
            warnings.push({
              type: 'ambiguous',
              severity: 'warning',
              location: {
                transitionId: edge2.id,
                stateId: sourceId,
                expression: guard2
              },
              message: `Transitions may have overlapping guards for event '${edge1.data.event}'`,
              suggestion: 'Ensure guards are mutually exclusive or prioritize transitions'
            });
          }
        }
      }
    }
  }

  return warnings;
}

/**
 * Check if two guards are mutually exclusive (simple heuristic)
 */
function areGuardsMutuallyExclusive(guard1: string, guard2: string): boolean {
  // This is a simplified check - full symbolic analysis would be more complex
  // For now, just check if they're obviously different
  return false; // Conservative: assume they might overlap
}

/**
 * Get all variables referenced in an expression
 */
export function getReferencedVariables(expression: string, variables: EFSMVariable[]): string[] {
  const result = parseGuardExpression(expression, variables);
  return result.variables;
}
