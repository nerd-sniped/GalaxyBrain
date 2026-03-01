# GalaxyBrain — LLM Context Document

> Last updated: Phase 4 complete.
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
| Remark | `@heavycircle/remark-obsidian` | Callouts, `==highlights==`, block refs, tasks |
| Custom remark | `src/lib/remark-wikilinks.ts` | `[[wikilinks]]` → `<a data-wikilink>` with slug-based hrefs |
| Rehype | `rehype-raw` | Passes inline HTML emitted by remark plugins through the rehype pipeline |
| Lucide | `lucide-react` | Callout icons (peer dep of `@heavycircle/remark-obsidian`) |
| `unist-util-visit` | `unist-util-visit` | AST traversal used by remark-wikilinks |
| Frontmatter parsing | `gray-matter` | Used by graph-builder integration |
| File globbing | `fast-glob` | Used by graph-builder integration |
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
│   ├── graph.json                  ← Full graph (33 nodes, 74 links) — built by graph-builder
│   └── graph/[noteId].json         ← 1-hop neighbourhood JSON per published note (14 files)
├── src/
│   ├── components/
│   │   ├── FullGraph.tsx           ← Landing page React island (COMPLETE — all Phase 3 interactions)
│   │   └── GraphNodeFactory.ts     ← shape string → THREE.BufferGeometry (COMPLETE)
│   ├── integrations/
│   │   └── graph-builder.ts        ← Astro integration — globs vault, emits graph.json + per-note JSONs
│   ├── layouts/
│   │   ├── BaseLayout.astro        ← HTML shell; anti-FOUC inline theme script
│   │   └── NoteLayout.astro        ← Two-column layout + "View in graph" link + ghost-link detection
│   ├── lib/
│   │   ├── graph-types.ts          ← Re-exports types.ts + NoteGraphData / NoteRef
│   │   ├── link-resolver.ts        ← Obsidian shortest-path wikilink resolution
│   │   ├── remark-wikilinks.ts     ← Custom remark plugin: [[wikilinks]] → <a data-wikilink>
│   │   ├── types.ts                ← All shared TypeScript types
│   │   └── vault-parser.ts         ← gray-matter + wikilink/tag/blockId extraction
│   ├── pages/
│   │   ├── index.astro             ← Landing page — mounts FullGraph island
│   │   └── notes/
│   │       └── [...slug].astro     ← Dynamic note pages from content collection
│   ├── styles/
│   │   ├── callouts.css            ← All 13 Obsidian callout types with Lucide SVG icons
│   │   ├── global.css              ← Design tokens, reset, prose typography, fadeOut keyframe
│   │   ├── graph.css               ← Graph overlay chrome styles
│   │   └── note.css                ← Full prose typography: tables, tasks, wikilinks, ghost-links
│   └── content.config.ts           ← "notes" content collection (vault/notes → Astro)
├── astro.config.mjs                ← remarkWikilinks + remarkObsidian + rehypeRaw wired in
├── tsconfig.json
├── package.json
├── netlify.toml
└── Context.md                      ← This file
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
│   └── LocalGraph.tsx              ← Phase 6: sidebar expandable local graph
public/
│   └── blocks.json                 ← Phase 5: blockId → content map
```

---

## Development Phases

| Phase | Goal | Status |
|---|---|---|
| **1** | Astro scaffold + 3D graph with hardcoded data, Netlify deploy | ✅ **Complete** |
| **2** | `vault-parser`, `link-resolver`, `graph-builder` — read real `.md` files, emit `graph.json` + per-note JSONs | ✅ **Complete** |
| **3** | Full graph interactions: collapse/expand with `+` sprite, tag highlight + pulsing glow, shift+click re-collapse, ghost-click toast, right-click camera focus, directional link particles | ✅ **Complete** |
| **4** | Content pipeline: `remark-wikilinks`, `remark-obsidian`, `rehype-raw`; `NoteLayout` with sidebar + "View in graph" link + ghost-link detection; `BaseLayout` anti-FOUC; `?focus=` auto-camera; callout + prose CSS | ✅ **Complete** |
| **5** | Block indexer, remark-transclusion, asset collector, remark-vault-images, image optimization | ⬜ Not started |
| **6** | `LocalGraph.tsx` sidebar with progressive expansion (click-to-expand → click-to-navigate), backlinks/forward links populated from per-note JSONs | ⬜ Not started |
| **7** | Full vault test, CSS polish, dark mode on note pages, performance, edge cases | ⬜ Not started |

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

`public/graph/[noteId].json` — **same schema**, filtered to 1-hop neighborhood of that note. Generated at build time by `graph-builder` for all 14 published notes.

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
| Left-click file node (collapsible, collapsed) | Expands: removes from `collapsedNodes`, downstream nodes re-appear |
| Shift+click file node (collapsible, expanded) | Re-collapses: adds back to `collapsedNodes` |
| Left-click tag node | Toggles tag highlight — connected nodes full opacity + 1.35× scale, tag gets pulsing PointLight, all others fade to 0.15 opacity. Click same tag again to clear. |
| Left-click ghost node | Shows "Note not yet created" toast at cursor, auto-dismisses after 2.2 s |
| Right-click any node | `event.preventDefault()` + camera flies to focus (1500 ms `cameraPosition()` animation) |
| `?focus=noteId` URL param | On mount, after 4 s force-sim settle, camera auto-flies to that node |
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

Node size (`val`) is set at build time proportional to link count. Scale applied: `Math.cbrt(val) * 1.2` (increased from 0.8 in Phase 3 for better visibility).

**Collapsed node indicator:** a `THREE.Sprite` with a canvas-drawn `+` badge floats above-right of the mesh. Built fresh per node in `nodeThreeObject`.

**Tag highlight state:** when `highlightedTag` is set, `nodeThreeObject` gives the tag node an emissive glow + `THREE.PointLight` child. A `requestAnimationFrame` loop in a `useEffect` pulses `light.intensity = 3 + 2·sin(3t)`. All non-connected nodes get `opacity: 0.15`; connected nodes scale ×1.35.

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

### Remark/rehype pipeline
Configured in `astro.config.mjs`:
1. **`remarkWikilinks`** (custom, `src/lib/remark-wikilinks.ts`) — runs first; converts `[[Note Name]]` and `[[Note Name|Display]]` text nodes into standard `mdast` `link` nodes with `href="/notes/<slug>"` and `data-wikilink="<slug>"` attribute. Heading fragments (`[[Note#Section]]`) are preserved in the href.
2. **`remarkObsidian`** (`@heavycircle/remark-obsidian`) — handles callouts (`[!type]` blockquotes → `.callout[callout="type"]` divs with Lucide SVG icons), `==highlights==` → `<span class="highlight">`, task checkboxes, `%%comments%%`, strikethroughs.
3. **`rehypeRaw`** — lets the rehype pipeline process the raw HTML strings emitted by `remarkObsidian`. Required because the plugin emits `{ type: 'html', value: '<svg>...' }` nodes.

### Ghost-link detection
A client-side `<script>` in `NoteLayout.astro` fetches `/graph.json` after DOM ready, builds a `Set` of published node IDs, then adds `.ghost-link` to any `a[data-wikilink]` whose slug is not in the set. Ghost links render with dashed underline + muted color + `cursor: not-allowed`.

### Anti-FOUC theme script
`BaseLayout.astro` has an `is:inline` script directly in `<head>`. It reads `localStorage.getItem('galaxybrain-theme')` and toggles `theme-dark` / `theme-light` on `<html>` before the first paint, preventing the dark/light flash on page load.

### `?focus=noteId` camera auto-focus
The "View in graph" link in `NoteLayout` navigates to `/?focus=<noteId>`. `FullGraph.tsx` reads this param via `new URLSearchParams(window.location.search)` in a `useMemo`. A `setTimeout` of 4 seconds (after mount, giving the force sim time to settle) triggers the same `cameraPosition()` animation used by right-click.

### Callout attribute selector
The `@heavycircle/remark-obsidian` plugin sets `callout="type"` as a bare attribute (not `data-callout`). All CSS selectors in `callouts.css` use `[callout="type"]` accordingly.

### Build pipeline (current)
Astro integrations registered in `astro.config.mjs` run in this order:
1. **`graph-builder`** → emits `public/graph.json` + `public/graph/[noteId].json`
2. Astro's own content collection + remark/rehype pipeline

Future integrations (Phase 5):
- `asset-collector` → copies `vault/attachments/` → `src/assets/vault/`
- `block-indexer` → emits `public/blocks.json`

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
