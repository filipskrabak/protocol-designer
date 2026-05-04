# Upload / New Protocol

The Upload page is your starting point. From here you either begin a brand-new protocol design or load one you worked on before.

<!-- ![Screenshot: Upload page with two action cards](./img/upload/upload-page-overview.png) -->

## Step-by-step: start a new protocol

1. Open the app. You land on the **Upload** page automatically.
2. Click the **Start New Project** card.
3. The app creates a blank protocol and takes you straight to the **Protocol Header** editor.

You can now add fields, set properties, and model behaviour.

---

## Step-by-step: import an existing protocol

Protocol Designer exports protocols as `.svg` files with the full design embedded inside them. This is the only file format accepted on import.

1. Click the **Import Protocol** card.
2. A file picker opens. Select an `.svg` file exported by Protocol Designer.
3. The app reads the file, restores all fields, properties, EFSM, and CPN, then redirects you to the **Protocol Header** editor.

::: tip
Only `.svg` files exported from Protocol Designer can be imported. Plain SVG images from other tools will not work — the app expects a specific embedded XML schema.
:::

---

## Your protocol library

Below the two cards you will see **Your Protocols** — a list of protocols you have previously saved to the server. Click any entry to load it directly without uploading a file.

::: tip
Use **Start New Project** to experiment freely. When you are happy with the result, save it (on the **Properties** tab) so it appears in your library for next time.
:::

---

## Common mistakes

- **Wrong file type** — Only `.svg` files produced by Protocol Designer are valid. Other formats (JSON, XML, plain SVG) are rejected.
- **File produced by a different tool** — Even if the extension is `.svg`, the import will fail unless the file contains the embedded protocol schema.

