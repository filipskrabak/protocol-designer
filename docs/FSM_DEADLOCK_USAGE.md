# FSM Deadlock Detection - User Guide

## Overview

The FSM builder now includes comprehensive deadlock detection to help you identify and fix potential issues in your finite state machine designs before deployment.

## How to Use

### 1. Analyze Your FSM

Click the **"Analyze FSM"** button (refresh icon) in the FSM Properties panel on the right sidebar.

The analysis runs automatically and displays results in expandable sections.

### 2. Understanding the Results

#### Overall Status ✅/⚠️

Shows high-level metrics:
- Total states and transitions
- Number of initial and final states
- Overall validity (green ✓ or yellow ⚠️)

#### Structural Properties

Basic checks for FSM design:
- **All States Reachable**: Can every state be reached from the initial state?
- **Deterministic**: Does the FSM have ambiguous transitions? (same event with same conditions from one state)
- **No Dead States**: Are there states with no outgoing transitions (except final states)?
- **Has Initial State**: Does the FSM have exactly one starting point?
- **Has Final State**: Does the FSM have at least one accepting/final state?

#### Graph Properties

Topological analysis:
- **Strongly Connected**: Can all states reach each other?
- **Maximum Depth**: Longest possible path through the FSM
- **Cycles Detected**: Does the FSM contain loops?
- **Self-Loops**: States that transition to themselves

#### Deadlock Analysis 🔒

**This is the most important section** - it detects four types of deadlocks:

##### 1. Progress Deadlock ⛔ (Critical)
**Problem**: States that you can reach but that have no path to any final state.

**Example**:
```
Initial → State A → State B → Final
               ↓
          Error State (no way out!)
```

**Why it's bad**: Your system can get stuck in a state it can never complete from.

**How to fix**:
- Add a transition from the deadlocked state to a final state
- Add a transition back to a state that can reach final
- Remove the unreachable path if it's not needed

##### 2. Circular Wait ⚠️ (Warning)
**Problem**: States have circular dependencies - State A waits for State B, which waits for State A.

**Example**:
```
State A: transition requires "flag1 = true", sets "flag2 = true"
State B: transition requires "flag2 = true", sets "flag1 = true"
```

**Why it's concerning**: If conditions depend on each other circularly, the FSM may never progress.

**How to fix**:
- Review transition conditions and actions
- Break the circular dependency by setting initial values
- Add alternative transition paths

##### 3. Event Starvation ⚠️ (Warning)
**Problem**: Events that can never be triggered because their source states are unreachable.

**Example**:
```
Initial → State A → State B → Final

State C (unreachable) --[event: "timeout"]--> State D
```

**Why it's concerning**: Dead code in your FSM - these transitions will never execute.

**How to fix**:
- Remove the unreachable states and transitions
- Add a path to make the states reachable (if intended)
- Check if you forgot to connect part of your FSM

##### 4. Terminal Non-Final States ⚠️ (Warning)
**Problem**: States that are reachable but have no valid way to continue (all exit conditions may be unsatisfiable).

**Example**:
```
State X: has transition requiring "x > 10"
         but x can never be greater than 10 in this state
```

**Why it's concerning**: The FSM appears to have exits but they're unusable.

**How to fix**:
- Review transition conditions for satisfiability
- Add unconditional transitions if needed
- Verify that actions in previous states set appropriate values

### 3. Interpreting Icons

- ✅ **Green Check**: All good, no issues detected
- ⚠️ **Yellow Alert**: Warning - potential issue that may or may not be a problem
- ❌ **Red X**: Critical error - FSM has fundamental issues

### 4. Detailed Cycle Information

If circular waits are detected, you'll see detailed cycle information showing the exact dependency chain:

```
Cycle 1: State A → State B → State C → State A
```

This helps you identify exactly which states are involved in the circular dependency.

## Common Scenarios

### Scenario 1: "I have progress deadlocks"

**Symptom**: States listed under "Progress Deadlock" section

**Solution**:
1. Identify the listed states in your FSM canvas
2. For each state, ask: "How should execution proceed from here?"
3. Add transitions to either:
   - A final state (if execution should end)
   - A state that has a path to final (if execution should continue)

**Example Fix**:
```
BEFORE:
Initial → Processing → Error (stuck!)
               ↓
             Success → Final

AFTER:
Initial → Processing → Error → Final (added transition)
               ↓
             Success → Final
```

### Scenario 2: "I want cycles but no deadlock warning"

**Symptom**: You have intentional cycles (loops) but want to ensure they're safe

**Solution**:
- Cycles themselves aren't deadlocks if there's an exit path
- Ensure every state in the cycle can eventually reach a final state
- The analysis will show cycles exist but no progress deadlock if implemented correctly

**Example Safe Cycle**:
```
Initial → Retry ⟷ Process → Success → Final
                    ↓
                  Error → Final
```

### Scenario 3: "Event starvation but it's intentional"

**Symptom**: Some events flagged as never triggering

**Solution**:
- If the event/state is truly unused, remove it (dead code cleanup)
- If it should be used, add a path from reachable states
- Document if it's intentionally reserved for future use

## Best Practices

### 1. Analyze Early and Often
- Run analysis after adding major state/transition changes
- Don't wait until FSM is complete

### 2. Fix Critical Issues First
- ⛔ Progress deadlocks are critical - fix immediately
- ⚠️ Warnings can sometimes be acceptable (document why)

### 3. Document Intentional Patterns
- If you have a valid reason for a warning (e.g., intentional dead end), add comments in the FSM description

### 4. Use Final States Properly
- Every FSM should have at least one final state
- Final states represent successful completion
- Error states should also be marked as final if they're acceptable end states

### 5. Test Execution Paths
- Mentally walk through different scenarios
- Verify every reachable state has a way to complete

## Limitations

The current deadlock detection has some limitations:

1. **Condition Satisfiability**: Cannot fully verify if complex conditions are satisfiable (uses heuristics)
2. **Action Effects**: Limited parsing of action side effects
3. **No Resource Modeling**: Cannot detect resource-based deadlocks
4. **Concurrency**: Assumes sequential execution only

For most FSM designs, these limitations won't affect the usefulness of the analysis.

## Advanced: Understanding Wait-For Graphs

The circular wait detection builds a "wait-for graph" that represents state dependencies:

- **Node**: A state in your FSM
- **Edge A→B**: State A waits for something that State B provides

**How dependencies are inferred**:
1. If State A's transition condition uses variable `x`
2. And State B's action sets variable `x`
3. Then State A depends on State B (A→B edge)

**Circular wait** occurs when this graph has cycles (A→B→C→A).

## Getting Help

If you encounter:
- **False positives**: The analysis flags something that's actually correct
- **Missed issues**: A real deadlock that wasn't detected
- **Unclear results**: You don't understand why something is flagged

Please review the detailed technical documentation in `DEADLOCK_DETECTION.md` or report the issue for analysis.

## Quick Reference

| Symbol | Meaning | Action Required |
|--------|---------|-----------------|
| 🔓 Green | No deadlocks detected | None - FSM looks good |
| ⚠️ Yellow | Potential deadlock | Review and verify |
| 🔒 Red | Critical deadlock | Must fix before deployment |

---

**Remember**: The goal is not zero warnings, but zero *unintended* warnings. Sometimes warnings are acceptable if you understand why they exist and have documented the reasoning.
