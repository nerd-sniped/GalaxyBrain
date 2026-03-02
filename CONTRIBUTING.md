# Contributing to GalaxyBrain

Thanks for your interest in contributing! GalaxyBrain is a community template — improvements that make it easier for people to publish their knowledge graphs are very welcome.

---

## Ways to Contribute

| Type | How |
|---|---|
| 🐛 Bug fix | Open an issue, then a PR |
| ✨ New feature | Open a feature request issue first to discuss |
| 📝 Documentation | PRs directly are fine |
| 🎨 UI / style | PR with before/after screenshots |
| 🌍 Show & tell | Post in [Discussions → Show & Tell](https://github.com/nerd-sniped/GalaxyBrain/discussions/categories/show-and-tell) |

---

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 9+ (`npm install -g pnpm`)
- Git

### Local setup

```bash
git clone https://github.com/nerd-sniped/GalaxyBrain.git
cd GalaxyBrain
pnpm install
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321).

### Running a production build

```bash
pnpm build
pnpm preview   # optional — serve the dist/ folder
```

The build must complete without errors before any PR can be merged.

---

## Project Structure

```
vault/         ← Template vault notes (.md files, flat at root; attachments/ holds media)
src/
  components/     ← React islands (FullGraph, LocalGraph, GraphNodeFactory)
  integrations/   ← Astro integrations (graph-builder, asset-collector, block-indexer)
  plugins/        ← Remark plugins (transclusion, vault-images)
  lib/            ← Shared types, vault-parser, link-resolver
  layouts/        ← Astro layouts
  pages/          ← Astro pages
  styles/         ← CSS (global, note, graph, callouts)
```

See [Context.md](Context.md) for a detailed description of every file and the decisions behind them.

---

## Code Style

- **TypeScript** everywhere — no `any` without a comment explaining why
- **No external CSS frameworks** — plain CSS custom properties in `src/styles/`
- **React components** are `client:only="react"` islands — keep them self-contained
- **Remark plugins** must never throw — wrap risky operations in try/catch and log a warning
- **Graph builder** must produce valid JSON even if some notes are malformed

---

## Adding a New Node Shape

1. Add the new name to the `NodeShape` union in [`src/lib/types.ts`](src/lib/types.ts)
2. Add a `case` to `buildGeometry()` in [`src/components/GraphNodeFactory.ts`](src/components/GraphNodeFactory.ts) returning a `THREE.BufferGeometry`
3. Document it in [`vault/Graph Features.md`](vault/Graph%20Features.md) and [`vault/Frontmatter Reference.md`](vault/Frontmatter%20Reference.md)

---

## Adding a New Frontmatter Field

1. Add the field to `NoteFrontmatter` (and `GraphNode` if it's graph-visible) in [`src/lib/types.ts`](src/lib/types.ts)
2. Map it in the file-node block of [`src/integrations/graph-builder.ts`](src/integrations/graph-builder.ts) — also add `fieldName: defaultValue` to the tag and ghost node constructors to keep TypeScript happy
3. Document it in [`vault/Frontmatter Reference.md`](vault/Frontmatter%20Reference.md)

---

## Pull Request Guidelines

- One logical change per PR — easier to review and revert if needed
- Include before/after screenshots for any UI change
- `pnpm build` must pass — CI will check this automatically
- Update the relevant vault note(s) if user-facing behaviour changes
- Keep PRs focused; separate refactors from feature work

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add callout label to graph nodes
fix: clear tag filter on banner click
docs: add node shape guide to Graph Features note
refactor: simplify collapsible node propagation
chore: update three.js to 0.184
```

---

## Reporting Security Issues

Please **do not** open a public issue for security vulnerabilities. Email the repository owner directly (see the GitHub profile). We'll respond within 72 hours.

---

## License

By contributing you agree that your work will be released under the [MIT License](LICENSE).
