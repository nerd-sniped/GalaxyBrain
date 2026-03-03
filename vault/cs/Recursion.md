---
publish: true
title: "Recursion"
tags: [cs/algorithms, cs]
graph:
  shape: torus
  color: "#e67e22"
---

# Recursion

Recursion is when a function calls itself.

```python
def factorial(n: int) -> int:
    return 1 if n <= 1 else n * factorial(n - 1)
```

Base case always required! See [[Dynamic Programming]] · [[Algorithms Overview]] · [[CS Concepts Hub]].
