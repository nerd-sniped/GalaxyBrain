---
publish: true
title: "Images Guide"
tags: [writing/features]
aliases: ["images", "attachments"]
graph:
  shape: sphere
  color: "#e91e63"
---

# Images Guide

Drop images into `vault/attachments/` and embed with:

```markdown
![[diagram.svg]]
![[screenshot.png]]
```

The build pipeline:
1. Copies `vault/attachments/*` → `public/vault-assets/attachments/`
2. Rewrites `![[img]]` → `<img src="/vault-assets/attachments/img">`

If the image file is missing, a **placeholder** is shown instead of breaking the build.

See [[Writing Hub]] · [[Transclusion Guide]].
