# GalaxyBrain — LLM Context Document

> Last updated: Phase 5 complete.
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
| Custom remark | `src/lib/remark-wikilinks.ts`, `src/plugins/remark-vault-images.ts`, `src/plugins/remark-transclusion.ts` | See pipeline order below |
| Rehype | `rehype-raw` | Passes inline HTML from remark plugins through rehype |
| Lucide | `lucide-react` | Callout icons |
| `unist-util-visit` | `unist-util-visit` | AST traversal used by remark plugins |
| `unified` | `unified@11` | Remark plugin typing (dev dep) |
| `@types/mdast` | `@types/mdast@4` | mdast AST types (dev dep) |
| Frontmatter | `gray-matter` | Used by build-time integrations |
| File globbing | `fast-glob` | Used by all integrations |
| Types | TypeScript 5 (`strict`) | Path aliases: `@lib/*`, `@components/*`, `@layouts/*`, `@styles/*` |

---

## Project Structure (current state)

```
GalaxyBrain/
├── vault/                          ← Obsidian vault (source of truth for content)
│   ├── notes/
│   │   ├── *.md                    ← 15 notes total, 14 with publish: true
│   │   └── examples/
│   │       └── screenshot.svg      ← Sample image in a note subfolder (Phase 5)
│   └── attachments/
│       └── diagram.svg             ← Sample image in attachments/ (Phase 5)
├── public/
│   ├── graph.json                  ← Full graph — built by graph-builder
│   ├── graph/[noteId].json         ← 1-hop neighbourhood per published note (14 files)
│   └── vault-assets/               ← Copied vault images (built by asset-collector)
│       ├── attachments/diagram.svg
│       └── notes/examples/screenshot.svg
├── .astro/                         ← Build-time generated data (created by Astro, gitignored)
│   ├── vault-images.json           ← { "diagram.svg": "/vault-assets/attachments/diagram.svg", … }
│   └── block-index.json            ← { "rust/^ownership-intro": "…", "note-taking": "…", … }
├── src/
│   ├── components/
│   │   ├── FullGraph.tsx           ← Landing page React island (COMPLETE — all Phase 3 interactions)
│   │   └── GraphNodeFactory.ts     ← shape string → THREE.BufferGeometry
│   ├── integrations/
│   │   ├── graph-builder.ts        ← Emits graph.json + per-note JSONs at astro:config:done
│   │   ├── asset-collector.ts      ← Copies vault images → public/vault-assets/ at astro:build:start
│   │   └── block-indexer.ts        ← Indexes ^blockIds per note → .astro/block-index.json
│   ├── layouts/
│   │   ├── BaseLayout.astro        ← HTML shell; anti-FOUC inline theme script
│   │   └── NoteLayout.astro        ← Two-column layout + "View in graph" + ghost-link detection
│   ├── lib/
│   │   ├── graph-types.ts          ← Re-exports types.ts + NoteGraphData / NoteRef
│   │   ├── link-resolver.ts        ← Obsidian shortest-path wikilink resolution
│   │   ├── remark-wikilinks.ts     ← [[wikilinks]] → <a data-wikilink>
│   │   ├── types.ts                ← All shared TypeScript types
│   │   └── vault-parser.ts         ← gray-matter + wikilink/tag/blockId extraction
│   ├── pages/
│   │   ├── index.astro             ← Landing page — mounts FullGraph island
│   │   └── notes/
│   │       └── [...slug].astro     ← Dynamic note pages from content collection
│   ├── plugins/
│   │   ├── remark-vault-images.ts  ← ![[img.ext]] / ![](img) → /vault-assets/ paths
│   │   └── remark-transclusion.ts  ← ![[note#^id]] / ![[note]] → blockquote/details embeds
│   ├── styles/
│   │   ├── callouts.css            ← All 13 Obsidian callout types with Lucide SVG icons
│   │   ├── global.css              ← Design tokens, reset, prose typography
│   │   ├── graph.css               ← Graph overlay chrome styles
│   │   └── note.css                ← Prose typography + transclusion styles (updated Phase 5)
│   └── content.config.ts           ← "notes" content collection (vault/notes → Astro)
├── astro.config.mjs
├── tsconfig.json
├── package.json
├── netlify.toml
└── Context.md                      ← This file
```

**Not yet created** (future phases):
```
src/components/
│   └── LocalGraph.tsx              ← Phase 6: sidebar expandable local graph
```

---

## Development Phases

