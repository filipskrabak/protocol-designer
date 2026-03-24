# Tutorial: Modelling the Alternating Bit Protocol (ABP)

The Alternating Bit Protocol is the ideal first CPN model for this tool. It is
small enough to build in 10 minutes but exercises every major feature: color
sets, variables, arc inscriptions with arithmetic, guards, S-invariants, and
state-space verification.

It is also a direct simplification of **MQTT-SN QoS 1** — once you have ABP
working you can extend it to a full PUBLISH/PUBACK flow by swapping the `Bit`
color set for a richer message type.

This tutorial is structured in two phases:

- **Phase 1 (Sections 1–7):** The reliable-channel model. Five places, three
  transitions, 7 reachable states. Use it to prove the protocol is bounded and
  deadlock-free when no packets are lost.

- **Phase 2 (Sections 8–11):** The full loss-recovery model. Six places, six
  transitions, ~15–20 reachable states. Proves the protocol recovers from
  arbitrary packet and ACK loss without deadlock.

---

## 1. What ABP Models

A **Sender** wants to deliver messages reliably over an unreliable channel.
Each message is tagged with a sequence bit (0 or 1). The Sender retains the
current bit until the Receiver acknowledges it. On acknowledgement the bit
flips and the next message can be sent.

In the reliable-channel model the data flow looks like this:

```
Sender_Ready ──[Send_Packet]──► Channel
     ▲                               │
     │                         [Receive_Packet]
[Process_Ack]                        │
     │                               ▼
Ack_Channel  ◄──────────────── Receiver_Expects
     │
Sender_Waiting
```

The Sender token moves between `Sender_Ready` and `Sender_Waiting`, ensuring
at most one packet is ever in flight at a time.

---

## 2. Declarations

### Color Set

| Field | Value |
|-------|-------|
| Name  | `Bit` |
| Type  | Int range |
| Min   | `0` |
| Max   | `1` |

### Variable

Create one variable:

| Field        | Value  |
|--------------|--------|
| Name         | `b`    |
| Color Set    | `Bit`  |

Create a second variable for the receive transition:

| Field        | Value  |
|--------------|--------|
| Name         | `b_in` |
| Color Set    | `Bit`  |

And a third:

| Field        | Value   |
|--------------|---------|
| Name         | `b_exp` |
| Color Set    | `Bit`   |

---

## 3. Places

Create **five** places:

### `Sender_Ready`
- **Color Set:** `Bit`
- **Initial Marking:** `1`0`
  *(the sender starts ready to send bit 0)*

### `Sender_Waiting`
- **Color Set:** `Bit`
- **Initial Marking:** *(leave empty)*
  *(holds the in-flight bit while waiting for ACK)*

### `Channel`
- **Color Set:** `Bit`
- **Initial Marking:** *(leave empty)*

### `Receiver_Expects`
- **Color Set:** `Bit`
- **Initial Marking:** `1`0`
  *(the receiver is waiting for bit 0)*

### `Ack_Channel`
- **Color Set:** `Bit`
- **Initial Marking:** *(leave empty)*

> **Why five places?** The original four-place model loops the token back into
> the sender place immediately, so `Send_Packet` fires again and again, piling
> tokens into `Channel` indefinitely — causing a state-space explosion of
> 10 000+ markings. Separating `Sender_Ready` from `Sender_Waiting` means the
> sender token is *consumed* when a packet goes in flight, so `Send_Packet`
> cannot fire again until the ACK is processed. This bounds `Channel` to at
> most 1 token and the entire state space to 7 markings.

---

## 4. Transitions

### `Send_Packet`
- **Guard:** *(leave empty)*

### `Receive_Packet`
- **Guard:** `b_in == b_exp`
  *(only fires when the received bit matches what the receiver expects)*

### `Process_Ack`
- **Guard:** *(leave empty)*

---

## 5. Arcs

### Send_Packet arcs

| Direction          | From / To         | Inscription | Meaning |
|--------------------|-------------------|-------------|---------|
| Place → Transition | `Sender_Ready`    | `b`         | Consume the ready-to-send bit; bind to `b` |
| Transition → Place | `Sender_Waiting`  | `b`         | Park the bit in "waiting" — sender is now blocked |
| Transition → Place | `Channel`         | `b`         | Put the packet in the channel |

