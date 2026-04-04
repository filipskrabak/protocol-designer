"""
CPN Analysis Endpoint - S-invariant computation via Z3

Receives a ColoredPetriNet definition and returns structural S-invariants
computed via Z3 integer linear programming (Tier 2).
The frontend handles Tier-1 bounded BFS exploration independently.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional, Any

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


#  Helpers

def _estimate_arc_weight(inscription: str) -> int:
    """
    Estimate total token weight of an arc inscription (colour-unaware).
    For "2`ACK ++ 1`SYN" → 3.  Falls back to 1 on parse errors.
    """
    if not inscription or inscription.strip().lower() in ("", "empty"):
        return 0
    total = 0
    for part in inscription.split("++"):
        p = part.strip()
        idx = p.find("`")
        if idx == -1:
            total += 1
        else:
            try:
                total += int(p[:idx].strip())
            except ValueError:
                total += 1
    return total


def _initial_token_count(marking: str) -> int:
    """Parse initial marking string to token count (colour-unaware)."""
    return _estimate_arc_weight(marking)


#  S-invariant computation

def _compute_s_invariants_z3(cpn: ColoredPetriNetInput) -> List[CPNInvariant]:
    """
    Compute structural S-invariants using Z3 integer arithmetic.

    Finds non-trivial non-negative integer vectors c such that:
        c · N = 0
    where N is the token-count incidence matrix (colour-unaware).

    Uses an iterative approach: for each place p_i, find the minimal
    positive invariant containing p_i by solving:
        minimize c[i]
        subject to: c · N = 0, c >= 0, c[i] >= 1, sum(c) <= P
    """
    if not Z3_AVAILABLE:
        return []

    places = cpn.places
    transitions = cpn.transitions
    P = len(places)
    T = len(transitions)

    if P == 0 or T == 0:
        return []

    place_idx = {p.id: i for i, p in enumerate(places)}
    trans_idx = {t.id: i for i, t in enumerate(transitions)}

    # Build incidence matrix N[p][t]
    N = [[0] * T for _ in range(P)]
    for arc in cpn.arcs:
        weight = _estimate_arc_weight(arc.inscription)
        if arc.arcType == "place-to-transition":
            pi = place_idx.get(arc.sourceId)
            ti = trans_idx.get(arc.targetId)
            if pi is not None and ti is not None:
                N[pi][ti] -= weight
        else:
            pi = place_idx.get(arc.targetId)
            ti = trans_idx.get(arc.sourceId)
            if pi is not None and ti is not None:
                N[pi][ti] += weight

    invariants: List[CPNInvariant] = []
    seen_labels: set = set()

    # For each place, try to find a minimal S-invariant containing it
    for pivot in range(P):
        solver = Solver()
        c = [Int(f"c_{i}") for i in range(P)]

        # Non-negativity
        for i in range(P):
            solver.add(c[i] >= 0)

        # Pivot place must be included
        solver.add(c[pivot] >= 1)

        # Bound the sum to avoid trivial scaling (sum <= P)
        solver.add(Sum(c) <= P)

        # Conservation: c · N = 0 for all transitions
        for j in range(T):
            col_sum = Sum([c[i] * N[i][j] for i in range(P)])
            solver.add(col_sum == 0)

        result = solver.check()
        if result == sat:
            model = solver.model()
            coeffs = {places[i].id: model[c[i]].as_long()
                      for i in range(P)
                      if model[c[i]].as_long() > 0}

            if not coeffs:
                continue

            # Compute conservation constant from initial marking
            constant = sum(
                coeff * _initial_token_count(places[place_idx[pid]].initialMarking)
                for pid, coeff in coeffs.items()
                if pid in place_idx
            )

            # Build human-readable label
            terms = []
            for pid, coeff in sorted(coeffs.items(), key=lambda x: place_idx.get(x[0], 0)):
                place_name = next((p.name for p in places if p.id == pid), pid)
                terms.append(f"{coeff}·{place_name}" if coeff > 1 else place_name)

            label = " + ".join(terms) + f" = {constant}"

            if label in seen_labels:
                continue
            seen_labels.add(label)

            invariants.append(CPNInvariant(
                coefficients={pid: float(coeff) for pid, coeff in coeffs.items()},
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
