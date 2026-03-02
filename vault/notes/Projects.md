---
publish: true
title: "Projects"
tags: [projects/garden, meta]
aliases: [my-projects]
graph:
  shape: dodecahedron
  color: "#9b59b6"
  collapsible: true
---

# Projects

Active and planned projects connected to this knowledge garden.

## GalaxyBrain — This Site

The project you are reading right now: a 3D knowledge graph built on top of an [[Obsidian]] vault.

**Status:** Active development  
**Tech:** [[Astro]], Three.js, React, [[TypeScript]]  
**Hosting:** Netlify (auto-deploys on git push)

What a digital garden is, in one sentence:

![[Digital Garden#^garden-definition]]

## Programming Projects

- **Rust CLI tool** — exploring [[Rust]] ownership model in a practical project; see [[Rust]] notes
- **TS library** — strongly-typed utilities built on [[TypeScript]]
- **Graph visualiser** — the ForceGraph3D component powering this site

See [[Programming]] for the language cluster these draw from.

## Learning Projects

- Reading through the queue in [[Reading List]]
- Working through [[Note Taking]] as a structured practice
- Implementing [[Second Brain]] methodology for this vault

## Infrastructure

The workflow for this garden:

```
[Obsidian] ──git push──▶ [Netlify CI] ──pnpm build──▶ [CDN]
```

See [[Tools]] for the full stack description.

## Ghost Projects (Ideas Not Yet Started)

- [[Rust Web Framework Experiment]] — want to try building a small API in Axum
- [[CLI Note Search Tool]] — fuzzy-search across the vault from the terminal

> [!tip] Project Tracking
> Projects graduate from [[Inbox]] → here → archived once complete. That's the PARA method in practice.

#projects/garden is the family tag for all project-related notes.

