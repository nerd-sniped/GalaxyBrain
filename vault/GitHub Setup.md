---
publish: true
title: "GitHub Setup"
tags: [meta/setup]
aliases: [git, github, version control]
graph:
  shape: cylinder
  color: "#27ae60"
---

# GitHub Setup

Installation steps live in the GitHub README and are maintained there as the single source of truth:

- [GalaxyBrain README (Installation Guide)](https://github.com/nerd-sniped/GalaxyBrain#readme)

This note is now reference-only for GitHub-specific details.

## Git Authentication Reference

For this template, the recommended auth path is **Git Credential Manager (GCM)** on Windows/macOS because it uses browser OAuth and avoids manual token handling.

Alternative auth options:

- **SSH** — key-based auth for terminal-centric workflows
- **Personal Access Token (PAT)** — fallback for restricted environments

## What Gets Committed (and What Doesn't)

The `.gitignore` in this repo intentionally excludes:

| Excluded | Why |
|---|---|
| `dist/` | Netlify builds this — no need to commit |
| `public/graph.json` | Built from your notes at build time |
| `public/graph/` | Same |
| `.astro/` | Build-time cache |
| `vault/.obsidian/workspace.json` | Per-machine Obsidian state |

Your Markdown notes, frontmatter, and attachments **are** committed and pushed.

## Next: Deploy on Netlify

Follow README for deployment steps, then see [[Netlify Deployment]] for troubleshooting and deployment behavior details.
