

# MVP XX — [TITLE]

Status:

```txt
Planned
```

---

# Goal

Describe the primary objective of this MVP.

Explain:

- What the player/user should experience
- What technical milestone is being achieved
- Why this MVP matters for the project evolution

---

# Summary

Short high-level description of the feature set delivered by this MVP.

Example:

```txt
Introduce vehicle collision detection against road boundaries
and traffic vehicles.
```

---

# Features

List the user-visible and system-visible features.

Example:

- Vehicle damage state
- Road collision detection
- Traffic collision detection
- Collision visualization

---

# Technical Scope

Describe the systems that will be created or modified.

Example:

- Collision geometry utilities
- Polygon intersection detection
- Car damage state handling
- Physics interruption on collision

---

# Architecture Notes

Document important architectural decisions.

Example:

- Collision system must remain rendering-independent
- Vehicle polygons should be generated dynamically
- Geometry utilities must remain reusable

---

# Tasks

## Core

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Visual

- [ ] Visual task 1
- [ ] Visual task 2

## Technical

- [ ] Refactor task
- [ ] Optimization task

---

# Acceptance Criteria

Define the minimum conditions required for this MVP to be considered complete.

Example:

- Vehicle correctly detects road collisions
- Vehicle stops after collision
- Traffic collisions are detected reliably
- Collision state is visually identifiable
- No major simulation instability introduced

---

# Debug Visualization

Describe the debug information that should be renderable.

Example:

- Collision polygons
- Contact edges
- Vehicle bounds
- Collision state

---

# Performance Considerations

Document any expected performance-sensitive areas.

Example:

- Avoid unnecessary polygon allocations
- Cache frequently reused geometry
- Keep collision checks deterministic

---

# Risks

List possible implementation risks.

Example:

- Polygon rotation inaccuracies
- False-positive collision detection
- Simulation jitter at high speed

---

# Out of Scope

Explicitly define what this MVP should NOT include.

Example:

- Curved roads
- Advanced crash physics
- Particle systems
- Damage deformation

---

# Future Improvements

List ideas intentionally postponed.

Example:

- SAT collision optimization
- Spatial partitioning
- Better crash response
- Collision analytics

---

# Dependencies

List required previous MVPs or systems.

Example:

- MVP 02 — Road System
- MVP 03 — Vehicle Physics

---

# Deliverables

Expected outputs of the MVP.

Example:

- Stable gameplay behavior
- Updated documentation
- Debug visualization
- Working simulation demo

---

# Notes

Freeform implementation notes, ideas, discoveries, or constraints.