# Extended Finite State Machine (EFSM)

The **EFSM** tab lets you model your protocol's behaviour as a graph of states and transitions. Each state represents a phase of the protocol lifecycle (e.g. `CLOSED`, `ESTABLISHED`). Each transition is an arrow from one state to another, optionally guarded by a condition and accompanied by variable updates.

![Screenshot: EFSM editor with a simple state machine on the canvas](./img/efsm/overview.png)

## Prerequisites

You have a protocol open in the editor.

---

## Concepts

| Term | Meaning |
|---|---|
| State | A named step in the protocol's lifecycle |
| Initial state | The state the protocol starts in (only one allowed) |
| Final state | A terminal state that the protocol can reach (zero or more) |
| Transition | A directed arrow from one state to another |
| Event | An input or output signal that triggers the transition |
| Guard | A boolean condition on variables — the transition fires only when the guard is true |
| Action | A variable assignment that executes when the transition fires |
| Variable | A typed value tracked across transitions (integer, boolean, or enumeration) |

---

## Building a state machine

### Step 1 — Create or select an FSM

- To create a new FSM, click **New FSM** in the toolbar. Enter a name when prompted.
- To switch between existing FSMs, use the **FSM** dropdown in the toolbar.

### Step 2 — Add states

States are created by dragging elements from the right sidebar onto the canvas.

1. In the sidebar, find the three draggable tiles: **Initial State**, **State**, and **Final State**.
2. Drag an **Initial State** tile onto the canvas.
3. Drag one or more **State** tiles for the intermediate phases.
4. Drag a **Final State** tile if the protocol has a defined endpoint.
5. Double-click any state to edit its name and type, or to add a description.

![Video: dragging state tiles from the sidebar onto the canvas](./img/efsm/add-states.gif)

### Step 3 — Add transitions

1. Hover over a state node until connection handles appear on its edges.
2. Click and drag from a handle to another state to draw a transition arrow.
3. A dialog opens automatically — fill in the **Event**, **Guard**, and **Action** fields (see the reference sections below).
4. Click **Save**.

To edit an existing transition, click the arrow on the canvas.

### Step 4 — Declare variables

Variables store values that guards and actions can reference. Declare them in the **Variables** panel in the sidebar.

1. Click **+** in the Variables panel.
2. Fill in:
   - **Name** — identifier for the variable (e.g. `seq_num`).
   - **Type** — `int`, `bool`, or `enum`.
   - **Initial value** — the value on entering the initial state.
3. Click **Save**.

You can also click **Regenerate from protocol** to automatically create integer variables for each numeric field in the protocol header — useful as a quick starting point.

### Step 5 — Register events (optional)

Events represent inputs or outputs of the protocol (e.g. receiving a SYN packet, sending an ACK). Declare them in the **Events** panel in the sidebar.

1. Click **+** in the Events panel.
2. Enter a name and choose a type: **send**, **receive**, or **internal**.
3. Click **Save**.

Events appear in the transition dialog's **Event** drop-down. Leaving the event blank creates a spontaneous (epsilon) transition.

### Step 6 — Run analysis

1. Click the **Analyze** button in the bottom toolbar.
2. The analysis panel shows:
   - Total state and transition counts.
   - **Reachability** — whether all states are reachable from the initial state.
   - **Determinism** — whether any state has two or more transitions with the same event that could both fire simultaneously. Checked via Z3 constraint solving.
   - **Completeness** — whether every state has at least one outgoing transition (no unintended dead-ends, except final states).
   - **Has initial state** — whether an initial state exists.
   - **Deadlock details** — which non-final states have no enabled outgoing transitions.

---

## Reference: guard expressions

Guards are boolean expressions entered in the **Guard Expression** field of a transition. If the guard is true when the event fires, the transition executes; otherwise it is skipped.

### Operators

| Category | Operators |
|---|---|
| Comparison | `>` `<` `>=` `<=` `=` `!=` |
| Logical AND / OR | `and` `&&` / `or` `\|\|` |
| Logical NOT | `not` `!` |
| Grouping | `( )` |

::: tip
Leave the guard field empty to create an unconditional transition — it fires on every occurrence of its event.
:::

### Examples

