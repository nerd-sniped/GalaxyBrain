---
publish: true
title: "TypeScript"
tags: [programming/js, programming/web, tech]
aliases: [ts]
graph:
  shape: cylinder
  color: "#3178c6"
---

# TypeScript

TypeScript is a statically typed superset of JavaScript that compiles to plain JS.

## Why TypeScript

JavaScript's dynamic typing makes large codebases hard to maintain. TypeScript adds:

- **Static types** — catch errors at compile time, not runtime
- **IDE support** — autocomplete, refactoring, go-to-definition
- **Gradual adoption** — any JS is valid TS; add types incrementally

## In This Project

This entire project is written in TypeScript (`strict` mode). Path aliases (`@lib/*`, `@components/*`) are configured in `tsconfig.json`. ^ts-config-ref

Below is a screenshot of the type definitions used by this project:

![[examples/screenshot.svg]]

[[Astro]] has first-class TypeScript support with no configuration required.

## Borrow vs Type Checking

TypeScript's type system is purely structural (erased at runtime). Compare this to Rust's borrow checker:

![[Rust#^borrow-ref]]

## Relationship to #programming/web

TypeScript is the dominant language for modern #programming/web development. Frameworks like [[Astro]], React, and Vue all have excellent TypeScript support.

Related: [[Web Dev]], [[Programming]]

> [!note] Config
> See `tsconfig.json` at the project root for the full TypeScript configuration used in this garden.
