# Plan: CPN Editor with Formal Verification & PNML

## TL;DR
Add a Colored Petri Nets (CPN) editor as tab 5 in the existing protocol designer, parallel to the EFSM editor. The CPN editor reuses VueFlow for the canvas, Pinia for state, and SVG metadata for persistence — all patterns already established by the EFSM. Formal verification runs in two tiers: bounded BFS state space in the frontend (TypeScript), and Z3 symbolic invariant checking in the backend (Python). HL-PNML (ISO 15909-2) is used as **both** the internal storage format (each CPN stored as a `<net>` element in SVG `<metadata>`, mirroring how FSMs use `<scxml:scxml>`) and the future interop format. Non-standard fields use standard `<toolspecific tool="protocol-designer">` extensions (ISO 15909-2 §7.3.3). Protocol field definitions auto-generate CPN color sets. MQTT-SN verification will prove reachability, deadlock-freedom, liveness, and boundedness.

## User Choices
- Verification: Both tiers (frontend bounded + backend Z3)
- Color sets: Visual builder panel
- PNML: Standard HL-PNML (ISO 15909-2)
- Protocol integration: Auto-generate, allow editing
- Storage: HL-PNML `<net>` elements in SVG `<metadata>` — same XML-native approach as SCXML for FSMs; non-standard fields (description, author, version, created_at, updated_at, protocol_id, arc handles) stored in `<toolspecific tool="protocol-designer">` blocks per ISO 15909-2 §7.3.3
- MQTT-SN properties: Reachability, Deadlock-freedom, Liveness, Boundedness

---

## Phase 1: Data Models & Type System

**Goal**: Define all CPN types and extend Protocol / stores.

### Steps
1. Add CPN interfaces to `frontend/src/contracts/models.ts`:
   - `ColorSetType = 'unit' | 'bool' | 'int' | 'string' | 'enum' | 'product' | 'list'`
   - `ColorSet { id, name, type, intMin?, intMax?, enumValues?, productOf?, description }`
   - `CPNVariable { id, name, colorSetId }` — bound to a color set
   - `CPNToken { value: any; colorSetId: string }` — for multiset markings
   - `CPNPlace { id, name, colorSetId, initialMarking: string, position, description }`
   - `CPNTransition { id, name, guard?, position, description }`
   - `CPNArc { id, sourceId, targetId, arcType: 'place-to-transition'|'transition-to-place', inscription: string }` — inscription is the arc expression (e.g. `1\`m`)
   - `ColoredPetriNet { id, name, description, author, version, created_at, updated_at, protocol_id?, places: CPNPlace[], transitions: CPNTransition[], arcs: CPNArc[], colorSets: ColorSet[], variables: CPNVariable[], metadata? }`
   - Extend `Protocol` interface: add `colored_petri_nets?: ColoredPetriNet[]`

2. Extend `frontend/src/store/ProtocolStore.ts`:
   - State: `currentCPNId: string | null`
   - Actions: `addCPN()`, `updateCPN(cpn)`, `deleteCPN(id)`, `getCurrentCPN()`, `getCPNById(id)`, `setCurrentCPN(id)`
   - Mirror existing FSM management methods (addFSM, updateFSM, etc.)

3. Extend `frontend/src/store/ProtocolRenderStore.ts`:
   - Add `saveCPNChanges(cpn: ColoredPetriNet)` — serialize CPN to SVG `<metadata>` under a `cpn:` namespace
   - Add `loadCPNFromMetadata()` — parse CPN data on SVG import (hook into existing `loadProtocolFromSVG`)
   - Pattern: mirror existing `saveFSMChanges()` / FSM serialization

**Parallel with**: nothing — this is foundation, all other phases depend on it.

---

## Phase 2: PNML Import/Export (UI — Deferred)

**Status: DEFERRED** — Internal storage already uses HL-PNML natively (implemented in Phase 1). The user-facing import/export feature will be added later as a dedicated step integrated directly in the app.