`Sender_Ready` is **empty after this fires**, so `Send_Packet` cannot fire
again until `Process_Ack` puts a new token there. This is what keeps `Channel`
bounded to 1 token at a time.

### Receive_Packet arcs

| Direction          | From / To           | Inscription              | Meaning |
|--------------------|---------------------|--------------------------|---------|
| Place → Transition | `Channel`           | `b_in`                   | Consume the packet; bind to `b_in` |
| Place → Transition | `Receiver_Expects`  | `b_exp`                  | Consume expected bit; bind to `b_exp` |
| Transition → Place | `Receiver_Expects`  | `b_exp`0 ++ (1-b_exp)`1` | Produce the flipped expected bit (see below) |
| Transition → Place | `Ack_Channel`       | `b_in`                   | Echo received bit as ACK |

### Process_Ack arcs

| Direction          | From / To         | Inscription                  | Meaning |
|--------------------|-------------------|------------------------------|---------|
| Place → Transition | `Sender_Waiting`  | `b`                          | Consume the in-flight bit; bind to `b` |
| Place → Transition | `Ack_Channel`     | `b`                          | Consume ACK (same variable — must match) |
| Transition → Place | `Sender_Ready`    | `b`0 ++ (1-b)`1`             | Produce the flipped bit into ready — sender advances |

Both input arcs use the same variable `b`, so `Process_Ack` only fires when
the ACK value matches the in-flight bit. The output flips the bit, advancing
the sender to the next sequence number.

#### Explaining the bit-flip inscription

The tool's color-slot only accepts a variable name or a literal — it cannot
evaluate arithmetic like `1 - b_exp` directly in the color position.
The standard CPN workaround is to spread the two possible outcomes across two
multiset terms and let the count expression select one:

```
(1-b_exp)`0 ++ b_exp`1
```

When `b_exp = 0`:
- `(1-0)` = 1, so the first term contributes `1\`0`
- `0` = 0, so the second term contributes `0\`1` (zero tokens, ignored)
- Result: `1\`0` — receiver now expects 0 again? No — wait, that is **wrong**.

Correct reading: receiver consumed `b_exp=0` and must now expect `1`.

```
b_exp\`0 ++ (1-b_exp)\`1
```

When `b_exp = 0`: contributes `0\`0 ++ 1\`1` → one token of value `1`. ✓  
When `b_exp = 1`: contributes `1\`0 ++ 0\`1` → one token of value `0`. ✓

So the correct inscription for the `Receiver_Expects` output arc is:

```
b_exp`0 ++ (1-b_exp)`1
```

---

## 6. Phase 1 Verification Checklist

Once the reliable-channel model is built, open the **Analysis** panel and run
the state-space exploration. Expect the following results:

### A. Deadlock-Freedom — should PASS

The sender always has a token in either `Sender_Ready` or `Sender_Waiting`.
The receiver always eventually fires when a matching token arrives. There are
no deadlock markings.

### B. Boundedness — should PASS (k = 1)

| Place              | Expected max tokens |
|--------------------|---------------------|
| `Sender_Ready`     | 1 |
| `Sender_Waiting`   | 1 |
| `Channel`          | 1 |
| `Receiver_Expects` | 1 |
| `Ack_Channel`      | 1 |

If any place exceeds 1 the firing logic or arc inscriptions are wrong.

### C. S-Invariants

The invariant calculator should find:

- **M(Sender_Ready) + M(Sender_Waiting) = 1** at all times
- **M(Receiver_Expects) = 1** at all times

The sender token moves between `Sender_Ready` and `Sender_Waiting` but is
never created or destroyed. The receiver's expected bit is likewise always
present in exactly one place.

### D. Guard Test (manual)

1. Delete the token in `Channel` and manually add a token with value `1`.
2. Ensure `Receiver_Expects` still holds `0`.
3. Try to fire `Receive_Packet`.

**Expected:** the transition is **disabled** because the guard
`b_in == b_exp` evaluates to `1 == 0` → false.

If the transition fires, the guard evaluation engine has a bug.

---

## 7. Phase 1 State Space Walk-Through

