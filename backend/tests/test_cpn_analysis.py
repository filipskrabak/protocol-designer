"""
Tests for the colour-aware S-invariant computation in cpn_analysis.py.

Coverage:
  1. _enumerate_domain         – color-set value enumeration
  2. _eval_token_expr          – token expression evaluation
  3. _eval_inscription         – arc inscription → multiset
  4. _eval_guard               – CPN-ML guard evaluation
  5. _eval_marking_multiset    – initial marking → multiset
  6. _build_colour_aware_matrix – CPN unfolding to P/T incidence matrix
  7. _compute_s_invariants_z3  – end-to-end; verifies c·N = 0 (the core math)

Run from the repo root (with venv active):
    pytest backend/tests/test_cpn_analysis.py -v
"""

import sys
import os
import pytest

# Stub out database/settings env vars so the import chain doesn't fail
# (the functions under test are pure — they don't need a real DB)
for _k, _v in {
    "DATABASE_HOST": "localhost",
    "DATABASE_PORT": "5432",
    "DATABASE_NAME": "test",
    "DATABASE_USER": "test",
    "DATABASE_PASSWORD": "test",
    "SECRET_KEY": "testsecret",
}.items():
    os.environ.setdefault(_k, _v)

# Make the backend src importable without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.endpoints.cpn_analysis import (
    ColorSet,
    CPNVariable,
    CPNPlace,
    CPNTransition,
    CPNArc,
    ColoredPetriNetInput,
    _enumerate_domain,
    _eval_token_expr,
    _eval_inscription,
    _eval_guard,
    _eval_marking_multiset,
    _build_colour_aware_matrix,
    _compute_s_invariants_z3,
)


# ---------------------------------------------------------------------------
#  Fixtures / builders
# ---------------------------------------------------------------------------

def _cs(id_, name, type_, **kwargs) -> ColorSet:
    return ColorSet(id=id_, name=name, type=type_, **kwargs)


def _place(id_, name, cs_id, marking="") -> CPNPlace:
    return CPNPlace(id=id_, name=name, colorSetId=cs_id,
                    initialMarking=marking, position={"x": 0, "y": 0})


def _trans(id_, name, guard=None) -> CPNTransition:
    return CPNTransition(id=id_, name=name, guard=guard,
                         position={"x": 0, "y": 0})


def _arc(id_, src, tgt, arc_type, inscription) -> CPNArc:
    return CPNArc(id=id_, sourceId=src, targetId=tgt,
                  arcType=arc_type, inscription=inscription)


def _cpn(places, transitions, arcs, color_sets, variables=None) -> ColoredPetriNetInput:
    return ColoredPetriNetInput(
        id="test", name="Test", description="",
        places=places, transitions=transitions, arcs=arcs,
        colorSets=color_sets, variables=variables or [],
    )


UNIT_CS = _cs("cs_unit", "Unit", "unit")
BOOL_CS = _cs("cs_bool", "Bool", "bool")
INT_CS  = _cs("cs_int",  "Int",  "int", intMin=1, intMax=3)
ENUM_CS = _cs("cs_enum", "Msg",  "enum", enumValues=["A", "B", "C"])

ENUMS = {"A", "B", "C"}


# ===========================================================================
#  1. _enumerate_domain
# ===========================================================================

class TestEnumerateDomain:
    def test_unit(self):
        assert _enumerate_domain(UNIT_CS) == [()]

    def test_bool(self):
        assert _enumerate_domain(BOOL_CS) == [True, False]

    def test_int_range(self):
        assert _enumerate_domain(INT_CS) == [1, 2, 3]

    def test_int_no_bounds_defaults_to_zero(self):
        cs = _cs("x", "X", "int")  # intMin/intMax both None → default 0
        assert _enumerate_domain(cs) == [0]

    def test_enum(self):
        assert _enumerate_domain(ENUM_CS) == ["A", "B", "C"]

    def test_enum_empty_values(self):
        cs = _cs("x", "X", "enum", enumValues=[])
        assert _enumerate_domain(cs) == []

    def test_unknown_type_falls_back_to_unit(self):
        cs = _cs("x", "X", "record")
        assert _enumerate_domain(cs) == [()]


# ===========================================================================
#  2. _eval_token_expr
# ===========================================================================

