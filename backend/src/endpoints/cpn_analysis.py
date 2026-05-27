"""
CPN Analysis Endpoint - S-invariant computation via Z3

Receives a CPN definition and returns structural S-invariants
computed via Z3 integer linear programming (Tier 2).
"""
import ast
import re
import itertools
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Set, Tuple

# Z3 is available in the backend container
try:
    from z3 import Solver, Int, Sum, sat
    Z3_AVAILABLE = True
except ImportError:
    Z3_AVAILABLE = False

from src.auth.jwthandler import get_current_user

router = APIRouter()


#  Pydantic models mirroring frontend ColoredPetriNet types

class ColorSet(BaseModel):
    id: str
    name: str
    type: str  # 'unit' | 'bool' | 'int' | 'enum'
    description: Optional[str] = None
    intMin: Optional[int] = None
    intMax: Optional[int] = None
    enumValues: Optional[List[str]] = None


class CPNVariable(BaseModel):
    id: str
    name: str
    colorSetId: str
    description: Optional[str] = None


class CPNPlace(BaseModel):
    id: str
    name: str
    colorSetId: str
    initialMarking: str
    position: Dict[str, float]
    description: Optional[str] = None


class CPNTransition(BaseModel):
    id: str
    name: str
    guard: Optional[str] = None
    position: Dict[str, float]
    description: Optional[str] = None


class CPNArc(BaseModel):
    id: str
    sourceId: str
    targetId: str
    arcType: str  # 'place-to-transition' | 'transition-to-place'
    inscription: str
    description: Optional[str] = None


class ColoredPetriNetInput(BaseModel):
    id: str
    name: str
    description: str = ""
    author: Optional[str] = None
    version: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    protocol_id: Optional[str] = None
    places: List[CPNPlace]
    transitions: List[CPNTransition]
    arcs: List[CPNArc]
    colorSets: List[ColorSet]
    variables: List[CPNVariable]
    metadata: Optional[Dict[str, Any]] = None


class CPNAnalysisRequest(BaseModel):
    cpn: ColoredPetriNetInput


#  Response models

class CPNInvariant(BaseModel):
    coefficients: Dict[str, float]
    constant: Optional[float] = None
    label: str


class CPNAnalysisResponse(BaseModel):
    invariants: List[CPNInvariant]


# ---------------------------------------------------------------------------
#  Colour-aware unfolding helpers
# ---------------------------------------------------------------------------

def _enumerate_domain(cs: ColorSet) -> list:
    """Enumerate all values of a color set."""
    if cs.type == "unit":
        return [()]
    if cs.type == "bool":
        return [True, False]
    if cs.type == "int":
        lo = cs.intMin if cs.intMin is not None else 0
        hi = cs.intMax if cs.intMax is not None else 0
        return list(range(lo, hi + 1))
    if cs.type == "enum":
        return list(cs.enumValues or [])
    return [()]


def _eval_token_expr(expr: str, binding: dict, all_enum_values: Set[str]) -> Any:
    """Evaluate a single token expression: variable, literal, or arithmetic."""
    expr = expr.strip()
    if expr == "()":
        return ()
    if expr in ("true", "True"):
        return True
    if expr in ("false", "False"):
        return False
    if expr in binding:
        return binding[expr]
    try:
        return int(expr)
    except ValueError:
        pass
    if expr in all_enum_values:
        return expr
    # Simple arithmetic after variable substitution
    result = expr
    for var, val in sorted(binding.items(), key=lambda x: -len(x[0])):
        result = re.sub(r"\b" + re.escape(var) + r"\b", str(val), result)
    if re.match(r"^[\d\s+\-*/%()]+$", result):
        try:
            return eval(result)  # noqa: S307 – guarded: digits/operators only
        except Exception:
            pass
    return expr  # fallback: treat as enum literal


def _eval_inscription(inscription: str, binding: dict, all_enum_values: Set[str]) -> Dict[Any, int]:
    """Evaluate a CPN-ML arc inscription to a multiset {color: count}."""
    if not inscription or inscription.strip().lower() in ("", "empty", "0"):
        return {}
    result: Dict[Any, int] = {}
    for part in inscription.split("++"):
        part = part.strip()
        bt = part.find("`")
        if bt >= 0:
            try:
                count = int(part[:bt].strip())
            except ValueError:
                count = 1
            token_expr = part[bt + 1:].strip()
        else:
            count = 1
            token_expr = part
        color = _eval_token_expr(token_expr, binding, all_enum_values)
        result[color] = result.get(color, 0) + count
    return result