| Phase | Goal | Status |
|---|---|---|
| **1** | Astro scaffold + 3D graph with hardcoded data, Netlify deploy | ✅ Complete |
| **2** | `vault-parser`, `link-resolver`, `graph-builder` — read real `.md` files, emit `graph.json` + per-note JSONs | ✅ Complete |
| **3** | Full graph interactions: collapse/expand with `+` sprite, tag highlight + pulsing glow, shift+click re-collapse, ghost-click toast, right-click camera focus, directional link particles | ✅ Complete |
| **4** | Content pipeline: `remark-wikilinks`, `remark-obsidian`, `rehype-raw`; `NoteLayout`; anti-FOUC; `?focus=` camera; callout + prose CSS | ✅ Complete |
| **5** | Block indexer, remark-transclusion, asset collector, remark-vault-images, transclusion CSS | ✅ Complete |
| **6** | `LocalGraph.tsx` sidebar with progressive expansion (click-to-expand → click-to-navigate), backlinks/forward links from per-note JSONs | ⬜ Not started |
| **7** | Full vault test, CSS polish, dark mode on note pages, performance, edge cases | ⬜ Not started |

---

## Phase 5 — What Was Built

### Integration: `asset-collector` (`src/integrations/asset-collector.ts`)

- Runs at `astro:build:start` and `astro:server:setup` (dev) — first in the integrations array.
- Scans every published note for image references: `![[filename.ext]]`, `![alt](path.ext)`, frontmatter `cover`.
- Resolves each by shortest-path filename match across `vault/` (lowercased basename, first occurrence wins).
- **Only copies images referenced by published notes** — unpublished note images are skipped.
- Copies matched files to `public/vault-assets/` preserving `vault/`-relative directory structure.
- Writes `.astro/vault-images.json`: `{ "diagram.svg": "/vault-assets/attachments/diagram.svg", … }`

### Integration: `block-indexer` (`src/integrations/block-indexer.ts`)

- Runs at `astro:build:start` and `astro:server:setup` — after asset-collector.
- Finds all `^blockId` markers in published notes. Extracts the block content:
  - Marker on a **paragraph line** → entire paragraph (back to preceding blank line)
  - Marker on a **list item** → that item + indented children
  - Marker on an **otherwise-empty line** → preceding paragraph block
- Writes `.astro/block-index.json`:
  - Full-note key: `"note-slug"` → full body string (for `![[note]]` embeds)
  - Block key: `"note-slug/^blockId"` → block content string (the `^` is literal in the key)

### Plugin: `remark-vault-images` (`src/plugins/remark-vault-images.ts`)

- Loads `.astro/vault-images.json` (cached per process).
- In text nodes: matches `![[filename.ext]]` via regex → emits `<img src="/vault-assets/..." class="vault-image" loading="lazy" decoding="async">` as a raw HTML node.
- On `image` AST nodes: rewrites `node.url` for any relative path found in the map.
- `resetImagePathMapCache()` exported for dev rebuilds.

### Plugin: `remark-transclusion` (`src/plugins/remark-transclusion.ts`)

- Loads `.astro/block-index.json` (cached per process).
- Detects `![[note#^blockId]]` and `![[note]]` in text nodes; skips image extensions.
- **Block embed** → `<blockquote class="transclusion">` with inline-rendered block content + `<cite class="transclusion-cite"><a href="/notes/slug">From: Note Name</a></cite>`.
- **Full note embed** → `<details class="transclusion-embed">` (collapsible) with `<summary>` header linking to the source and note body (capped at 1500 raw chars).
- **Missing reference** → `<div class="transclusion-missing">⚠ Block not found: …</div>` — never throws, never breaks the build.
- `resetBlockIndexCache()` exported for dev rebuilds.
- The inline markdown renderer (bold, italic, code, lists, paragraphs) is regex-based; does NOT recurse into nested embeds.

### Transclusion CSS (`src/styles/note.css`)

- `blockquote.transclusion` — accent left-border, subtle background, decorative `❝` glyph.
- `cite.transclusion-cite` — right-aligned, small, "From: note-name" with top border separator.
- `details.transclusion-embed` — collapsible container with animated `▶`/`▼` indicator.
- `.transclusion-missing` — orange-tinted inline warning box.
- `img.vault-image` — same visual treatment as `.prose img`.

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

`public/graph/[noteId].json` — same schema, 1-hop neighborhood. 14 files.

`.astro/vault-images.json` — `{ "basename.ext": "/vault-assets/relative/path.ext" }` (both lowercased basename and full relative path stored as keys).

