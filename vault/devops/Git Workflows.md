---
publish: true
title: "Git Workflows"
tags: [devops/git, devops]
graph:
  shape: torus
  color: "#f05032"
---

# Git Workflows

## Common Workflows
- **GitHub Flow**: branch + PR + merge
- **Gitflow**: develop/release/hotfix branches
- **Trunk-based**: commit directly to main

```bash
git checkout -b feature/my-feature
git commit -am "Add feature"
git push origin feature/my-feature
```

See [[GitHub Actions]] · [[CI CD Pipelines]] · [[DevOps Hub]].
