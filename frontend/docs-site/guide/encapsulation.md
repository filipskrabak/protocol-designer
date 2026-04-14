# Encapsulation

**Encapsulation** lets you model how one protocol is carried inside another — for example, a TCP segment inside an IPv4 packet, or HTTP inside TCP. The outer protocol's header contains a field (often called a type or version field) whose value determines which inner protocol follows.

## Prerequisites

- The **outer** (parent) protocol is loaded and has at least one field with **Options and Values** defined. That field is the discriminator — its value tells the decoder which inner protocol to expect.
- The **inner** (child) protocol already exists in your library (it was saved via the **Properties** tab).

---

## Concepts

| Term | Meaning |
|---|---|
| Encapsulating field | The field in the parent protocol whose value identifies the child protocol (e.g. EtherType in Ethernet II, Protocol in IPv4) |
| Child protocol | The protocol carried inside the encapsulating field (e.g. IPv4, TCP) |
| Field option | A named numeric value of the encapsulating field that maps to one specific child protocol |

---

## Step-by-step: set up encapsulation

### 1. Choose the encapsulating field

1. Open the **Encapsulation** tab.
2. In the **Encapsulated field** section, select the parent field that carries the child protocol from the drop-down (e.g. `EtherType`, `Protocol`, `Type`).

::: tip
The drop-down lists only fields that are not already marked as encapsulating. If the field you need is missing, check the **Protocol Header** tab — all fields are eligible once you add them there.
:::

### 2. Add a child protocol

1. In the **Encapsulated protocols** section, type or select a protocol from your library.
2. Click **Add encapsulated protocol**.
3. A card for that child protocol appears below.

Repeat for every protocol that can appear inside the encapsulating field.

### 3. Map field values to the child protocol

Each child protocol card shows one or more **field chips** — these represent the parent fields whose values identify this particular child.

1. Click **Manage fields** on the child protocol card to add which parent fields act as discriminators for this child.
2. Once a field is listed as a chip on the card, click the chip to open a value picker.
3. Select which **option values** of that field correspond to this child protocol (e.g. `IPv4 (2048)` for the EtherType field on an IPv4 encapsulation).
4. Close the dialog.

The chip tooltip shows the currently selected values. A red chip reading **No fields have been added yet!** means the mapping is incomplete.

![Screenshot: Encapsulation tab with one child protocol card and a field chip](./img/encapsulation/child-protocol-card.png)

---

## Worked example: Ethernet II carrying IPv4 and ARP

**Scenario:** Model an Ethernet II frame. The **EtherType** field determines whether the payload is IPv4 (0x0800 = 2048) or ARP (0x0806 = 2054).

**Pre-conditions:**
- Ethernet II protocol is open with an `EtherType` field that has two options: `IPv4 (2048)` and `ARP (2054)`.
- `IPv4` and `ARP` protocols exist in your library.

**Steps:**

1. Open the **Encapsulation** tab for the Ethernet II protocol.
2. Select `EtherType` as the encapsulating field.
3. Add `IPv4` as a child protocol. Click **Manage fields**, add `EtherType`, then click the `EtherType` chip and select `IPv4 (2048)`.
4. Add `ARP` as a child protocol. Click **Manage fields**, add `EtherType`, then click the `EtherType` chip and select `ARP (2054)`.

The diagram now shows Ethernet II as the outer frame with arrows to IPv4 and ARP.

---

## Common mistakes

- **Child protocol not in library** — The inner protocol must be in the library before it appears in the picker.
- **No options on the encapsulating field** — If the field you select has no options defined, there is nothing to map to a child. Add options first on the **Protocol Header** tab under **Options and Values**.
- **Red chip on a child card** — This means no parent field values have been mapped yet. Click **Manage fields**, add the discriminating field, then click the chip and select the correct values.

