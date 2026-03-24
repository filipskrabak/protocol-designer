# Plan: CPN Editor with Formal Verification & PNML

## TL;DR
Add a Colored Petri Nets (CPN) editor as tab 5 in the existing protocol designer, parallel to the EFSM editor. The CPN editor reuses VueFlow for the canvas, Pinia for state, and SVG metadata for persistence — all patterns already established by the EFSM. Formal verification runs in two tiers: bounded BFS state space in the frontend (TypeScript), and Z3 symbolic invariant checking in the backend (Python). HL-PNML (ISO 15909-2) is used for import/export. Protocol field definitions auto-generate CPN color sets. MQTT-SN verification will prove reachability, deadlock-freedom, liveness, and boundedness.

## User Choices
- Verification: Both tiers (frontend bounded + backend Z3)
- Color sets: Visual builder panel
- PNML: Standard HL-PNML (ISO 15909-2)
- Protocol integration: Auto-generate, allow editing
- Storage: SVG metadata (like FSMs)
- MQTT-SN properties: Reachability, Deadlock-freedom, Liveness, Boundedness

> **Risk legend**: 🔴 Critical (blocks correctness) | 🟠 High (significant extra work) | 🟡 Medium (manageable with care)

---

## Phase 1: Data Models & Type System

**Goal**: Define all CPN types and extend Protocol / stores.

### Steps
1. Add CPN interfaces to `frontend/src/contracts/models.ts`:
   - `ColorSetType = 'unit' | 'bool' | 'int' | 'enum'` — **scope-limited for thesis** (drop `product`, `list`, `string` for now; see Risk R3)
   - `ColorSet { id, name, type, intMin?, intMax?, enumValues?, description }`
   - `CPNVariable { id, name, colorSetId }` — bound to a color set
   - `CPNToken { value: any; colorSetId: string }` — for multiset markings
   - `CPNPlace { id, name, colorSetId, initialMarking: string, position, description }`
   - `CPNTransition { id, name, guard?, position, description }`
   - `CPNArc { id, sourceId, targetId, arcType: 'place-to-transition'|'transition-to-place', inscription: string }` — inscription is the arc expression (e.g. `1\`m`)
   - `ColoredPetriNet { id, name, description, author, version, created_at, updated_at, protocol_id?, places: CPNPlace[], transitions: CPNTransition[], arcs: CPNArc[], colorSets: ColorSet[], variables: CPNVariable[], metadata? }`
   - Extend `Protocol` interface: add `colored_petri_nets?: ColoredPetriNet[]`

2. **Create a dedicated `frontend/src/store/CPNStore.ts`** (do NOT add CPN to `ProtocolStore.ts`):
   - State: `currentCPNId: string | null`, `analysisResults`, `isAnalysisRunning`
   - Actions: `addCPN()`, `updateCPN(cpn)`, `deleteCPN(id)`, `getCurrentCPN()`, `getCPNById(id)`, `setCurrentCPN(id)`
   - Reads from `useProtocolStore().protocol.colored_petri_nets` (single source of truth in Protocol)
   - Rationale: ProtocolStore is already large; CPN analysis state (results, running flags) would bloat it further
   - 🟠 **Risk R8**: If CPN actions are mixed into ProtocolStore, the store becomes very hard to maintain and test in isolation.

3. Extend `frontend/src/store/ProtocolRenderStore.ts`:
   - Add `saveCPNChanges()` — serialize all CPN models as a JSON blob inside a `<cpn:data>` element within `<metadata>`, **using CDATA to avoid XML escaping issues with multiset expressions**
   - Add `loadCPNsFromMetadata()` — parse CPN data on SVG load (hook after the existing SCXML/FSM parsing in `saveFSMChanges()` flow)
   - 🟠 **Risk R9**: The existing `saveFSMChanges()` uses SCXML XML structure (namespace `scxml:`). CPN has no equivalent compact standard XML format. Using a JSON-in-CDATA approach is pragmatic but means CPN data is opaque to external XML tools. Document this explicitly.
   - 🟡 **Risk R10**: For large MQTT-SN models, the JSON blob in SVG metadata can grow large. Add a size warning in `saveCPNChanges()` if serialized size exceeds 500KB.

**Parallel with**: nothing — this is foundation, all other phases depend on it.

---

## Phase 2: PNML Import/Export

**Goal**: HL-PNML (ISO 15909-2) round-trip serialization.

