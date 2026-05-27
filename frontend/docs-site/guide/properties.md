# Properties

The **Properties** tab stores metadata about your protocol — its name, author, version, and a description. This information appears in the exported SVG and identifies the protocol in the library.

## Prerequisites

You have a protocol open. See [Upload / New Protocol](./upload.md).

---

## Step-by-step: fill in protocol metadata

1. Click the **Properties** tab (tab 2 in the editor).
2. Fill in the fields:
   - **Protocol Name** — short identifier (e.g. `TCP`, `IPv4`). This name is used when another protocol encapsulates yours.
   - **Author** — your name or team name.
   - **Version** — a version string (e.g. `1.0`).
   - **Description** — a free-text explanation of what the protocol does.
3. Click **Save**.

The **Created** and **Last Update** timestamps are filled in automatically and cannot be edited.

---

## Worked example: TCP metadata

| Field | Value |
|---|---|
| Protocol Name | `TCP` |
| Author | `IETF` |
| Version | `1.0` |
| Description | `Transmission Control Protocol — reliable, ordered, error-checked delivery of a stream of bytes between applications.` |

---

## Common mistakes

- **Forgetting to click Save** — changes to the form are not persisted until you click **Save**. Navigating away without saving loses your edits.
- **Leaving Protocol Name blank** — the name is required and is shown in the encapsulation picker in other protocols.

