# Deadlock Detection Visual Examples

## 1. Progress Deadlock

### Example: Unreachable Final State

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Initial │────────▶│ State A │────────▶│  Final  │
└─────────┘         └─────────┘         └─────────┘
                         │
                         │
                         ▼
                    ┌─────────┐
                    │ State B │  ⛔ DEADLOCK!
                    │(trapped)│  (can't reach Final)
                    └─────────┘
```

**Analysis Result**:
- State B is reachable from Initial
- No path from State B to Final
- **Detection**: Progress Deadlock ⛔

**Fix**: Add transition B → Final or B → A

---

## 2. Circular Wait Deadlock

### Example: Mutual Dependency

```
State A:
  Condition: flag1 == true
  Action: set flag2 = true
     │
     ▼
State B:
  Condition: flag2 == true
  Action: set flag1 = true
     │
     └──────────────┐
                    │
                    ▼
           ⚠️ CIRCULAR WAIT!
```

**Wait-For Graph**:
```
A ──(waits for flag1)──▶ B
▲                        │
│   (waits for flag2)    │
└────────────────────────┘
```

**Detection**: Cycle in wait-for graph ⚠️

**Fix**: 
- Set initial flag value
- Break dependency chain
- Add alternative path

---

## 3. Event Starvation

### Example: Unreachable Event Source

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Initial │────────▶│ State A │────────▶│  Final  │
└─────────┘         └─────────┘         └─────────┘


                    ┌─────────┐  [timeout]  ┌─────────┐
                    │ State C │───────────▶│ State D │
                    │(unreachable)          └─────────┘
                    └─────────┘
                         ⚠️ Event "timeout" can never fire!
```

**Analysis Result**:
- Event "timeout" is defined on transition C → D
- State C is not reachable from Initial
- **Detection**: Event Starvation ⚠️

**Fix**: 
- Remove unreachable states/transitions
- Add path to make State C reachable

---

## 4. Safe Cycle (No Deadlock)

### Example: Loop with Exit

```
                    ┌─────────┐
                    │  Retry  │◀───┐
                    └─────────┘    │
                         │         │
                         │    [retry]
                         │         │
┌─────────┐         ┌─────────┐   │
│ Initial │────────▶│ Process │───┘
└─────────┘         └─────────┘
                         │
                    [success]
                         │
                         ▼
                    ┌─────────┐
                    │  Final  │
                    └─────────┘
```

**Analysis Result**:
- Cycle exists: Process ↔ Retry
- Both states have path to Final
- **Detection**: Cycle detected ✓, No deadlock ✓

---

## 5. Complex Deadlock Pattern

### Example: Partial Reachability

```
┌─────────┐         ┌─────────┐
│ Initial │────────▶│ State A │
└─────────┘         └─────────┘
                         │
                         ├──────────────────┐
                         │                  │
                         ▼                  ▼
                    ┌─────────┐       ┌─────────┐
                    │ State B │       │ State C │
                    └─────────┘       └─────────┘
                         │                  │
                         ▼                  │
                    ┌─────────┐            │
                    │  Final  │◀───────────┘
                    └─────────┘

      ⛔ State B is deadlocked!
         (reachable but no path to Final)
```

**Analysis**:
- Path 1: Initial → A → B (dead end)
- Path 2: Initial → A → C → Final ✓
- **Detection**: Progress Deadlock on State B ⛔

---

## 6. Wait-For Graph Example

### Original FSM

```
State X: condition "count > 0", action "increment total"
State Y: condition "total > 10", action "increment count"
State Z: condition "ready == true", action "set ready = false"
```

### Extracted Dependencies

```
X depends on "count" → Y sets "count"
Y depends on "total" → X sets "total"
Z depends on "ready" → Z sets "ready"
```

### Wait-For Graph

```
    X ◀────┐
    │      │
    ▼      │
    Y ─────┘  ⚠️ Circular dependency!

    Z ◀────┐
    │      │
    └──────┘  ✓ Self-loop (acceptable with exit condition)
```

---

## 7. Determinism vs Deadlock

### Non-Deterministic (Warning)

```
            [event: "packet"]
State A ──────────────────────▶ State B
  │
  │     [event: "packet"]
  └─────────────────────────▶ State C

⚠️ Same event, no conditions → Non-deterministic
   (not a deadlock, but ambiguous behavior)
```

### Deterministic with Conditions

```
            [event: "packet" | type == 1]
State A ────────────────────────────────▶ State B
  │
  │     [event: "packet" | type == 2]
  └────────────────────────────────────▶ State C

✓ Same event, different conditions → Deterministic
  (not a deadlock, not ambiguous)
```

---

## 8. Real-World Example: TCP State Machine

### Simplified TCP Connection FSM

```
┌─────────┐  [SYN]   ┌──────────┐  [ACK]   ┌─────────────┐
│  CLOSED │─────────▶│ SYN_SENT │─────────▶│ ESTABLISHED │
└─────────┘          └──────────┘          └─────────────┘
                                                   │
                                              [FIN]│
                                                   ▼
                                            ┌──────────┐
                                            │ FIN_WAIT │
                                            └──────────┘
                                                   │
                                              [ACK]│
                                                   ▼
                                            ┌─────────┐
                                            │ CLOSED  │
                                            └─────────┘
```

**Analysis**: ✓ No deadlocks
- All states reachable from CLOSED (initial)
- All states can reach CLOSED (final)
- No circular dependencies

### With Deadlock Bug

```
┌─────────┐  [SYN]   ┌──────────┐  [ACK]   ┌─────────────┐
│  CLOSED │─────────▶│ SYN_SENT │─────────▶│ ESTABLISHED │
└─────────┘          └──────────┘          └─────────────┘
                          │                        │
                     [RST]│                   [FIN]│
                          ▼                        ▼
                    ┌──────────┐            ┌──────────┐
                    │  ERROR   │⛔          │ FIN_WAIT │
                    └──────────┘            └──────────┘
                    (no exit!)                   │
                                            [ACK]│
                                                 ▼
                                            ┌─────────┐
                                            │ CLOSED  │
                                            └─────────┘
```

**Analysis**: ⛔ Progress Deadlock
- ERROR state is reachable (on RST)
- ERROR state cannot reach CLOSED (final)
- **Fix**: Add ERROR → CLOSED transition

---

## 9. Livelock vs Deadlock

### Deadlock (System Stuck)

```
State A ◀────▶ State B
(cycling but both wait for external event that never comes)

⛔ No progress possible
```

### Livelock (Busy-Wait, No Progress)

```
State A ─[retry]─▶ State B ─[retry]─▶ State A
   │                                      │
   └──────────────────────────────────────┘
         (infinite retry loop)

⚠️ System active but not progressing toward goal
   (harder to detect, requires temporal logic)
```

**Current Implementation**: Detects deadlock ✓, livelock detection is future work ⏳

---

## 10. Visualization Legend

### Symbols Used

```
┌─────────┐
│  State  │    Rectangle: FSM State
└─────────┘

────────▶      Arrow: Transition

[event]        Square brackets: Event name

◀────▶         Double arrow: Bidirectional transition

⛔             Red stop sign: Critical deadlock

⚠️             Yellow warning: Potential issue

✓              Green check: Valid/OK

│              Vertical line: Connection
├──            Branch point
└──            End of branch
```

### Color Coding in UI

- 🟢 **Green**: No issues (success)
- 🟡 **Yellow**: Warnings (potential issues)
- 🔴 **Red**: Critical errors (must fix)

---

## Summary Table

| Deadlock Type | Severity | Example | Fix Strategy |
|---------------|----------|---------|--------------|
| Progress Deadlock | ⛔ Critical | Reachable state with no path to final | Add exit transition |
| Circular Wait | ⚠️ Warning | A waits for B, B waits for A | Break dependency chain |
| Event Starvation | ⚠️ Warning | Event source unreachable | Remove dead code or add path |
| Terminal Non-Final | ⚠️ Warning | All exits have unsatisfiable conditions | Fix conditions or add unconditional exit |

---

## Interactive Elements (Future)

### Planned Visualizations

1. **Highlight on Canvas**: Click deadlock warning → states highlighted in red
2. **Path Animation**: Animate execution path leading to deadlock
3. **Wait-For Graph Overlay**: Toggle view showing dependency edges
4. **Trace Replay**: Step through counterexample execution

**Status**: Algorithms implemented ✓, Visualization planned for Phase 4 ⏳