### Steps
4. Create `frontend/src/utils/cpn/pnml.ts`:
   - `exportToPNML(cpn: ColoredPetriNet): string` — serialize to HL-PNML XML
     - `<pnml>` / `<net type="http://www.pnml.org/version-2009/grammar/highlevelnet">`
     - `<declaration>` block for color sets — **scope-limited to**: `finiteenumeration` (enum), `intrange` (int), `bool` (bool) — skip `productsort` and `listsort` (see Risk R4)
     - `<variabledecl>` for CPN variables
     - `<page>` with `<place>` (type + initialMarking), `<transition>` (condition), `<arc>` (inscription)
     - Include `<graphics>` position data from VueFlow node positions (required for import round-trip, see Risk R6)
   - `importFromPNML(xml: string): ColoredPetriNet` — parse HL-PNML XML back to internal model
     - Use browser `DOMParser` (XML mode) — consistent with existing SVG parsing pattern in ProtocolRenderStore
     - Parse `<graphics>` element into VueFlow `position` — **without this all imported nodes stack at (0,0)** (Risk R6)
     - Handle both color declarations (`<declaration>/<sorts>`) and variable declarations (`<variabledecl>`)
     - Map unrecognized sort types to `int` with a visible warning
   - `validatePNML(xml: string): { valid: boolean; errors: string[] }`
   - 🟠 **Risk R4**: HL-PNML is a large spec. Restricting to the three sort types above is safe and sufficient for MQTT-SN. Document the subset explicitly in the thesis to avoid reviewer questions.
   - 🟠 **Risk R6**: Failing to parse `<graphics>` on import is a silent layout loss. Test import from GreatSPN/PIPE early to catch schema differences.

5. **Add PNML export/import directly in the CPN editor toolbar** — do NOT add it to `ExportModal.vue`:
   - `ExportModal.vue` is protocol-header-centric (SVG, P4, Lua). Adding PNML there creates confusing UX ("why does my header have a Petri net export?") and appears even when no CPN exists.
   - Instead: toolbar button "Export PNML" → calls `exportToPNML()` → triggers download
   - Toolbar file-input "Import PNML" → reads `.pnml` file → calls `importFromPNML()` → populates CPNStore
   - 🟠 **Risk R7**: If PNML import is added to ExportModal, users will look for it in the wrong place. Keep CPN-specific actions in the CPN editor only.

**Depends on**: Step 1 (CPN types).

---

## Phase 3: CPN Canvas Editor Components

**Goal**: Full VueFlow-based CPN graph editor. Pattern: mirror `components/behavior/` structure.

### Steps
6. Create `frontend/src/components/cpn/ColoredPetriNet.vue` (main canvas):
   - VueFlow `<VueFlow>` with `nodeTypes` mapping to CPNPlaceNode and CPNTransitionNode
   - `edgeTypes` mapping to CPNArcEdge
   - Toolbar: new CPN, delete CPN, CPN selector dropdown (like FSM selector in FiniteStateMachine.vue)
   - Toolbar buttons: "Auto-generate color sets from protocol", import PNML, export PNML
   - Right-click context menu on canvas: add place / add transition
   - Double-click node → open edit dialog; double-click arc → open arc edit dialog
   - **Implement `isValidConnection` to enforce bipartiteness**: a connection is valid only if source node type ≠ target node type (place→transition or transition→place; reject place→place and transition→transition)
   - Sync VueFlow nodes/edges ↔ CPNStore on edit
   - 🔴 **Risk R2**: VueFlow does not enforce arc bipartiteness by default. Without `isValidConnection`, users can draw place→place arcs, silently producing an invalid Petri net that breaks all downstream analysis. This validation **must** be implemented in Phase 3, not deferred.

7. Create `frontend/src/components/cpn/CPNPlaceNode.vue`:
   - Circle shape (VueFlow custom node) — standard Petri net notation
   - Shows: place name (above), current initial marking (inside)
   - Visual indicator for color set type
   - Four handles (N/S/E/W) for arc connections — label handles as `type: 'place'` for use in `isValidConnection`

8. Create `frontend/src/components/cpn/CPNTransitionNode.vue`:
   - Rectangle shape, shows transition name + abbreviated guard
   - Visual distinction from FSM states (no rounded corners, no initial/final flags)
   - Label handles as `type: 'transition'` for use in `isValidConnection`

9. Create `frontend/src/components/cpn/CPNArcEdge.vue`:
   - Directed curved edge
   - Shows inscription expression as edge label
   - Arrowhead only at target end