Starting marking: `Sender_Ready={0}`, `Receiver_Expects={0}`, everything else empty.
Expected total: **7 reachable markings**.

| Step | Transition fired | Sender_Ready | Sender_Waiting | Channel | Receiver_Expects | Ack_Channel |
|------|-----------------|---|---|---|---|---|
| 0 (initial) | — | {0} | {} | {} | {0} | {} |
| 1 | `Send_Packet` (b=0) | {} | {0} | {0} | {0} | {} |
| 2 | `Receive_Packet` (b_in=0, b_exp=0) | {} | {0} | {} | {1} | {0} |
| 3 | `Process_Ack` (b=0) | {1} | {} | {} | {1} | {} |
| 4 | `Send_Packet` (b=1) | {} | {1} | {1} | {1} | {} |
| 5 | `Receive_Packet` (b_in=1, b_exp=1) | {} | {1} | {} | {0} | {1} |
| 6 | `Process_Ack` (b=1) | {0} | {} | {} | {0} | {} |
| — | *(back to initial)* | | | | | |

The protocol cycles cleanly through 7 states. The guard on `Receive_Packet`
blocks any firing if `Channel` holds the wrong bit.

---

## 8. Adding Loss Transitions — and Why They Expose a Design Gap

The most natural next step is to add two "drop" transitions:

- **`Lose_Packet`**: consumes one token from `Channel` and produces nothing.
- **`Lose_Ack`**: consumes one token from `Ack_Channel` and produces nothing.

### `Lose_Packet` arcs

| Direction | From / To | Inscription |
|-----------|-----------|-------------|
| Place → Transition | `Channel` | `b` |

### `Lose_Ack` arcs

| Direction | From / To | Inscription |
|-----------|-----------|-------------|
| Place → Transition | `Ack_Channel` | `b` |

Add these two transitions to the five-place model, then re-run the
state-space exploration.

**The tool will report deadlock markings**, for example:

```
Deadlock detected:
  Sender_Ready   = {}
  Sender_Waiting = {0}
  Channel        = {}
  Receiver_Expects = {0}
  Ack_Channel    = {}
```

This is the marking reached after `Lose_Packet` fires: the in-flight bit
is parked in `Sender_Waiting` but the channel is empty and nothing can fire.
The sender is stuck forever.

This is **correct behavior by the tool** — it has found a real design gap.
ABP requires the sender to **retransmit** if no ACK arrives within a timeout.
Without a retransmit transition, packet loss is a permanent failure.

> **Key insight:** the deadlock detector acts as a formal checker. It found the
> missing retransmit mechanism purely from the structure of the model — no
> manual reasoning required.

The same dead marking appears after `Lose_Ack` fires: the receiver accepted
the packet and sent an ACK, but the ACK was dropped. The sender waits
indefinitely because there is no way to trigger a retransmit.

---

## 9. Phase 2: The Complete ABP — Loss Recovery

To eliminate the deadlocks we need two structural changes from the five-place
model:

1. **Merge `Sender_Ready` / `Sender_Waiting`** into a single `Sender` place
   that always holds exactly one token (the current sequence bit). Both the
   first send and every retransmit are the same operation: read the sender's
   bit and put a copy in the channel.

2. **Add capacity-slot places** (`Channel_Free` and `Ack_Free`) so each
   channel holds at most one packet. Without them, retransmit would fire
   repeatedly and fill `Channel` with unboundedly many tokens.

The complete model has **six places** and **six transitions**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Sender (bit b)                             │
│          self-loop — always 1 token, value flips on ACK         │
└──────────────┬────────────────────────────────┬─────────────────┘
               │ Send_Or_Retransmit              │ Process_Ack
               │ (needs Channel_Free)            │ (needs Ack_Channel
               ▼                                 │  with matching b)
           Channel ──►  Receive_New  ──►  Ack_Channel
                   └──►  Receive_Dup ──►  (reply for duplicate)
           Lose_Packet                  Lose_Ack
           (frees slot)                 (frees slot)
