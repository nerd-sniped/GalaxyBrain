---
publish: true
title: "Features"
tags: [meta/start, meta/reference]
aliases: [feature-overview, what-can-it-do]
graph:
  shape: dodecahedron
  color: "#9b59b6"
  collapsible: true
---

# GalaxyBrain Features

A high-level tour of everything GalaxyBrain can do — useful if you're evaluating the template or just want to know what's possible before diving into the setup docs.

> [!tip] New here?
> Start with [[Welcome]] for the big picture, then use this page as a reference for what you can customize and build.

---

## The 3D Knowledge Graph

The centerpiece of GalaxyBrain is a **force-directed 3D graph** rendered on the landing page. Every published note is a node; every `[[wikilink]]` becomes an edge.

### Node Types

| Appearance | What it represents |
|---|---|
| Solid custom shape | A published note |
| Diamond (octahedron) | A tag — auto-generated from `tags:` frontmatter |
| Wireframe sphere | A ghost node — linked but not yet written |

### Node Shapes

You can set the shape of any note's node via its frontmatter:

| Shape | Frontmatter value |
|---|---|
| Sphere (default) | `sphere` |
| Cube | `box` |
| Cone | `cone` |
| Cylinder | `cylinder` |
| 12-face polyhedron | `dodecahedron` |
| Donut ring | `torus` |
| Knotted torus | `torusknot` |

### Node Colors

Set `graph.color` to any CSS hex string (e.g. `"#e74c3c"`). In light mode colors are automatically darkened for readability. Some palette suggestions:

| Color | Hex |
|---|---|
| Blue (default) | `#3498db` |
| Green | `#2ecc71` |
| Red | `#e74c3c` |
| Orange | `#f39c12` |
| Purple | `#9b59b6` |
| Teal | `#00ad9f` |

### Graph Interactions

| Action | Result |
|---|---|
| Left-click a note node | Navigate to that note |
| Left-click a tag node | Filter graph — unrelated nodes fade out |
| Left-click a ghost node | "Note not yet created" toast |
| Right-click any node | Camera flies smoothly to that node |
| Drag | Rotate |
| Scroll / pinch | Zoom |

---

## Collapsible Nodes

Set `graph.collapsible: true` on any note to hide its downstream links behind a `+` badge on first load. Click to expand; Shift+click to re-collapse.

This is useful for **hub notes** — notes with many connections that would otherwise dominate the graph. See [[Graph Features]] for examples.

---

## Callout Badge (Entry Point Hint)

Set `graph.callout: true` on one note to show an animated pulsing arrow and speech bubble pointing at that node when visitors first land on the page. Use it to guide new visitors to a starting point.

- `calloutText` controls the bubble text (default: `"Click to get started"`)
- Auto-dismisses after 30 seconds or when clicked
- Does not reappear for the rest of the browser session

---

## Ghost Nodes

Any `[[wikilink]]` pointing to a note that hasn't been written yet, or has `publish: false`, automatically creates a **ghost node** — a transparent wireframe sphere in the graph. Ghost nodes let you plan your knowledge graph visually before writing every note.

---

## Tag Nodes & Filtering

- Every unique tag in your vault's frontmatter generates a diamond-shaped tag node
- Hierarchical tags (`#programming/rust`) share a color family with their siblings
- Clicking a tag node dims all unrelated notes, letting you focus on one topic
- A filter banner with an **✕** clear button appears at the top of the graph
- Tag pills on note pages link back to `/?highlight=<tagId>` to re-open the graph pre-filtered

---

## The Local Graph (Sidebar)

Every note page shows a **local graph** in the sidebar — your current note at 1.55× scale with an emissive glow, surrounded by its immediate neighbours (direct links, backlinks, shared tags).

| Action | Result |
|---|---|
| Left-click a node (first click) | Expand that node's neighbours |
| Left-click a node (second click) | Navigate to that note |
| Right-click any node | Camera fly-to focus |

Below the canvas are **Backlinks** and **Linked Notes** sections, plus tag pills.

---

## Dark / Light Theme

A toggle in the top-right corner switches between dark and light modes, persisted across sessions in `localStorage`. The graph syncs its colors instantly without a page reload, and even updates across browser tabs.

---

## Writing Notes

GalaxyBrain supports the full Obsidian Markdown flavor:

### Wikilinks
```markdown
[[Another Note]]              # link to a note (creates a graph edge)
[[Another Note|display text]] # aliased link
```

### Tags
```yaml
tags: [programming/rust, tech]
```

Inline `#tags` in the note body also work.

### Callouts

> [!note]
> All standard Obsidian callout types are supported.

Supported types: `note`, `tip`, `important`, `warning`, `caution`, `abstract`, `info`, `todo`, `success`, `question`, `failure`, `danger`, `bug`, `example`, `quote`

Each has its own icon and color scheme.

### Code Blocks

Fenced code blocks with language identifiers get full **Shiki syntax highlighting**, with separate themes for dark and light mode.

### Highlights

`==highlighted text==` renders as `<mark>` — Obsidian's highlight syntax works out of the box.

### Tasks

`- [ ] todo` and `- [x] done` Obsidian task syntax is supported.

### Block IDs & Transclusion

Mark any paragraph for embedding elsewhere:
```markdown
This is an important paragraph. ^my-block-id
```

Then embed it in another note:
```markdown
![[Other Note#^my-block-id]]  # block embed → styled blockquote
![[Other Note]]               # full note embed → collapsible details element
```

### Images

Drop files into `vault/attachments/` and embed with `![[image.png]]`. The build pipeline copies images to the right place and rewrites paths automatically.

---

## Frontmatter Reference

Here are all the recognized frontmatter fields:

```yaml
---
publish: true              # REQUIRED — false or omitted = note is hidden entirely
title: "My Note"           # display name; defaults to filename if omitted
tags: [topic/subtopic]
aliases: [other name]      # [[other name]] resolves to this note
graph:
  shape: dodecahedron      # sphere|box|cone|cylinder|dodecahedron|torus|torusknot
  color: "#F74C00"         # any CSS hex color
  collapsible: false       # hide children behind + badge; default false
  callout: false           # show entry-point arrow/bubble; default false
  calloutText: "Start!"    # bubble text; default "Click to get started"
---
```

See [[Frontmatter Reference]] for the full reference guide.

---

## Automatic Deploys

The intended workflow is:

1. Edit notes in Obsidian
2. The **Obsidian Git** plugin auto-commits and pushes to GitHub
3. **Netlify** detects the push and rebuilds the site in ~60–90 seconds

No terminal, no manual deploys. See [[Netlify Deployment]] and [[Obsidian Setup]] for setup details.

---

## Further Reading

- [[Getting Started]] — how to navigate the graph UI
- [[Writing Notes]] — detailed authoring guide
- [[Frontmatter Reference]] — every frontmatter option documented
- [[How to Use This Template]] — full setup walkthrough
- [[Graph Features]] — in-depth graph customization examples