10. Create `frontend/src/components/cpn/CPNPlaceEditDialog.vue`:
    - Fields: name, description, color set (dropdown from defined color sets), initial marking (text, e.g. `1\`CONNECT ++ 1\`DISCONNECT`)
    - Include syntax help for multiset notation

11. Create `frontend/src/components/cpn/CPNTransitionEditDialog.vue`:
    - Fields: name, description, guard expression (text), guard syntax help tooltip

12. Create `frontend/src/components/cpn/CPNArcEditDialog.vue`:
    - Fields: arc direction (display-only), inscription expression (text with variable suggestions)
    - Include syntax reference for supported inscription syntax (see Risk R1)

13. Create `frontend/src/components/cpn/composables/useCPNDragAndDrop.ts`:
    - Drag places/transitions from sidebar palette onto VueFlow canvas
    - Pattern: mirror `useFSMDragAndDrop.ts`

**Depends on**: Steps 1–3 (types + stores).

---

## Phase 4: Color Sets & Protocol Field Integration

**Goal**: Visual color set editor + automatic generation from protocol fields.

### Steps
14. Create `frontend/src/utils/cpn/colorSetGenerator.ts`:
    - `generateColorSetsFromProtocol(protocol: Protocol): ColorSet[]`
      - For each `Field` with `field_options`: create enum ColorSet (values = field option names)
      - For each numeric `Field` without options and fixed length ≤ 16 bits: create int ColorSet with `intMin=0, intMax=2^length-1`
      - Special case: 1-bit field → bool ColorSet
      - **Skip variable-length fields** (`is_variable_length === true`) — they have no defined upper bound (see Risk R11)
    - Returns array ready to add to a CPN

15. Create `frontend/src/components/cpn/CPNColorSetsPanel.vue`:
    - List of defined color sets with type badges
    - Add/edit/delete color set actions
    - "Import from Protocol" button → calls `generateColorSetsFromProtocol()`, adds to CPN
    - Edit dialog inline (name, type, int bounds, enum values list) — pattern from EFSMVariablesPanel.vue
    - Type-specific input validation
    - **Warn if an int color set has range > 255** (large ranges will cause binding explosion in analysis, see Risk R5)

16. Create `frontend/src/components/cpn/CPNVariablesPanel.vue`:
    - List of CPN variables, each bound to a color set
    - Add/edit/delete — pattern from EFSMVariablesPanel.vue

17. Create `frontend/src/components/cpn/CPNSidebar.vue`:
    - Tabbed panel (Color Sets | Variables | Analysis)
    - Tabs host CPNColorSetsPanel, CPNVariablesPanel, CPNAnalysis
    - Also includes draggable palette items (Place, Transition) for canvas drag-drop

**Depends on**: Steps 1–13.

---

## Phase 5: Frontend Verification (Bounded State Space)

**Goal**: BFS state space exploration for bounded CPNs.

### Key Data Structure
A **marking** = `Map<placeId, Multiset<tokenValue>>`. A **multiset** = `Map<value, count>`.

