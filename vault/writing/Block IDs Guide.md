---
publish: true
title: "Block IDs Guide"
tags: [writing/features]
aliases: ["block ids", "block references"]
graph:
  shape: box
  color: "#9b59b6"
---

# Block IDs Guide

Append `^id` to the end of any paragraph to give it a stable reference ID.

## Example

```markdown
This is the important fact. ^key-fact
```

Other notes can then transclude exactly this paragraph:

```markdown
![[Block IDs Guide#^key-fact]]
```

---

This paragraph has a block ID. ^block-guide-intro

This paragraph also has an ID. ^block-guide-usage

See [[Transclusion Guide]] · [[Wikilinks Guide]] · [[Writing Hub]].
