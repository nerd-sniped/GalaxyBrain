---
publish: true
title: "JavaScript"
tags: [programming/js, tech]
aliases: [js, ecmascript]
graph:
  shape: torusknot
  color: "#f7df1e"
---

# JavaScript

JavaScript is the lingua franca of the web — the only language that runs natively in every browser. It has also grown to dominate server-side development through Node.js and edge runtimes.

## Modern JS (ES2020+)

The language has evolved dramatically. Key modern features:

```js
// Optional chaining & nullish coalescing
const city = user?.address?.city ?? "Unknown";

// Destructuring with defaults
const { name = "Anonymous", age = 0 } = person;

// Async/Await
const data = await fetch("/api/notes").then(r => r.json());

// Array methods
const slugs = notes
  .filter(n => n.publish)
  .map(n => n.slug);
```

## Type Safety

Vanilla JavaScript offers no compile-time type checking. This is why [[TypeScript]] was created — it adds a static type layer on top of JS while remaining fully interoperable.

==JavaScript without TypeScript is fine for small scripts; for anything larger, TypeScript is strongly recommended.==

## The Ecosystem

| Package manager | Description |
|---|---|
| npm | Default Node.js manager |
| pnpm | Faster, disk-efficient (used in this project) |
| yarn | Alternative with workspaces |

## Frameworks

- **React** — declarative UI components (islands used in this garden)
- **[[Vue.js]]** — progressive framework with great DX (ghost — not yet written)  
- **Astro** — see [[Astro]] for how this garden uses it

## Runtime Environments

Beyond the browser, JS executes in:

- **Node.js** — the dominant server runtime
- **[[Node.js Ecosystem]]** — deep dive on servers, streams, and the event loop (ghost)
- **Deno / Bun** — modern alternatives with TypeScript-first design
- **Edge runtimes** — Cloudflare Workers, Netlify Edge, Vercel Edge

## Relationship to This Garden

The 3D graph on the landing page is React + Three.js — pure JavaScript compiled by [[Astro]]. The build pipeline is Node.js. The entire codebase is [[TypeScript]].

## Learning Path

> [!tip] Where to Start
> If you know another language, the MDN JavaScript Guide is the most comprehensive and accurate reference.
> Then move to [[TypeScript]] for large-scale development.
> Explore [[React Hooks]] for component logic patterns (ghost — links to unwritten deep-dive).

See also: [[Web Dev]], [[Programming]], [[TypeScript]]

## Related Tags

#programming/js — notes in this family form the web development cluster of this garden.