### Steps
18. Create `frontend/src/utils/cpn/tokenEvaluator.ts`:
    - **Write a custom multiset expression parser** — do NOT use `expr-eval` directly for arc inscriptions (see Risk R1):
      - Supported syntax: `varname`, `1\`value`, `2\`value ++ 1\`other`, simple arithmetic on the count (e.g. `n\`v` where n is a constant or variable)
      - `expr-eval` can be reused only for evaluating the *count* subexpression (the part before the backtick) once the multiset tokens have been split by `++`
    - `evaluateInscription(expr: string, bindings: Map<string, any>, colorSets: ColorSet[]): Multiset`
    - `evaluateGuard(expr: string, bindings: Map<string, any>): boolean` — guards are standard boolean expressions, safe to use `expr-eval` here
    - `isEnabled(transition, marking, arcs, variables, colorSets): BindingList`
      - Enumerate all value combinations for each variable from its color set
      - **Hard cap**: refuse to enumerate if total binding combinations exceed `maxBindings` (default 10,000) — surface a "too complex" warning to the user (see Risk R5)
    - 🔴 **Risk R1**: `expr-eval` does not understand `` 1`m ++ 2`ACK `` multiset notation — the backtick character is not an operator in `expr-eval`. A dedicated tokenizer (split on `++`, split on `` ` ``) is required before calling `expr-eval` on subexpressions. Underestimating this is the most likely cause of Phase 5 delay.

19. Create `frontend/src/utils/cpn/stateSpace.ts`:
    - `exploreStateSpace(cpn: ColoredPetriNet, options: { maxStates?, maxDepth?, boundK? }): StateSpaceResult`
    - BFS expansion: for each state, find all enabled transitions + their bindings → fire → new marking
    - Firing: remove consumed tokens from input places, add produced tokens to output places
    - State deduplication: serialize markings to a canonical JSON string (sort keys deterministically) for visited set
    - `StateSpaceResult`: `{ states: Marking[], transitions: FiredTransition[], truncated: boolean, stats }`
    - Pattern: mirror `deadlockDetectorBFS.ts` (BFS + bounded exploration)

20. Create `frontend/src/utils/cpn/properties.ts`:
    - `checkReachability(result: StateSpaceResult, targetCondition: (m: Marking) => boolean): PropertyResult`
    - `checkDeadlockFreedom(result: StateSpaceResult): PropertyResult` — any marking with 0 enabled bindings = deadlock
    - `checkBoundedness(result: StateSpaceResult, bound: number): PropertyResult` — max total token count per place across all markings
    - `checkLiveness(result: StateSpaceResult, transitionId: string): PropertyResult` — L1-liveness: from every reachable marking, there exists a firing sequence leading to a marking that enables transition t
      - Implementation: for each marking M in state space, do a BFS sub-search for a path to any marking where t is enabled
      - **Complexity warning**: O(|states|² × BFS cost) — only feasible for state spaces < ~1000 markings (see Risk R12)
    - `PropertyResult { passed: boolean, witness?: Marking, counterexample?: FiredTransition[], message: string }`

21. Create `frontend/src/components/cpn/CPNAnalysis.vue`:
    - "Run Analysis" button → triggers state space + property checks
    - Configuration: bound K, max states, max bindings per transition
    - Results: per-property pass/fail with witness/counterexample paths
    - Stats: reachable states count, truncated warning, binding-limit warnings
    - "Check Invariants (Z3)" button → POST to `/cpn/find-invariants` (Phase 6)
    - Pattern: mirror FSMAnalysis.vue

**Depends on**: Steps 14–17.

---

## Phase 6: Backend Z3 Verification (Invariants)

**Goal**: Symbolic place-invariant (S-invariant) checking via Z3, scoped to P/T-equivalent models.

### Scope clarification
🔴 **Risk R3**: True colored-net S-invariants require solving multiset linear equations over each color separately — far more complex than simple integer LP. The plan is **scoped to token-count invariants only** (ignoring token colors): treat each arc inscription's total multiplicity as its integer weight in the incidence matrix W. This is sound for P/T-equivalent CPNs (where all tokens are indistinguishable) and partially sound for colored nets (yields a necessary but not sufficient invariant). This limitation must be stated explicitly in the thesis.

### Steps
22. Extend `backend/src/z3_utils.py`:
    - `build_incidence_matrix(places: List, transitions: List, arcs: List) -> dict`
      - For each arc, parse inscription to extract integer multiplicity (e.g. `1\`m` → 1, `2\`ACK ++ 1\`m` → 3)
      - Build W[place][transition] = (output weight) - (input weight)
    - `find_s_invariant(places: List, transitions: List, arcs: List) -> Optional[Dict[str, int]]`
      - Ask Z3: find integer vector f (indexed by place) such that W^T · f = 0, f[i] ≥ 0, sum(f) > 0
      - Return `{ place_id: coefficient }` map
    - `find_all_minimal_s_invariants(places, transitions, arcs, max_count=10) -> List`
      - Iteratively exclude found solutions and re-solve; stop at `max_count` to avoid Z3 timeout

23. Create `backend/src/endpoints/cpn_analysis.py`:
    - All endpoints require `get_current_user` dependency (mirrors all other authenticated endpoints)
    - `POST /cpn/find-invariants`: accepts `{ places, transitions, arcs }`, returns list of S-invariant vectors
    - `POST /cpn/check-s-invariant`: accepts `{ places, transitions, arcs, candidateVector }`, returns bool + Z3 model
    - `POST /cpn/check-reachability`: simple forward-reachability check via Z3 (constraint on marking reachable from initial)
    - Pattern: mirror `fsm_analysis.py` (pydantic request/response models, router setup)
    - 🟠 **Risk R13**: Backend endpoints must require auth. Without `get_current_user`, they are open to unauthenticated abuse (anyone could POST large CPN models to DoS Z3). Apply the same dependency injection pattern as all other endpoints.

24. Register router in `backend/src/router.py`:
    - `app.include_router(cpn_analysis.router, prefix="/cpn", tags=["CPN"])`

