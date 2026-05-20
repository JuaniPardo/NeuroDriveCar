# AGENTS.md

This document defines the architectural principles, coding rules, simulation philosophy, and AI/code-generation constraints for NeuroDriveCar.

The goal is to maintain a clean, extensible, high-performance simulation architecture while allowing rapid experimentation and iterative vibecoding.

---

# Project Philosophy

NeuroDriveCar is intentionally built without heavy game engines.

The project prioritizes:

1. Simulation correctness
2. Architectural clarity
3. Full control over systems
4. Readable math and physics
5. Real-time debugging visibility
6. Incremental evolution of complexity

The project is not intended to:

- Hide complexity behind frameworks
- Depend on black-box systems
- Optimize prematurely
- Chase visual realism before simulation quality

---

# Core Principles

## 1. Simulation First

Physics, sensors, collisions, and AI behavior are the core of the project.

Rendering exists to visualize the simulation.

Simulation logic must never depend on rendering code.

---

## 2. Explicit Systems

Prefer explicit and understandable math over abstracted helper libraries.

Avoid hidden side effects.

Avoid magic behavior.

The codebase should remain educational and debuggable.

---

## 3. Small Composable Modules

Prefer:

- Small classes
- Focused responsibilities
- Pure utility functions
- Explicit data flow

Avoid:

- Massive monolithic managers
- Deep inheritance hierarchies
- Overengineered abstractions
- Premature ECS architectures

---

## 4. Incremental Complexity

The project evolves in layers.

Do not introduce future-stage systems early.

Example:

- Highway simulation before cities
- Straight roads before intersections
- Stable AI before procedural generation

---

# Rendering Rules

## Allowed

- HTML5 Canvas 2D
- Native browser APIs
- Lightweight utility helpers

## Forbidden

- Three.js
- Phaser
- Unity exports
- Heavy game engines
- Full rendering frameworks

Canvas rendering must remain custom and understandable.

---

# Architecture Rules

## Separation of Responsibilities

Rendering, simulation, AI, input, and physics must remain separated.

Example:

```txt
Car
 ├── physics
 ├── controls
 ├── sensors
 ├── brain
 └── rendering
```

---

## Update and Render

Game objects should expose:

```ts
update(deltaTime)
render(ctx)
```

Simulation updates should occur before rendering.

---

## Camera Independence

The camera follows simulation state.

Simulation coordinates must never depend on screen coordinates.

---

## Deterministic Logic

Where possible:

- physics
- collisions
- sensors
- neural outputs

should behave deterministically for reproducibility.

---

# AI Rules

## Initial AI Scope

Stage 1 uses:

- Feed-forward neural networks
- Mutation-based evolution
- No backpropagation
- No external ML frameworks

The goal is visualization and emergent behavior.

---

## Sensor Inputs

Sensor outputs should remain normalized.

Inputs should be interpretable and debuggable.

---

## Brain Persistence

The best-performing brain should be serializable.

Persistence should initially use:

```txt
localStorage
```

---

# Performance Rules

## Avoid Hot-Loop Allocations

Inside update/render loops:

- avoid unnecessary object creation
- avoid temporary arrays
- avoid repeated allocations

Prefer reusable structures for hot paths.

---

## Optimize Only When Necessary

Do not optimize prematurely.

Correctness and clarity come first.

Optimization is allowed only after:

- visible performance problems
- measurable bottlenecks
- profiling evidence

---

# Debugging Philosophy

The simulation should always remain visually debuggable.

Important systems should be renderable:

- sensors
- collision polygons
- neural activity
- selected rays
- AI decisions

Debugging visibility is considered a feature.

---

# Visual Direction

Current visual direction:

- Dark minimalist aesthetic
- Clean geometry
- High contrast readability
- Simulation-focused visuals
- Debug-friendly rendering

The project should feel like:

```txt
An AI driving laboratory.
```

not:

```txt
An arcade racing game.
```

---

# Scope Discipline

Avoid introducing:

- city systems
- pedestrians
- weather
- multiplayer
- advanced shaders
- procedural worlds

before the highway AI simulation is stable.

Stage 1 priorities:

1. Stable physics
2. Reliable sensors
3. Collision correctness
4. AI evolution
5. Debug visualization
6. Visual polish

---

# Code Style

## Preferred

- Readable names
- Explicit calculations
- Short functions
- Predictable control flow
- Type safety
- Simple data structures

## Avoid

- Clever one-liners
- Excessive generics
- Meta-programming
- Unnecessary patterns
- Hidden mutations

---

# Vibecoding Guidelines

When using AI/code-generation:

Prefer:

- incremental changes
- isolated features
- testable steps
- readable code

Avoid:

- giant rewrites
- architectural reinventions
- speculative abstractions
- framework migrations

The project should evolve continuously without losing understandability.

---

# Current Stage

```txt
Stage 1
Highway autonomous driving simulation
```

Current target:

```txt
Train multiple AI-controlled vehicles to survive as long
as possible on a multi-lane highway using sensor-based
neural decision making.
```
