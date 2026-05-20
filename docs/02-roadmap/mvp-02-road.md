# MVP 02 — Highway Rendering

Status:

```txt
Planned
```

---

# Goal

Create the first navigable simulation environment for NeuroDriveCar.

This MVP introduces the visual and spatial foundation of the highway world.

The player/user should experience:

- A vertically scrolling highway
- Multiple visible lanes
- A stable world-space environment
- A moving camera following the simulation
- A believable driving space for future vehicle systems

The technical milestone is:

- Introduction of world coordinates
- Infinite-feeling road rendering
- Lane system abstraction
- Initial camera tracking behavior

This MVP matters because every future gameplay and AI system depends on a stable navigable world:

- Vehicle movement
- Traffic
- Sensors
- Collisions
- AI driving
- Population training

---

# Summary

```txt
Implement an infinite-feeling multi-lane highway rendering system
with camera support and reusable lane utilities.
```

---

# Features

- Infinite vertical road rendering illusion
- 3-lane highway
- Road borders
- Dashed lane separators
- Camera following system
- World-space rendering
- Lane center helper functions
- Stable scrolling environment

---

# Technical Scope

Create or extend the following systems:

- `Road` class
- Lane calculation helpers
- World coordinate rendering
- Camera tracking behavior
- Infinite road rendering illusion
- Render clipping and visible-range drawing

Expected files involved:

```txt
src/
  game/
    Camera.ts
  world/
    Road.ts
    Lane.ts
  utils/
    math.ts
```

Possible future-facing concepts introduced:

- worldY coordinates
- lane indexing
- road bounds
- render offsets

---

# Architecture Notes

- The road must exist in world space, not screen space
- Camera movement should not modify world coordinates directly
- Rendering should use camera offsets
- Road rendering must remain deterministic
- Lane calculations should be reusable by traffic and AI systems later
- Avoid hardcoding lane centers in multiple places
- The road system should remain independent from vehicle logic

The road is a simulation structure first and a visual element second.

---

# Tasks

## Core

- [ ] Create `Road` class
- [ ] Define road width
- [ ] Define lane count
- [ ] Implement lane width calculation
- [ ] Implement `getLaneCenter(index)`
- [ ] Create infinite vertical road rendering illusion
- [ ] Create left and right road borders
- [ ] Implement dashed lane separators
- [ ] Add world coordinate support

## Camera

- [ ] Create camera follow behavior
- [ ] Implement camera vertical tracking
- [ ] Separate world and screen coordinates
- [ ] Ensure rendering offsets are correct

## Visual

- [ ] Create dark background
- [ ] Create readable road contrast
- [ ] Render clean dashed lane lines
- [ ] Add subtle visual depth through line styling
- [ ] Ensure visuals remain debug-friendly

## Technical

- [ ] Keep rendering performant
- [ ] Avoid unnecessary allocations during render
- [ ] Keep road calculations reusable
- [ ] Ensure future traffic systems can query lane centers

---

# Acceptance Criteria

This MVP is complete when:

- A highway is rendered continuously
- The road appears vertically infinite
- Three lanes are clearly visible
- Dashed separators render correctly
- Camera movement works reliably
- World-space rendering behaves consistently
- Lane center calculations are reusable and accurate
- No visual jitter occurs during scrolling
- Rendering remains stable at 60 FPS

---

# Debug Visualization

Useful optional debug visuals:

- Lane center markers
- Road boundaries
- Camera origin
- Visible render bounds
- World coordinate labels

Debug rendering should remain lightweight.

---

# Performance Considerations

- Avoid rendering unnecessary off-screen geometry
- Avoid allocating arrays inside render loops
- Dashed line rendering should remain lightweight
- Camera calculations should remain simple
- Road rendering should scale to future traffic density

Performance target:

```txt
Stable 60 FPS with continuous scrolling.
```

---

# Risks

- Mixing screen coordinates with world coordinates
- Camera jitter during movement
- Misaligned dashed lane separators
- Incorrect lane center calculations
- Rendering artifacts during scroll
- Hardcoded assumptions that block future curved roads

---

# Out of Scope

This MVP should NOT include:

- Vehicle physics
- Keyboard controls
- Traffic cars
- Sensors
- Neural networks
- Collisions
- Curved roads
- Intersections
- AI systems
- Population simulation

The road exists purely as environment infrastructure in this MVP.

---

# Future Improvements

- Curved roads
- Dynamic lane counts
- Road shoulders
- Visual road wear
- Tunnel systems
- Bridges
- Elevation changes
- Procedural road generation
- Lane merge/split systems

---

# Dependencies

Required:

- MVP 01 — Foundation

This MVP depends on:

- Stable Canvas rendering
- Working game loop
- Camera-ready architecture

---

# Deliverables

- Infinite-feeling road rendering
- Reusable lane system
- Camera-follow functionality
- World-space rendering baseline
- Stable scrolling simulation environment
- Updated documentation if architecture changes

---

# Notes

This MVP establishes the first real feeling of movement and space in the project.

Even without vehicles yet, the highway should already feel like:

```txt
A controllable simulation environment.
```

The road system should be implemented carefully because many future systems will depend on it:

- Traffic spawning
- AI positioning
- Sensor calculations
- Collision detection
- Navigation behavior
