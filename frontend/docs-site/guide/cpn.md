# Colored Petri Nets (CPN)

The **CPN** tab lets you model your protocol's concurrent behaviour as a Colored Petri Net. Where the EFSM captures the sequential lifecycle of a single participant, a CPN can express multiple concurrent components — sender, channel, receiver — and then exhaustively verify properties like deadlock-freedom and boundedness.

![Screenshot: CPN editor with a small net on the canvas](./img/cpn/overview.png)

## Prerequisites

You have a protocol open in the editor.

---

## Concepts

| Term | Meaning |
|---|---|
| Place | A container that holds tokens (drawn as a circle) |
| Transition | A firing rule that consumes tokens from input places and produces tokens into output places (drawn as a rectangle) |
| Token | A data value that circulates through the net |
| Color set | The type of a token — defines the values a place can hold |
| Marking | The current distribution of tokens across all places |
| Initial marking | The token distribution at the start |
| Arc inscription | The multiset of tokens consumed or produced along an arc when a transition fires |
| Guard | A boolean condition on variables — the transition fires only when the guard is true |
| Variable | A named placeholder that is bound to a token's value when a transition fires |

---

## Step-by-step: build a net

### Step 1 — Create or select a CPN

- Click **New CPN** to start a fresh net and enter a name.
- Use the **CPN** drop-down to switch between saved nets.
- **Duplicate** copies the current net for safe experimentation.
- **Clear** removes all nodes and arcs.

### Step 2 — Define color sets

Color sets are the token types in your net. Open the **Color Sets** panel in the sidebar and click **+**.

| Type | When to use | Example values |
|---|---|---|
| `unit` | Presence/absence only — tokens carry no data | A "ready" slot |
| `bool` | True or false flags | An acknowledgement status |
| `int` range | Integers within a min–max range | Sequence numbers 0–1 |
| `enum` | Named values you define | `IDLE`, `ACK`, `SYN` |

### Step 3 — Declare variables

Variables are bound to token values when a transition fires. Open the **Variables** panel in the sidebar and click **+**.

- Give the variable a **Name** (e.g. `b`, `msg`, `seq`).
- Assign it a **Color set** — the variable can only hold values of that type.

Variables are then used in arc inscriptions and guards.

### Step 4 — Add places and transitions

Drag **Place** (circle) or **Transition** (rectangle) tiles from the element palette onto the canvas.

Click on a **place** to set:
- **Name** — label shown in the diagram.
- **Color Set** — which type of token it holds.
- **Initial Marking** — how many tokens (and of which color) it starts with.

Click on a **transition** to set:
- **Name** — label shown in the diagram.
- **Guard** — optional boolean expression (transition fires only when this is true).

### Step 5 — Connect places and transitions with arcs

1. Hover over a node until connection handles appear.
2. Drag from a handle to another node to create an arc.
3. A dialog opens — type the **arc inscription** (the tokens consumed or produced) and an optional description.
4. Click **Save**.

An arc from a **place → transition** is an input arc (consumes tokens).
An arc from a **transition → place** is an output arc (produces tokens).

### Step 6 — Run analysis

Click **Analyze** in the toolbar. The built-in engine explores the state space and shows:

- **Markings** — total distinct states reached from the initial marking.
- **Boundness** — checks whether any place can grow without limit (unbounded) or has a finite maximum token count (bounded).
- **Dead markings** — markings where no transition fires (potential deadlocks).
- **L1 Liveness** — checks whether every transition can eventually fire in some reachable marking.

For more detailed results, use the **CPNpy** analysis panel (server-side engine).

::: warning
If your color sets cover a large integer range, the state space may be too large to explore fully. The frontend engine stops exploration that is too large. Reduce the integer range or use the CPNpy engine.
:::

---

## Reference: arc inscription syntax (multiset notation)

An inscription defines the multiset of tokens consumed or produced on an arc. The syntax is:

```
count`color
```

Join multiple token types with `++` (multiset union):

```
count1`color1 ++ count2`color2
```

### Quick reference table

| Inscription | Meaning |
|---|---|
| ``1`ACK`` | one token of color `ACK` |
| `ACK` | shorthand for ``1`ACK`` |
| `b` | one token whose color equals the current value of variable `b` |
| ``2`ACK ++ 1`SYN`` | two ACK tokens and one SYN token |
| ``n`m`` | `n` tokens of color `m` (both are variables / expressions) |
| ``b`0 ++ (1-b)`1`` | one token whose color is `1-b` — the bit-flip pattern |
| `empty` or `0` | no tokens |

The count (left of the backtick) is an integer literal, a variable, or any arithmetic expression using `+`, `-`, `*`, `/`, and parentheses.

::: tip Bit-flip pattern
CPN colors must be identifiers or literals. You cannot write arithmetic in the color position. The standard workaround is to spread the two possible outcomes across two terms:

``b`0 ++ (1-b)`1``