```

### New declarations

Add a second variable:

| Field | Value | Purpose |
|-------|-------|---------|
| `f`   | `Bit` | Consume slot tokens (value is ignored — only presence matters) |

(Keep `b`, `b_in`, `b_exp` from Phase 1.)

The slot places use `Bit` for their color set; no separate `Unit` type is
needed. The initial token value `0` is a dummy — only token presence is
meaningful.

### Places

| Name | Color Set | Initial Marking | Role |
|------|-----------|-----------------|------|
| `Sender` | `Bit` | `1'0` | Current sequence bit; always exactly 1 token |
| `Channel_Free` | `Bit` | `1'0` | Presence = channel is free |
| `Channel` | `Bit` | *(empty)* | In-flight packet |
| `Receiver_Expects` | `Bit` | `1'0` | Next bit the receiver accepts as new |
| `Ack_Free` | `Bit` | `1'0` | Presence = ACK channel is free |
| `Ack_Channel` | `Bit` | *(empty)* | In-flight acknowledgement |

### Transitions

| Transition | Guard | Description |
|------------|-------|-------------|
| `Send_Or_Retransmit` | *(none)* | Read sender bit; send packet when channel free |
| `Receive_New` | `b_in == b_exp` | Correct packet received; advance receiver |
| `Receive_Dup` | `b_in != b_exp` | Duplicate received; re-ACK without advancing |
| `Lose_Packet` | *(none)* | Drop in-flight packet; free channel slot |
| `Lose_Ack` | *(none)* | Drop in-flight ACK; free ACK slot |
| `Process_Ack` | *(none)* | Matching ACK received; flip sender bit |

> **Why `Receive_Dup`?** After a lost ACK, the sender retransmits the *old*
> bit. The receiver has already advanced, so `b_in != b_exp`. Without
> `Receive_Dup`, the retransmitted packet occupies `Channel` permanently and
> the model deadlocks. With it, the receiver re-ACKs the old bit so the sender
> can eventually call `Process_Ack` and advance.

---

## 10. Complete Model Arcs

### `Send_Or_Retransmit` arcs

| Direction | From / To | Inscription | Meaning |
|-----------|-----------|-------------|---------|
| Place → Transition | `Sender` | `b` | Read the current sequence bit |
| Place → Transition | `Channel_Free` | `f` | Consume the free-channel token |
| Transition → Place | `Sender` | `b` | Return bit unchanged **(self-loop)** |
| Transition → Place | `Channel` | `b` | Put the packet in the channel |

The self-loop on `Sender` binds `b` to the current bit without permanently
removing the token. This single transition covers both "first send" and every
subsequent retransmit — no additional `Retransmit` transition is needed.

### `Receive_New` arcs (guard: `b_in == b_exp`)

| Direction | From / To | Inscription | Meaning |
|-----------|-----------|-------------|---------|
| Place → Transition | `Channel` | `b_in` | Remove the packet |
| Place → Transition | `Receiver_Expects` | `b_exp` | Consume expected bit |
| Place → Transition | `Ack_Free` | `f` | Consume the ACK-channel free token |
| Transition → Place | `Channel_Free` | `0` | Return the channel slot |
| Transition → Place | `Receiver_Expects` | `b_exp`0 ++ (1-b_exp)`1` | Flip expected bit |
| Transition → Place | `Ack_Channel` | `b_in` | Send ACK for received bit |

### `Receive_Dup` arcs (guard: `b_in != b_exp`)

| Direction | From / To | Inscription | Meaning |
|-----------|-----------|-------------|---------|
| Place → Transition | `Channel` | `b_in` | Remove the duplicate packet |
| Place → Transition | `Receiver_Expects` | `b_exp` | Read expected bit |
| Place → Transition | `Ack_Free` | `f` | Consume the ACK-channel free token |
| Transition → Place | `Channel_Free` | `0` | Return the channel slot |
| Transition → Place | `Receiver_Expects` | `b_exp` | Keep expected bit unchanged |
| Transition → Place | `Ack_Channel` | `b_in` | Re-send ACK for the (old) bit |

### `Lose_Packet` arcs

| Direction | From / To | Inscription | Meaning |
|-----------|-----------|-------------|---------|
| Place → Transition | `Channel` | `b` | Drop the packet |
| Transition → Place | `Channel_Free` | `0` | Free the channel slot (allows retransmit) |