# ---------------------------------------------------------------------------
# Safe guard evaluator — AST whitelist + sandboxed eval
# ---------------------------------------------------------------------------
_GUARD_ALLOWED_NODES = (
    # structural
    ast.Expression,
    # boolean operators
    ast.BoolOp, ast.And, ast.Or,
    ast.UnaryOp, ast.Not, ast.UAdd, ast.USub,
    # comparisons
    ast.Compare,
    ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
    # arithmetic (needed for guards like "x + 1 > y")
    ast.BinOp,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.FloorDiv,
    # literals only — no Name, no Call, no Attribute
    ast.Constant,
    ast.Tuple,
)


def _safe_eval_guard(g: str) -> bool:
    """
    Evaluate a fully-substituted guard string using an AST whitelist.

    Only literals and pure arithmetic/comparison/boolean operators are
    allowed.  No function calls, no attribute access, no imports.
    Returns True (fail-open) for any parse error or disallowed construct.
    """
    try:
        tree = ast.parse(g, mode="eval")
    except SyntaxError:
        return True  # unparseable — fail-open
    for node in ast.walk(tree):
        if not isinstance(node, _GUARD_ALLOWED_NODES):
            return True  # disallowed AST node — fail-open
    try:
        # Empty builtins dict prevents access to any Python built-in name.
        return bool(eval(compile(tree, "<guard>", "eval"), {"__builtins__": {}}, {}))
    except Exception:
        return True  # evaluation error — fail-open


def _eval_guard(guard: Optional[str], binding: dict) -> bool:
    """Evaluate a transition guard with a given variable binding."""
    if not guard:
        return True
    g = guard.strip()
    for var, val in sorted(binding.items(), key=lambda x: -len(x[0])):
        val_str = repr(val) if not isinstance(val, (int, float, bool)) else str(val)
        g = re.sub(r"\b" + re.escape(var) + r"\b", val_str, g)
    g = (g.replace("<>", "!=")
           .replace("andalso", "and")
           .replace("orelse", "or"))
    g = re.sub(r"(?<![=!<>])=(?!=)", "==", g)
    return _safe_eval_guard(g)


def _eval_marking_multiset(marking: str, cs: ColorSet, all_enum_values: Set[str]) -> Dict[Any, int]:
    """Parse an initial marking string into a multiset {color: count}."""
    result = _eval_inscription(marking, {}, all_enum_values)
    if not result and marking.strip() not in ("", "0", "empty"):
        # Bare integer string (e.g. "1") with no backtick: treat as a count of
        # unit tokens rather than a token of integer color.
        try:
            n = int(marking.strip())
            if n > 0:
                result = {_enumerate_domain(cs)[0]: n} if _enumerate_domain(cs) else {}
        except (ValueError, IndexError):
            domain = _enumerate_domain(cs)
            if domain:
                result = {domain[0]: 1}

    # For unit color sets the only valid token color is ().
    # Normalize any mis-parsed color (e.g. integer 0 from "1`0") to ().
    if cs.type == "unit" and result:
        total = sum(result.values())
        return {(): total} if total > 0 else {}

    return result


# ---------------------------------------------------------------------------
#  Colour-aware incidence matrix builder
# ---------------------------------------------------------------------------