25. Wire "Check Invariants (Z3)" button in `CPNAnalysis.vue` → POST `/cpn/find-invariants`:
    - Display S-invariants as `"2·Disconnected + 1·Active + 1·Asleep = const"` conservation law formulas
    - Show tooltip clarifying that invariants are token-count-based (not color-aware) for colored models

**Depends on**: Steps 18–21 (frontend model is defined and validated).

---

## Phase 7: Navigation & Final Integration

### Steps
26. Modify `frontend/src/pages/index.vue`:
    - Add nav list item under "Behavior":
      ```html
      <v-list-item prepend-icon="mdi-graph-outline" title="Colored Petri Net" value="cpn" @click="selectTab(5)" />
      ```
    - Add `<v-window-item :value="5">` with `<CPNEditor />`
    - Import `CPNEditor` from `@/components/cpn/ColoredPetriNet.vue`

27. Add PNML import trigger in `CPNEditor` toolbar (file input → `importFromPNML()` → populate CPN store)

**Depends on**: Steps 6–25.

---

## Relevant Files

### Modify (minimal changes)
- `frontend/src/contracts/models.ts` — add CPN type definitions
- `frontend/src/store/ProtocolStore.ts` — add CPN CRUD (mirror FSM methods)
- `frontend/src/store/ProtocolRenderStore.ts` — add `saveCPNChanges()`, `loadCPNFromMetadata()`
- `frontend/src/pages/index.vue` — add tab 5 + nav item
- `frontend/src/components/modals/ExportModal.vue` — add PNML format
- `backend/src/z3_utils.py` — add S/T-invariant functions
- `backend/src/router.py` — register CPN router

### Create (new)
- `frontend/src/utils/cpn/pnml.ts`
- `frontend/src/utils/cpn/colorSetGenerator.ts`
- `frontend/src/utils/cpn/tokenEvaluator.ts`
- `frontend/src/utils/cpn/stateSpace.ts`
- `frontend/src/utils/cpn/properties.ts`
- `frontend/src/components/cpn/ColoredPetriNet.vue`
- `frontend/src/components/cpn/CPNPlaceNode.vue`
- `frontend/src/components/cpn/CPNTransitionNode.vue`
- `frontend/src/components/cpn/CPNArcEdge.vue`
- `frontend/src/components/cpn/CPNSidebar.vue`
- `frontend/src/components/cpn/CPNAnalysis.vue`
- `frontend/src/components/cpn/CPNColorSetsPanel.vue`
- `frontend/src/components/cpn/CPNVariablesPanel.vue`
- `frontend/src/components/cpn/CPNPlaceEditDialog.vue`
- `frontend/src/components/cpn/CPNTransitionEditDialog.vue`
- `frontend/src/components/cpn/CPNArcEditDialog.vue`
- `frontend/src/components/cpn/composables/useCPNDragAndDrop.ts`
- `backend/src/endpoints/cpn_analysis.py`

---

## Verification

1. **Unit test PNML round-trip**: create a small CPN, export to PNML, re-import, compare resulting model
2. **State space sanity**: create a simple 2-place/1-transition net, verify state space has expected states
3. **Deadlock detection**: create a net with a known deadlock, confirm CPNAnalysis flags it
4. **MQTT-SN model**: build MQTT-SN as CPN (Disconnected/Active/Asleep/Awake/Lost places, message-type color sets), run all 4 property checks
5. **Z3 invariants**: run `POST /cpn/find-invariants` on MQTT-SN net; verify conservation laws match spec
6. **PNML interop**: export MQTT-SN CPN to .pnml, open in external HL-PNML viewer (e.g., GreatSPN) for cross-validation
7. **Protocol → color sets**: open Ethernet II / IPv4 protocol, use "Import from Protocol" in CPNColorSetsPanel, verify field options map correctly

---

## Decisions
- FSM code is NOT rewritten — CPN is additive
- **Dedicated `CPNStore.ts`** instead of bloating `ProtocolStore.ts`
- Storage: SVG metadata (JSON-in-CDATA under a `cpn:` element, same `<metadata>` block as SCXML)
- No new DB table needed
- Arc inscription parsing requires a **custom tokenizer** (not raw `expr-eval`); `expr-eval` is still used for guard and count sub-expression evaluation
- Verification scope: bounded K-nets (user sets K and maxBindings); state explosion is user's responsibility for large models
- HL-PNML only (not CPN-Tools XML, not plain P/T PNML)
- PNML import/export lives **in the CPN editor toolbar**, not in ExportModal
- S-invariant analysis is **token-count-only** (not full color-aware); document this scope in thesis
- All backend endpoints protected by `get_current_user`

