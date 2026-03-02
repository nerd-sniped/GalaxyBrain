# GalaxyBrain — LLM Context Document

> Last updated: Phase 8 complete.
> Purpose: Give any future LLM session immediate, accurate context to continue development without re-deriving decisions from scratch.

---

## What This Project Is

A **static Astro website** that publishes an Obsidian vault of `.md` files as a "digital garden". The **primary navigation is a full-viewport interactive 3D force-directed graph** rendered with `react-force-graph-3d` (Three.js). Notes appear as nodes; wikilinks and tags are edges. Clicking a node navigates to its note page. Each note page has a sidebar with a **live interactive local graph** (`LocalGraph.tsx`) showing the 1-hop neighbourhood, a backlinks list, forward links list, and tag pills. The site has a full **dark/light theme system** with no flash on load and a single global toggle button.

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
| Syntax highlighting | Shiki (built into Astro) | Dual themes: `github-dark` / `github-light`, bound to `html.dark` / `html.light` via CSS variables |
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
│   │   ├── *.md                    ← 20 notes total: 17 with publish:true, 3 with publish:false
│   │   └── examples/
│   │       └── screenshot.svg      ← Sample image referenced in TypeScript.md
│   └── attachments/
│       ├── diagram.svg             ← Placeholder image
│       ├── graph-preview.svg       ← Graph preview (Phase 8) — embedded in Welcome.md
│       └── rust-logo.svg           ← Rust logo (Phase 8) — embedded in Rust.md
├── public/
│   ├── graph.json                  ← Full graph — 52 nodes, 122 links, 26.4 KB
│   ├── graph/[noteId].json         ← 1-hop neighbourhood per published note (17 files)
│   └── vault-assets/               ← Copied vault images (built by asset-collector)
│       ├── attachments/…
│       └── notes/examples/…
├── .astro/                         ← Build-time generated data (gitignored)
│   ├── vault-images.json           ← { “dialog.svg”: “/vault-assets/…”, … }
│   └── block-index.json            ← { “rust/^ownership-intro”: “…”, “note-taking”: “…”, … }
├── src/
│   ├── components/
│   │   ├── FullGraph.tsx           ← Landing page React island (COMPLETE — see Phase 8 perf notes)
│   │   ├── LocalGraph.tsx          ← Note page sidebar island (COMPLETE — lazy init + cleanup Phase 8)
│   │   └── GraphNodeFactory.ts     ← shape string → THREE.BufferGeometry; isLight flag (Phase 7)
│   ├── integrations/
│   │   ├── graph-builder.ts        ← Emits graph.json + per-note JSONs; per-file try/catch (Phase 8)
│   │   ├── asset-collector.ts      ← Copies vault images → public/vault-assets/
│   │   └── block-indexer.ts        ← Indexes ^blockIds per note
│   ├── layouts/
│   │   ├── BaseLayout.astro        ← HTML shell; anti-FOUC; global theme toggle
│   │   └── NoteLayout.astro        ← Two-column layout, LocalGraph sidebar
│   ├── lib/
│   │   ├── graph-types.ts          ← Re-exports types.ts + NoteGraphData / NoteRef
│   │   ├── link-resolver.ts        ← Obsidian shortest-path wikilink resolution
│   │   ├── remark-wikilinks.ts     ← [[wikilinks]] → <a data-wikilink>
│   │   ├── types.ts                ← All shared TypeScript types
│   │   └── vault-parser.ts         ← gray-matter + extraction; try/catch for malformed YAML (Phase 8)
│   ├── pages/
│   │   ├── index.astro             ← Landing page — mounts FullGraph island
│   │   └── notes/
│   │       └── [...slug].astro     ← Dynamic note pages from content collection
│   ├── plugins/
│   │   ├── remark-vault-images.ts  ← ![[img.ext]] → /vault-assets/; broken-img placeholder (Phase 8)
│   │   └── remark-transclusion.ts  ← ![[note#^id]]; depth guard + circular embed detection (Phase 8)
│   ├── styles/
│   │   ├── callouts.css
│   │   ├── global.css
│   │   ├── graph.css
│   │   └── note.css                ← Prose styles + .vault-image-missing styles (Phase 8)
│   └── content.config.ts           ← notes content collection
├── .gitignore                      ← Comprehensive (Phase 8)
├── astro.config.mjs
├── tsconfig.json
├── package.json
├── netlify.toml                    ← NODE_VERSION=22, npm run build (Phase 8)
├── README.md                       ← Full rewrite: setup guide, frontmatter ref, arch overview (Phase 8)
└── Context.md                      ← This file
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
| **6** | `LocalGraph.tsx` sidebar with progressive expansion, backlinks/forward links/tags from per-note JSONs | ✅ Complete |
| **7** | Full dark/light theme system, Shiki dual-themes, CSS variable overhaul, `GraphNodeFactory` light-mode colours | ✅ Complete |
| **8** | Production hardening: sample vault content, deploy pipeline, error handling, performance, README | ✅ Complete |

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

`public/graph/[noteId].json` — same `nodes`/`links` schema as above (1-hop neighbourhood), plus two additional arrays:

```typescript
{
  nodes: GraphNode[];
  links: GraphLink[];
  backlinks: NoteRef[];      // notes that link TO this note
  forwardLinks: NoteRef[];   // published notes this note links TO (non-ghost only)
}

interface NoteRef {
  id: string;
  name: string;
  path: string | null;
}
```

14 files total (one per published note). Ghost nodes and tag nodes appear in the `nodes` array but not in `backlinks`/`forwardLinks`.

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

Rendered by `<LocalGraph client:only="react" noteId={focusId} />` in `NoteLayout.astro`.

| Interaction | Result |
|---|---|
| Mount | Fetches `/graph/[noteId].json`, displays current note + its 1-hop neighbours. Current note is in `expandedNodes` from the start. |
| Left-click **tag** node | No-op (tags don't expand or navigate in local graph) |
| Left-click **ghost** node | Shows "Note not yet created" toast at cursor, auto-dismisses after 2.2 s |
| Left-click **file** node (not yet clicked) | Adds to `clickedOnce`; fetches `/graph/[nodeId].json`; merges new nodes/links into `graphState` (deduplicated); adds a white ring overlay indicating "click again to open" |
| Left-click **file** node (already in `clickedOnce`) | `window.location.href = node.path` |
| Right-click any node | Camera fly-to focus (1200 ms animation) |
| Below the canvas | Backlinks section, Linked Notes section, Tags as pills |
| Tag pill click | Navigates to `/?highlight=<tagId>` — opens full graph with that tag highlighted |

**State model in `LocalGraph.tsx`:**
- `nodes: Map<string, GraphNode>` — currently visible nodes (deduplicated by ID)
- `links: GraphLink[]` — all links in view
- `expandedNodes: Set<string>` — nodes whose neighbours have been fetched
- `clickedOnce: Set<string>` — nodes primed for navigation

**Visual distinction for current note:** 1.55× scale + emissive glow material + `THREE.PointLight` child.
**Primed node (clickedOnce):** white `THREE.RingGeometry` overlay floats around the mesh.

---

## Node Visuals

| Node type | Shape | Material | Color (dark) | Color (light) |
|---|---|---|---|---|
| `file` | Shape from frontmatter (default sphere) | `MeshLambertMaterial` solid | From frontmatter | Darkened 22% via HSL (see `resolveColor`) |
| `tag` | Octahedron (forced) | `MeshLambertMaterial` solid | From node data | Darkened 22% |
| `ghost` | Sphere | `MeshBasicMaterial` wireframe | White, opacity 0.15 | Gray `0x888888`, opacity 0.35 |

Node size (`val`) is set at build time proportional to link count. Scale applied: `Math.cbrt(val) * 1.2`.

`buildNodeObject(type, shape, color, val, isLight?)` in `GraphNodeFactory.ts` — the optional `isLight` flag triggers colour darkening for light-mode readability. Ghost nodes also switch from white to gray wireframe.

**Collapsed node indicator:** a `THREE.Sprite` with a canvas-drawn `+` badge floats above-right of the mesh.

**Tag highlight state:** when `highlightedTag` is set, the tag node gets emissive glow + `THREE.PointLight` child. A `requestAnimationFrame` loop pulses `light.intensity = 3 + 2·sin(3t)`. All non-connected nodes fade to opacity 0.15; connected nodes scale ×1.35.

**Local graph current note:** 1.55× base scale, emissive colour, `PointLight` halo.
**Local graph primed node (clickedOnce):** white `RingGeometry` overlay.

---

## Key Implementation Details

### Why `client:only="react"` on the graph
`react-force-graph-3d` uses `window`, `document`, and WebGL — none of which exist during Astro's SSR pass. `client:only="react"` skips server rendering entirely for this component.

### Tooltip is imperative (no React state)
The hover tooltip updates `el.style` and `el.textContent` directly via a DOM ref. This prevents `setTooltip(...)` from triggering re-renders on every mouse movement, which was causing the force simulation to restart and nodes to twitch.

### `visibleData` is memoized with `useMemo`
`graphData` is passed to `<ForceGraph3D graphData={...}>`. If this prop changes reference on every render, the library restarts the force simulation. `useMemo` ensures the reference only changes when `graphData` or `collapsedNodes` actually changes.

### Dark/light theme system (Phase 7)

- **Anti-FOUC:** `BaseLayout.astro` has an `is:inline` `<script>` directly in `<head>` that reads `localStorage.getItem('theme')` and adds `'dark'` or `'light'` class to `<html>` before the first paint.
- **Toggle button:** A `#theme-toggle` button is appended to `<body>` in `BaseLayout.astro` via a second `is:inline` script. It is fixed top-right (`z-index: 9999`), styles itself from CSS variables, and works on every page.
- **Storage key:** `'theme'`, values `'dark'` (default) or `'light'`.
- **CSS variables:** `html.dark { --bg-primary: … }` / `html.light { --bg-primary: … }` in `global.css`. All colour references in all CSS files use only these variables — no hardcoded colours.
- **Event propagation to React islands:** The toggle dispatches `CustomEvent('theme-change', { detail: { theme } })` on `window`. Both `FullGraph.tsx` and `LocalGraph.tsx` listen for this event (and also the `'storage'` event for cross-tab sync) to update their `isDark` state without a page reload.
- **Graph background:** `FullGraph` and `LocalGraph` pass `bgColor` to `ForceGraph3D.backgroundColor`. Values: dark = `#0a0a0a`, light = `#f5f5f5`.
- **Smooth transitions:** `body`, `.prose`, `.note-layout` etc have `transition: background-color 0.2s, color 0.2s, border-color 0.2s`. Canvas, SVG, and Shiki code spans are excluded (`transition: none !important`).
- **Shiki dual themes:** `astro.config.mjs` sets `shikiConfig: { themes: { dark: 'github-dark', light: 'github-light' }, defaultColor: false }`. Astro emits `--shiki-dark`, `--shiki-dark-bg`, `--shiki-light`, `--shiki-light-bg` (etc.) as CSS custom properties per token. `global.css` binds them via `html.dark .astro-code { color: var(--shiki-dark) !important; … }` and same for `html.light`.

### `?highlight=tagId` URL param (FullGraph)

`FullGraph.tsx` initialises `highlightedTag` from `new URLSearchParams(window.location.search).get('highlight')` so navigating to `/?highlight=tag:programming` immediately activates tag-filter mode. Tag pills in `LocalGraph.tsx` link to `/?highlight=<tagId>`.

### `?focus=noteId` camera auto-focus (FullGraph)

The "View in graph" link in `NoteLayout` navigates to `/?focus=<noteId>`. `FullGraph.tsx` reads this param via `useMemo`. A `setTimeout` of 4 seconds (after mount, giving the force sim time to settle) triggers the `cameraPosition()` animation.

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

### Content collection
`src/content.config.ts` defines a `notes` collection using Astro 5's Content Layer API (`glob` loader pointing at `vault/`, excluding `attachments/`). Rendering uses the `render(note)` function (not the deprecated `note.render()` method). Only notes with `publish: true` get static routes.

### Remark/rehype pipeline
Configured in `astro.config.mjs` — order is critical:
1. **`remarkVaultImages`** — runs first; rewrites `![[img.ext]]` text nodes to `<img class="vault-image">`. Must run before other plugins consume `![[...]]` syntax.
2. **`remarkTransclusion`** — converts `![[note#^blockId]]` / `![[note]]` to HTML embeds. Must run before `remarkWikilinks`.
3. **`remarkWikilinks`** — `[[Note Name]]` → `<a href="/notes/<slug>" data-wikilink="<slug>">`.
4. **`remarkObsidian`** — callouts, `==highlights==`, tasks, `%%comments%%`.
5. **`rehypeRaw`** — processes raw HTML nodes emitted by all remark plugins above.

### Ghost-link detection
A client-side `<script>` in `NoteLayout.astro` fetches `/graph.json` after DOM ready, builds a `Set` of published node IDs, then adds `.ghost-link` to any `a[data-wikilink]` whose slug is not in the set. Ghost links render with dashed underline + `var(--link-ghost)` color + `cursor: not-allowed`.

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

## Phase 8 — What Was Built

### Sample vault content

**20 notes total** (up from 15), **17 published**, **3 with `publish: false`**.

New published notes:
- `JavaScript.md` — `#programming/js`, `shape: torusknot`, `color: #f7df1e`. Links: `[[Vue.js]]`, `[[React Hooks]]`, `[[Node.js Ecosystem]]` (ghost nodes). Has code block, table, callout.
- `Reading List.md` — `#books/fiction`, `#books/technical`. Contains a **full-note transclusion** `![[Getting Started]]` and a **block transclusion** `![[Note Taking#^cornell-method]]`. Links to ghost `[[The Left Hand of Darkness]]`.
- `Projects.md` — `#projects/garden`, `collapsible: true`. Block transclusion `![[Digital Garden#^garden-definition]]`. Ghost links: `[[Rust Web Framework Experiment]]`, `[[CLI Note Search Tool]]`.

New unpublished notes (invisible to the entire system):
- `Consciousness Draft.md` — `publish: false`. Philosophy brain dump, links to published notes but creates no edges.
- `Inbox.md` — `publish: false`. Unsorted capture inbox (PARA method).

Existing notes enriched with required tag families:
- `Rust.md` → `#programming/rust` added
- `TypeScript.md`, `Web Dev.md` → `#programming/js` added
- `Digital Garden.md` → `#projects/garden` added
- `Note Taking.md` → `#books/technical` added

**Tag families present:** `#programming/rust`, `#programming/js`, `#programming/web`, `#programming/systems`, `#books/fiction`, `#books/technical`, `#projects/garden`, `#meta/concepts`, plus standalone tags `#math`, `#tech`, `#tools`, `#productivity`.

**Ghost nodes (>5):** Ownership Model, Algorithms, Data Structures, Dijkstra, Minimum Spanning Tree, Vue.js, React Hooks, Node.js Ecosystem, The Left Hand of Darkness, The Pragmatic Programmer, Rust Web Framework Experiment, CLI Note Search Tool, Roam Research.

**Collapsible nodes:** `Programming.md` and `Projects.md` start collapsed.
**Custom shapes:** box, cone, cylinder, dodecahedron, torus, torusknot, octahedron all present across notes.
**Custom colours:** Rust.md `#F74C00`, TypeScript.md `#3178c6`, Web Dev.md `#e74c3c`, etc.

**New images in `vault/attachments/`:**
- `graph-preview.svg` — annotated graph mockup; embedded in `Welcome.md` via `![[graph-preview.svg]]`.
- `rust-logo.svg` — Rust logo; embedded in `Rust.md` via `![[rust-logo.svg]]`.

### Infrastructure files

- **`.gitignore`** (replaced Astro starter default) — now covers: `node_modules/`, `dist/`, `.astro/`, `public/graph.json`, `public/graph/`, `public/blocks.json`, `src/assets/vault/`, `vault/.obsidian/workspace.json`, `vault/.obsidian/workspace-mobile.json`, `vault/.trash/`, `.env`, `.DS_Store`, `.netlify`.
- **`netlify.toml`** (updated) — `command = "npm run build"` (was `pnpm build`), `NODE_VERSION = "22"` (was `20`), redirect from `/*` to `/index.html` with status `404` (was `/404`).
- **`README.md`** (full rewrite) — project description, prerequisites table (Node 22+, Obsidian, Obsidian Git), 6-step setup guide (clone, install, open vault, configure Obsidian Git, dev, Netlify), complete frontmatter reference with all fields, publishing guide, graph appearance customization guide, architecture diagram, deploy pipeline diagram, commands table.

### Error handling

All error handling is **non-crashing by design** — failures degrade gracefully:

**`src/lib/vault-parser.ts` — malformed frontmatter:**
```typescript
try {
  parsed = matter(rawContent);
} catch {
  // Log warning, fall back to empty frontmatter → treated as publish: false
  parsed = matter('');
  parsed.content = rawContent;
}
```
Note with invalid YAML is silently excluded from the site but does not abort the build.

**`src/integrations/graph-builder.ts` — per-file `try/catch`:**
```typescript
const allNotes = mdFiles.flatMap((filePath) => {
  try { ... return [parseNote(raw, filePath, vaultNotesRoot)]; }
  catch (err) { log.warn(`Skipping malformed file: ...`); return []; }
});
```
A single corrupted file is skipped; all other notes build normally.

**`src/plugins/remark-transclusion.ts` — recursion depth + circular embed guard:**
- Module-level `_embedDepth: number` counter and `_expandingNotes: Set<string>`.
- `MAX_EMBED_DEPTH = 3` — if depth is exceeded, renders `<div class="transclusion-missing">⚠ Max embed depth…</div>`.
- If `_expandingNotes` already contains the slug (A ⊃ B ⊃ A), renders a circular-embed warning instead of looping.
- Only full-note embeds are depth-tracked; block embeds are single lookups and can’t recurse.

**`src/plugins/remark-vault-images.ts` — broken-image placeholder:**
- Previously: kept original `![[filename]]` text when the image was not found in the vault index.
- Now: renders an inline `<span class="vault-image-missing">` with an SVG broken-image icon and the filename label. Also logs a `console.warn`.
- CSS for `.vault-image-missing` and `.vault-image-missing-label` added to `src/styles/note.css`.

**`src/components/FullGraph.tsx` and `LocalGraph.tsx` — fetch failure UI:**
- Previously displayed a plain text error string.
- Now shows a centred SVG alert icon + "Could not load graph" heading + error detail (FullGraph), or a compact `.local-graph-error` class div (LocalGraph).

### Performance changes

**`FullGraph.tsx` — stable `nodeThreeObject` across theme changes:**
- Added `isDarkRef = useRef(isDark)` that is updated (`isDarkRef.current = isDark`) on every render.
- `nodeThreeObject` callback reads `isDarkRef.current` instead of the `isDark` state variable, so the callback reference does not change when the theme toggles.
- A separate `useEffect([isDark])` calls `fgRef.current?.refresh?.()` once per theme change, causing the graph to re-draw nodes in the new colour scheme **without recreating the entire callback** for every node.
- Net effect: theme toggle causes exactly **one** node visual refresh instead of a full `nodeThreeObject` dependency change that would previously restart the force simulation.

**`LocalGraph.tsx` — same `isDarkRef` pattern:**
- Same `useRef`/`refresh()` approach applied to `LocalGraph` so its `nodeThreeObject` also stays stable.

**`LocalGraph.tsx` — lazy initialisation via `IntersectionObserver`:**
- `isVisible` state initialised to `false`.
- `useEffect` sets up both a `ResizeObserver` (already existed) and an `IntersectionObserver` on the container div.
- `IntersectionObserver` fires once when the container enters the viewport (with `rootMargin: '100px'` pre-buffering). On intersection: `setIsVisible(true)`, then `io.disconnect()`.
- `ForceGraph3D` is only mounted when `isLoaded && isVisible`. Before that, a placeholder div shows "Scroll to view graph…" (or "Loading…" while data fetches).
- On mobile where the sidebar scrolls below the fold, this prevents Three.js / WebGL initialisation until needed.

**`LocalGraph.tsx` — Three.js cleanup on unmount:**
```typescript
useEffect(() => {
  return () => {
    (fgRef.current as any).pauseAnimation?.();
    (fgRef.current as any).renderer?.().dispose?.();
  };
}, []);
```
`ForceGraph3D` creates a `WebGLRenderer` internally. Without disposal the GPU context count grows with each note navigation. `pauseAnimation()` stops the RAF loop; `renderer().dispose()` releases the WebGL resources.
---

## Phase 6 — What Was Built

### `LocalGraph.tsx` (`src/components/LocalGraph.tsx`)

A React island mounted in `NoteLayout.astro` sidebar via `<LocalGraph client:only="react" noteId={focusId} />`.

**Data:** Fetches `/graph/[noteId].json` on mount. The response provides `nodes`, `links`, `backlinks`, and `forwardLinks`. Tags and ghost forward-links are derived from the `nodes`/`links` arrays (no separate fetch needed).

**Graph rendering:** `ForceGraph3D` at `100% width × 350 px` using a `ResizeObserver` to track the container's actual pixel width. Uses `buildNodeObject` from `GraphNodeFactory` (same as `FullGraph`).

**Progressive expansion state:**
- `nodes: Map<string, GraphNode>` — deduplicated by ID
- `links: GraphLink[]` — deduplicated by `source→target` key
- `expandedNodes: Set<string>` — initially contains only `noteId`
- `clickedOnce: Set<string>` — tracks nodes primed for navigation

**Click logic:**
```
tag node    → no-op
ghost node  → "Note not yet created" toast
file node, not in clickedOnce:
  → add to clickedOnce
  → fetch /graph/[node.id].json, merge into graphState
  → add to expandedNodes
  → show white ring overlay (primed indicator)
file node, already in clickedOnce:
  → window.location.href = node.path
```

**Visual features:**
- Current note: 1.55× scale, emissive glow, `PointLight` halo in node colour
- Primed node: `THREE.RingGeometry` white overlay (semi-transparent)
- Hover tooltip: updates DOM imperatively (no React re-render)
- Right-click: camera fly-to (same as FullGraph)

**Sidebar sections (rendered in React below the canvas):**
- **Backlinks**: `backlinks[]` from JSON → links list
- **Linked Notes**: `forwardLinks[]` (published) + ghost forward links (muted italic with dashed underline)
- **Tags**: `file-tag` links from the data → pills, each linking to `/?highlight=<tagId>`

**NoteLayout.astro sidebar** (`src/layouts/NoteLayout.astro`):
- Sidebar is `position: sticky; height: calc(100vh - 4rem); overflow-y: auto` — scrolls independently of main content
- All `.local-graph-*` CSS classes defined via `:global()` rules in the scoped `<style>` block

---

## Phase 7 — What Was Built

### Theme variable system (`src/styles/global.css`)

All colour tokens moved from `:root` to theme-specific classes:
```css
html.dark  { --bg-primary: #0a0a0a; --bg-secondary: …; --text-primary: …; … }
html.light { --bg-primary: #ffffff; --bg-secondary: …; --text-primary: …; … }
```

Backward-compat aliases (`--bg`, `--surface-0/1/2`, `--text`) kept for old rules. No hardcoded colours remain in any CSS file.

**Key variables:**

| Variable | Dark | Light |
|---|---|---|
| `--bg-primary` | `#0a0a0a` | `#ffffff` |
| `--bg-secondary` | `#141414` | `#f5f5f5` |
| `--bg-surface` | `#1e1e1e` | `#fafafa` |
| `--text-primary` | `#e0e0e0` | `#1a1a1a` |
| `--text-muted` | `#606060` | `#999999` |
| `--border` | `#2a2a2a` | `#e0e0e0` |
| `--accent` | `#42a5f5` | `#1565c0` |
| `--link` | `#42a5f5` | `#1565c0` |
| `--link-ghost` | `#555555` | `#aaaaaa` |
| `--mark-bg` | `rgba(255,213,0,0.22)` | `rgba(255,220,0,0.38)` |
| `--transclusion-bg` | `#15171e` | `#f2f4ff` |
| `--graph-bg` | `#0a0a0a` | `#f5f5f5` |

### Theme toggle (`src/layouts/BaseLayout.astro`)

Two inline scripts added to `BaseLayout`:
1. **`<head>` anti-FOUC script:** reads `localStorage.getItem('theme')` and adds `dark` or `light` class to `<html>` before any paint.
2. **`<body>` toggle script:** wires up the `#theme-toggle` button; on click flips the class, writes to `localStorage`, dispatches `CustomEvent('theme-change', { detail: { theme } })`.

Both `FullGraph.tsx` and `LocalGraph.tsx` listen for `'theme-change'` (same tab) and `'storage'` (cross-tab) events to update their `isDark` React state. Storage key is `'theme'` (changed from the old `'galaxybrain-theme'`).

### Shiki dual themes

`astro.config.mjs` shikiConfig:
```js
shikiConfig: {
  themes: { dark: 'github-dark', light: 'github-light' },
  defaultColor: false,
  wrap: false,
}
```
`global.css` binds per-token CSS variables:
```css
html.dark  .astro-code, html.dark  .astro-code span { color: var(--shiki-dark) !important; … }
html.light .astro-code, html.light .astro-code span { color: var(--shiki-light) !important; … }
```

### `GraphNodeFactory.ts` light-mode colours

`buildNodeObject(type, shape, color, val, isLight?)` — new optional `isLight` parameter.

When `isLight = true`:
- File and tag nodes: `resolveColor(color, true)` calls `darkenHex(color, 0.22)` — converts hex to HSL, reduces lightness by 22%, converts back.
- Ghost nodes: wireframe colour changes from `0xffffff` (white) to `0x888888` (gray), opacity raises from 0.15 to 0.35.

HSL helpers (`hexToRgb`, `rgbToHsl`, `hslToRgb`, `darkenHex`) are pure functions in the same file, no external dependency.

---

## Design System

CSS custom properties are defined in `src/styles/global.css` on `html.dark` and `html.light` classes (Phase 7 — no more `:root` colour tokens). See the Phase 7 variable table above for all values.

**Non-colour tokens (always in `:root`):**
```css
--radius-sm: 4px  |  --radius-md: 8px  |  --radius-lg: 12px
--font-body: 'Inter', system-ui, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace
```

**Typography notes:**
- Tables: horizontal borders only, striped even rows, responsive `overflow-x: auto`
- Highlights: `var(--mark-bg)` (yellow-tinted, adapts per theme)
- Callouts: background/border/icon colour set per callout type; `html.light` selector overrides quote/cite callouts
- Transclusion: `var(--transclusion-bg)` (dark blue tint / light lavender)
- Wikilinks: `var(--link)` with `color-mix` bottom border; ghost links: `var(--link-ghost)` dashed

---

## Open Design Questions

1. **Tag geometry**: All tags currently share one shape (octahedron). Should tag families (`#programming/rust`) get distinct shapes or colours?
2. **Image optimisation**: Vault raster images bypass Astro’s WebP/AVIF pipeline. Worth adding `sharp` post-processing in `asset-collector` for PNG/JPG?
3. **Graph always-dark option**: Should the 3D graph always use a dark background regardless of the page theme (space aesthetic)?
4. **Local graph physics**: Currently uses `alphaDecay: 0.03`, `velocityDecay: 0.3`. Worth tuning for a tighter, faster-settling local graph?
5. **Obsidian Git auto-push**: The README documents this workflow but it is not enforced or tested in CI. A `.github/actions` workflow for the Netlify deploy would make the pipeline fully automated without Obsidian Git.
6. **Search**: No full-text search exists. Could be added with Pagefind (runs at build time, zero JS overhead).
7. **Transclusion recursion**: Block embeds can’t recurse (single lookup), full-note embeds are capped at depth 3. Deeper nesting never naturally occurs in typical vaults but the cap is documented.

---

## Commands

```bash
pnpm dev          # dev server at localhost:4321
pnpm build        # production build → dist/
pnpm preview      # serve dist/ locally
```

**Netlify build command:** `npm run build` (configured in `netlify.toml`), publish dir: `dist/`, `NODE_VERSION = "22"`.
