"""
Shared Z3 utilities for FSM analysis
"""
from z3 import And, Or
import re


def parse_manual_expression(expression: str, get_variable):
    """
    Parse a manual expression string into a Z3 constraint.

    Args:
        expression: String like "x > 10", "y == 5", "connack_rc == true"
        get_variable: Function to get/create Z3 Int variable by name

    Returns:
        Z3 expression or True if unparseable
    """
    if not expression or not expression.strip():
        return True

    expr = expression.strip()

    # Handle AND
    if '&&' in expr:
        parts = expr.split('&&')
        sub_exprs = [parse_manual_expression(p.strip(), get_variable) for p in parts]
        return And(*sub_exprs)

    # Handle OR
    if '||' in expr:
        parts = expr.split('||')
        sub_exprs = [parse_manual_expression(p.strip(), get_variable) for p in parts]
        return Or(*sub_exprs)

    # Handle single comparison: x > 10, y == 5, x == true, etc.
    # First try boolean literals (true/false)
    bool_match = re.match(r'^\s*(\w+)\s*(==|!=)\s*(true|false)\s*$', expr, re.IGNORECASE)
    if bool_match:
        var_name, operator, bool_str = bool_match.groups()
        value = 1 if bool_str.lower() == 'true' else 0
        var = get_variable(var_name)

        if operator == '==':
            return var == value
        elif operator == '!=':
            return var != value

    # Then try numeric comparisons
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