`.astro/block-index.json` — `{ "slug": "full note body", "slug/^blockId": "block content" }`. Keys for blocks include a literal `^` character (e.g. `"rust/^ownership-intro"`).

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
Configured in `astro.config.mjs` — order is critical:
1. **`remarkVaultImages`** (`src/plugins/remark-vault-images.ts`) — runs first; rewrites `![[img.ext]]` text nodes to `<img class="vault-image">` and rewrites standard `image` AST node URLs to `/vault-assets/...` paths. Must run before other plugins consume `![[...]]` syntax.
2. **`remarkTransclusion`** (`src/plugins/remark-transclusion.ts`) — converts `![[note#^blockId]]` to `<blockquote class="transclusion">` and `![[note]]` to `<details class="transclusion-embed">`. Missing refs render a `<div class="transclusion-missing">` warning. Must run before `remarkWikilinks` so embeds aren't partially parsed as wikilinks.
3. **`remarkWikilinks`** (custom, `src/lib/remark-wikilinks.ts`) — converts `[[Note Name]]` and `[[Note Name|Display]]` into `<a href="/notes/<slug>" data-wikilink="<slug>">`. Heading fragments preserved.
4. **`remarkObsidian`** (`@heavycircle/remark-obsidian`) — callouts (`[!type]` → `.callout[callout="type"]` divs + Lucide SVG), `==highlights==` → `<span class="highlight">`, tasks, `%%comments%%`.
5. **`rehypeRaw`** — processes raw HTML nodes emitted by all remark plugins above.

### Ghost-link detection
A client-side `<script>` in `NoteLayout.astro` fetches `/graph.json` after DOM ready, builds a `Set` of published node IDs, then adds `.ghost-link` to any `a[data-wikilink]` whose slug is not in the set. Ghost links render with dashed underline + muted color + `cursor: not-allowed`.

### Anti-FOUC theme script
`BaseLayout.astro` has an `is:inline` script directly in `<head>`. It reads `localStorage.getItem('galaxybrain-theme')` and toggles `theme-dark` / `theme-light` on `<html>` before the first paint, preventing the dark/light flash on page load.

### `?focus=noteId` camera auto-focus
The "View in graph" link in `NoteLayout` navigates to `/?focus=<noteId>`. `FullGraph.tsx` reads this param via `new URLSearchParams(window.location.search)` in a `useMemo`. A `setTimeout` of 4 seconds (after mount, giving the force sim time to settle) triggers the same `cameraPosition()` animation used by right-click.

### Callout attribute selector
The `@heavycircle/remark-obsidian` plugin sets `callout="type"` as a bare attribute (not `data-callout`). All CSS selectors in `callouts.css` use `[callout="type"]` accordingly.

### Build pipeline (complete)
Registered in `astro.config.mjs`:
```
astro:config:done
  └── graph-builder      → public/graph.json, public/graph/[id].json

astro:build:start
  ├── asset-collector    → public/vault-assets/, .astro/vault-images.json
  └── block-indexer      → .astro/block-index.json

remark pipeline (per .md file)
  1. remark-vault-images   — ![[img]] → <img src="/vault-assets/...">
  2. remark-transclusion   — ![[note#^id]] / ![[note]] → HTML embeds
  3. remark-wikilinks      — [[note]] → <a data-wikilink>
  4. remark-obsidian       — callouts, highlights, tasks
  ↓
  rehype-raw               — processes raw HTML from steps 1–4
```

### Block index key convention
Keys in `.astro/block-index.json`:
- Full note: `"note-slug"` → full body string
- Block: `"note-slug/^blockId"` → block content string (the `^` is **literally in the key**)

Lookup in `remark-transclusion`:
```typescript
// blockId comes from regex as "^ownership-intro"
const key = `${noteSlug}/^${blockId.slice(1)}`; // → "rust/^ownership-intro"
```

### Build-time JSON files
`vault-images.json` and `block-index.json` live in `.astro/` — created at build time, read by remark plugins via `readFileSync`. **Not shipped to the browser.**

### Transclusion inline renderer
The markdown → HTML converter inside `remark-transclusion` is a lightweight regex-based renderer (bold, italic, code, lists, paragraphs). It does NOT recursively invoke the full remark pipeline. If a transcluded block itself contains `![[...]]` embeds, those are **not** recursively resolved.

### Image optimization note
Vault images are served from `public/vault-assets/` as static files with `loading="lazy" decoding="async"`. Astro's WebP/AVIF pipeline only applies to files imported via the content layer from `src/assets/`. For raster PNG/JPG optimization a future phase could add `sharp` post-processing in `asset-collector` or re-route through `getImage()`.

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
--radius-md:   6px
```

---

## Open Design Questions

1. **Tag geometry**: All tags currently share one shape (octahedron). Should tag families (`#programming/systems`) get distinct shapes or colors?
2. **Graph background**: Currently ties to note page theme. Should the graph always be dark (space-like)?
3. **Image optimization**: Vault raster images bypass Astro's WebP/AVIF pipeline. Worth adding `sharp` in `asset-collector` for PNG/JPG?
4. **Transclusion recursion**: Transcluded blocks containing `![[...]]` are NOT recursively resolved. Is deep nesting a requirement?

---

## Commands

```bash
pnpm dev          # dev server at localhost:4321
pnpm build        # production build → dist/
pnpm preview      # serve dist/ locally
```

Netlify build command: `pnpm build` (configured in `netlify.toml`), publish dir: `dist/`.
