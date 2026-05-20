# MVP 05 — Traffic Simulation

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
[✓] MVP 05 — Traffic Simulation
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

Introduce deterministic highway traffic into NeuroDriveCar.

This MVP creates the first shared driving environment:

```txt
The road is no longer empty.
```

The player/user should experience:

- Predictable lane-based traffic ahead of the player
- A meaningful need to steer around slower vehicles
- Vehicle-to-vehicle collision failure states
- A more simulation-like highway environment
- Clear visual distinction between the player and traffic

The technical milestone is:

- Reuse of the existing `Car` simulation model for NPC traffic
- Deterministic traffic spawning and lifecycle management
- Constant-speed obstacle movement in world coordinates
- Player-vs-traffic polygon collision detection
- Future-ready traffic state for sensors and AI perception

This MVP matters because traffic becomes the environment that future systems must reason about:

- Sensors need traffic to detect
- AI needs obstacles to avoid
- Evolution needs survival pressure
- Debug tools need moving reference targets
- Highway driving needs context, not just boundaries

---

# Summary

```txt
Introduce lane-based traffic vehicles with deterministic spawning,
constant-speed movement, and player-to-traffic collision detection
to create a shared highway simulation.
```

---

# Features

- NPC traffic vehicles
- Deterministic lane-based spawning
- Constant-speed traffic movement
- Traffic lifecycle management
- Player-to-traffic collision detection
- Shared `Car` rendering/simulation core
- Traffic debug overlays and lane labels
- Tunable traffic density through fixed spacing and spawn distance

---

# Technical Scope

Create or extend the following systems:

- `TrafficManager`
- Traffic-enabled `Car` mode
- Lane-based traffic spawning
- Player-vs-traffic polygon collision checks
- Traffic update/render lifecycle integration
- Traffic debug overlay support

Expected files involved:

```txt
src/
  car/
    Car.ts
  traffic/
    TrafficManager.ts
  game/
    Game.ts
  world/
    Road.ts
  collision/
    geometry.ts
```

Potential concepts introduced:

- deterministic spawn patterns
- constant-speed NPC entities
- traffic culling
- shared vehicle model
- lane occupancy spacing
- player-vs-traffic impact detection

---

# Architecture Notes

- Traffic reuses the existing `Car` entity where practical
- Traffic behavior remains deterministic and intentionally simple
- Traffic movement stays in world coordinates
- `TrafficManager` owns spawning, lifecycle, and update orchestration
- Player and traffic rendering remain separate from simulation state
- Vehicle-to-vehicle collision checks reuse polygon geometry utilities
- Traffic-to-traffic collisions remain out of scope for this MVP
- Spawning prioritizes readability, determinism, and debuggability over realism

The goal is to create reliable moving obstacles, not intelligent traffic.

---

# Tasks

## Core

- [x] Create `TrafficManager`
- [x] Add deterministic NPC traffic vehicles
- [x] Spawn traffic from lane centers
- [x] Move traffic at constant speed
- [x] Prevent impossible spawn overlaps
- [x] Integrate traffic update lifecycle into the game loop
- [x] Despawn traffic that has moved behind the player
- [x] Detect player-to-traffic collisions
- [x] Trigger damaged state when the player hits traffic

## Visual

- [x] Render traffic vehicles distinctly from the player
- [x] Keep the dark simulation-lab visual direction
- [x] Add traffic debug lane labels
- [x] Add active traffic visibility through the overlay
- [x] Add spawn-line debug visualization

## Technical

- [x] Keep traffic controls independent from keyboard input
- [x] Keep movement deterministic where practical
- [x] Reuse existing collision geometry utilities
- [x] Avoid traffic-specific rendering dependencies in simulation logic
- [x] Keep the implementation small and composable

---

# Acceptance Criteria

This MVP is complete when:

- Traffic vehicles appear ahead of the player on lane centers
- Traffic vehicles move forward at a constant speed
- Traffic spawning avoids impossible immediate overlaps
- The player can drive around or collide with traffic
- Player-to-traffic collisions damage the player vehicle
- Existing road-boundary collision logic still works
- Traffic updates and renders as part of the normal simulation lifecycle
- Traffic density is easy to tune through simple constants
- The simulation remains readable and debuggable
- The project is ready for future sensor and AI traffic interaction

---

# Debug Visualization

Useful optional debug visuals:

- Traffic collision polygons
- Traffic lane labels
- Spawn line position
- Active traffic count
- Player damaged state
- Collision point display

Debug visuals should help answer:

```txt
What traffic exists ahead of the player, and why did a crash happen?
```

---

# Performance Considerations

- Keep traffic spacing deterministic and fixed-size
- Reuse the `Car` polygon structure already in place
- Avoid unnecessary allocations in the traffic update loop
- Cull traffic behind the player to keep active counts bounded
- Keep collision checks limited to player-vs-traffic for this MVP

Performance target:

```txt
Stable 60 FPS with active traffic and collision debug enabled.
```

---

# Risks

- Traffic density becoming unfair or visually cluttered
- Spawn spacing producing accidental overlaps
- Player-to-traffic collisions missing at higher relative speeds
- Traffic logic drifting toward premature AI behavior
- Mixing spawn/render logic with simulation state
- Traffic becoming too random or too predictable

---

# Out of Scope

This MVP should NOT include:

- Lane-changing traffic
- Traffic acceleration/deceleration
- Overtaking behavior
- Traffic AI decision making
- Sensors
- Neural networks
- Population systems
- Procedural traffic wave generation
- Traffic lights
- Intersections
- Pedestrians

---

# Future Improvements

- Traffic speed variants by lane
- Better density balancing rules
- Sensor-visible traffic tagging
- Multi-car AI training scenarios
- Traffic pooling if active counts grow later

---

# Dependencies

- MVP 02 — Highway Rendering
- MVP 03 — Vehicle Physics & Controls
- MVP 04 — Collision System

---

# Deliverables

- Shared traffic-enabled highway simulation
- Deterministic moving obstacles
- Working player-vs-traffic collision detection
- Updated roadmap documentation
- A stronger foundation for sensor and AI systems
