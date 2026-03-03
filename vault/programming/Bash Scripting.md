---
publish: true
title: "Bash Scripting"
tags: [programming/bash, programming, devops]
graph:
  shape: box
  color: "#4eaa25"
---

# Bash Scripting

Bash (Bourne Again SHell) is the standard Unix shell and scripting language.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Hello, $USER!"
for f in *.md; do
  echo "Found: $f"
done
```

See [[DevOps Hub]] · [[Git Workflows]] · [[Programming Hub]].
