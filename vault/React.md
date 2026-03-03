---
publish: true
title: "React"
tags: [tools/js]
graph:
  shape: sphere
  color: "#61dafb"
---

# React

React is the UI library used to build the interactive graph islands in this project.

## Usage in GalaxyBrain

The two main React components are:

- `FullGraph.tsx` — the full 3D graph on the home page
- `LocalGraph.tsx` — the 1-hop neighbourhood graph shown on every note page

Both are rendered as Astro islands with `client:only="react"`, meaning they ship no server-side HTML and hydrate entirely in the browser.

## Related

- TypeScript — all components are written in TSX
- [[JavaScript]] ← parent hub
