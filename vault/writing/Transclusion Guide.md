---
publish: true
title: "Transclusion Guide"
tags: [writing/features]
aliases: ["transclusion", "embed"]
graph:
  shape: torus
  color: "#e67e22"
---

# Transclusion Guide

**Transclusion** embeds content from another note inline.

## Embed a whole note

```markdown
![[Another Note]]
```

## Embed a specific block

```markdown
![[Block IDs Guide#^block-guide-intro]]
```

The content of that paragraph renders inline here. Transclusions are **depth-guarded** (max 4 levels) and **circular-embed safe**.

See [[Block IDs Guide]] · [[Wikilinks Guide]] · [[Writing Hub]].
