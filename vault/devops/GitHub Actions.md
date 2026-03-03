---
publish: true
title: "GitHub Actions"
tags: [devops/cicd, devops]
graph:
  shape: box
  color: "#2088ff"
---

# GitHub Actions

GitHub Actions automates workflows on every push/PR.

```yaml
name: Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
```

See [[CI CD Pipelines]] · [[Docker Overview]] · [[DevOps Hub]].
