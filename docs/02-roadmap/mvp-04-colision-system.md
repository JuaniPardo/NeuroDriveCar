

# MVP 04 — Collision System

Status:

```txt
Completed
```

---

# Roadmap Position

```txt
[✓] MVP 01 — Foundation
[✓] MVP 02 — Highway Rendering
[✓] MVP 03 — Vehicle Physics & Controls
[✓] MVP 04 — Collision System
[ ] MVP 05 — Traffic Simulation
[ ] MVP 06 — Sensor System
[ ] MVP 07 — Neural Network Driving
```

Legend:

```txt
[✓] Completed
[→] Current
[~] Partial
[ ] Planned
[!] Blocked
```

---

# Goal

Introduce reliable collision detection into NeuroDriveCar.

This MVP establishes the first real failure condition in the simulation:

```txt
A vehicle can crash.
```

The player/user should experience:

- The manually controlled vehicle colliding with road boundaries
- The vehicle entering a clear damaged/disabled state after collision
- Visual feedback when a crash occurs
- Debuggable collision geometry

The technical milestone is:

- Vehicle polygon generation
- Road boundary collision detection
- Collision utility functions
- Damage state handling
- Future-ready collision architecture for traffic and sensors

This MVP matters because collision detection is essential for:

- Traffic interaction
- AI survival evaluation
- Evolutionary selection
- Sensor validation
- Damage states
- Training feedback

Without reliable collisions, the AI has no meaningful failure condition.

---

# Summary

```txt
Implement polygon-based collision detection between the vehicle
and road boundaries, introduce a damaged state, and prepare reusable
geometry utilities for future vehicle-to-vehicle collisions.
```

---

# Features

- Vehicle collision polygon
- Road boundary collision detection
- Damaged/disabled vehicle state
- Crash visual feedback
- Debug collision rendering
- Reusable geometry utilities
- Simulation stop or disable behavior after crash

---

# Technical Scope

Create or extend the following systems:

- Collision geometry utilities
- Segment intersection detection
- Polygon intersection detection
- Vehicle polygon generation
- Road boundary collision checks
- Car damage state
- Collision debug rendering

Expected files involved:

```txt
src/
  collision/
    geometry.ts
  car/
    Car.ts
  world/
    Road.ts
  utils/
    math.ts
```

Potential concepts introduced:

- points
- line segments
- polygons
- road borders
- intersection testing
- damaged state
- collision visualization

---

# Architecture Notes

- Collision logic must remain independent from rendering
- Geometry utilities should be reusable by traffic, sensors, and AI systems later
- The car should expose or compute its polygon in world coordinates
- Road borders should be available as world-space line segments
- Damage state should belong to the car simulation state
- Rendering should only visualize the collision state, not determine it
- Collision checks should remain deterministic
- Avoid adding advanced physics responses in this MVP

The goal is detection, not realistic crash simulation.

---

# Tasks

## Core

- [x] Create reusable point/segment/polygon types if needed
- [x] Implement line segment intersection detection
- [x] Implement polygon intersection detection
- [x] Generate rotated vehicle polygon from car position, size, and angle
- [x] Expose road borders as collision segments
- [x] Detect collision between vehicle polygon and road borders
- [x] Add `damaged` state to vehicle
- [x] Disable or stop vehicle after collision

## Visual

- [x] Render damaged vehicle differently
- [x] Add optional collision polygon debug rendering
- [x] Add optional road border debug rendering
- [x] Add clear crash feedback without visual clutter

## Technical

- [x] Keep collision utilities pure where possible
- [x] Keep geometry calculations in world coordinates
- [x] Avoid unnecessary allocations inside update loops where practical
- [x] Ensure collision checks work at multiple angles
- [x] Ensure collision checks are stable at different speeds

---

# Acceptance Criteria

This MVP is complete when:

- Vehicle collides with left road boundary
- Vehicle collides with right road boundary
- Collision is detected using polygon/segment logic
- Vehicle enters damaged state after collision
- Damaged vehicle no longer drives normally
- Collision geometry is visually debuggable
- Collision logic is independent from rendering
- No major false positives occur during normal lane driving
- No major false negatives occur when crossing road boundaries
- Simulation remains stable at 60 FPS

---

# Debug Visualization

Useful optional debug visuals:

- Vehicle collision polygon
- Road boundary segments
- Collision points
- Damaged state indicator
- Vehicle center point
- Heading vector

Debug visuals should be toggleable or easy to remove later.

They should help answer:

```txt
Why did the vehicle crash?
```

---

# Performance Considerations

- Avoid excessive geometry allocations in hot loops
- Keep polygon size small and predictable
- Road boundary checks should be cheap
- Segment intersection should remain simple and deterministic
- Do not introduce spatial partitioning yet

Performance target:

```txt
Stable 60 FPS with collision checks enabled.
```

---

# Risks

- Incorrect rotated polygon generation
- Collision detection fails at sharp angles
- False positives near lane borders
- False negatives at high speed
- Mixing screen coordinates with world coordinates
- Damaged state interfering with future AI control logic
- Overengineering collision response too early

---

# Out of Scope

This MVP should NOT include:

- Traffic vehicle collisions
- Sensor raycasting
- Neural networks
- AI driving
- Population fitness evaluation
- Crash particles
- Damage deformation
- Physics-based crash response
- Curved road collisions
- Spatial partitioning

The focus is reliable road-boundary collision detection only.

---

# Future Improvements

- Vehicle-to-vehicle collision detection
- Collision points visualization
- SAT-based collision detection if needed
- Spatial partitioning for large traffic populations
- Crash particles
- Sound effects
- Damage severity
- Recovery/reset tools
- Collision analytics for AI training

---

# Dependencies

Required:

- MVP 01 — Foundation
- MVP 02 — Highway Rendering
- MVP 03 — Vehicle Physics & Controls

This MVP depends on:

- Stable game loop
- Working world-space road
- Controllable vehicle
- Rotation-based vehicle movement
- Camera-follow driving behavior

---

# Deliverables

- Road-boundary collision detection
- Reusable geometry utilities
- Vehicle collision polygon
- Damaged vehicle state
- Crash visual feedback
- Debug collision visualization
- Updated documentation if implementation changes occur

---

# Notes

This MVP creates the first meaningful failure state in the project.

That is important because future AI training needs a clear distinction between:

```txt
surviving
```

and:

```txt
failing
```

The implementation should remain simple, explicit, and trustworthy.

Do not chase realistic crash physics yet.

The only goal is:

```txt
The car knows when it hit the road boundary.
```