---

## Risks & Mitigations

| ID | Severity | Risk | Mitigation |
|----|----------|------|------------|
| R1 | 🔴 Critical | `expr-eval` cannot parse CPN-ML multiset notation (`` 1`m ++ 2`ACK ``) — backtick is not an operator | Write a dedicated 2-step tokenizer: split by `++`, then split each token by backtick, then use `expr-eval` only on the count part |
| R2 | 🔴 Critical | VueFlow does not enforce bipartiteness (place→place arcs are silently allowed) | Implement `isValidConnection` callback in Phase 3 — check source and target node `type` field before allowing connection |
| R3 | 🔴 Critical | True colored-net S-invariants require multiset LP, not integer LP | Scope Z3 analysis to token-count invariants (P/T projection); state limitation explicitly in thesis |
| R4 | 🟠 High | HL-PNML `<declaration>` section is very large (productsort, listsort, arbitrary sort algebra) | Implement only `finiteenumeration`, `intrange`, `bool`; gracefully reject/warn on other sorts during import |
| R5 | 🟠 High | Variable binding enumeration: 3 int variables with range [0,255] = 16M combinations per transition per marking | Hard cap at 10,000 total binding combinations per transition; surface a clear UI warning; recommend enum color sets over large int ranges |
| R6 | 🟠 High | PNML import from external tools (GreatSPN, PIPE) without `<graphics>` parsing stacks all nodes at (0,0) | Parse `<graphics><position>` into VueFlow node `position`; test import from at least one external tool early |
| R7 | 🟠 High | Adding PNML to ExportModal creates wrong UX — PNML is not a header format | Keep PNML import/export exclusively in the CPN editor toolbar (resolved in revised Phase 2) |
| R8 | 🟠 High | Adding CPN management to ProtocolStore bloats an already large store | Use dedicated `CPNStore.ts` (resolved in revised Phase 1) |
| R9 | 🟡 Medium | CPN has no compact standard XML (unlike SCXML for FSM) — storage format must be chosen carefully | Use JSON-in-CDATA inside `<cpn:data>` element; clearly document that this is internal format, not interoperable |
| R10 | 🟡 Medium | SVG metadata grows large for complex CPN models | Add a serialized-size warning in `saveCPNChanges()` if > 500KB |
| R11 | 🟡 Medium | Variable-length protocol fields have no computable `intMax` | Skip variable-length fields in `generateColorSetsFromProtocol()`; surface them as unresolved with a note |
| R12 | 🟡 Medium | Liveness check is O(|states|² × BFS) — prohibitive for large models | Disable liveness check if state space > 500 markings; show a tooltip explaining the complexity |
| R13 | 🟡 Medium | Backend CPN endpoints are open to unauthenticated abuse without auth | Apply `get_current_user` dependency to all `/cpn/*` endpoints (resolved in revised Phase 6) |
| R14 | 🟡 Medium | MQTT-SN QoS 1/2 retransmission logic is hard to express with standard arcs | Use guard conditions on transitions to approximate QoS behavior; document that inhibitor arcs are out of scope |

---

## Further Considerations
1. **Arc expression language complexity**: CPN-ML supports complex product types and complex expressions. For thesis scope, supporting `varname`, `1\`value`, `1\`v ++ 1\`w` (multiset addition), and simple arithmetic on counts should be sufficient. Full CPN-ML parsing is out of scope — document this boundary.
2. **MQTT-SN concurrency**: MQTT-SN involves a broker + multiple clients. A full concurrent model produces large state spaces. For thesis, model a single client-broker interaction (sequential, bounded); discuss scalability limitations separately.
3. **QoS levels**: QoS 0 (fire-and-forget) maps cleanly to CPN arcs. QoS 1/2 require retransmission logic that is awkward without inhibitor arcs. Use guarded transitions as an approximation; acknowledge this in the thesis.
4. **`FormalModel` interface** (from [docs/FORMAL_VERIFICATION_GAP_ANALYSIS.md](docs/FORMAL_VERIFICATION_GAP_ANALYSIS.md)): optionally extract a shared `FormalModel` interface that both `FiniteStateMachine` and `ColoredPetriNet` implement — nice architectural talking point for the thesis but not required for functionality.
5. **Two VueFlow instances**: running FSM and CPN canvases as separate tab components is safe — VueFlow's `useVueFlow()` scopes internal state per component instance. No isolation issues expected.
