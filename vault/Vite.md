---
publish: true
title: "Vite"
tags: [tools/js]
graph:
  shape: cone
  color: "#bd34fe"
---

# Vite

Vite is a fast frontend build tool. Astro uses Vite internally for dev-server HMR and bundling, so it powers this project even if you never configure it directly.

## Relevance

- **Dev server** — `pnpm dev` spins up Vite's HMR server via Astro
- **Build** — Vite bundles the React island code and Three.js graph for production
- **Plugins** — Astro's Vite integration handles TypeScript transpilation and asset hashing

## Related

- [[JavaScript]] ← parent hub