**Goal**: Expose HL-PNML (ISO 15909-2) as a user-visible import/export option.

### Steps (when implemented)
4. ~~Create `frontend/src/utils/cpn/pnml.ts`~~ — **Already done** as part of internal PNML storage. `exportToPNML`, `importFromPNML`, `validatePNML` all exist in `frontend/src/utils/cpn/pnml.ts` with full `<toolspecific>` round-trip for non-standard fields.

5. Add PNML export/import to `frontend/src/components/modals/ExportModal.vue` (or a dedicated dialog):
   - New `ExportFormat` entry: `{ id: 'pnml', name: 'HL-PNML', fileExtension: 'pnml', ... }`
   - New `ExportHandler` that calls `exportToPNML()` and triggers file download
   - Import: file picker → `importFromPNML()` → load into CPNStore

**Depends on**: Phase 1 complete (done).

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
   - Sync VueFlow nodes/edges ↔ CPNStore on edit

7. Create `frontend/src/components/cpn/CPNPlaceNode.vue`:
   - Circle shape (VueFlow custom node) — standard Petri net notation
   - Shows: place name (above), current initial marking (inside)
   - Visual indicator for color set type
   - Two handles (top/bottom and left/right) for arc connections

8. Create `frontend/src/components/cpn/CPNTransitionNode.vue`:
   - Rectangle shape, shows transition name + abbreviated guard
   - Visual distinction from FSM states (no rounded corners, no initial/final flags)

9. Create `frontend/src/components/cpn/CPNArcEdge.vue`:
   - Directed curved edge
   - Shows inscription expression as edge label
   - Arrowhead only at target end

10. Create `frontend/src/components/cpn/CPNPlaceEditDialog.vue`:
    - Fields: name, description, color set (dropdown from defined color sets), initial marking (text, e.g. `1\`CONNECT ++ 1\`DISCONNECT`)

11. Create `frontend/src/components/cpn/CPNTransitionEditDialog.vue`:
    - Fields: name, description, guard expression (text), guard syntax help tooltip

12. Create `frontend/src/components/cpn/CPNArcEditDialog.vue`:
    - Fields: arc direction (display-only), inscription expression (text with variable suggestions)

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
      - For each numeric `Field` without options: create int ColorSet with `intMin=0, intMax=2^length-1`
      - Special case: boolean field (length=1) → bool ColorSet
    - Returns array ready to add to a CPN

15. Create `frontend/src/components/cpn/CPNColorSetsPanel.vue`:
    - List of defined color sets with type badges
    - Add/edit/delete color set actions
    - "Import from Protocol" button → calls `generateColorSetsFromProtocol()`, adds to CPN
    - Edit dialog inline (name, type, int bounds, enum values list) — pattern from EFSMVariablesPanel.vue
    - Type-specific input validation

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
    - `evaluateInscription(expr: string, bindings: Map<string, any>, colorSets: ColorSet[]): Multiset`
      - Parse arc inscription expressions: `1\`m`, `2\`ACK ++ 1\`m`, etc.
      - Evaluate variable bindings to produce concrete token multisets
    - `evaluateGuard(expr: string, bindings: Map<string, any>): boolean`
    - `isEnabled(transition, marking, arcs, variables, colorSets): BindingList` — returns all valid variable bindings that enable the transition
    - Reuse `expr-eval` library (already in package.json)

19. Create `frontend/src/utils/cpn/stateSpace.ts`:
    - `exploreStateSpace(cpn: ColoredPetriNet, options: { maxStates?, maxDepth?, boundK? }): StateSpaceResult`
    - BFS expansion: for each state, find all enabled transitions + their bindings → fire → new marking
    - Firing: remove consumed tokens from input places, add produced tokens to output places
    - State deduplication: serialize markings to string for visited set
    - `StateSpaceResult`: `{ states: Marking[], transitions: FiredTransition[], truncated: boolean, stats }`
    - Pattern: mirror `deadlockDetectorBFS.ts` (BFS + bounded exploration)

