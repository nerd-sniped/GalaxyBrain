---
publish: true
title: "Welcome"
tags: [meta/start]
aliases: [home, start]
graph:
  shape: torusknot
  color: "#3498db"
  collapsible: true
  callout: true
  calloutText: "Start Here! Click Me!"
---

# Welcome to GalaxyBrain

This is the **Welcome Page** for the Galaxy Brain note system. 

You're inside a live example of the site running with template notes. Each node in the graph on the landing page is one of the notes below. The edges are the `[[wikilinks]]` between them.

## What You Can Do Here

- **Explore** — rotate the 3D graph, click nodes to read notes
- **Learn** — follow the setup path below to build your own version
- **Fork** — replace these notes with your own vault and deploy

## Build Your Own Version

Want a site like this for your own notes? The full setup takes about 15 minutes:

1. **[[GitHub Setup]]** — use this repo as a GitHub template and clone it locally
2. **[[Obsidian Setup]]** — open the `vault/` folder in Obsidian and install the Obsidian Git plugin
3. **[[Netlify Deployment]]** — connect your GitHub repo to Netlify for automatic deploys
4. **[[Writing Notes]]** — write your first note and watch it appear on the live site

For the full picture of how the pieces fit together, see [[How to Use This Template]].

> [!tip] No terminal knowledge needed
> Git authentication (step 1) is handled by a browser pop-up — no tokens or command-line setup required.

## Explore This Demo

Not ready to set up yet? Browse around — [[Getting Started]] explains how to navigate the graph, and [[Graph Features]] shows everything you can do with node shapes, colours, and filters.

> Right-click any node in the graph to fly the camera to it. Click a tag node (diamond shape) to highlight all connected notes.

## About This Graph

Every published note becomes a node. Every `[[wikilink]]` becomes an edge. Tags become their own nodes. Links to notes that don't exist become **ghost nodes** — transparent wireframe spheres that show a note is referenced but not yet written.
