---
publish: true
title: "Rust"
tags: [programming/rust, programming, systems]
graph:
  shape: torusknot
  color: "#ce422b"
---

# Rust

Rust is a systems language focused on safety, speed, and concurrency. Its ownership model guarantees memory safety without a GC. ^rust-intro

```rust
fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}
```

See [[Memory Management]] · [[Concurrency]] · [[Programming Hub]].
