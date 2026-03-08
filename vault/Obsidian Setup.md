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

Installation and onboarding steps are maintained in the GitHub README:

- [GalaxyBrain README (Installation Guide)](https://github.com/nerd-sniped/GalaxyBrain#readme)

This note is reference-only for Obsidian-specific conventions and settings.

## Vault Convention

GalaxyBrain expects you to open the `vault/` subfolder (not the repo root) as your Obsidian vault.

> [!important] Important
> Open the `vault/` subfolder, **not** the repo root. Obsidian stores its config inside whichever folder you open, and notes can live anywhere inside `vault/` (excluding `attachments/`).

## Recommended Obsidian Settings

Inside Obsidian, go to **Settings** and configure the following:

### Files & Links
- **Default location for new notes** → `vault` (the root of the vault)
- **Default location for new attachments** → `vault/attachments`
- **Use [[Wikilinks]]** → ✅ On
- **Detect all file extensions** → ✅ On

### Editor
- **Strict line breaks** → Off (lets paragraph breaks work naturally in rendered HTML)

## Obsidian Git (Recommended)

For automated sync, use the **Obsidian Git** plugin ([direct link](obsidian://show-plugin?id=obsidian-git)).

Recommended plugin behavior:

- Auto commit interval enabled
- Auto push enabled
- A stable commit message format

> [!note] Authentication
> You don't need to configure credentials here. On the first push, Git Credential Manager opens a GitHub login page in your browser — approve it once and all future pushes are silent. See [[GitHub Setup]] for details.

## Next: Configure GitHub

Use README for the exact setup sequence, then see [[GitHub Setup]] for auth strategy and repo hygiene reference.
