# MVP 12 — Visual Polish Pass

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
[✓] MVP 06 — Sensor System
[✓] MVP 07 — Neural Network Driving
[✓] MVP 08 — Neural Visualizer & HUD
[✓] MVP 09 — Population Training
[✓] MVP 10 — Brain Persistence
[✓] MVP 11 — Simulation Controls
[✓] MVP 12 — Visual Polish Pass
[ ] MVP 13 — Replay System
[ ] MVP 14 — Curved Roads
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

Improve the visual clarity, readability, and overall feel of NeuroDriveCar without changing the core simulation behavior.

This MVP turns the project from a functional AI simulation into a more polished and presentable driving lab.

The player/user should experience:

- Cleaner road visuals
- More readable vehicles
- Better contrast between player, traffic, and AI population
- Less visual clutter during population training
- A more cohesive AI laboratory aesthetic
- HUD and neural visualizer refinements
- A simulation that feels intentional instead of prototype-like

The technical milestone is:

- Visual styling pass across the main render systems
- Consistent color and spacing decisions
- Improved draw ordering
- Better opacity rules for population rendering
- Refined debug visualization readability
- Non-invasive polish that preserves simulation correctness

This MVP matters because the project now has enough systems that readability becomes part of usability.

The goal is not to add new simulation features.

The goal is to make the existing simulation easier and more pleasant to understand.

---

# Summary

```txt
Refine the visual presentation of the road, vehicles, sensors, HUD,
neural visualizer, and population rendering while preserving existing
simulation behavior and architecture.
```

---

# Features

- Improved road rendering
- Better vehicle styling
- Cleaner traffic visuals
- Better best-car highlighting
- Reduced population visual clutter
- Refined sensor rendering
- Improved HUD readability
- Improved neural visualizer readability
- More cohesive dark AI-lab aesthetic
- Better draw order and layering

---

# Technical Scope

Create or extend the following systems:

- Visual constants/theme file if useful
- Road rendering styles
- Vehicle rendering styles
- Traffic rendering styles
- Population opacity/highlight rules
- Sensor visual styling
- HUD layout/style refinements
- Neural visualizer style refinements
- Debug rendering toggles if useful

Expected files involved:

```txt
src/
  world/
    Road.ts
  car/
    Car.ts
  traffic/
    TrafficManager.ts
  population/
    PopulationManager.ts
  sensors/
    Sensor.ts
  ui/
    Hud.ts
    NeuralVisualizer.ts
    ControlsPanel.ts
  utils/
    visualTheme.ts
```

Potential concepts introduced:

- visual theme
- semantic colors
- opacity levels
- highlight styles
- panel spacing
- debug visibility modes
- draw order
- visual hierarchy

---

# Architecture Notes

- Visual polish must not change core simulation logic
- Rendering changes should remain Canvas-based
- Styling constants should be centralized if repeated
- Debug visualization should remain readable, not decorative
- Population rendering should prioritize the best car
- Sensor rendering should not obscure the road or vehicles
- HUD and visualizer should remain observability tools
- Avoid adding new dependencies
- Avoid changing physics, AI, collision, or training behavior unless fixing visual-only bugs

This MVP is a presentation layer improvement.

It should not become a gameplay feature expansion.

---

# Tasks

## Road Visuals

- [x] Improve road background contrast
- [x] Refine lane separator styling
- [x] Refine road border styling
- [x] Add subtle depth or layering without hurting readability
- [x] Ensure road visuals remain stable during camera movement

## Vehicle Visuals

- [x] Improve player/best-car styling
- [x] Improve traffic vehicle styling
- [x] Improve damaged vehicle styling
- [x] Make vehicle direction easier to read
- [x] Ensure vehicles remain readable against road background

## Population Visuals

- [x] Render non-best AI cars with reduced opacity
- [x] Make best car clearly visible
- [x] Reduce clutter from crashed vehicles
- [x] Ensure sensors are shown only for the best/selected car
- [x] Ensure population rendering remains performant

## Sensor Visuals

