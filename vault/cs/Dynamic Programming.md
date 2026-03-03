---
publish: true
title: "Dynamic Programming"
tags: [cs/algorithms, cs]
graph:
  shape: box
  color: "#2980b9"
---

# Dynamic Programming

DP solves problems by breaking them into overlapping subproblems and memoising results.

```python
@functools.lru_cache(None)
def fib(n):
    return n if n <= 1 else fib(n-1) + fib(n-2)
```

See [[Recursion]] · [[Algorithms Overview]] · [[CS Concepts Hub]].
