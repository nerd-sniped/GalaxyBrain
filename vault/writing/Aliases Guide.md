---
publish: true
title: "Aliases Guide"
tags: [writing/features]
aliases: ["aliases", "alternate names", "alt names"]
graph:
  shape: sphere
  color: "#2ecc71"
---

# Aliases Guide

**Aliases** are alternate names for a note. If another note uses `[[aliases]]`, it resolves to this note.

```yaml
aliases:
  - alternate names
  - alt names
```

## Why Use Aliases?

- Shorten long titles: `[[aliases]]` → "Aliases Guide"
- Handle plurals: `[[alias]]` and `[[aliases]]` can point to the same note
- Accommodate typos or alternate spellings

See [[Wikilinks Guide]] · [[Frontmatter Guide]] · [[Writing Hub]].
