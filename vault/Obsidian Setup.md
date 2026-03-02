---
publish: true
title: "Obsidian Setup"
tags: [meta/setup]
aliases: [obsidian, vault setup]
graph:
  shape: cylinder
  color: "#8e44ad"
---

# Obsidian Setup

This note walks you through creating and configuring an Obsidian vault that works with GalaxyBrain.

## 1. Install Obsidian

Download Obsidian from [obsidian.md](https://obsidian.md). It's free for personal use and runs on Windows, macOS, Linux, iOS, and Android.

## 2. Open the `vault/` Folder as a Vault

The GalaxyBrain repo already contains a `vault/` folder. Rather than creating a new vault from scratch:

1. Open Obsidian
2. Click **Open folder as vault**
3. Navigate to and select the `vault/` folder **inside your cloned GalaxyBrain repo**
4. Obsidian will create a hidden `.obsidian/` folder inside `vault/` with your settings

> [!important] Important
> Open the `vault/` subfolder, **not** the repo root. Obsidian stores its config inside whichever folder you open, and notes can live anywhere inside `vault/` (excluding `attachments/`).

## 3. Recommended Obsidian Settings

Inside Obsidian, go to **Settings** and configure the following:

### Files & Links
- **Default location for new notes** → `vault` (the root of the vault)
- **Default location for new attachments** → `vault/attachments`
- **Use [[Wikilinks]]** → ✅ On
- **Detect all file extensions** → ✅ On

### Editor
- **Strict line breaks** → Off (lets paragraph breaks work naturally in rendered HTML)

## 4. Install the Obsidian Git Plugin

The **Obsidian Git** community plugin auto-commits and pushes your notes to GitHub so the site rebuilds without you touching a terminal.

1. Go to **Settings → Community plugins → Browse**
2. Search for **Obsidian Git** and install it
3. Enable it
4. Go to its settings and configure:
   - **Auto commit interval** — e.g. `5` (minutes)
   - **Auto push after commit** — ✅ On
   - **Commit message** — e.g. `vault: auto-save {{date}}`

## 5. Verify the Setup

Create a test note in `vault/`:

```markdown
---
publish: true
title: "Test Note"
---

# Test Note

Hello, graph!
```

Run `pnpm dev` from the repo root. Visit `http://localhost:4321` — your test note should appear as a node.

## Next: Configure GitHub

Once your vault is working locally, see [[GitHub Setup]] to connect it to a remote repo so Netlify can watch for changes.
