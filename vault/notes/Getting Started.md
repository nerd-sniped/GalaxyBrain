---
publish: true
title: "Getting Started"
tags: [meta]
aliases: [how-to]
graph:
  shape: dodecahedron
  color: "#2ecc71"
---

# Getting Started

Welcome to the navigation guide for this garden.

## The 3D Graph

The landing page shows a **force-directed 3D graph** of all published notes. Each node is a note; edges are `[[wikilinks]]` and `#tags`.

| Interaction | Result |
|---|---|
| Left-click file node | Navigate to note |
| Left-click tag node | Highlight all notes with that tag |
| Right-click any node | Camera flies to that node |
| Drag | Rotate the graph |
| Scroll | Zoom in/out |

## Node Types

- **Spheres / custom shapes** — published notes
- **Octahedra (diamond)** — tags
- **Wireframe spheres** — ghost nodes (linked but not yet written)

## Ghost Notes

A ==ghost node== appears when a wikilink points to a note that doesn't exist yet (or has `publish: false`). Ghost nodes are transparent and not clickable — they're placeholders.

> [!note] Note
> Ghost notes show up as `Future Ideas` in the seed graph on the landing page.

## Collapsible Nodes

Notes with `collapsible: true` in their frontmatter start with their downstream links hidden. Click once to reveal children; click again to navigate.

## Graph Architecture Diagram

The graph below shows a simplified sample of the force-directed layout used on the home page:

![[diagram.svg]]

## Transclusion Examples

This section demonstrates block and note embedding.

### Rust Ownership Model (block embed)

> The following is transcluded directly from [[Rust]]:

![[Rust#^ownership-intro]]

### Note-Taking Principle (block embed)

![[Note Taking#^atomic-note]]

### Broken Reference (error handling test)

The embed below references a block that does not exist — it should render a warning instead of breaking the build:

![[nonexistent note#^broken-id]]

### Full Note Embed

The full content of [[Note Taking]] is embedded below (collapsed by default):

![[Note Taking]]