When `b = 0`: the first term contributes ``0`0`` (zero tokens), the second ``1`1`` - result is one token of value `1`. 
When `b = 1`: the first term contributes ``1`0`` - result is one token of value `0`. 

This pattern lets you express a computed color using only the count expression.
:::

---

## Reference: initial marking syntax

Initial markings follow the same syntax as arc inscriptions:

| Marking | Meaning |
|---|---|
| ``1`0`` | the place starts with one token of integer value 0 |
| ``1`IDLE`` | the place starts with one IDLE token |
| ``2`ACK ++ 1`SYN`` | starts with two ACKs and one SYN |
| ``empty`` or ``0`` | place starts empty |

---

## Reference: transition guard expressions

Guards are boolean expressions. They do **not** use backtick syntax.

| Category | Operators |
|---|---|
| Comparison | `=` `!=` `<` `<=` `>` `>=` |
| Logical | `&&` `\|\|` `!` |
| Arithmetic | `+` `-` `*` `/` |
| Grouping | `( )` |

`=` is the equality operator (it is NOT an assignment). Leave the guard field empty for an unconditional transition.

| Example guard | Meaning |
|---|---|
| `b_in = b_exp` | fires only when the received bit equals the expected bit |
| `n > 0` | fires only when `n` is positive |
| *(empty)* | always fires |

---

## Reference: color set types

| Type | Example values | Notes |
|---|---|---|
| `unit` | `()` | All tokens are identical; only the count matters |
| `bool` | `true`, `false` | — |
| `int` range (min–max) | `0`, `1`, `42` | Exploration capped at 256 distinct values per set |
| `enum` | `IDLE`, `CONNECT`, `ACK` | Names are case-sensitive |

::: danger
Deleting a color set that is already assigned to a place or variable will break those nodes. Remove all references before deleting.
:::

---

## Example: Alternating Bit Protocol (ABP)

**Scenario:** The Alternating Bit Protocol is a simple reliable data-link protocol. Each packet is tagged with a 1-bit sequence number (0 or 1). The sender keeps the current bit until the receiver acknowledges it; the bit then flips and the next packet is sent. This example walks through the full CPN workflow.

### 1. Color set

Open the **Color Sets** panel and create:

| Name | Type | Min | Max |
|---|---|---|---|
| `Bit` | int | `0` | `1` |

### 2. Variables

Open the **Variables** panel and create three variables, all of type `Bit`:

| Name | Color set |
|---|---|
| `b` | `Bit` |
| `b_in` | `Bit` |
| `b_exp` | `Bit` |

### 3. Places

Create five places:

| Name | Color set | Initial marking |
|---|---|---|
| `Sender_Ready` | `Bit` | ``1`0`` |
| `Sender_Waiting` | `Bit` | *(empty)* |
| `Channel` | `Bit` | *(empty)* |
| `Receiver_Expects` | `Bit` | ``1`0`` |
| `Ack_Channel` | `Bit` | *(empty)* |

`Sender_Ready` and `Receiver_Expects` each start with one token of value `0` — both sides begin with bit 0.

### 4. Transitions

Create three transitions:

| Name | Guard |
|---|---|
| `Send_Packet` | *(empty)* |
| `Receive_Packet` | `b_in = b_exp` |
| `Process_Ack` | *(empty)* |

The guard on `Receive_Packet` ensures it only fires when the received bit matches the expected bit.

### 5. Arcs

#### Send_Packet

| Arc | Place | Inscription |
|---|---|---|
| Place → Transition | `Sender_Ready` | `b` |
| Transition → Place | `Sender_Waiting` | `b` |
| Transition → Place | `Channel` | `b` |

#### Receive_Packet

| Arc | Place | Inscription |
|---|---|---|
| Place → Transition | `Channel` | `b_in` |
| Place → Transition | `Receiver_Expects` | `b_exp` |
| Transition → Place | `Receiver_Expects` | ``b_exp`0 ++ (1-b_exp)`1`` |
| Transition → Place | `Ack_Channel` | `b_in` |

The output arc back to `Receiver_Expects` uses the bit-flip pattern. When `b_exp = 0`: produces one token of value `1` (receiver now expects bit 1). When `b_exp = 1`: produces one token of value `0`.

#### Process_Ack

| Arc | Place | Inscription |
|---|---|---|
| Place → Transition | `Sender_Waiting` | `b` |
| Place → Transition | `Ack_Channel` | `b` |
| Transition → Place | `Sender_Ready` | ``b`0 ++ (1-b)`1`` |

Both input arcs use the same variable `b`, so `Process_Ack` only fires when the ACK value matches the in-flight bit. The output flips the bit — the sender advances to the next sequence number.

### 6. Run analysis

Click **Analyze**. You should see:

- **6 reachable markings** — the protocol cycles cleanly.
- **0 dead markings** — the net never gets stuck.
- **All places bounded at 1** — at most one token observed.

CPNpy should confirm these results as well.

![Screenshot: CPN analysis panel showing 6 markings, 0 dead markings, all transitions live](./img/cpn/abp-analysis-results.png)
---

## Exporting

Click **Export** in the toolbar to save the net as:
- **PNML** — standard Petri Net Markup Language
- **CPN Tools XML** — import directly into the CPN Tools/CPN IDE application, which also include simulation

---

## Common mistakes

- **Place has no color set** — A place with no color set assigned cannot hold tokens. Assign a color set before adding an initial marking or connecting arcs.
- **Variable type mismatch** — An arc inscription references variable `b` but the place holds a different color set than `b`'s declared color set. Make sure variables and places use the same color set.
- **State space truncated** — The analysis stops early with a warning. Either reduce the integer range of your color sets or run the CPNpy server-side engine.
