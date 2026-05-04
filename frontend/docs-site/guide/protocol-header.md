# Protocol Header

The Protocol Header tab is where you define the binary structure of your protocol — its fields, their sizes, byte order, and named values. The diagram updates in real time as you build.

<!-- ![Screenshot: Protocol Header tab with field list and rendered diagram](./img/protocol-header/overview.png) -->

## Prerequisites

You have created a new protocol or loaded one from the library. See [Upload / New Protocol](./upload.md).

---

## Step-by-step: add a field

1. Click **Add Field** in the top-right corner of the field list (in Field Management mode) or the **+** button under the protocol (in Visual Editor mode).
2. A dialog opens with two tabs: **Field** (basic attributes) and **Options and Values** (named values for enumerated fields).
3. Fill in the **Field** tab:
   - **Display name** — the human-readable label shown in the diagram (e.g. `Destination Port`).
   - **ID** — the internal identifier used when referencing this field (e.g. `dst_port`). Must start with a letter or underscore and contain only letters, numbers, and underscores.
   - **Length** — the bit or byte size of the field.
   - **Length unit** — choose **bits** or **bytes**.
   - **Endianity** — choose **big** (network byte order, most common) or **little**.
   - **Group** — optional. Assign the field to a named group (e.g. `Flags`) for visual organisation. You can type a new group name or pick an existing one.
   - **Description** — optional free-text note.
4. If the field has a variable size (e.g. a payload), enable **Variable length** and fill in both **Minimum length** and **Maximum length**.
5. Click **Save**.

::: tip
Length unit applies to both the minimum and maximum values. Switching the unit automatically converts the existing values.
:::

---

## Step-by-step: add named values to a field (options)

Some fields carry a fixed set of named values — for example, the EtherType field in an Ethernet II frame, or an IP version number.

1. Open a field for editing (click the pencil icon in Field Management mode or the field itself in Visual Editor mode).
2. Switch to the **Options and Values** tab.
3. Click the **+** button to add an entry.
4. Set a **Name** (e.g. `IPv4`) and a numeric **Value** (e.g. `2048`).
5. Repeat for each option. Click the bin icon to remove one.
6. Click **Save**.

Options are used later in the **Encapsulation** tab to map child protocols to specific field values.

---

## Step-by-step: reorder fields

The order of fields in the list matches the order in the rendered diagram (left to right, top row first).

1. Hover over a field row to reveal the drag handle on the left.
2. Drag the row up or down to the desired position.
3. The diagram updates immediately.

<!-- ![Video: dragging a field to reorder it](./img/protocol-header/reorder-drag.gif) -->

---

## Step-by-step: group fields

Groups draw a coloured chip next to related fields (useful for representing flag bytes, option sets, etc.).

1. Check the boxes next to the fields you want to group.
2. A toolbar appears above the list. Type a group name in the **Group** box (or pick an existing one).
3. Click **Assign Group**.
4. To remove a group, select the fields and click **Remove Group**.

---

## Step-by-step: export the diagram

1. Click **Export** in the top toolbar.
2. Choose **SVG** to download an `.svg` file with the protocol definition embedded — use this to save your work and share it.
3. Choose **P4** to download a P4 program fragment describing the header layout.

---

## Field attributes reference

| Attribute | Required | Description |
|---|---|---|
| Display name | Yes | Label shown in the SVG diagram |
| ID | Yes | Internal machine-readable name (`snake_case`). Must be unique. |
| Length | Yes | Size in bits or bytes |
| Length unit | Yes | `bits` or `bytes` |
| Variable length | No | Enable when the field size varies at runtime |
| Maximum length | Only if variable | Upper bound when variable length is enabled |
| Endianity | Yes | `big` (most protocols) or `little` |
| Group | No | Visual grouping label |
| Description | No | Free-text note — not rendered in the diagram |

---

## Worked example: TCP header

TCP has 10 fixed fields. Here is how to create the first four:

| Display name | ID | Length | Unit | Endianity |
|---|---|---|---|---|
| Source Port | `src_port` | 16 | bits | big |
| Destination Port | `dst_port` | 16 | bits | big |
| Sequence Number | `seq_num` | 32 | bits | big |
| Acknowledgment Number | `ack_num` | 32 | bits | big |

For the **Flags** field (9 bits), you could add individual flag fields (URG, ACK, PSH, RST, SYN, FIN, each 1 bit) or a single 9-bit field — whichever fits your modelling needs.

---

## Common mistakes

- **ID contains spaces or special characters** — IDs must only use letters, numbers, and underscores (e.g. use `src_port`, not `src port`).
- **Duplicate ID** — Each field must have a unique ID. Rename one of the conflicting fields.
- **Wrong unit** — If you set a field to `4 bytes` but mean `4 bits`, the diagram will render it eight times wider than intended. Double-check the **Length unit** drop-down.
- **Options with duplicate values** — Each option value must be unique within a field.

