---
publish: true
title: "Graph Features"
tags: [meta/authoring]
aliases: [graph, shapes, colors, customisation]
graph:
  shape: torusknot
  color: "#e74c3c"
  pinned: true
---

# Graph Features

GalaxyBrain's 3D graph is fully customisable per note. This page covers all the visual options available.

## Node Shapes

Set the shape via `graph.shape` in frontmatter:

```yaml
graph:
  shape: dodecahedron
```

| Value | Description | Suggested use |
|---|---|---|
| `sphere` | Default smooth sphere | General notes |
| `box` | Cube | Tools, infrastructure |
| `cone` | Cone | Entry points, indexes |
| `cylinder` | Cylinder | Reference docs |
| `dodecahedron` | 12-face polyhedron | Hub notes with many connections |
| `torus` | Donut ring | Concept notes |
| `torusknot` | Knotted torus | Highly interconnected topics |
| `octahedron` | Diamond (reserved) | Used automatically for tag nodes |

## Node Colours

```yaml
graph:
  color: "#F74C00"
```

Any valid CSS hex colour. A few suggestions:

| Hex | Colour |
|---|---|
| `#3498db` | Default blue |
| `#2ecc71` | Green |
| `#e74c3c` | Red |
| `#f39c12` | Orange |
| `#9b59b6` | Purple |
| `#00ad9f` | Teal |
| `#e67e22` | Amber |
| `#F74C00` | Rust orange |

In **light mode**, node colours automatically lighten slightly. In **dark mode**, they appear as set.

## Collapsible Nodes

A collapsible node starts with all its downstream wikilink targets hidden:

```yaml
graph:
  collapsible: true
```

The node shows a `+` badge. Clicking it expands all hidden children. Shift+clicking an expanded collapsible node re-collapses it.

This is useful for hub notes (like `Welcome`) that would otherwise dominate the graph with too many edges on first load.

## Tag Nodes

You don't configure tag nodes directly — they're generated automatically from the `tags` in your notes' frontmatter. Each unique top-level tag family (e.g. `programming`) gets a consistent colour. All notes sharing a tag are connected to the same tag octahedron.

Clicking a tag node in the full graph filters the view to only that tag's connected notes.

## Ghost Nodes

Ghost nodes are automatically created for any `[[wikilink]]` that points to a non-published note. They appear as transparent wireframe spheres. You can't click them to navigate (there's no page). They appear in the graph to show "something is linked here but hasn't been written yet."

Ghost nodes are a useful way to pre-plan your knowledge graph — write links to topics you intend to cover and the graph will show the shape of your future notes.

## Dark / Light Mode

The theme toggle in the top-right of every page switches between dark and light mode. The preference is persisted in `localStorage`. Node colours, link colours, background, and prose all respond to the theme.

## The Local Graph

Every note page has a sidebar local graph showing only the current note and its **1-hop neighbourhood** — direct links, backlinks, and shared tags. This is loaded from `public/graph/[note-id].json` which is pre-computed at build time.
