

# MVP 09 — Population Training

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
[→] MVP 09 — Population Training
[ ] MVP 10 — Brain Persistence
[ ] MVP 11 — Simulation Controls
[ ] MVP 12 — Visual Polish Pass
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

Introduce multiple simultaneous AI-controlled vehicles and the first evolutionary training loop.

This MVP turns NeuroDriveCar from a single autonomous vehicle demo into an evolutionary simulation.

The player/user should experience:

- Many AI vehicles starting from the same position
- Each vehicle using its own neural brain
- Vehicles crashing and becoming inactive
- The best-performing vehicle being highlighted
- The camera following the best surviving vehicle
- A visible sense of selection and survival

The technical milestone is:

- AI population creation
- Multiple brain instances
- Best-agent selection
- Fitness based on distance/survival
- Population update/render lifecycle
- Mutation-ready brain structure
- Camera tracking of the current best vehicle

This MVP matters because it introduces the core loop of the project:

```txt
create many agents → let them drive → identify the best performer
```

Mutation and persistence can be refined later.

At this stage, the important part is making population behavior visible and stable.

---

# Summary

```txt
Implement a population of AI-controlled vehicles that run simultaneously,
select the best-performing car based on progress, deactivate crashed cars,
and visually highlight the best agent during the simulation.
```

---

# Features

- Multiple AI-controlled cars
- Independent neural brains per car
- Shared starting position
- Best-car selection
- Camera follows best car
- Crashed cars become inactive
- Best car visual highlight
- Alive/dead population count
- Basic fitness/progress tracking
- Population-ready architecture for later mutation and persistence

---

# Technical Scope

Create or extend the following systems:

- `PopulationManager` or equivalent
- AI car population generation
- Brain cloning/randomization strategy
- Best-car selection logic
- Population update lifecycle
- Population render lifecycle
- Fitness/progress calculation
- Camera target switching
- HUD integration for population stats

Expected files involved:

```txt
src/
  ai/
    Brain.ts
    NeuralNetwork.ts
    mutation.ts
  car/
    Car.ts
  population/
    PopulationManager.ts
  game/
    Game.ts
    Camera.ts
  ui/
    Hud.ts
    NeuralVisualizer.ts
```

Potential concepts introduced:

- population size
- agent index
- best agent
- alive count
- fitness
- generation
- brain clone
- mutation rate placeholder
- inactive/damaged agents
- best distance

---

# Architecture Notes

- Population management should not be embedded directly inside `Car`
- Each AI car should remain a normal simulation entity
- Best-car selection should use world-space progress
- Camera should follow the selected best car, not the population manager itself
- HUD should read population stats without mutating simulation state
- Neural visualizer should show the best car brain by default
- Population logic should remain independent from rendering where practical
- Avoid implementing persistent save/load in this MVP
- Avoid overengineering genetic algorithms too early

The population system coordinates agents.

It should not become a hidden game engine.

---

# Tasks

## Core

- [ ] Create `PopulationManager` or equivalent coordination system
- [ ] Generate multiple AI-controlled vehicles
- [ ] Ensure all AI vehicles start from the same initial position
- [ ] Give each AI vehicle an independent brain
- [ ] Update all active vehicles each frame
- [ ] Stop updating damaged/dead vehicles where appropriate
- [ ] Select current best vehicle based on progress
- [ ] Make camera follow the best vehicle

## Fitness / Selection

- [ ] Define basic progress metric
- [ ] Suggested metric: farthest distance along the highway
- [ ] Track best distance
- [ ] Track alive count
- [ ] Track crashed/inactive count
- [ ] Keep selection deterministic and simple

## Visual

- [ ] Render non-best AI vehicles with lower opacity
- [ ] Render best vehicle clearly highlighted
- [ ] Ensure crashed cars do not visually dominate the screen
- [ ] Keep sensor visualization focused on the best car
- [ ] Keep neural visualizer focused on the best car brain

## HUD / Debug

- [ ] Show population size
- [ ] Show alive count
- [ ] Show best distance/progress
- [ ] Show current best car index if useful
- [ ] Show generation number as placeholder if useful

## Technical

- [ ] Keep population update/render separated
- [ ] Avoid unnecessary allocations inside population loops
- [ ] Keep brain data future-compatible with mutation and persistence
- [ ] Ensure existing single-car mode is not unnecessarily broken
- [ ] Keep traffic, sensors, collisions, and AI behavior working

---

# Acceptance Criteria

This MVP is complete when:

- Multiple AI cars can run simultaneously
- Each car has its own brain
- Cars can crash independently
- Crashed cars become inactive or stop affecting best selection
- The best-performing car is selected correctly
- The best car is visually highlighted
- Camera follows the current best car
- HUD shows useful population information
- Neural visualizer reflects the best car brain/state
- Existing traffic, sensors, collisions, and AI control continue working
- Simulation remains stable with a modest population size

---

# Debug Visualization

Useful debug visuals:

- Best car marker
- Alive/dead count
- Best distance
- Current best index
- Population size
- Optional ghost opacity for non-best cars
- Optional labels for agent index

Debug visuals should help answer:

```txt
Which car is winning?
```

and:

```txt
How many agents are still alive?
```

---

# Performance Considerations

- Start with modest population sizes
- Suggested initial population sizes: 5, 10, 25, 50
- Avoid rendering full debug details for every car
- Prefer rendering sensors only for the best car
- Prefer rendering neural visualizer only for the best car
- Avoid unnecessary brain/network allocations every frame

Performance target:

```txt
Stable simulation with at least 25 AI cars on a normal desktop browser.
```

Stretch target:

```txt
Stable simulation with 50 AI cars if rendering remains lightweight.
```

---

# Risks

- Population rendering becomes visually noisy
- Performance drops due to sensor/raycast checks for many cars
- Best-car selection changes too frequently and causes camera jitter
- HUD becomes cluttered
- Neural visualizer accidentally tracks the wrong car
- Population manager becomes too coupled to rendering
- Mutation/persistence logic sneaks in too early

---

# Out of Scope

This MVP should NOT include:

- Brain save/load
- localStorage persistence
- Full mutation refinement
- Genetic selection strategies
- Reproduction/crossover
- Training history charts
- Simulation speed controls
- Replay system
- Scenario editor
- Advanced analytics

This MVP is about simultaneous population simulation and best-agent selection only.

---

# Future Improvements

- Brain persistence
- Mutation rate controls
- Generation reset flow
- Best-brain cloning
- Population size controls
- Simulation speed controls
- Fitness scoring beyond distance
- Training analytics
- Ghost replay of best run
- Evolution history tracking

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

This MVP depends on:

- Stable game loop
- Working AI-controlled vehicle
- Working sensors
- Working collisions
- Working traffic
- Working neural network inference
- Working HUD and neural visualizer
- Camera follow system

---

# Deliverables

- AI population manager
- Multiple simultaneous AI cars
- Independent brains per vehicle
- Best-car selection
- Best-car camera follow
- Population HUD stats
- Best-car neural visualization
- Updated documentation if implementation decisions change

---

# Notes

This MVP is where the project begins to feel like an evolutionary AI simulation.

The vehicles do not need to improve yet.

The key milestone is seeing many agents attempt the same challenge at once.

The desired feeling is:

```txt
Many bad drivers enter. One survives longer.
```

Once that is stable, the next MVP can focus on saving, cloning, and mutating the best brain.