- [x] Refine free-ray and detected-ray colors/opacities
- [x] Make intersections easier to see if enabled
- [x] Avoid hiding lane markings with sensors
- [x] Keep sensor rendering lightweight

## HUD / Neural Visualizer

- [x] Improve HUD spacing and typography
- [x] Improve panel contrast
- [x] Improve neural node readability
- [x] Improve neural connection readability
- [x] Improve control/status labels
- [x] Keep HUD readable at common desktop resolutions

## Technical

- [x] Centralize repeated colors/sizes if practical
- [x] Preserve existing public APIs where possible
- [x] Avoid breaking persistence, controls, and population flow
- [x] Confirm no simulation behavior changes were introduced accidentally

---

# Acceptance Criteria

This MVP is complete when:

- Simulation looks visually cleaner and more cohesive
- Road, vehicles, sensors, HUD, and visualizer are easier to read
- Best car is immediately identifiable
- Population rendering is less visually noisy
- Debug visuals remain useful
- Existing simulation controls still work
- Existing brain persistence still works
- Existing population training still works
- Existing traffic, sensors, collisions, and AI behavior still work
- No major simulation logic changes were introduced
- Simulation remains stable at target performance

---

# Debug Visualization

Useful visual/debug improvements:

- Cleaner sensor ray colors
- Clear best-car highlight
- Better damaged state indication
- Optional debug mode distinction
- Less clutter from inactive cars
- Clear HUD text hierarchy
- Better neural activation readability

Debug visuals should help answer:

```txt
What is happening right now?
```

without overwhelming the user visually.

---

# Performance Considerations

- Avoid expensive gradients or shadows if they hurt performance
- Avoid heavy per-car effects in population mode
- Keep opacity and simple shapes cheap
- Avoid recalculating static layout unnecessarily
- Avoid adding visual polish that reduces simulation capacity

Performance target:

```txt
Maintain stable performance with population training enabled.
```

---

# Risks

- Visual polish accidentally changes simulation behavior
- Too many effects reduce performance
- Debug visuals become decorative instead of useful
- HUD becomes visually heavier than the simulation
- Best-car highlight becomes too subtle
- Population rendering remains cluttered
- Theme constants become overengineered too early

---

# Out of Scope

This MVP should NOT include:

- New physics behavior
- New AI behavior
- New traffic behavior
- Replay system
- Curved roads
- Sprites or external art assets
- Particle systems
- Weather effects
- Day/night cycle
- Full responsive redesign
- Major UI framework

This MVP is polish, not feature expansion.

---

# Future Improvements

- Sprite-based vehicles
- Motion trails
- Better crash feedback
- Optional particle effects
- Light/dark visual themes
- Responsive HUD layout
- Minimap
- Replay overlays
- Training analytics charts
- Exportable screenshots

---

# Dependencies

Required:

- MVP 01 — Foundation
- MVP 02 — Highway Rendering
- MVP 03 — Vehicle Physics & Controls
- MVP 04 — Collision System
- MVP 05 — Traffic Simulation
- MVP 06 — Sensor System
- MVP 07 — Neural Network Driving
- MVP 08 — Neural Visualizer & HUD
- MVP 09 — Population Training
- MVP 10 — Brain Persistence
- MVP 11 — Simulation Controls

This MVP depends on:

- Stable rendering loop
- Working road rendering
- Working vehicle rendering
- Working sensors
- Working HUD
- Working neural visualizer
- Working population rendering
- Working simulation controls

---

# Deliverables

- Refined visual style
- Improved road visuals
- Improved vehicle visuals
- Improved sensor visuals
- Improved HUD readability
- Improved neural visualizer readability
- Better population rendering hierarchy
- Updated documentation if implementation decisions change

---

# Notes

This MVP should make the project feel more intentional.

The goal is not realism.

The goal is clarity, polish, and presentation.

The simulation should feel like:

```txt
A clean AI driving laboratory.
```

not:

```txt
A rough debugging prototype.
```

Do not sacrifice simulation correctness for aesthetics.
