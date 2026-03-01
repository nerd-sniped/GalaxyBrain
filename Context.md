# GalaxyBrain — LLM Context Document

> Last updated: Phase 2 complete.
> Purpose: Give any future LLM session immediate, accurate context to continue development without re-deriving decisions from scratch.

---

## What This Project Is

A **static Astro website** that publishes an Obsidian vault of `.md` files as a "digital garden". The **primary navigation is a full-viewport interactive 3D force-directed graph** rendered with `react-force-graph-3d` (Three.js). Notes appear as nodes; wikilinks and tags are edges. Clicking a node navigates to its note page. Each note page will have a sidebar with a smaller local graph (not yet built).

The project is hosted on **Netlify** as a fully static deploy (`output: 'static'`).

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Astro 5 | Static output, content collections |
| React islands | `@astrojs/react` | `client:only="react"` for graph components |
| 3D graph | `react-force-graph-3d` | Wraps Three.js force simulation |
| Three.js | `three@0.183` | Direct import for custom geometries |
| Hosting | Netlify | `@astrojs/netlify` adapter |
| Markdown | Obsidian-flavored `.md` | `[[wikilinks]]`, `#tags`, `[!callouts]`, `==highlights==`, `^block-references` |
| Remark | `@heavycircle/remark-obsidian` | Handles wikilinks, callouts, highlights, block refs, tasks |
| Frontmatter parsing | `gray-matter` | (installed, used in future integrations) |
| File globbing | `fast-glob` | (installed, used in future integrations) |
| Types | TypeScript 5 (`strict`) | Path aliases: `@lib/*`, `@components/*`, `@layouts/*`, `@styles/*` |

---

## Project Structure (current state)

```
GalaxyBrain/
├── vault/                          ← Obsidian vault (source of truth for content)
│   ├── notes/
│   │   ├── Welcome.md
│   │   ├── Getting Started.md
│   │   ├── Tools.md
│   │   ├── Obsidian.md
│   │   └── Astro.md
│   └── attachments/
│       └── .gitkeep
├── public/
│   └── graph.json                  ← Hardcoded Phase 1 graph data (8 file + 3 tag + 2 ghost nodes)
├── src/
│   ├── components/
│   │   ├── FullGraph.tsx           ← Landing page React island (COMPLETE)
│   │   └── GraphNodeFactory.ts     ← shape string → THREE.BufferGeometry (COMPLETE)
│   ├── layouts/
│   │   ├── BaseLayout.astro        ← HTML shell, imports global.css
│   │   └── NoteLayout.astro        ← Two-column: content + sidebar placeholder
│   ├── lib/
│   │   └── types.ts                ← All shared TypeScript types
│   ├── pages/
│   │   ├── index.astro             ← Landing page — mounts FullGraph island
│   │   └── notes/
│   │       └── [...slug].astro     ← Dynamic note pages from content collection
│   ├── styles/
│   │   ├── global.css              ← Design tokens, reset, prose typography
│   │   ├── graph.css               ← Graph overlay chrome styles
│   │   ├── callouts.css            ← Obsidian callout variants
│   │   └── note.css                ← Backlinks, wikilink anchors, transclusion
│   └── content.config.ts           ← "notes" content collection (vault/notes → Astro)
├── astro.config.mjs
├── tsconfig.json
├── package.json
├── netlify.toml
└── Context.md                      ← This file
```

**Phase 2 additions (now exist):**
```
src/integrations/
│   └── graph-builder.ts            ✅ Astro integration — globs vault, emits graph.json + per-note JSONs
src/lib/
│   ├── graph-types.ts              ✅ Re-exports types.ts + NoteGraphData / NoteRef for per-note format
│   ├── vault-parser.ts             ✅ gray-matter + wikilink/tag/blockId extraction
│   └── link-resolver.ts            ✅ Obsidian shortest-path wikilink resolution
public/
│   └── graph/[noteId].json         ✅ 1-hop neighbourhood JSON per published note (14 files)
```

**Not yet created** (future phases):
```
src/integrations/
│   ├── asset-collector.ts          ← Phase 5: copies vault images → src/assets/vault/
│   └── block-indexer.ts            ← Phase 5: builds public/blocks.json
src/plugins/
│   ├── remark-transclusion.ts      ← Phase 5: ![[note#^block]] → inlined content
│   └── remark-vault-images.ts      ← Phase 5: ![[image]] → optimized <img>
src/components/
│   ├── LocalGraph.tsx              ← Phase 6: sidebar expandable local graph
│   └── GraphInteractions.ts        ← Phase 6: shared click/focus/highlight logic
public/
│   └── blocks.json                 ← Phase 5: blockId → content map
```

---

## Development Phases

| Phase | Goal | Status |
|---|---|---|
| **1** | Astro scaffold + 3D graph with hardcoded data, Netlify deploy | ✅ **Complete** |
| **2** | `vault-parser`, `link-resolver`, `graph-builder` — read real `.md` files, emit `graph.json` + per-note JSONs | ✅ **Complete** |
| **3** | Full graph interactions: ghost nodes, custom geometry, collapse/expand, right-click focus, tag highlight, navigation | ✅ **Complete** (built in Phase 1) |
| **4** | Content collection, remark plugins for wikilinks + callouts, basic note page rendering | ⬜ Not started |
| **5** | Block indexer, remark-transclusion, asset collector, remark-vault-images, image optimization | ⬜ Not started |
| **6** | `NoteLayout` two-column, `LocalGraph` with progressive expansion (click-to-expand then click-to-navigate), backlinks/forward links | ⬜ Not started |
| **7** | Full vault test, CSS polish, callout styling, dark mode, performance, edge cases | ⬜ Not started |

> Phase 3 interactions were implemented ahead of schedule during Phase 1 since the component was being built anyway.

