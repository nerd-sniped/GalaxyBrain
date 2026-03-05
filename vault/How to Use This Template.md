---
publish: true
title: "How to Use This Template"
tags: [meta/start, meta/setup]
aliases: [template, setup]
graph:
  shape: dodecahedron
  color: "#9b59b6"
  collapsible: true
  pinned: true
---

# How to Use This Template

GalaxyBrain is a **template** — a starting point for publishing your own Obsidian vault as an interactive 3D knowledge graph website. This note explains what the template gives you and how the pieces fit together.

## What's Included

| Part | What it does |
|---|---|
| `vault/` | Where your Markdown notes live (flat — `.md` files go directly here) |
| `vault/attachments/` | Images, PDFs, and other media |
| `src/` | The Astro site code (you rarely touch this) |
| `netlify.toml` | Netlify build config (already set up) |

## How It Works

```
Write note in Obsidian
        ↓
Obsidian Git auto-commits & pushes to GitHub
        ↓
Netlify detects push, runs the build command from `netlify.toml`
        ↓
Astro reads vault/*.md, builds graph JSON + HTML
        ↓
Live site updates at your Netlify URL
```

The site rebuilds **completely automatically** every time you push a change. No manual deploys needed once set up.

## The Build Pipeline

When Netlify runs the configured build command, three things happen before any Markdown is rendered:

1. **Graph builder** — reads all published notes, resolves wikilinks, and writes `public/graph.json` and one per-note JSON file per published note
2. **Asset collector** — copies everything in `vault/attachments/` to `public/vault-assets/` so images in notes are served correctly
3. **Block indexer** — scans every note for `^blockId` markers and builds an index so transclusion (`![[note#^id]]`) can look up exact paragraphs

Then Astro renders each published note to a static HTML page.

## What You Need to Do

For all installation and deployment steps, use the GitHub README as the canonical guide:

- [GalaxyBrain README (Installation Guide)](https://github.com/nerd-sniped/GalaxyBrain#readme)

Then use these notes as supporting reference:

1. **[[GitHub Setup]]** — Git auth options and repo hygiene notes
2. **[[Obsidian Setup]]** — vault conventions and recommended app settings
3. **[[Netlify Deployment]]** — deployment model and troubleshooting
4. **[[Writing Notes]]** — publish your first real note
5. Replace these template notes with your own content

> [!tip] Total setup time
> Most people are up and running in about 15 minutes. Steps 1 and 3 are the longest — GitHub and Netlify each need a browser sign-in and a few clicks.

## Keeping vs Replacing Template Notes

These template notes (`Welcome`, `Getting Started`, etc.) exist only to explain the system. Once you understand how it works, delete or replace them. Start fresh notes directly in `vault/` and add `publish: true` to any you want to appear on the site.

> [!tip] Tip
> The `Draft Note` and `Inbox` notes in this vault have `publish: false` — they're invisible to the site but show how unpublished notes behave.

---

## Support This Project

> [!tip] This is free — and that's on purpose
> I'm releasing this for free because fun side projects are better when they aren't hidden behind a paywall — not everything needs to feed the soul-crushing capitalism machine. That said, I still have to pay rent. If you've found this helpful or end up using it yourself, please consider [supporting me on Patreon](https://www.patreon.com/cw/Nerd_Sniped). ❤️
