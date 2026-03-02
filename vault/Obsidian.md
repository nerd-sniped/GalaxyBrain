---
publish: true
title: "Obsidian"
tags: [tools]
graph:
  shape: cylinder
  color: "#8e44ad"
---

# Obsidian

Obsidian is a local-first Markdown note-taking app. It stores notes as plain `.md` files on disk, which makes it trivially easy to integrate with a static site generator.

## Why Obsidian

- **Plain files** — no proprietary database; files are readable and version-controllable with git
- **Wikilinks** — `[[Note Name]]` syntax for easy cross-linking
- **Graph view** — built-in visual graph (the inspiration for this site's 3D graph)
- **Community plugins** — extensible with a rich ecosystem

## Vault Structure

The vault used for this site lives in `vault/` at the project root:

```
vault/
├── notes/        ← All .md files
└── attachments/  ← Images and other media
```

## Frontmatter

Every publishable note includes `publish: true` in its YAML frontmatter. Notes without this field (or with `publish: false`) are excluded from the site.

See [[Getting Started]] for the full frontmatter schema.
