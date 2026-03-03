---
publish: true
title: "TypeScript"
tags: [tools/js]
graph:
  shape: box
  color: "#3178c6"
---

# TypeScript

TypeScript is a typed superset of JavaScript. Every source file in this project — components, integrations, and library utilities — is written in TypeScript or TSX.

## Why TypeScript

- **Type-safe frontmatter** — schema types flow from `content.config.ts` into components automatically
- **Graph types** — `GraphNode`, `GraphLink`, and `GraphData` are defined in `src/lib/types.ts`
- **Refactoring confidence** — structural changes in the graph data shape surface errors at build time, not runtime

## Related

- React — components are written in TSX
- [[JavaScript]] ← parent hub