class TestEvalTokenExpr:
    def test_unit_literal(self):
        assert _eval_token_expr("()", {}, set()) == ()

    def test_true_literal(self):
        assert _eval_token_expr("true", {}, set()) is True

    def test_false_literal(self):
        assert _eval_token_expr("false", {}, set()) is False

    def test_binding_lookup(self):
        assert _eval_token_expr("x", {"x": "A"}, ENUMS) == "A"

    def test_integer_literal(self):
        assert _eval_token_expr("42", {}, set()) == 42

    def test_enum_literal_no_binding(self):
        assert _eval_token_expr("B", {}, ENUMS) == "B"

    def test_arithmetic_with_binding(self):
        # x=2, expr "x + 1" → 3
        result = _eval_token_expr("x + 1", {"x": 2}, set())
        assert result == 3

    def test_unknown_falls_back_to_string(self):
        # Not a binding variable, not a known enum, not parseable integer
        result = _eval_token_expr("unknown_sym", {}, set())
        assert result == "unknown_sym"


# ===========================================================================
#  3. _eval_inscription
# ===========================================================================

class TestEvalInscription:
    def test_empty_string(self):
        assert _eval_inscription("", {}, set()) == {}

    def test_empty_keyword(self):
        assert _eval_inscription("empty", {}, set()) == {}

    def test_zero_string(self):
        assert _eval_inscription("0", {}, set()) == {}

    def test_unit_token(self):
        assert _eval_inscription("()", {}, set()) == {(): 1}

    def test_variable_token(self):
        assert _eval_inscription("x", {"x": "A"}, ENUMS) == {"A": 1}

    def test_weighted_literal(self):
        result = _eval_inscription("2`A ++ 1`B", {}, ENUMS)
        assert result == {"A": 2, "B": 1}

    def test_weighted_variable(self):
        result = _eval_inscription("1`x ++ 1`y", {"x": "A", "y": "B"}, ENUMS)
        assert result == {"A": 1, "B": 1}

    def test_same_color_accumulates(self):
        result = _eval_inscription("1`A ++ 2`A", {}, ENUMS)
        assert result == {"A": 3}

    def test_whitespace_tolerance(self):
        result = _eval_inscription("  3 ` A ", {}, ENUMS)
        assert result == {"A": 3}


# ===========================================================================
#  4. _eval_guard
# ===========================================================================

class TestEvalGuard:
    def test_none_guard_is_true(self):
        assert _eval_guard(None, {}) is True

    def test_empty_guard_is_true(self):
        assert _eval_guard("", {}) is True

    def test_cpnml_equality_true(self):
        # CPN-ML uses single = for equality; we rewrite to ==
        assert _eval_guard("x = y", {"x": "A", "y": "A"}) is True

    def test_cpnml_equality_false(self):
        assert _eval_guard("x = y", {"x": "A", "y": "B"}) is False

    def test_cpnml_inequality_true(self):
        assert _eval_guard("x <> y", {"x": "A", "y": "B"}) is True

    def test_cpnml_inequality_false(self):
        assert _eval_guard("x <> y", {"x": "A", "y": "A"}) is False

    def test_integer_comparison(self):
        assert _eval_guard("x > 0", {"x": 1}) is True
        assert _eval_guard("x > 0", {"x": 0}) is False

    def test_andalso(self):
        assert _eval_guard("x > 0 andalso y < 5", {"x": 2, "y": 3}) is True
        assert _eval_guard("x > 0 andalso y < 5", {"x": 2, "y": 6}) is False

    def test_orelse(self):
        assert _eval_guard("x = 1 orelse y = 2", {"x": 1, "y": 99}) is True
        assert _eval_guard("x = 1 orelse y = 2", {"x": 0, "y": 0}) is False

    def test_fail_open_on_unparseable(self):
        # Completely unrecognizable guard → fail open (True)
        result = _eval_guard("IMPOSSIBLE!!!GUARD???", {"x": 1})
        assert result is True


# ===========================================================================
#  5. _eval_marking_multiset
# ===========================================================================

