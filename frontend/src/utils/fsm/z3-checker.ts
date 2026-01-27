// Z3-based Guard Satisfiability Checker for EFSM Determinism Analysis
// Uses backend API for Z3 SMT solving

import axios from 'axios';
import type { ProtocolFieldCondition } from '@/contracts/models';

/**
 * Guard representation that can be checked for satisfiability
 */
export interface Guard {
  type: 'protocol' | 'manual' | 'always_true';
  protocolConditions?: ProtocolFieldCondition[];
  manualExpression?: string;
}

/**
 * Check if two guards can be satisfied simultaneously (i.e., they conflict)
 * Returns true if satisfiable (conflict exists), false if unsatisfiable (no conflict)
 * Uses backend API for Z3 SMT solving
 */
export async function areGuardsSatisfiableSimultaneously(
  guard1: Guard,
  guard2: Guard
): Promise<{ satisfiable: boolean; model?: string }> {
  try {
    const response = await axios.post('/fsm/check-guards', {
      guard1,
      guard2,
    });

    return {
      satisfiable: response.data.satisfiable,
      model: response.data.model,
    };
  } catch (error) {
    console.error('Error calling backend Z3 checker:', error);
    // On error, assume unsatisfiable (conservative approach)
    return {
      satisfiable: false,
    };
  }
}

/**
 * Check if a set of guards covers all possible cases (completeness check)
 * Returns true if complete (no gaps), false if there's a gap (potential deadlock)
 * Uses backend API for Z3 SMT solving
 */
export async function areGuardsComplete(
  guards: Guard[],
  state: string,
  event: string,
  variables?: any[]
): Promise<{ complete: boolean; gapModel?: string }> {
  try {
    const response = await axios.post('/fsm/check-completeness', {
      guards,
      state,
      event,
      variables,
    });

    return {
      complete: response.data.complete,
      gapModel: response.data.gap_model,
    };
  } catch (error) {
    console.error('Error calling backend completeness checker:', error);
    // On error, assume complete (conservative approach)
    return {
      complete: true,
    };
  }
}

/**
 * Convert FSM edge data to Guard object
 */
export function edgeDataToGuard(edgeData: any): Guard {
  // Handle legacy condition structure (object with type property)
  const condition = edgeData?.condition;

  if (condition && typeof condition === 'object') {
    if (condition.type === 'protocol' && condition.conditions?.length > 0) {
      return {
        type: 'protocol',
        protocolConditions: condition.conditions,
      };
    }

    if (condition.type === 'manual' && condition.text?.trim()) {
      return {
        type: 'manual',
        manualExpression: condition.text.trim(),
      };
    }
  }

  // Check if using protocol conditions (new structure)
  if (edgeData?.use_protocol_conditions && edgeData?.protocol_conditions?.length > 0) {
    return {
      type: 'protocol',
      protocolConditions: edgeData.protocol_conditions,
    };
  }

  // Check if condition is a direct string (alternative structure)
  if (typeof condition === 'string' && condition.trim() !== '') {
    return {
      type: 'manual',
      manualExpression: condition.trim(),
    };
  }

  // No guard - always true
  return {
    type: 'always_true',
  };
}