### `Lose_Ack` arcs

| Direction | From / To | Inscription | Meaning |
|-----------|-----------|-------------|---------|
| Place → Transition | `Ack_Channel` | `b` | Drop the ACK |
| Transition → Place | `Ack_Free` | `0` | Free the ACK-channel slot |

### `Process_Ack` arcs

| Direction | From / To | Inscription | Meaning |
|-----------|-----------|-------------|---------|
| Place → Transition | `Sender` | `b` | Read sender's current bit |
| Place → Transition | `Ack_Channel` | `b` | Consume ACK — **same variable forces match** |
| Transition → Place | `Sender` | `b`0 ++ (1-b)`1` | Flip the sender bit |
| Transition → Place | `Ack_Free` | `0` | Free the ACK-channel slot |

The same-variable binding on `Sender` and `Ack_Channel` means `Process_Ack`
only fires when the ACK bit matches the current sender bit. A stale ACK (bit
already flipped by a previous round) will not match, and the transition
remains disabled until that stale ACK is drained by `Lose_Ack`.

---

## 11. Phase 2 Verification

### Boundedness — should PASS (k = 1)

| Place | Max tokens |
|-------|-----------|
| `Sender` | 1 (always) |
| `Channel_Free` | 1 |
| `Channel` | 1 |
| `Receiver_Expects` | 1 (always) |
| `Ack_Free` | 1 |
| `Ack_Channel` | 1 |

S-invariants:
- **M(Channel_Free) + M(Channel) = 1** — exactly one of "free" or "in-flight" at all times
- **M(Ack_Free) + M(Ack_Channel) = 1** — same for the ACK channel

### Deadlock-Freedom — should PASS

Under **arbitrary** packet and ACK loss:
- The sender can always retransmit whenever `Channel_Free` has a token (eventually guaranteed because every packet is either delivered or lost).
- The receiver handles duplicates and re-ACKs so the sender always eventually advances.
- No reachable marking has zero enabled transitions.

### Expected state count: ~15–20 reachable markings

Loss branches roughly double the state count compared to the reliable model
but the S-invariants keep the space finite and tractable.

### Sample loss-recovery trace

Starting marking: `Sender={0}`, `Channel_Free={0}`, `Receiver_Expects={0}`, `Ack_Free={0}`, channels empty.

| Step | Transition | Notable state |
|------|-----------|---------------|
| 0 | *(initial)* | Sender={0}, channel free |
| 1 | `Send_Or_Retransmit` | Channel={0}, Channel_Free empty |
| 2 | **`Lose_Packet`** | Channel empty, Channel_Free restored |
| 3 | `Send_Or_Retransmit` *(retransmit!)* | Channel={0} again |
| 4 | `Receive_New` (b_in=0, b_exp=0) | RE={1}, Ack_Channel={0} |
| 5 | **`Lose_Ack`** | Ack_Channel empty, Ack_Free restored |
| 6 | `Send_Or_Retransmit` *(retransmit)* | Channel={0} |
| 7 | `Receive_Dup` (b_in=0 ≠ b_exp=1) | RE={1} unchanged, Ack_Channel={0} |
| 8 | `Process_Ack` (b=0 matches ACK=0) | Sender flips to {1} |
| — | *(round 2 begins)* | Sender={1} |

The protocol recovers from both a lost packet (steps 2→3) and a lost ACK
(steps 5→6→7), advancing the sender bit at step 8.

---

## 12. Extending to MQTT-SN QoS 1

Once the full ABP model is verified, extend it as follows:

1. **Replace `Bit` with a `MsgId` color set:** `int [0..255]`
2. **Add a `TopicId` color set:** `int [1..10]` (keep small for finite state space)
3. **Change `Channel` and `Ack_Channel` color sets** from `Bit` to `MsgId`
4. **Change the guard** on `Receive_New` to `msg_id == expected_id`
5. **Change `Process_Ack`** to increment the message ID modulo 256 using
   the same multiset arithmetic pattern:
   `(msg_id + 1) % 256` — or enumerate a small range of IDs

You now have a formal model of the MQTT-SN PUBLISH → PUBACK loop that can be
verified for deadlock-freedom and boundedness under arbitrary loss.

