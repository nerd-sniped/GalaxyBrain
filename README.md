# GalaxyBrain

A **starter template** for publishing your Obsidian vault as an interactive 3D knowledge graph website.

Edit notes in Obsidian → push to GitHub → site rebuilds on Netlify automatically.

**[Live demo →](https://galaxybrain.netlify.app)**

---

## What You Get

- **Landing page** — force-directed 3D graph of all published notes, wikilinks, and tags
- **Note pages** — rendered Markdown with a sidebar local graph, backlinks, forward-links, and tags
- **Ghost nodes** — wireframe nodes for linked-but-unwritten notes
- **Collapsible nodes** — hub notes can start with subtrees hidden
- **Tag nodes** — click a tag to filter and highlight connected notes
- **Dark / light mode** — stored in `localStorage`, no flash on load
- **Full Markdown support** — callouts, tables, code blocks with syntax highlighting, wikilinks, transclusion (`![[embeds]]`), images from vault

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Git | Any | [git-scm.com](https://git-scm.com) |
| Obsidian | Latest | [obsidian.md](https://obsidian.md) — free |
| GitHub account | — | [github.com](https://github.com) — free |
| Netlify account | — | [netlify.com](https://netlify.com) — free tier is sufficient |

---

## Step 1 — Get the Template

### Option A: Use as template (recommended)

1. Click **Use this template** → **Create a new repository** on the GitHub page for this repo
2. Name your repo, set visibility (public or private — both work with Netlify)
3. Clone it locally:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

### Option B: Fork

Click **Fork**, then clone your fork:
```bash
git clone https://github.com/your-username/galaxybrain.git
cd galaxybrain
```

---

## Step 2 — Install Dependencies

```bash
pnpm install
```

Or with npm: `npm install`

---

## Step 3 — Set Up Obsidian

### 3a. Open the vault

1. Open Obsidian
2. Click **Open folder as vault**
3. Select the **`vault/`** subfolder inside your cloned repo *(not the repo root)*

Obsidian will create a `.obsidian/` folder inside `vault/` with your settings. This is normal and gitignored.

### 3b. Configure Obsidian settings

In **Settings**:

| Section | Setting | Value |
|---|---|---|
| Files & Links | Default location for new notes | `vault/notes` |
| Files & Links | Default location for new attachments | `vault/attachments` |
| Files & Links | Use \[\[Wikilinks\]\] | ✅ On |
| Editor | Strict line breaks | Off |

### 3c. Install the Obsidian Git plugin

This plugin auto-commits and pushes your notes to GitHub so the site rebuilds without you opening a terminal.

1. **Settings → Community plugins → Browse**
2. Search **Obsidian Git** → Install → Enable
3. In the plugin's settings:
   - **Auto commit interval**: `5` (minutes, or your preference)
   - **Auto push after commit**: ✅ On
   - **Commit message**: `vault: auto-save {{date}}`

### 3d. Authenticate Git

Obsidian Git needs write access to your remote repo. The easiest way is a **GitHub Personal Access Token (PAT)**:

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Create a token with **Contents: Read and Write** on your repo
3. In your local repo, embed the token in the remote URL:
   ```bash
   git remote set-url origin https://YOUR_PAT@github.com/your-username/your-repo.git
   ```

Obsidian Git will use this URL. You won't be prompted for credentials again.

Alternatively, use SSH keys — see [GitHub's SSH docs](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

---

## Step 4 — Run the Dev Server

```bash
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321). The template notes appear in the graph. Edit or create a note in Obsidian and save — the browser will hot-reload.

> **Note:** Graph JSON files (`public/graph.json`, `public/graph/*.json`) are regenerated at server start. If you add a new note and it doesn't appear, restart the dev server.

---

## Step 5 — Write Your First Note

Create a file in `vault/notes/`, for example `vault/notes/My First Note.md`:

```markdown
---
publish: true
title: "My First Note"
tags: [topic]
---

# My First Note

Hello, graph! This links to [[Another Note]] which doesn't exist yet — it'll appear as a ghost node.
```

Save it. The dev server will reflect the change after a restart (or run `pnpm build` to see the full output).

---

## Step 6 — Deploy to Netlify

### 6a. Push to GitHub

```bash
git add .
git commit -m "initial vault"
git push
```

### 6b. Import to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Choose **Deploy with GitHub** and authorise access
3. Select your repo
4. Review build settings — `netlify.toml` pre-configures everything:

   | Setting | Value |
   |---|---|
   | Build command | `npm run build` |
   | Publish directory | `dist` |
   | Node version | `22` |

5. Click **Deploy site**

### 6c. First build

The build takes 1–3 minutes. Look for:
```
[build] Complete!
```

Your site is live at `random-name.netlify.app`.

### 6d. Set a custom domain (optional)

**Site configuration → Domain management → Add a domain** — then follow the DNS instructions for your registrar.

### 6e. The full auto-deploy flow

```
Edit note in Obsidian
        │
        ▼  (Obsidian Git — every N minutes)
GitHub receives push
        │
        ▼  (Netlify webhook)
npm run build
        │
        ▼
dist/  →  live on CDN (~60–90 seconds)
```

---

## Writing Notes

### Publishing

Add `publish: true` to any note to make it appear on the site:

```yaml
---
publish: true
---
```

Without this field the note is completely invisible — no node, no page, no edges from its wikilinks.

### Wikilinks

```markdown
[[Note Name]]                    links to that note
[[Note Name|Display text]]       with custom link text
```

Links to unpublished or non-existent notes become **ghost nodes** (wireframe spheres) in the graph.

### Tags

```yaml
tags: [programming/rust, tech]
```

Tags become octahedron nodes in the graph. Hierarchical tags like `#programming/rust` cluster into visual families.

### Images

Drop images into `vault/attachments/` and embed with `![[filename.png]]`. The build pipeline copies them to `public/vault-assets/` automatically.

### Block transclusion

Mark a paragraph with `^id`:
```markdown
This is the paragraph I want to share. ^my-id
```

Embed it in another note:
```markdown
![[Source Note#^my-id]]
```

### Full-note embed

```markdown
![[Note Name]]
```

Renders as a collapsible `<details>` element.

---

## Frontmatter Reference

```yaml
---
publish: true           # Must be true to appear on the site
title: "My Note"        # Display name (defaults to filename)
tags:                   # YAML list or inline array
  - topic/subtopic
  - other-tag
aliases:                # Alternative names for wikilink resolution
  - short name
graph:
  shape: sphere         # Node shape — see table below
  color: "#3498db"      # Hex colour for the node
  collapsible: false    # true = start with children hidden
---
```

### Node shapes

| Value | Shape |
|---|---|
| `sphere` | Default — general notes |
| `box` | Cube — tools, reference |
| `cone` | Cone — entry points |
| `cylinder` | Cylinder — documentation |
| `dodecahedron` | 12-face — hub notes |
| `torus` | Donut — concepts |
| `torusknot` | Knotted torus — complex interconnections |
| `octahedron` | Diamond — reserved for tag nodes |

---

## Customising the Site

### Colours and fonts

Edit `src/styles/global.css`. CSS custom properties at the top of the file control both dark and light themes.

### Landing page layout

Edit `src/pages/index.astro`.

### Note page layout

Edit `src/layouts/NoteLayout.astro`.

### Graph physics

`ForceGraph3D` props in `src/components/FullGraph.tsx` control link distance, charge, particle speed, etc.

---

## Architecture

```
vault/
├── notes/         ← Your Markdown files
└── attachments/   ← Images and media

src/
├── integrations/
│   ├── graph-builder.ts      ← Parses vault → graph.json + per-note JSONs
│   ├── asset-collector.ts    ← Copies images to public/vault-assets/
│   └── block-indexer.ts      ← Indexes ^blockIds for transclusion
├── plugins/
│   ├── remark-transclusion.ts   ← ![[embed]] → HTML
│   └── remark-vault-images.ts   ← ![[img]] → <img src>
├── lib/
│   ├── vault-parser.ts   ← Frontmatter, wikilinks, tags, block IDs
│   ├── link-resolver.ts  ← Obsidian shortest-path wikilink resolution
│   └── types.ts          ← Shared TypeScript types
├── components/
│   ├── FullGraph.tsx    ← Landing page 3D graph (React island)
│   └── LocalGraph.tsx   ← Sidebar local graph (React island)
└── pages/
    ├── index.astro              ← Landing page
    └── notes/[...slug].astro   ← Note pages

public/
├── graph.json          ← Full graph (generated at build time)
└── graph/[id].json     ← Per-note 1-hop neighbourhood JSONs
```

### Build pipeline order

1. `astro:config:done` — graph-builder reads vault, writes `public/graph.json` and `public/graph/*.json`
2. `astro:build:start` — asset-collector copies images; block-indexer writes `.astro/block-index.json`
3. Remark/Rehype — `remark-vault-images` → `remark-transclusion` → `remark-wikilinks` process each note
4. Astro — renders pages to static HTML in `dist/`

---

## Commands

| Command | Action |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Preview production build locally |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Note doesn't appear in graph | Check `publish: true` is in frontmatter |
| Graph shows after dev server restart | Graph JSON is built at startup — restart after adding notes |
| Images not loading | Ensure file is in `vault/attachments/`; filename case must match exactly |
| Build error on frontmatter | Check YAML syntax — unclosed quotes are common |
| Netlify build fails on Node version | Verify `netlify.toml` has `NODE_VERSION = "22"` |
| Obsidian Git not pushing | Re-check PAT permissions (Contents: Read & Write) |

---

## License

MIT — use this template for anything, personal or commercial.