class TestEvalMarkingMultiset:
    def test_empty_marking(self):
        assert _eval_marking_multiset("", UNIT_CS, set()) == {}

    def test_unit_token(self):
        result = _eval_marking_multiset("1`()", UNIT_CS, set())
        assert result == {(): 1}

    def test_enum_multiset(self):
        result = _eval_marking_multiset("1`A ++ 2`B", ENUM_CS, ENUMS)
        assert result == {"A": 1, "B": 2}

    def test_integer_marking(self):
        result = _eval_marking_multiset("1`2", INT_CS, set())
        assert result == {2: 1}


# ===========================================================================
#  6. _build_colour_aware_matrix
# ===========================================================================

class TestBuildColourAwareMatrix:

    def test_simple_unit_passthrough(self):
        """
        P1 --[()]→ T1 --[()]→ P2   (unit-color tokens)

        pc_pairs  : [(p1,()), (p2,())]
        tc_instances: [(t1,{})]
        N = [[-1], [+1]]
        """
        cpn = _cpn(
            places=[_place("p1", "P1", "cs_unit", "1`()"),
                    _place("p2", "P2", "cs_unit", "")],
            transitions=[_trans("t1", "T1")],
            arcs=[_arc("a1", "p1", "t1", "place-to-transition", "()"),
                  _arc("a2", "t1", "p2", "transition-to-place",  "()")],
            color_sets=[UNIT_CS],
        )
        pc_pairs, N = _build_colour_aware_matrix(cpn)

        # Rows
        assert len(pc_pairs) == 2
        place_ids = [pid for pid, _, _ in pc_pairs]
        assert "p1" in place_ids
        assert "p2" in place_ids

        # One column (one binding)
        assert len(N) == 2
        assert all(len(row) == 1 for row in N)

        # P1 is consumed (-1), P2 is produced (+1)
        row_p1 = N[place_ids.index("p1")]
        row_p2 = N[place_ids.index("p2")]
        assert row_p1 == [-1]
        assert row_p2 == [+1]

    def test_colored_passthrough_enum(self):
        """
        Colored pass-through:  P1 --[x]→ T1{x∈{A,B}} --[x]→ P2

        pc_pairs (in order): (p1,A),(p1,B),(p2,A),(p2,B)
        tc_instances: (t1,{x:'A'}), (t1,{x:'B'})
        N:
          (p1,A): [-1,  0]
          (p1,B): [ 0, -1]
          (p2,A): [+1,  0]
          (p2,B): [ 0, +1]
        """
        cs = _cs("cs_ab", "Msg", "enum", enumValues=["A", "B"])
        var = CPNVariable(id="v1", name="x", colorSetId="cs_ab")
        cpn = _cpn(
            places=[_place("p1", "Sender",   "cs_ab", "1`A ++ 1`B"),
                    _place("p2", "Receiver",  "cs_ab", "")],
            transitions=[_trans("t1", "Send")],
            arcs=[_arc("a1", "p1", "t1", "place-to-transition", "x"),
                  _arc("a2", "t1", "p2", "transition-to-place",  "x")],
            color_sets=[cs],
            variables=[var],
        )
        pc_pairs, N = _build_colour_aware_matrix(cpn)

        assert len(pc_pairs) == 4  # 2 places × 2 colors
        assert len(N) == 4
        assert all(len(row) == 2 for row in N)  # 2 bindings

        # Build lookup: (place_id, color) → row_index
        idx = {(pid, color): i for i, (pid, color, _) in enumerate(pc_pairs)}

        # Binding 0 = x:A, Binding 1 = x:B (order follows enum value order)
        # Find which column corresponds to each binding using P1's row
        row_p1a = N[idx[("p1", "A")]]
        row_p1b = N[idx[("p1", "B")]]
        row_p2a = N[idx[("p2", "A")]]
        row_p2b = N[idx[("p2", "B")]]

        # x:A binding consumes p1[A] and produces p2[A]
        # x:B binding consumes p1[B] and produces p2[B]
        # The two columns must be in some order; find which is which
        if row_p1a[0] == -1:
            col_a, col_b = 0, 1
        else:
            col_a, col_b = 1, 0

        assert row_p1a[col_a] == -1  and row_p1a[col_b] == 0
        assert row_p1b[col_a] == 0   and row_p1b[col_b] == -1
        assert row_p2a[col_a] == +1  and row_p2a[col_b] == 0
        assert row_p2b[col_a] == 0   and row_p2b[col_b] == +1

    def test_guard_filters_bindings(self):
        """
        P1 --[x]→ T1{guard: x <> 'C'}{x∈{A,B,C}} --[x]→ P2
        Only two bindings should survive: x=A and x=B.
        """
        cs = _cs("cs_abc", "Msg", "enum", enumValues=["A", "B", "C"])
        var = CPNVariable(id="v1", name="x", colorSetId="cs_abc")
        cpn = _cpn(
            places=[_place("p1", "P1", "cs_abc", "").
                    model_copy(update={"initialMarking": "1`A ++ 1`B"}),
                    _place("p2", "P2", "cs_abc", "")],
            transitions=[_trans("t1", "T1", guard="x <> 'C'")],
            arcs=[_arc("a1", "p1", "t1", "place-to-transition", "x"),
                  _arc("a2", "t1", "p2", "transition-to-place",  "x")],
            color_sets=[cs],
            variables=[var],
        )
        pc_pairs, N = _build_colour_aware_matrix(cpn)

        # 3 places × 2 colors = 6 rows, but only 2 columns (x=A, x=B)
        assert len(pc_pairs) == 6     # (p1,A),(p1,B),(p1,C),(p2,A),(p2,B),(p2,C)
        assert all(len(row) == 2 for row in N)

    def test_no_variables_single_binding(self):
        """
        A transition with no variable references gets exactly one binding ({}).
        """
        cpn = _cpn(
            places=[_place("p1", "P1", "cs_unit", "1`()"),
                    _place("p2", "P2", "cs_unit", "")],
            transitions=[_trans("t1", "T1")],
            arcs=[_arc("a1", "p1", "t1", "place-to-transition", "()"),
                  _arc("a2", "t1", "p2", "transition-to-place",  "()")],
            color_sets=[UNIT_CS],
        )
        _, N = _build_colour_aware_matrix(cpn)
        # 1 row per (place, color) = 2 rows; 1 column for the single binding
        assert all(len(row) == 1 for row in N)

    def test_empty_net_returns_empty(self):
        cpn = _cpn(places=[], transitions=[], arcs=[], color_sets=[UNIT_CS])
        pc_pairs, N = _build_colour_aware_matrix(cpn)
        assert pc_pairs == []