| Guard | Meaning |
|---|---|
| `seq_num > 0` | fires only when `seq_num` is positive |
| `state = 0` | fires only when `state` equals zero |
| `ready = true` | fires when the boolean variable `ready` is true |
| `n >= 1 and n < 8` | fires when `n` is in the range 1–7 |
| `!ready` | fires when `ready` is false |
| *(empty)* | always fires |

::: warning
Variable names are case-sensitive. `State` and `state` are different variables.
:::

---

## Reference: action expressions

Actions are entered in the **Action** field of a transition. They run when the transition fires and update variable values.

**Syntax:** `variable = expression`

Multiple assignments are separated by semicolons:

```
variable1 = expression1; variable2 = expression2
```

### Examples

| Action | Effect |
|---|---|
| `n = n + 1` | increment `n` by 1 |
| `state = 0` | reset `state` to 0 |
| `n = n - 1; ready = 1` | decrement `n` and set `ready` |
| `send_ACK` | annotation only — no variable change, documents that an ACK is sent |

::: tip
A bare identifier like `send_ACK` with no `=` sign is treated as an event emission annotation. It is not executed as an assignment — it just documents that a signal is sent on this transition.
:::

---

## Reference: variable types

| Type | Description | Extra fields |
|---|---|---|
| `int` | Integer within a declared range | Min value, Max value |
| `bool` | True or false | — |
| `enum` | One of a set of named values you define | Comma-separated value names |

Variable names must start with a letter or underscore and contain only letters, digits, and underscores.

---

## Worked example: simplified TCP connection lifecycle

**Scenario:** Model the TCP three-way handshake and teardown using four states and six transitions.

### Starting point

Open any protocol in the editor. Switch to the **EFSM** tab. Click **New FSM**, name it `TCP Lifecycle`.

### Declare variables

| Name | Type | Min | Max | Initial |
|---|---|---|---|---|
| `retries` | int | 0 | 3 | 0 |

### Add events

| Name | Type |
|---|---|
| `send_SYN` | output |
| `recv_SYN_ACK` | input |
| `send_ACK` | output |
| `send_FIN` | output |
| `recv_FIN_ACK` | input |

### Add states

Drag the following onto the canvas:

| Node type | Name |
|---|---|
| Initial state | `CLOSED` |
| State | `SYN_SENT` |
| State | `ESTABLISHED` |
| Final state | `TERMINATED` |

### Add transitions

| From | To | Event | Guard | Action |
|---|---|---|---|---|
| `CLOSED` | `SYN_SENT` | `send_SYN` | *(empty)* | `retries = 0` |
| `SYN_SENT` | `ESTABLISHED` | `recv_SYN_ACK` | *(empty)* | `send_ACK` |
| `SYN_SENT` | `CLOSED` | — | `retries >= 3` | `retries = 0` |
| `ESTABLISHED` | `ESTABLISHED` | — | `retries < 3` | `retries = retries + 1` |
| `ESTABLISHED` | `TERMINATED` | `send_FIN` | *(empty)* | *(empty)* |
| *(optional)* `TERMINATED` | `CLOSED` | `recv_FIN_ACK` | *(empty)* | *(empty)* |

### Run analysis

Click **Analyze**. You should see:
- All states reachable ✓
- No determinism violations ✓ (each state has distinct events or exclusive guards)
- No unexpected deadlocks in non-final states ✓

![Screenshot: FSM analysis panel showing all checks green](./img/efsm/analysis-results.png)

---

## Exporting

Click **Export** in the toolbar to download the FSM as an SCXML file — a standard state machine interchange format.

---

## Common mistakes

- **No initial state** — The analysis reports "no initial state". Drag an **Initial State** tile onto the canvas.
- **Non-deterministic transitions** — Two transitions from the same state have the same event and their guards can both be true at the same time. Make the guards mutually exclusive.
- **Unreachable state** — A state has no incoming transitions (other than the initial state). Add a transition from another state or remove the orphan.
- **Syntax error in guard** — Use `=` not `==` for equality. Operators `and`/`or` and `&&`/`||` are both accepted.
- **Variable not declared** — Using a name in a guard or action that was not added in the Variables panel causes a runtime check error. Add it in the sidebar first.


Use the **Analyze** panel to check the EFSM for reachability and deadlocks.