def _build_colour_aware_matrix(
    cpn: ColoredPetriNetInput,
) -> Tuple[List[Tuple[str, Any, str]], List[List[int]]]:
    """
    Unfold the CPN into a P/T net for colour-aware S-invariant detection.

    Returns:
        pc_pairs  – list of (place_id, color_value, place_name) – matrix rows
        N         – len(pc_pairs) × len(tc_instances) incidence matrix
    """
    cs_by_id = {cs.id: cs for cs in cpn.colorSets}
    all_enum_values: Set[str] = {
        v
        for cs in cpn.colorSets
        if cs.type == "enum" and cs.enumValues
        for v in cs.enumValues
    }

    # Build (place, color) -> row index
    pc_pairs: List[Tuple[str, Any, str]] = []
    pc_idx: Dict[Tuple[str, Any], int] = {}
    for p in cpn.places:
        cs = cs_by_id.get(p.colorSetId)
        if not cs:
            continue
        for color in _enumerate_domain(cs):
            key = (p.id, color)
            pc_idx[key] = len(pc_pairs)
            pc_pairs.append((p.id, color, p.name))

    if not pc_pairs:
        return [], [[]]

    # Variable domains
    var_domain: Dict[str, list] = {}
    for v in cpn.variables:
        cs = cs_by_id.get(v.colorSetId)
        if cs:
            var_domain[v.name] = _enumerate_domain(cs)

    # Place -> color-set type lookup (for unit-token normalization)
    place_cs_type: Dict[str, str] = {}
    for _p in cpn.places:
        _cs_obj = cs_by_id.get(_p.colorSetId)
        if _cs_obj:
            place_cs_type[_p.id] = _cs_obj.type

    # Group arcs by transition id
    in_arcs: Dict[str, List[CPNArc]] = {}
    out_arcs: Dict[str, List[CPNArc]] = {}
    for arc in cpn.arcs:
        if arc.arcType == "place-to-transition":
            in_arcs.setdefault(arc.targetId, []).append(arc)
        else:
            out_arcs.setdefault(arc.sourceId, []).append(arc)

    # Enumerate (transition, binding) instances
    tc_instances: List[Tuple[str, dict, str]] = []
    for t in cpn.transitions:
        all_arcs = in_arcs.get(t.id, []) + out_arcs.get(t.id, [])
        all_exprs = " ".join(a.inscription for a in all_arcs)
        if t.guard:
            all_exprs += " " + t.guard
        used_vars = [
            v for v in var_domain
            if re.search(r"\b" + re.escape(v) + r"\b", all_exprs)
        ]
        if not used_vars:
            tc_instances.append((t.id, {}, t.name))
            continue
        domains = [var_domain[v] for v in used_vars]
        for combo in itertools.product(*domains):
            binding = dict(zip(used_vars, combo))
            if _eval_guard(t.guard, binding):
                tc_instances.append((t.id, binding, t.name))

    if not tc_instances:
        return pc_pairs, []

    R = len(pc_pairs)
    C = len(tc_instances)
    N: List[List[int]] = [[0] * C for _ in range(R)]

    for col, (tid, binding, _) in enumerate(tc_instances):
        for arc in in_arcs.get(tid, []):
            ms = _eval_inscription(arc.inscription, binding, all_enum_values)
            pid = arc.sourceId
            is_unit = place_cs_type.get(pid) == "unit"
            for color, cnt in ms.items():
                actual_color = () if is_unit else color
                key = (pid, actual_color)
                if key in pc_idx:
                    N[pc_idx[key]][col] -= cnt
        for arc in out_arcs.get(tid, []):
            ms = _eval_inscription(arc.inscription, binding, all_enum_values)
            pid = arc.targetId
            is_unit = place_cs_type.get(pid) == "unit"
            for color, cnt in ms.items():
                actual_color = () if is_unit else color
                key = (pid, actual_color)
                if key in pc_idx:
                    N[pc_idx[key]][col] += cnt

    return pc_pairs, N


# ---------------------------------------------------------------------------
#  S-invariant computation (colour-aware ILP)
# ---------------------------------------------------------------------------