# ===========================================================================
#  7. _compute_s_invariants_z3  — mathematical correctness
# ===========================================================================

def _verify_invariant_math(invariant, pc_pairs, N):
    """
    Core mathematical check: for every invariant with coefficient vector c,
    verify that c · N[j] = 0 for every column j (transition binding).

    This is the defining property of a P-semiflow / S-invariant.
    """
    if not N or not N[0]:
        return  # nothing to check

    T_eff = len(N[0])
    c_vec = []
    for pid, color, _pname in pc_pairs:
        color_str = "()" if color == () else str(color)
        # Coefficient is keyed by either pid or "pid:color_str"
        coeff = invariant.coefficients.get(pid, 0.0)
        if coeff == 0.0:
            coeff = invariant.coefficients.get(f"{pid}:{color_str}", 0.0)
        c_vec.append(coeff)

    for j in range(T_eff):
        dot = sum(c_vec[i] * N[i][j] for i in range(len(pc_pairs)))
        assert dot == 0.0, (
            f"Invariant '{invariant.label}' fails c·N=0 at column {j}: got {dot}"
        )


def _verify_constant_math(invariant, pc_pairs, initial_tokens):
    """
    Verify the conservation constant: c · M_0 = stated constant.
    """
    total = 0.0
    for i, (pid, color, _pname) in enumerate(pc_pairs):
        color_str = "()" if color == () else str(color)
        coeff = invariant.coefficients.get(pid, 0.0)
        if coeff == 0.0:
            coeff = invariant.coefficients.get(f"{pid}:{color_str}", 0.0)
        total += coeff * initial_tokens.get((pid, color), 0)
    assert total == invariant.constant, (
        f"Constant mismatch for '{invariant.label}': "
        f"c·M0={total}, stated={invariant.constant}"
    )


