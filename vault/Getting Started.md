---
publish: true
title: "Getting Started"
tags: [meta/start]
aliases: [how-to, nav]
graph:
  shape: dodecahedron
  color: "#2ecc71"
  pinned: true
---

# Getting Started

This page explains how to navigate the site and what everything in the graph means.

## Navigating the 3D Graph

The landing page shows a **force-directed 3D graph** of every published note. Each node is a note; edges are `[[wikilinks]]` between notes or connections to `#tag` nodes.

| Interaction | Result |
|---|---|
| Left-click a file node | Navigate to that note |
| Left-click a tag node | Highlight all notes sharing that tag |
| Right-click any node | Camera flies smoothly to that node |
| Drag | Rotate the graph |
| Scroll / pinch | Zoom in or out |
| Shift+click a collapsible node | Re-collapse its children |

## Node Types

| Appearance | What it is |
|---|---|
| Solid custom shape | A published note |
| Diamond (octahedron) | A tag node |
| Wireframe sphere | A ghost node — linked but not yet written |

## The Local Graph

On any individual note page, a **local graph** appears in the sidebar. It shows only the current note and its immediate neighbours — notes it links to, notes that link back, and shared tags. Click any node in the sidebar to navigate.

## Ghost Nodes

A ghost node appears when a `[[wikilink]]` points to a note that hasn't been written yet, or has `publish: false`. Ghost nodes are visual placeholders — they make the shape of your knowledge graph visible even for ideas you haven't captured yet.

## Collapsible Nodes

Notes with `collapsible: true` in their frontmatter start with their downstream links hidden behind a `+` badge. Click to expand the subtree; Shift+click to re-collapse.

## Tags

Tags appear as octahedron nodes. Clicking one dims all unrelated nodes and highlights only the notes connected to that tag. A filter banner appears at the top — click the **✕** button to clear the filter.

## Next Steps

Ready to build your own? Follow the [GalaxyBrain README installation guide](https://github.com/nerd-sniped/GalaxyBrain#readme), then return to **How to Use This Template** for architecture details.

---

## Support This Project

> [!tip] This is free — and that's on purpose
> I'm releasing this for free because fun side projects are better when they aren't hidden behind a paywall — not everything needs to feed the soul-crushing capitalism machine. That said, I still have to pay rent. If you've found this helpful or end up using it yourself, please consider [supporting me on Patreon](https://www.patreon.com/cw/Nerd_Sniped). ❤️