---

## Graph Data Contract

### `public/graph.json` (full graph)

```typescript
{
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphNode {
  id: string;           // slug, e.g. "my-note" or "tag:programming"
  name: string;         // display name
  type: 'file' | 'ghost' | 'tag';
  path: string | null;  // null for ghost and tag nodes
  val: number;          // node size (proportional to link count)
  shape: NodeShape;     // see NodeShape type below
  color: string;        // hex
  collapsible: boolean; // if true, starts collapsed; click to reveal downstream
  excerpt: string | null;
}

interface GraphLink {
  source: string;  // node id
  target: string;  // node id
  type: 'wikilink' | 'file-tag' | 'tag-hierarchy';
}

type NodeShape = 'sphere' | 'box' | 'cone' | 'cylinder' |
                 'dodecahedron' | 'torus' | 'torusknot' | 'octahedron';
```

`public/graph/[noteId].json` — **same schema**, filtered to 1-hop neighborhood of that note. Not yet generated (Phase 2).

`public/blocks.json` — blockId → content map. Not yet generated (Phase 5).

---

## Frontmatter Schema

```yaml
---
publish: true                   # REQUIRED — notes without this are excluded everywhere
title: "My Note Title"
tags: [programming, rust]
aliases: [my-note, intro]
graph:
  shape: dodecahedron           # sphere|box|cone|cylinder|dodecahedron|torus|torusknot|octahedron
  color: "#ff6b6b"              # hex override
  collapsible: true             # hides downstream nodes until clicked (default: false)
cover: attachments/hero.png     # optional hero image
---
```

---

## Interaction Model

### Full Graph (`/`)

| Interaction | Result |
|---|---|
| Left-click file node (expanded) | `window.location.href = node.path` |
| Left-click file node (collapsible, collapsed) | Reveals downstream nodes |
| Left-click tag node | Toggles highlight — dims all unrelated nodes. Click again to clear. |
| Left-click ghost node | No-op. Tooltip: "Note not yet created." |
| Right-click any node | Camera flies to focus on node (1500ms animation via `cameraPosition()`) |
| Scroll | Zoom |
| Drag | Rotate |

### Local Graph (`/notes/[slug]` sidebar) — Phase 6

- First click on neighbour: fetch that node's `/graph/[id].json`, merge into view
- Second click on same neighbour: navigate to that note's page
- Below graph: backlinks list + forward links list

---

## Node Visuals

| Node type | Shape | Material | Color |
|---|---|---|---|
| `file` | Shape from frontmatter (default sphere) | `MeshLambertMaterial` solid | From frontmatter |
| `tag` | Octahedron (forced, regardless of shape field) | `MeshLambertMaterial` solid | From node data (red/orange family) |
| `ghost` | Sphere | `MeshBasicMaterial` wireframe, opacity 0.15 | White |

Node size (`val`) is set at build time proportional to link count. Scale applied: `Math.cbrt(val) * 0.8`.

---

## Key Implementation Details

### Why `client:only="react"` on the graph
`react-force-graph-3d` uses `window`, `document`, and WebGL — none of which exist during Astro's SSR pass. `client:only="react"` skips server rendering entirely for this component.

### Tooltip is imperative (no React state)
The hover tooltip updates `el.style` and `el.textContent` directly via a DOM ref. This prevents `setTooltip(...)` from triggering re-renders on every mouse movement, which was causing the force simulation to restart and nodes to twitch.

### `visibleData` is memoized with `useMemo`
`graphData` is passed to `<ForceGraph3D graphData={...}>`. If this prop changes reference on every render, the library restarts the force simulation. `useMemo` ensures the reference only changes when `graphData` or `collapsedNodes` actually changes.

### Dark/light mode
- Toggle button fixed top-right: ☀️ / 🌙
- State stored in `localStorage` under key `galaxybrain-theme`
- Values: `'dark'` (default) / `'light'`
- Background colors: dark = `#0a0a0a`, light = `#f5f5f5`
- Tooltip and link colors adapt to the current theme

### Content collection
`src/content.config.ts` defines a `notes` collection using Astro 5's Content Layer API (`glob` loader pointing at `vault/notes/`). Rendering uses the `render(note)` function (not the deprecated `note.render()` method). Only notes with `publish: true` get static routes.

### Build pipeline (planned for Phase 2+)
Astro integrations registered in `astro.config.mjs` will run in this order before Astro's own pipeline:
1. `asset-collector` → copies `vault/attachments/` images to `src/assets/vault/`
2. `block-indexer` → emits `public/blocks.json`
3. `graph-builder` → emits `public/graph.json` + `public/graph/[noteId].json`

Then Astro's remark pipeline runs with `@heavycircle/remark-obsidian` + custom plugins.

---

## Design System

CSS custom properties defined in `src/styles/global.css`:

```css
--bg:          #0d0d0d
--surface-0:   #111111
--surface-1:   #1a1a1a
--surface-2:   #222222
--border:      rgba(255 255 255 / 0.08)
--text:        #e0e0e0
--text-muted:  #888888
--accent:      #3498db
--accent-tag:  #e74c3c
--font-body:   'Inter', system-ui, sans-serif
--font-mono:   'JetBrains Mono', 'Fira Code', monospace
```

---

## Open Design Questions

1. **Tag geometry**: All tags currently share one shape (octahedron). Should tag families (`#programming/systems`) get distinct shapes or colors?
2. **Graph background**: Currently ties to the note page theme (dark/light). Alternatively, always dark (space-like) independent of note theme.

---

## Commands

```bash
pnpm dev          # dev server at localhost:4321
pnpm build        # production build → dist/
pnpm preview      # serve dist/ locally
```

Netlify build command: `pnpm build` (configured in `netlify.toml`), publish dir: `dist/`.
