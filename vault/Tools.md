---
publish: true
title: "Tools"
tags: [meta]
graph:
  shape: box
  color: "#9b59b6"
  collapsible: true
---

# Tools

The stack behind this garden.

## Authoring

- **[[Obsidian]]** — the note-taking app used to write and link notes
- **Git** — version control; the vault lives in the same repo as the site

## Publishing

- **[[Astro]]** — static site generator
- **react-force-graph-3d** — three.js-powered 3D graph visualization
- **Netlify** — hosting and CI/CD

## Workflow

```
Write notes in Obsidian
       ↓
Commit vault/ to git
       ↓
Netlify triggers pnpm build
       ↓
Astro integrations parse vault → graph.json + blocks.json
       ↓
Static HTML + assets deployed to CDN
```

> [!warning] Work in Progress
> Many of the features described in this garden are still being built. The graph is functional; full note rendering with transclusion is coming in a later phase.
