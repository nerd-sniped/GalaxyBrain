---
publish: true
title: "Writing Notes"
tags: [meta/authoring]
aliases: [notes, authoring, writing]
graph:
  shape: torus
  color: "#e67e22"
---

# Writing Notes

Everything you need to know about writing notes that appear correctly on the site.

## The Basics

A publishable note is any `.md` file in `vault/` with `publish: true` in its frontmatter:

```markdown
---
publish: true
title: "My Note"
---

# My Note

Write here...
```

Notes without `publish: true` (or with `publish: false`) are completely invisible to the site — they never appear in the graph, their links create no edges, and their tags don't generate tag nodes.

## Wikilinks

Use `[[Note Name]]` to link from one note to another:

```markdown
This connects to [[Another Note]].
You can also [[Another Note|alias the link text]].
```

Wikilinks become edges in the graph. If the target note doesn't exist or isn't published, it becomes a **ghost node** — a transparent wireframe in the graph that shows the link is there but the note hasn't been written yet.

## Tags

Tags appear in frontmatter or inline with `#`:

```markdown
---
tags: [programming/rust, tech]
---

Some inline #tags also work.
```

Tags become their own nodes in the graph. Using hierarchical tags like `#programming/rust` clusters related notes visually — all `#programming/*` tags appear in the same colour family.

## Block IDs

You can mark any paragraph with a block ID using `^id-here` at the end:

```markdown
This is an important paragraph. ^my-block-id
```

This lets other notes transclude that exact paragraph with `![[This Note#^my-block-id]]`.

## Images

Drop image files (PNG, JPG, SVG, GIF, WebP) into `vault/attachments/` and embed them with:

```
![[diagram.svg]]
```

The build pipeline automatically copies images to `public/vault-assets/` and rewrites the paths. If an image file is missing, a broken-image placeholder is shown instead of breaking the build.

## Transclusion

Embed content from other notes:

```markdown
# Embed a block from another note
![[Other Note#^block-id]]

# Embed an entire note (collapsed by default)
![[Other Note]]
```

Block embeds appear as styled blockquotes. Full-note embeds appear as expandable `<details>` elements. Transclusion depth is capped at 3 levels to prevent infinite loops.

## Callouts

Obsidian-style callouts are supported:

```markdown
> [!note] Optional Title
> Note content here.

> [!tip] Pro Tip
> This is a tip.

> [!warning]
> Watch out!
```

Supported types: `note`, `tip`, `important`, `warning`, `caution`, `abstract`, `info`, `todo`, `success`, `question`, `failure`, `danger`, `bug`, `example`, `quote`.

## Frontmatter Cheatsheet

```yaml
---
publish: true         # Required to appear on site
title: "My Note"
tags: [topic/subtopic]
aliases: [other name]
graph:
  shape: sphere
  color: "#e74c3c"
  collapsible: false
---
```

See [[Frontmatter Reference]] for every available field.
