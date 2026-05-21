

# MVP 11 — Simulation Controls

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
[→] MVP 12 — Visual Polish Pass
[ ] MVP 13 — Replay System
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

Add explicit simulation controls so training and experimentation can be managed without changing code.

This MVP turns NeuroDriveCar from a mostly passive simulation into an interactive training tool.

The player/user should experience:

- Ability to pause and resume the simulation
- Ability to restart a run or generation
- Ability to adjust population size
- Ability to adjust mutation rate
- Ability to adjust simulation speed
- Clear visibility into current simulation settings

The technical milestone is:

- Simulation control state
- Controlled restart flow
- Speed multiplier support
- Population size selection
- Mutation rate selection
- Minimal control interface
- HUD/control integration without breaking the simulation architecture

This MVP matters because iterative training needs fast experimentation.

The user should be able to tune and restart runs quickly without editing source files.

---

# Summary

```txt
Implement pause/resume, restart, simulation speed, population size,
and mutation-rate controls so AI training can be managed interactively.
```

---

# Features

- Pause/resume simulation
- Restart current run/generation
- Simulation speed multiplier
- Population size control
- Mutation rate control
- Display current control settings
- Safe interaction with brain persistence
- Minimal UI or keyboard controls
- Clear training workflow controls

---

# Technical Scope

Create or extend the following systems:

- Simulation control state
- Pause/resume handling
- Restart/generation reset flow
- Speed multiplier support
- Population configuration
- Mutation configuration
- HUD/control status display
- Minimal input/control interface

Expected files involved:

```txt
src/
  game/
    Game.ts
    Loop.ts
  population/
    PopulationManager.ts
  ai/
    mutation.ts
  ui/
    Hud.ts
    ControlsPanel.ts
  utils/
    storage.ts
```

Potential concepts introduced:

- paused state
- speed multiplier
- generation reset
- selected population size
- selected mutation rate
- training settings
- control panel
- keyboard shortcuts
- UI event handling

---

# Architecture Notes

- Simulation controls should modify high-level simulation state, not low-level car internals directly
- Pause/resume should stop updates, not rendering if HUD feedback is useful
- Speed multiplier should affect simulation updates consistently
- Restart should create a clean population without refreshing the browser
- Population size should be applied during generation creation, not mid-update unpredictably
- Mutation rate should be passed explicitly to brain mutation logic
- UI/control logic should not own simulation entities
- Avoid building a large UI framework in this MVP
- Keep keyboard shortcuts and/or minimal DOM controls simple and explicit

The controls are orchestration tools.

They should not become the simulation engine.

---

# Tasks

## Simulation State

- [x] Add paused/running state
- [x] Add simulation speed multiplier
- [x] Add generation/run restart flow
- [x] Add selected population size setting
- [x] Add selected mutation rate setting
- [x] Keep settings centralized and readable

## Controls / Interaction

- [x] Add pause/resume control
- [x] Add restart generation control
- [x] Add population size selector or shortcut
- [x] Add mutation rate selector or shortcut
- [x] Add speed multiplier selector or shortcut
- [x] Keep controls discoverable in HUD or minimal panel

## Population Integration

- [x] Ensure restart recreates population cleanly
- [x] Ensure population size setting affects new populations
- [x] Ensure mutation rate setting affects seeded/mutated populations
- [x] Ensure saved-brain seeding from MVP 10 still works
- [x] Preserve best-car selection after restart

## HUD / Visual

- [x] Show pause/running state
- [x] Show current simulation speed
- [x] Show current population size
- [x] Show current mutation rate
- [x] Show generation/run count if available
- [x] Show short feedback after restart/save/load if applicable

## Technical

- [x] Keep update/render separated
- [x] Avoid changing population during iteration in unsafe ways
- [x] Avoid hidden global state where possible
- [x] Avoid overcomplicating UI controls
- [x] Ensure app remains keyboard/mouse friendly

---

# Acceptance Criteria

This MVP is complete when:

- Simulation can be paused and resumed
- Paused simulation stops world updates reliably
- Simulation can be restarted without page refresh
- Population size can be changed for new runs
- Mutation rate can be changed for new runs
- Simulation speed can be changed
- HUD or control panel displays current settings
- Existing brain persistence continues working
- Existing population training continues working
- Existing sensors, traffic, collisions, neural visualizer, and AI behavior continue working
- Simulation remains stable after multiple restarts

---

# Debug Visualization

Useful debug/control information:

- Running/paused state
- Simulation speed
- Population size
- Mutation rate
- Generation/run number
- Saved brain status
- Population source: random/saved
- Last control action feedback

Debug/control information should help answer:

```txt
What settings is this training run using?
```

and:

```txt
Can I restart/tune the simulation without editing code?
```

---

# Performance Considerations

- Pause should reduce update work
- Speed multiplier should not create unstable physics if set too high
- Population changes should happen only on restart/new generation
- UI controls should not trigger expensive work every frame
- Keep speed options bounded initially

Suggested initial speed options:

```txt
0x / paused
1x
2x
5x
```

Suggested initial population options:

```txt
1
5
10
25
50
```

Suggested initial mutation options:

```txt
0.05
0.10
0.20
0.40
```

---

# Risks

- Speed multiplier destabilizes physics
- Pause stops rendering and hides status feedback
- Restart leaks event listeners or stale references
- Population is changed mid-loop and causes inconsistent state
- Mutation rate control does not actually affect population generation
- UI state becomes duplicated across Game, HUD, and PopulationManager
- Controls panel becomes too complex too early

---

# Out of Scope

This MVP should NOT include:

- Full analytics dashboard
- Replay system
- Scenario editor
- Advanced training history
- Cloud persistence
- Export/import controls
- Multiple saved brains
- Complex UI framework
- Mobile-first control design
- Advanced keyboard remapping

This MVP is about basic interactive simulation management only.

---

# Future Improvements

- Rich control panel
- Keyboard shortcut reference
- Training presets
- Named experiments
- Advanced mutation controls
- Generation history
- Fitness charts
- Automatic restart on all cars crashed
- Auto-save best brain
- Mobile-friendly controls

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

This MVP depends on:

- Working game loop
- Working population manager
- Working brain persistence
- Working mutation flow
- Working HUD/status display
- Stable AI training loop

---

# Deliverables

- Pause/resume control
- Restart generation/run control
- Simulation speed control
- Population size control
- Mutation rate control
- HUD/control status display
- Safe restart flow
- Updated documentation if implementation decisions change

---

# Notes

This MVP makes the training loop usable.

Before this MVP, the simulation can learn only through code changes and manual refreshes.

After this MVP, the user should be able to experiment directly:

```txt
change settings → restart → observe → save best → mutate → repeat
```

The controls should stay simple.

The goal is not a polished dashboard yet.

The goal is practical control over the training loop.
