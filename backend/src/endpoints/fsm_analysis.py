"""
FSM Determinism Checking Endpoint using Z3
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal, Any

router = APIRouter()


# Request/Response Models
class ProtocolFieldCondition(BaseModel):
    field_id: str
    operator: Literal['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal']
    value: Optional[Any] = None
    field_option_name: Optional[str] = None


class Guard(BaseModel):
    type: Literal['protocol', 'manual', 'always_true']
    protocolConditions: Optional[List[ProtocolFieldCondition]] = None
    manualExpression: Optional[str] = None


class CheckGuardsRequest(BaseModel):
    guard1: Guard
    guard2: Guard


class CheckGuardsResponse(BaseModel):
    satisfiable: bool
    model: Optional[str] = None
    error: Optional[str] = None


@router.post("/fsm/check-guards", response_model=CheckGuardsResponse)
async def check_guards_satisfiability(request: CheckGuardsRequest):
    """
    Check if two guards can be satisfied simultaneously using Z3 SMT solver.

    Returns:
        satisfiable: True if both guards can be true at the same time (non-deterministic)
        model: Counter-example showing values that satisfy both guards
        error: Error message if Z3 check failed
    """
    try:
        from z3 import Int, Solver, sat, And, Or

        solver = Solver()
        variable_cache = {}

        # Helper function to get or create Z3 variable
        def get_variable(name: str):
            if name not in variable_cache:
                variable_cache[name] = Int(name)
            return variable_cache[name]

        # Helper function to convert protocol condition to Z3 expression
        def protocol_condition_to_z3(condition: ProtocolFieldCondition):
            var = get_variable(f"field_{condition.field_id}")

            # Parse value
            if isinstance(condition.value, (int, float)):
                value = int(condition.value)
            elif isinstance(condition.value, str):
                try:
                    value = int(condition.value)
                except ValueError:
                    # Use hash for string constants
                    value = abs(hash(condition.value)) % 10000
            else:
                value = 0

            # Create comparison
            if condition.operator == 'equals':
                return var == value
            elif condition.operator == 'not_equals':
                return var != value
            elif condition.operator == 'greater_than':
                return var > value
            elif condition.operator == 'less_than':
                return var < value
            elif condition.operator == 'greater_or_equal':
                return var >= value
            elif condition.operator == 'less_or_equal':
                return var <= value
            else:
                return True

        # Helper function to parse manual expression
        def parse_manual_expression(expression: str):
            if not expression or not expression.strip():
                return True

            expr = expression.strip()

            # Handle AND
            if '&&' in expr:
                parts = expr.split('&&')
                sub_exprs = [parse_manual_expression(p.strip()) for p in parts]
                return And(*sub_exprs)

            # Handle OR
            if '||' in expr:
                parts = expr.split('||')
                sub_exprs = [parse_manual_expression(p.strip()) for p in parts]
                return Or(*sub_exprs)

            # Handle single comparison: x > 10, y == 5, etc.
            import re
            match = re.match(r'^\s*(\w+)\s*(==|!=|>=|<=|>|<)\s*(-?\d+)\s*$', expr)
            if match:
                var_name, operator, value_str = match.groups()
                value = int(value_str)
                var = get_variable(var_name)

                if operator == '==':
                    return var == value
                elif operator == '!=':
                    return var != value
                elif operator == '>':
                    return var > value
                elif operator == '<':
                    return var < value
                elif operator == '>=':
                    return var >= value
                elif operator == '<=':
                    return var <= value

            # If can't parse, treat as always true (conservative)
            return True

        # Helper function to convert guard to Z3 expression
        def guard_to_z3(guard: Guard):
            if guard.type == 'always_true' or (not guard.protocolConditions and not guard.manualExpression):
                return True

            if guard.type == 'protocol' and guard.protocolConditions:
                conditions = [protocol_condition_to_z3(pc) for pc in guard.protocolConditions]
                return And(*conditions) if len(conditions) > 1 else conditions[0]

            if guard.type == 'manual' and guard.manualExpression:
                return parse_manual_expression(guard.manualExpression)

            return True

        # Convert both guards to Z3 expressions
        expr1 = guard_to_z3(request.guard1)
        expr2 = guard_to_z3(request.guard2)

        # Add both conditions to solver
        solver.add(expr1)
        solver.add(expr2)

        # Check satisfiability
        result = solver.check()

        if result == sat:
            model = solver.model()
            return CheckGuardsResponse(
                satisfiable=True,
                model=str(model)
            )
        else:
            return CheckGuardsResponse(
                satisfiable=False
            )

    except Exception as e:
        return CheckGuardsResponse(
            satisfiable=False,
            error=str(e)
        )
