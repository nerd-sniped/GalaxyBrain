---
publish: true
title: "Astro"
tags: [tools]
graph:
  shape: cone
  color: "#e84393"
---

# Astro

Astro is the static site generator powering this garden.

## Why Astro

- **Islands architecture** — ship zero JS by default; opt into interactivity per-component
- **Content Collections** — typed, schema-validated Markdown with automatic slug generation
- **Remark/Rehype integration** — pluggable Markdown pipeline; easy to add Obsidian-specific syntax support
- **Static output** — compiles to plain HTML/CSS/JS, perfect for Netlify

## Key Integrations Used

| Integration | Purpose |
|---|---|
| `@astrojs/react` | React islands (FullGraph, LocalGraph) |
| `@astrojs/netlify` | Static adapter for Netlify deploys |
| `@heavycircle/remark-obsidian` | Wikilinks, callouts, highlights, task lists |

## Build Pipeline

Astro integrations run in order before the Astro content pipeline:

1. `asset-collector` — copies vault images to `src/assets/vault/`
2. `block-indexer` — builds `public/blocks.json`
3. `graph-builder` — emits `public/graph.json` + per-note JSONs

Then Astro's remark plugins process the Markdown into HTML.

See [[Tools]] for the full workflow diagram.
