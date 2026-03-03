---
publish: true
title: "Elixir"
tags: [programming/elixir, programming, functional]
graph:
  shape: torus
  color: "#9b59b6"
---

# Elixir

Elixir is a dynamic, functional language that runs on the Erlang VM (BEAM).

```elixir
defmodule Greeter do
  def greet(name), do: "Hello, #{name}!"
end

IO.puts Greeter.greet("Elixir")
```

See [[Functional Programming]] · [[Concurrency]] · [[Programming Hub]].