def _compute_s_invariants_z3(cpn: ColoredPetriNetInput) -> List[CPNInvariant]:
    """
    Compute structural S-invariants using Z3 integer arithmetic.

    The CPN is first unfolded into a P/T net:
      - Rows  = (place, color) pairs
      - Cols  = (transition, binding) instances

    Then finds non-trivial non-negative integer vectors c such that c·N = 0.
    One ILP solve per pivot row, using a symmetry-breaking sum bound.

    Labels group same-coefficient (place, color) entries when possible:
      - Unit-typed places → just the place name (single color)
      - Other types     → "placeName[color]" per token color
    """
    if not Z3_AVAILABLE:
        return []

    pc_pairs, N = _build_colour_aware_matrix(cpn)

    if not pc_pairs or not N or not N[0]:
        return []

    P_eff = len(pc_pairs)
    T_eff = len(N[0]) if N else 0

    if T_eff == 0:
        return []

    # Build initial markings per (place_id, color)
    cs_by_id = {cs.id: cs for cs in cpn.colorSets}
    all_enum_values: Set[str] = {
        v
        for cs in cpn.colorSets
        if cs.type == "enum" and cs.enumValues
        for v in cs.enumValues
    }
    place_by_id = {p.id: p for p in cpn.places}
    initial_tokens: Dict[Tuple[str, Any], int] = {}
    for (pid, color, _) in pc_pairs:
        p = place_by_id.get(pid)
        if not p:
            initial_tokens[(pid, color)] = 0
            continue
        cs = cs_by_id.get(p.colorSetId)
        if not cs:
            initial_tokens[(pid, color)] = 0
            continue
        ms = _eval_marking_multiset(p.initialMarking, cs, all_enum_values)
        initial_tokens[(pid, color)] = ms.get(color, 0)

    invariants: List[CPNInvariant] = []
    seen_labels: Set[str] = set()

    for pivot in range(P_eff):
        solver = Solver()
        c = [Int(f"c_{i}") for i in range(P_eff)]

        for i in range(P_eff):
            solver.add(c[i] >= 0)
        solver.add(c[pivot] >= 1)
        solver.add(Sum(c) <= P_eff)

        for j in range(T_eff):
            col_sum = Sum([c[i] * N[i][j] for i in range(P_eff)])
            solver.add(col_sum == 0)

        if solver.check() != sat:
            continue

        model = solver.model()
        raw_coeffs: List[Tuple[int, Any, str, int]] = []  # (row_idx, color, place_id, coeff)
        for i, (pid, color, pname) in enumerate(pc_pairs):
            v = model[c[i]]
            val = v.as_long() if v is not None else 0
            if val > 0:
                raw_coeffs.append((i, color, pid, pname, val))

        if not raw_coeffs:
            continue

        # Compute conservation constant from initial marking
        constant = sum(
            coeff * initial_tokens.get((pid, color), 0)
            for (_, color, pid, _pname, coeff) in raw_coeffs
        )

        # Build label: try to simplify per-place when all colors share same coeff
        # Group by (place_id, coeff)
        place_colors: Dict[Tuple[str, int], List[Any]] = defaultdict(list)
        place_names: Dict[str, str] = {}
        for (_, color, pid, pname, coeff) in raw_coeffs:
            place_colors[(pid, coeff)].append(color)
            place_names[pid] = pname

        # Determine expected total colors per place
        place_domain_size: Dict[str, int] = {}
        for p in cpn.places:
            cs = cs_by_id.get(p.colorSetId)
            if cs:
                place_domain_size[p.id] = len(_enumerate_domain(cs))

        terms: List[str] = []
        coefficients: Dict[str, float] = {}
        for (pid, coeff), colors in sorted(
            place_colors.items(),
            key=lambda kv: next(
                (i for i, (pid2, _, _) in enumerate(pc_pairs) if pid2 == kv[0][0]), 0
            ),
        ):
            pname = place_names[pid]
            all_colors_of_place = place_domain_size.get(pid, 1)
            if len(colors) == all_colors_of_place and all_colors_of_place > 0:
                # All colors of this place share the same coefficient → use place name only
                label_part = f"{coeff}·{pname}" if coeff > 1 else pname
                # Single coefficient entry keyed by place_id
                coefficients[pid] = float(coeff)
            else:
                # Per-color entries
                for color in colors:
                    color_str = "()" if color == () else str(color)
                    label_part = (
                        f"{coeff}·{pname}[{color_str}]" if coeff > 1
                        else f"{pname}[{color_str}]"
                    )
                    coefficients[f"{pid}:{color_str}"] = float(coeff)
            terms.append(label_part)

        label = " + ".join(terms) + f" = {constant}"

        if label in seen_labels:
            continue
        seen_labels.add(label)

        invariants.append(CPNInvariant(
            coefficients=coefficients,
            constant=float(constant),
            label=label,
        ))

    return invariants


#  Endpoint

@router.post("/api/cpn/analyze", response_model=CPNAnalysisResponse)
async def analyze_cpn(
    request: CPNAnalysisRequest,
    current_user=Depends(get_current_user),
):
    """
    Compute S-invariants for a ColoredPetriNet using Z3.

    The frontend handles Tier-1 BFS exploration; this endpoint provides
    stronger structural guarantees via integer linear programming.
    """
    cpn = request.cpn

    if not cpn.places:
        raise HTTPException(status_code=422, detail="CPN must have at least one place")

    return CPNAnalysisResponse(invariants=_compute_s_invariants_z3(cpn))
