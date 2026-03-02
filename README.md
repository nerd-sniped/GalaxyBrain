# GalaxyBrain

A **3D knowledge graph** built on top of an Obsidian vault, published with Astro, and deployed to Netlify. Edit notes in Obsidian → push to git → site auto-rebuilds.

---

## Table of Contents

1. [What is this?](#what-is-this)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [Frontmatter Reference](#frontmatter-reference)
5. [Publishing a Note](#publishing-a-note)
6. [Customising Graph Appearance](#customising-graph-appearance)
7. [Architecture Overview](#architecture-overview)

---

## What is this?

GalaxyBrain turns a folder of Obsidian Markdown notes into an interactive, explorable website:

- **Landing page** — force-directed 3D graph of all published notes, wikilinks, and tags
- **Note pages** — rendered Markdown with a sidebar showing a local graph, backlinks, forward-links, and tags
- **Ghost nodes** — transparent wireframe nodes representing linked-but-unwritten notes
- **Dark / light mode** — system preference with manual toggle

The vault lives alongside the site code in the same git repo. Netlify rebuilds the site every time you push.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22+ | JavaScript runtime |
| pnpm | 9+ | Package manager (recommended) |
| Obsidian | Latest | Vault authoring |
| Obsidian Git plugin | Latest | Auto-push on save |
| Git | Any | Version control |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/galaxybrain.git
cd galaxybrain
```

### 2. Install dependencies

```bash
npm install        # or: pnpm install
```

### 3. Open the vault in Obsidian

- Open Obsidian
- Click **Open folder as vault**
- Select the `vault/` folder inside this repo

### 4. Configure Obsidian Git for auto-push

- Install the **Obsidian Git** community plugin
- In plugin settings, enable **Auto commit** and **Auto push**
- Set commit interval to your preference (e.g. 5 minutes)
- Every save will now push your notes to GitHub → Netlify rebuilds automatically

### 5. Local development

```bash
npm run dev        # starts dev server at http://localhost:4321
```

The dev server hot-reloads on note changes. Some graph changes require a server restart (the `astro:config:done` hook runs once at startup).

### 6. Connect to Netlify

- Push the repo to GitHub / GitLab / Bitbucket
- Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
- Select your repo; build settings are already in `netlify.toml`:
  - **Build command:** `npm run build`
  - **Publish directory:** `dist`
- Deploy. Every subsequent `git push` triggers a rebuild.

---

## Frontmatter Reference

Every note in `vault/notes/` may include a YAML frontmatter block. All fields are optional.

```yaml
---
publish: true           # Required to appear on the site. Default: false
title: "My Note"        # Display name in graph and page title
tags:                   # List of tags (de-duplicated with inline #tags)
  - programming/rust
  - tech
aliases:                # Alternative names for wikilink resolution
  - my note
graph:
  shape: sphere         # Node shape in the 3D graph (see below). Default: sphere
  color: "#e74c3c"      # Hex colour for the node. Default: #3498db
  collapsible: true     # Downstream nodes start hidden. Default: false
cover: "photo.jpg"      # Cover image (copied from vault/attachments/ to public/)
---
```

### Available `graph.shape` values

| Shape | Description |
|---|---|
| `sphere` | Default (most notes) |
| `box` | Cube — tool / infrastructure notes |
| `cone` | Cone — entry-point notes |
| `cylinder` | Cylinder — reference notes |
| `dodecahedron` | 12-face polyhedron — hub notes |
| `torus` | Donut — concept notes |
| `torusknot` | Knotted torus — interconnected concepts |
| `octahedron` | Diamond — used by tag nodes internally |

---

## Publishing a Note

Add `publish: true` to the note's frontmatter:

```markdown
---
publish: true
title: "My New Note"
---

# My New Note

Content here...
```

Notes without `publish: true` are completely invisible: they are excluded from the graph, their wikilinks create no edges, and their tags don't appear as tag nodes.

---

## Customising Graph Appearance

### Node shape

```yaml
graph:
  shape: dodecahedron
```

### Node colour

```yaml
graph:
  color: "#F74C00"   # Rust orange
```

### Collapsible nodes

A collapsible node starts with all its downstream wikilink targets hidden. Clicking the node (which shows a `+` badge) expands the subtree:

```yaml
graph:
  collapsible: true
```

Shift+click an expanded collapsible node to re-collapse it.

### Tag nodes

Tags automatically appear as octahedron nodes, coloured by their top-level family. Clicking a tag node in the full graph highlights all connected notes.

---

## Architecture Overview

```
vault/
├── notes/          ← Markdown files (source of truth)
└── attachments/    ← Images and media

src/
├── integrations/
│   ├── asset-collector.ts   ← Copies images to public/vault-assets/
│   ├── block-indexer.ts     ← Builds block-index.json for transclusions
│   └── graph-builder.ts     ← Builds graph.json + per-note JSONs
├── plugins/
│   ├── remark-transclusion.ts   ← ![[embed]] → HTML
│   └── remark-vault-images.ts   ← ![[img.png]] → <img>
├── lib/
│   ├── vault-parser.ts    ← Parses MD frontmatter, wikilinks, tags, blocks
│   ├── link-resolver.ts   ← Resolves [[wikilinks]] (ghost if missing)
│   └── types.ts           ← Shared TypeScript types
├── components/
│   ├── FullGraph.tsx       ← Landing page 3D graph (React island)
│   └── LocalGraph.tsx      ← Note sidebar local graph (React island)
└── pages/
    ├── index.astro          ← Landing page (full graph)
    └── notes/[...slug].astro ← Note pages

public/
├── graph.json            ← Full graph (built at compile time)
└── graph/[id].json       ← Per-note 1-hop neighbourhood JSONs
```

### Build pipeline

1. **`astro:config:done`** — `graph-builder` parses vault, writes `graph.json` + per-note JSONs
2. **`astro:build:start`** — `asset-collector` copies images; `block-indexer` indexes blocks
3. **Remark/Rehype** — `remark-transclusion` and `remark-vault-images` process each note
4. **Astro** — renders `.astro` pages to static HTML

### Deploy pipeline

```
Edit in Obsidian
      │
      ▼ (Obsidian Git auto-push)
GitHub / GitLab
      │
      ▼ (Netlify webhook)
pnpm build  →  dist/  →  CDN
```

### Commands

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Local dev server at `localhost:4321` |
| `pnpm build` | Production build to `./dist/` |
| `pnpm preview` | Preview production build locally |