20. Create `frontend/src/utils/cpn/properties.ts`:
    - `checkReachability(result: StateSpaceResult, targetCondition: (m: Marking) => boolean): PropertyResult`
    - `checkDeadlockFreedom(result: StateSpaceResult): PropertyResult` — any state with 0 enabled transitions = deadlock
    - `checkBoundedness(result: StateSpaceResult, bound: number): PropertyResult` — max token count across all states/places
    - `checkLiveness(result: StateSpaceResult, transitionId: string): PropertyResult` — from every reachable state, transition _t_ is eventually fireable
    - `PropertyResult { passed: boolean, witness?: Marking, counterexample?: FiredTransition[], message: string }`

21. Create `frontend/src/components/cpn/CPNAnalysis.vue`:
    - "Run Analysis" button → triggers state space + property checks
    - Configuration: bound K, max states
    - Results: per-property pass/fail with witness/counterexample paths
    - Stats: reachable states count, truncated warning
    - Pattern: mirror FSMAnalysis.vue

**Depends on**: Steps 14–17.

---

## Phase 6: Backend Z3 Verification (Invariants)

**Goal**: Symbolic S-invariant and T-invariant checking via Z3.

### Steps
22. Extend `backend/src/z3_utils.py`:
    - `check_s_invariant(places: List, arcs: List, candidate_vector: List[int]) -> bool`
      - Build place flow matrix W (from arc inscriptions, treating as integer coefficients)
      - Check: W·f = 0 (S-invariant condition) via Z3 linear arithmetic
    - `find_s_invariant(places: List, arcs: List) -> Optional[List[int]]`
      - Ask Z3 to find non-trivial f such that W·f = 0, f[i] >= 0, sum(f) > 0
    - `check_t_invariant(transitions: List, arcs: List) -> Optional[List[int]]`
      - Find firing sequence that returns to initial marking

23. Create `backend/src/endpoints/cpn_analysis.py`:
    - `POST /cpn/check-s-invariant`: accepts `{ places, arcs, candidateVector? }`, returns invariant result
    - `POST /cpn/find-invariants`: finds all minimal S-invariants (bounds analysis)
    - `POST /cpn/check-reachability`: Z3 constraint-based marking reachability query
    - Pattern: mirror `fsm_analysis.py` (pydantic request/response models, router setup)

24. Register router in `backend/src/router.py`:
    - `app.include_router(cpn_analysis.router, prefix="/cpn", tags=["CPN"])`

25. Add backend Z3 call in `CPNAnalysis.vue`:
    - "Check Invariants (Z3)" button → POST to `/cpn/find-invariants`
    - Display S-invariants as "(2·p1 + 1·p2 = const)" formulas
    - Invariants imply conservation laws → directly useful for MQTT-SN proofs (e.g., "total message count is conserved")

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
- Storage: SVG metadata (cpn: namespace prefix, same approach as FSM)
- No new DB table needed
- Arc-expression evaluation reuses `expr-eval` (already in package.json)
- Verification scope: bounded K-nets (user sets K); state explosion is user's responsibility for large models
- HL-PNML only (not CPN-Tools XML, not plain P/T PNML)

## Further Considerations
1. **Arc expression language complexity**: CPN-ML supports complex product types and complex expressions. For thesis scope, supporting `1\`value`, `var`, `1\`v ++ 1\`w` (multiset addition), and simple arithmetic should be sufficient. Full CPN-ML parsing is out of scope.
2. **MQTT-SN concurrency**: MQTT-SN involves a broker + multiple clients. A full concurrent model produces large state spaces. For thesis, model a single client-broker interaction (sequential, bounded).
3. **FormalModel interface (from gap analysis)**: Optionally extract a shared `FormalModel` interface that both FiniteStateMachine and ColoredPetriNet implement — enables shared verification tooling. This is a nice-to-have for thesis architecture discussion but not required for functionality.
