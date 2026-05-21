

# TASK 01 — Traffic Tuning Controls

Status:

```txt
Completed
```

---

# Goal

Add explicit traffic difficulty controls so AI training can progress through manageable scenarios without changing source code.

The current training loop has controls for population, mutation, persistence, and simulation speed, but traffic difficulty is still effectively fixed.

This makes training harder to tune because the environment can become either:

```txt
Too easy → cars learn to drive straight forever
```

or:

```txt
Too hard → cars attempt avoidance and crash immediately
```

This task introduces configurable traffic settings so the AI can be trained with a curriculum:

```txt
road only → sparse traffic → normal traffic → dense traffic
```

---

# Why This Matters

Traffic is now part of the learning environment.

If traffic is not configurable, then it becomes difficult to know whether poor AI performance is caused by:

- bad sensors
- bad neural outputs
- bad fitness scoring
- excessive mutation
- overly aggressive steering
- traffic that is too difficult too early

Traffic tuning gives the simulation a controlled difficulty curve.

---

# Scope

This task should add configurable traffic behavior, not a new traffic AI system.

The goal is to expose simple training controls for existing traffic.

---

# Features

- Enable/disable traffic
- Select traffic density
- Select training traffic phase
- Configure traffic speed preset
- Configure spawn distance preset
- Display current traffic settings in HUD/control panel
- Apply traffic changes safely on restart/new generation

---

# Suggested Settings

## Traffic Enabled

```txt
true / false
```

---

## Traffic Density

```txt
none
sparse
normal
dense
```

Suggested meaning:

```txt
none   → no traffic vehicles
sparse → few vehicles, large gaps
normal → current expected training density
dense  → more vehicles, smaller gaps
```

---

## Training Phase

```txt
road-only
sparse-traffic
normal-traffic
dense-traffic
```

Suggested behavior:

```txt
road-only      → traffic disabled
sparse-traffic → sparse traffic, far spawn distance
normal-traffic → normal traffic, medium spawn distance
dense-traffic  → dense traffic, medium/near spawn distance
```

---

## Traffic Speed Preset

```txt
slow
normal
fast
```

Suggested behavior:

```txt
slow   → easier obstacle timing
normal → current baseline traffic speed
fast   → more difficult closing scenarios
```

---

## Spawn Distance Preset

```txt
far
medium
near
```

Suggested behavior:

```txt
far    → easier, more time to react
medium → standard challenge
near   → harder, less reaction time
```

---

# Technical Scope

Expected files involved:

```txt
src/
  traffic/
    TrafficManager.ts
  game/
    Game.ts
  population/
    PopulationManager.ts
  ui/
    Hud.ts
    ControlsPanel.ts
  utils/
    storage.ts
```

Potential concepts introduced:

- `TrafficSettings`
- `TrafficDensity`
- `TrafficPhase`
- `TrafficSpeedPreset`
- `TrafficSpawnDistancePreset`
- traffic settings state
- traffic configuration presets
- safe traffic rebuild on restart

---

# Architecture Notes

- Traffic settings should be centralized and explicit
- Traffic changes should apply on restart/new generation, not unpredictably mid-update
- TrafficManager should receive settings instead of reading UI state directly
- HUD/ControlsPanel should display and update settings, but not own traffic entities
- PopulationManager should remain focused on cars/brains, not traffic rules
- Traffic difficulty should remain deterministic where practical
- Avoid introducing lane-changing, overtaking, or traffic intelligence in this task

The task is about training environment control.

It is not about making traffic smarter.

---

# Tasks

## Settings Model

- [ ] Define traffic settings type/interface
- [ ] Define traffic density options
- [ ] Define traffic phase options
- [ ] Define speed preset options
- [ ] Define spawn distance preset options
- [ ] Create default traffic settings

## TrafficManager Integration

- [ ] Update TrafficManager to accept traffic settings
- [ ] Support traffic disabled mode
- [ ] Map density presets to vehicle count/spacing
- [ ] Map speed presets to traffic speeds
- [ ] Map spawn distance presets to initial placement
- [ ] Ensure traffic generation avoids impossible overlaps

## Training Phase Integration

- [ ] Add phase presets
- [ ] `road-only` disables traffic
- [ ] `sparse-traffic` creates sparse/far traffic
- [ ] `normal-traffic` creates baseline traffic
- [ ] `dense-traffic` creates denser traffic
- [ ] Keep phase behavior simple and explicit

## Controls / HUD

- [ ] Add traffic settings to control panel or keyboard-accessible controls
- [ ] Show current traffic phase
- [ ] Show current traffic density
- [ ] Show traffic enabled/disabled
- [ ] Show speed/spawn preset if practical
- [ ] Show note that changes apply on restart/new generation if needed

## Restart / Generation Flow

- [ ] Apply traffic changes safely during restart/new generation
- [ ] Ensure population restart rebuilds traffic consistently
- [ ] Avoid modifying active traffic list mid-iteration unsafely
- [ ] Preserve existing brain persistence behavior
- [ ] Preserve existing mutation and population controls

## Technical Safety

- [ ] Keep existing sensors working with all traffic settings
- [ ] Keep existing collisions working with all traffic settings
- [ ] Keep existing HUD/neural visualizer working
- [ ] Ensure no-traffic mode does not break sensor updates
- [ ] Ensure dense mode remains performant

---

# Acceptance Criteria

This task is complete when:

- Traffic can be disabled
- Sparse traffic mode works
- Normal traffic mode works
- Dense traffic mode works
- Traffic phase can be selected
- Traffic speed preset can be selected or configured
- Spawn distance preset can be selected or configured
- HUD/control panel shows current traffic settings
- Changes apply safely on restart/new generation
- No-traffic mode does not crash sensors or AI logic
- Existing population training still works
- Existing brain persistence still works
- Existing simulation speed/population/mutation controls still work

---

# Out of Scope

This task should NOT include:

- Lane-changing traffic
- Traffic overtaking
- Traffic acceleration/deceleration
- Traffic AI decision making
- Traffic lights
- Intersections
- Pedestrians
- Curved roads
- Replay system
- Analytics dashboard
- New neural network architecture
- Sensor redesign

---

# Risks

- Traffic settings become duplicated across Game, ControlsPanel, and TrafficManager
- Traffic changes apply mid-loop and create inconsistent state
- No-traffic mode breaks sensor assumptions
- Dense mode causes performance issues
- Phase presets become too clever or hidden
- Controls panel becomes cluttered
- Traffic difficulty changes make previous saved brains hard to compare

---

# Debug / UX Notes

The user should always be able to answer:

```txt
What traffic difficulty am I training against?
```

Recommended HUD/control display:

```txt
Traffic Phase: sparse-traffic
Traffic: enabled
Density: sparse
Speed: normal
Spawn: far
```

If settings only apply after restart, make that clear:

```txt
Traffic changes apply on next restart/generation.
```

---

# Future Improvements

- Auto-curriculum progression
- Traffic scenario presets
- Safe gap generation
- Randomized but seeded traffic layouts
- Per-lane density controls
- Traffic replay comparison
- Traffic difficulty score
- Scenario-based saved brains

---

# Deliverables

- Traffic settings model
- TrafficManager settings integration
- Traffic phase presets
- UI/HUD traffic setting display
- Safe restart/new-generation application
- Stable no-traffic/sparse/normal/dense modes

---

# Notes

This task should make the training loop easier to reason about.

The desired workflow is:

```txt
Train road-only until stable
Train sparse traffic until basic avoidance appears
Train normal traffic for real behavior
Train dense traffic for stress testing
```

Traffic difficulty should become a controllable part of the experiment, not a hidden constant.
