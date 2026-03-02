---
publish: true
title: "Rust"
tags: [programming/rust, programming/systems, tech]
graph:
  shape: box
  color: "#F74C00"
---

# Rust

![[rust-logo.svg]]

Rust is a systems programming language focused on safety, speed, and concurrency.

## The Ownership Model

Rust's core innovation is the **borrow checker** — a compile-time analysis that eliminates entire classes of memory bugs. ^ownership-intro

Key concepts:
- **Ownership** — every value has exactly one owner
- **Borrowing** — temporary, scoped references (`&T` immutable, `&mut T` mutable)
- **Lifetimes** — compile-time proof that references don't outlive their data

See [[Ownership Model]] for a deep-dive (not yet written). ^borrow-ref

## Why Rust for Systems Work

#programming/systems languages traditionally required manual memory management (C, C++). Rust achieves similar performance without garbage collection, but with compile-time safety guarantees.

Contrast with [[TypeScript]] which operates at a much higher level of abstraction.

## Use in This Project

[[Astro]]'s build toolchain (Vite, esbuild) is partially written in Rust-based tools. The fast incremental builds are partly thanks to Rust-powered compilers.

Parent note: [[Programming]]
