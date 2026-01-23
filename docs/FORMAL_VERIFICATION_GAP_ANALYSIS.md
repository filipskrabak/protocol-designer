# Formal Verification Gap Analysis

## Current Implementation vs. Formal Event-Driven Verification Instructions

### ✅ What We Have Right

1. **State Representation**: We have `FSMNode` and `FSMEdge` similar to `State` and `Transition`
2. **Guard Support**: Transitions have guards (though as string expressions, not functions)
3. **Event Types**: Edges have `event` property
4. **Execution Tracking**: `GuardEvaluationTrace` tracks history
5. **DFS Implementation**: `exploreAllPaths()` exists with guard/action evaluation
6. **Deadlock Detection**: Multiple types (progress, circular, starvation, terminal)

### ❌ Critical Gaps

#### 1. **Event-Centric Architecture** ❌
- **Current**: Transitions are edge-centric; events are just metadata
- **Required**: Events should be the primary abstraction that drives everything
- **Impact**: Cannot formally verify event sequences or event-driven properties

#### 2. **Pure Function Event Application** ❌
- **Current**: Imperative DFS with side effects
- **Required**: `applyEvent(model, context, event) -> newContext` pure function
- **Impact**: Cannot unit test event application in isolation

#### 3. **Formal Error Types** ⚠️
- **Current**: Warnings and deadlock types, but not formal error classes
- **Required**: `InvalidTransitionError`, `NonDeterminismError`, etc.
- **Impact**: Cannot catch and handle specific verification failures programmatically

#### 4. **Non-Determinism Detection** ❌
- **Current**: Only checks if multiple transitions have same event from same state
- **Required**: Must detect when multiple guards pass for same event
- **Impact**: Missing EFSM non-determinism (e.g., `x > 5` and `x > 3` both true)

#### 5. **Property Abstraction** ❌
- **Current**: Hardcoded checks (deadlock, reachability, etc.)
- **Required**: `Property` interface with `check()` and `onViolation()`
- **Impact**: Cannot add custom properties or compose verification rules

#### 6. **ExecutionContext** ⚠️
- **Current**: Have traces but not a formal context object
- **Required**: `{ currentState, history }` with immutable updates
- **Impact**: Less composable and testable

#### 7. **exploreAllPaths Not Integrated** ❌
- **Current**: Function exists but never called
- **Required**: Should be the core DFS verification engine
- **Impact**: Guard/action evaluation not used in actual deadlock detection

### 📋 Architecture Comparison

| Aspect | Current | Required | Status |
|--------|---------|----------|--------|
| Event abstraction | Metadata on edges | First-class `Event` interface | ❌ |
| State evolution | Imperative navigation | Pure `applyEvent()` | ❌ |
| Guard evaluation | String expressions | `(payload) => boolean` | ⚠️ Works but different |
| Error handling | Warnings/booleans | Error classes | ❌ |
| Property verification | Hardcoded checks | `Property` interface | ❌ |
| Non-determinism | Basic event check | Full guard evaluation | ❌ |
| Execution tracking | Traces | `ExecutionContext` | ⚠️ Close |
| DFS integration | Not used | Core engine | ❌ |
| Future extensibility | FSM-specific | `FormalModel` interface | ❌ |

## Implementation Plan

### Phase 1: Event-Driven Core (CRITICAL)
1. Define formal `Event` interface
2. Implement `applyEvent()` pure function
3. Create `ExecutionContext` with history
4. Define error classes

### Phase 2: Property System
1. Create `Property` interface
2. Implement built-in properties (deadlock, forbidden states, etc.)
3. Add property composition

### Phase 3: EFSM Integration
1. Integrate `exploreAllPaths()` into verification
2. Add non-determinism detection for guards
3. Connect guard/action evaluation to event application

### Phase 4: Formal Verification Engine
1. Implement `verifyEventSequence()`
2. Add immediate violation detection
3. Provide traceable results

### Phase 5: Future-Proofing
1. Extract `FormalModel` interface
2. Prepare for Petri Net support
3. Ensure deterministic execution

## Immediate Action Required

**Priority 1**: Integrate `exploreAllPaths()` into deadlock detection
- Currently unused despite full implementation
- Contains guard/action evaluation logic
- Should replace or augment current reachability checks

**Priority 2**: Add EFSM non-determinism detection
- Check if multiple guards can pass simultaneously
- Detect ambiguous transitions

**Priority 3**: Formalize error types
- Convert warnings to proper error classes
- Enable programmatic error handling