class TestComputeSInvariantsZ3:

    # ------------------------------------------------------------------
    #  Helper: run ILP and return (invariants, pc_pairs, N, initial_tokens)
    # ------------------------------------------------------------------
    @staticmethod
    def _run(cpn):
        pc_pairs, N = _build_colour_aware_matrix(cpn)
        invariants = _compute_s_invariants_z3(cpn)

        # Recompute initial_tokens the same way the production code does
        from src.endpoints.cpn_analysis import _eval_marking_multiset
        cs_by_id = {cs.id: cs for cs in cpn.colorSets}
        all_enums = {v for cs in cpn.colorSets
                     if cs.type == "enum" and cs.enumValues
                     for v in cs.enumValues}
        place_by_id = {p.id: p for p in cpn.places}
        initial_tokens = {}
        for (pid, color, _) in pc_pairs:
            p = place_by_id.get(pid)
            if not p:
                initial_tokens[(pid, color)] = 0
                continue
            cs = cs_by_id.get(p.colorSetId)
            if not cs:
                initial_tokens[(pid, color)] = 0
                continue
            ms = _eval_marking_multiset(p.initialMarking, cs, all_enums)
            initial_tokens[(pid, color)] = ms.get(color, 0)

        return invariants, pc_pairs, N, initial_tokens

    # ------------------------------------------------------------------
    #  7a: Simple P/T cycle — a known unique invariant exists
    #      P1 (init 3 tokens) → T1 → P2 → T2 → P1
    # ------------------------------------------------------------------
    def test_unit_cycle_invariant_exists(self):
        """P1 + P2 = 3 is the unique (up to scaling) S-invariant."""
        cpn = _cpn(
            places=[_place("p1", "P1", "cs_unit", "3`()"),
                    _place("p2", "P2", "cs_unit", "")],
            transitions=[_trans("t1", "T1"), _trans("t2", "T2")],
            arcs=[
                _arc("a1", "p1", "t1", "place-to-transition",  "()"),
                _arc("a2", "t1", "p2", "transition-to-place",  "()"),
                _arc("a3", "p2", "t2", "place-to-transition",  "()"),
                _arc("a4", "t2", "p1", "transition-to-place",  "()"),
            ],
            color_sets=[UNIT_CS],
        )
        invs, pc_pairs, N, m0 = self._run(cpn)

        assert len(invs) >= 1, "Expected at least one S-invariant for a cycle net"

        for inv in invs:
            _verify_invariant_math(inv, pc_pairs, N)
            _verify_constant_math(inv, pc_pairs, m0)

        # All returned invariants must have non-negative integer coefficients
        for inv in invs:
            for coeff in inv.coefficients.values():
                assert coeff >= 0
                assert coeff == int(coeff)

        # Conservation constant should be 3 (all tokens start in P1)
        constants = {inv.constant for inv in invs}
        assert 3.0 in constants, f"Expected constant=3, got constants={constants}"

    # ------------------------------------------------------------------
    #  7b: Open sink net — no conservation possible
    #      P1 → T1 (T1 has no output; tokens disappear)
    # ------------------------------------------------------------------
    def test_open_sink_no_invariant(self):
        """When tokens can disappear, no non-trivial S-invariant exists."""
        cpn = _cpn(
            places=[_place("p1", "P1", "cs_unit", "2`()")],
            transitions=[_trans("t1", "T1")],
            arcs=[_arc("a1", "p1", "t1", "place-to-transition", "()")],
            color_sets=[UNIT_CS],
        )
        invs, pc_pairs, N, _ = self._run(cpn)
        # N = [[-1]]; c·N = 0 requires c[0]=0, so no non-trivial solution
        assert invs == [], f"Expected no invariant for sink net, got: {invs}"

    # ------------------------------------------------------------------
    #  7c: Colored pass-through — per-color invariants
    #      P1 --[x]→ T1{x∈{A,B}} --[x]→ P2
    # ------------------------------------------------------------------
    def test_colored_passthrough_per_color_invariants(self):
        """
        Each color should be independently conserved:
          P1[A] + P2[A] = 1
          P1[B] + P2[B] = 1
        (Z3 may find other valid invariants too; we verify math, not exact labels.)
        """
        cs = _cs("cs_ab", "Msg", "enum", enumValues=["A", "B"])
        var = CPNVariable(id="v1", name="x", colorSetId="cs_ab")
        cpn = _cpn(
            places=[_place("p1", "Sender",  "cs_ab", "1`A ++ 1`B"),
                    _place("p2", "Receiver", "cs_ab", "")],
            transitions=[_trans("t1", "Send")],
            arcs=[_arc("a1", "p1", "t1", "place-to-transition", "x"),
                  _arc("a2", "t1", "p2", "transition-to-place",  "x")],
            color_sets=[cs],
            variables=[var],
        )
        invs, pc_pairs, N, m0 = self._run(cpn)

        assert len(invs) >= 1, "Expected at least one invariant for colored pass-through"

        for inv in invs:
            _verify_invariant_math(inv, pc_pairs, N)
            _verify_constant_math(inv, pc_pairs, m0)

        # At least one invariant must reference color-level granularity:
        # it should NOT have equal non-zero coefficients for both A and B
        # under both p1 and p2 simultaneously with sum=4 — OR it correctly
        # finds the per-color invariants.  Either way, EVERY returned
        # invariant must satisfy c·N=0 (already checked above).

        # Specific check: the total conservation constant across ALL tokens
        # equals len(initial marking) = 2  (1`A ++ 1`B)
        constants = {inv.constant for inv in invs}
        # The per-color constants are each 1; the aggregate constant is 2
        assert constants.issubset({1.0, 2.0}), (
            f"Unexpected constants: {constants}. Expected only 1.0 and/or 2.0"
        )

    # ------------------------------------------------------------------
    #  7d: Two independent sub-nets — separate invariants per sub-net
    #      P1→T1→P2 and P3→T2→P4 (no shared places)
    # ------------------------------------------------------------------
    def test_two_independent_cycles(self):
        """Each independent sub-net yields its own invariant."""
        cpn = _cpn(
            places=[
                _place("p1", "P1", "cs_unit", "2`()"),
                _place("p2", "P2", "cs_unit", ""),
                _place("p3", "P3", "cs_unit", "5`()"),
                _place("p4", "P4", "cs_unit", ""),
            ],
            transitions=[_trans("t1", "T1"), _trans("t2", "T2"),
                          _trans("t3", "T3"), _trans("t4", "T4")],
            arcs=[
                _arc("a1", "p1", "t1", "place-to-transition",  "()"),
                _arc("a2", "t1", "p2", "transition-to-place",  "()"),
                _arc("a3", "p2", "t2", "place-to-transition",  "()"),
                _arc("a4", "t2", "p1", "transition-to-place",  "()"),
                _arc("a5", "p3", "t3", "place-to-transition",  "()"),
                _arc("a6", "t3", "p4", "transition-to-place",  "()"),
                _arc("a7", "p4", "t4", "place-to-transition",  "()"),
                _arc("a8", "t4", "p3", "transition-to-place",  "()"),
            ],
            color_sets=[UNIT_CS],
        )
        invs, pc_pairs, N, m0 = self._run(cpn)

        assert len(invs) >= 2, "Expected at least two invariants for two independent cycles"

        for inv in invs:
            _verify_invariant_math(inv, pc_pairs, N)
            _verify_constant_math(inv, pc_pairs, m0)

        constants = {inv.constant for inv in invs}
        # Sub-net 1 conserves 2; sub-net 2 conserves 5
        assert 2.0 in constants, f"Missing constant=2 for first cycle; got: {constants}"
        assert 5.0 in constants, f"Missing constant=5 for second cycle; got: {constants}"

    # ------------------------------------------------------------------
    #  7e: Empty net returns no invariants (not an error)
    # ------------------------------------------------------------------
    def test_empty_net_returns_empty(self):
        cpn = _cpn(places=[], transitions=[], arcs=[], color_sets=[UNIT_CS])
        invs = _compute_s_invariants_z3(cpn)
        assert invs == []

    # ------------------------------------------------------------------
    #  7f: Integer-colored token passing — verify int-range bindings
    #      P1 --[x]→ T1{x∈{0,1}} --[x]→ P2
    # ------------------------------------------------------------------
    def test_integer_color_passthrough(self):
        cs = _cs("cs_int01", "Idx", "int", intMin=0, intMax=1)
        var = CPNVariable(id="v1", name="x", colorSetId="cs_int01")
        cpn = _cpn(
            places=[_place("p1", "Src",  "cs_int01", "1`0 ++ 1`1"),
                    _place("p2", "Dst",  "cs_int01", "")],
            transitions=[_trans("t1", "Move")],
            arcs=[_arc("a1", "p1", "t1", "place-to-transition", "x"),
                  _arc("a2", "t1", "p2", "transition-to-place",  "x")],
            color_sets=[cs],
            variables=[var],
        )
        invs, pc_pairs, N, m0 = self._run(cpn)

        assert len(invs) >= 1
        for inv in invs:
            _verify_invariant_math(inv, pc_pairs, N)
            _verify_constant_math(inv, pc_pairs, m0)

    # ------------------------------------------------------------------
    #  7g: Multi-token arc weights are correctly reflected in the matrix
    #      P1 --[2`()]→ T1 --[2`()]→ P2  (weight-2 arcs)
    # ------------------------------------------------------------------
    def test_weighted_arcs(self):
        """
        Weighted arcs: T1 consumes 2 from P1 and produces 2 to P2.
        N = [[-2], [+2]].  S-invariant (if any) must satisfy c·N=0 → c[P1]=c[P2].
        """
        cpn = _cpn(
            places=[_place("p1", "P1", "cs_unit", "4`()"),
                    _place("p2", "P2", "cs_unit", "")],
            transitions=[_trans("t1", "T1"), _trans("t2", "T2")],
            arcs=[
                _arc("a1", "p1", "t1", "place-to-transition",  "2`()"),
                _arc("a2", "t1", "p2", "transition-to-place",  "2`()"),
                _arc("a3", "p2", "t2", "place-to-transition",  "2`()"),
                _arc("a4", "t2", "p1", "transition-to-place",  "2`()"),
            ],
            color_sets=[UNIT_CS],
        )
        invs, pc_pairs, N, m0 = self._run(cpn)

        # Verify the incidence matrix has weight 2
        row_p1 = N[[pid for pid, _, _ in pc_pairs].index("p1")]
        assert -2 in row_p1, f"Expected -2 in P1 row, got: {row_p1}"

        for inv in invs:
            _verify_invariant_math(inv, pc_pairs, N)
            _verify_constant_math(inv, pc_pairs, m0)

    # ------------------------------------------------------------------
    #  7h: Unit place with "1`0" arc/marking notation (from the UI)
    #      The app renders unit tokens as  1`0  instead of  1`()
    #      Both marking and arc entries must be normalised to color ().
    # ------------------------------------------------------------------
    def test_unit_zero_notation_normalised(self):
        """
        Regression: marking="1`0" and arc inscription "1`0" on a unit place
        must be treated identically to "1`()".  If they are not normalised
        the incidence matrix stays all-zero and Z3 trivially 'proves'
        every place has constant 0.
        """
        cpn = _cpn(
            places=[_place("p1", "Idle",  "cs_unit", "1`0"),   # UI format
                    _place("p2", "Active","cs_unit", "")],
            transitions=[_trans("t1", "Start"), _trans("t2", "Stop")],
            arcs=[
                _arc("a1", "p1", "t1", "place-to-transition", "1`0"),  # UI format
                _arc("a2", "t1", "p2", "transition-to-place", "1`0"),
                _arc("a3", "p2", "t2", "place-to-transition", "1`0"),
                _arc("a4", "t2", "p1", "transition-to-place", "1`0"),
            ],
            color_sets=[UNIT_CS],
        )
        _, N = _build_colour_aware_matrix(cpn)

        # Matrix must NOT be all-zero
        any_nonzero = any(v != 0 for row in N for v in row)
        assert any_nonzero, (
            "Incidence matrix is all-zero: unit-token normalisation failed. "
            "Arc inscriptions of '1`0' were not mapped to color ()."
        )

        invs, pc_pairs, N2, m0 = self._run(cpn)

        assert len(invs) >= 1, (
            "No invariant found despite a simple cycle. "
            "Check unit-token normalisation in marking and arc evaluation."
        )
        # In a 2-place cycle with 1 token starting in P1:
        constants = {inv.constant for inv in invs}
        assert 1.0 in constants, f"Expected constant=1 (one token); got {constants}"

        for inv in invs:
            _verify_invariant_math(inv, pc_pairs, N2)
            _verify_constant_math(inv, pc_pairs, m0)
