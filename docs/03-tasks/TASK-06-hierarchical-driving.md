

# TASK 06 — Lane-Following Controller & Curriculum Training

Status:

```txt
Completed
```

---

# Goal

Refactor the driving architecture so the neural network is no longer responsible for every low-level driving behavior simultaneously.

The current system expects the AI to learn:

```txt
acceleration
steering
lane centering
heading correction
obstacle avoidance
lane recovery
stabilization
```

all directly from raw outputs.

This has made the search space too large and unstable.

The goal of this task is to introduce:

- a stable low-level lane-following controller,
- hierarchical driving responsibilities,
- tactical vs physical separation,
- and curriculum-based training progression.

This task is a major architecture evolution.

---

# Why This Matters

Current observations:

```txt
The AI can react,
but it cannot consistently stabilize.
```

Even with:

- more sensors,
- more neural inputs,
- steering smoothing,
- fitness tuning,
- and heuristic scaffolding,

no consistently viable neural driver emerges.

The problem is no longer raw perception.

The problem is architectural.

The neural network is currently trying to learn:

```txt
vehicle control physics
+ lane stabilization
+ tactical navigation
+ obstacle avoidance
```

at the same time.

This task separates:

```txt
HIGH LEVEL DECISIONS
from
LOW LEVEL CONTROL
```

which dramatically reduces the learning burden.

---

# Scope

This task includes:

- lane-following controller,
- target lane abstraction,
- hierarchical driving responsibilities,
- curriculum training phases,
- tactical neural outputs,
- stable steering translation,
- and training progression rules.

This task does NOT include:

- full pathfinding,
- city navigation,
- reinforcement learning,
- RNN/LSTM,
- large hidden-layer expansion,
- or replacing the neural network entirely.

---

# Architecture Shift

## Current Architecture

Currently:

```txt
inputs → neural network → raw steering outputs
```

The AI directly controls steering behavior.

This creates instability because the network must learn:

```txt
micro-correction
heading stabilization
lane centering
edge recovery
```

implicitly.

---

## New Architecture

Target structure:

```txt
WORLD STATE
    ↓
TACTICAL AI
    ↓
DRIVING INTENT
    ↓
LANE-FOLLOWING CONTROLLER
    ↓
PHYSICAL VEHICLE CONTROL
```

This task introduces the missing middle layers.

---

# Part A — Lane-Following Controller

## Goal

Create a robust low-level controller responsible for:

```txt
keeping the vehicle stable inside a target lane
```

This controller should exist independently from neural AI.

It becomes the translation layer between:

```txt
desired lane behavior
```

and:

```txt
actual steering output
```

---

# Responsibilities

The controller should handle:

- lane centering,
- heading correction,
- steering smoothing,
- edge avoidance,
- steering stabilization,
- and lane-target convergence.

The controller should NOT decide:

- tactical route,
- overtaking strategy,
- traffic planning,
- or long-term navigation.

---

# Suggested Inputs

The controller may use:

```txt
laneCenterOffsetNormalized
headingErrorNormalized
edgeProximity
currentLaneCenterX
vehicleHeading
vehicleX
vehicleY
```

Use existing normalized signals where practical.

---

# Suggested Control Logic

Keep implementation lightweight.

Suggested conceptual model:

```txt
steerCorrection =
  laneOffsetCorrection
+ headingCorrection
+ edgeCorrection
```

Potential implementation style:

```txt
PID-lite
weighted correction
blended steering controller
```

Do NOT introduce:

- physics engine,
- complex control framework,
- or heavy PID tuning infrastructure.

---

# Controller Output

Controller should produce:

```txt
continuous steering value
```

Example:

```txt
steer ∈ [-1, 1]
```

The controller owns:

```txt
smooth steering behavior
```

instead of the neural network.

---

# Part B — Tactical AI Outputs

## Goal

The neural network should stop controlling raw wheel behavior directly.

Instead, it should make:

```txt
high-level tactical decisions
```

---

# Replace Raw Steering Outputs

Current likely outputs:

```txt
left
right
forward
reverse
```

These are too low-level.

Suggested tactical outputs:

```txt
keep-lane
prefer-left
prefer-right
slow-down
```

or:

```txt
targetLaneDelta
preferredSpeed
```

Example:

```txt
-1 → move left
 0 → keep lane
+1 → move right
```

The controller then converts this into stable steering.

---

# Tactical vs Physical Separation

Neural AI decides:

```txt
What should I try to do?
```

Controller decides:

```txt
How do I physically stabilize that?
```

This is the key architecture change.

---

# Part C — Target Lane System

## Goal

Introduce an explicit target lane abstraction.

Current AI implicitly tries to:

```txt
steer somewhere useful
```

Instead, the system should reason as:

```txt
I want to be in lane X
```

---

# Required Concepts

Suggested state:

```ts
interface LaneIntent {
  currentLane: number;
  targetLane: number;
  laneChangeProgress: number;
}
```

Keep this lightweight.

---

# Lane Change Rules

The system should:

```txt
choose target lane
→ converge toward lane center
→ stabilize
```

The lane-following controller performs the physical correction.

---

# Important Constraint

This is NOT a pathfinding system.

Do NOT implement:

```txt
multi-step route planning
map navigation
complex traffic strategy
```

This is still a highway lane simulation.

---

# Part D — Curriculum Training

## Goal

Formalize progressive training difficulty.

Currently the system allows:

```txt
dense traffic from generation 1
```

This makes learning unstable.

---

# Curriculum Phases

Introduce explicit phases:

```txt
Phase 1 → road-only
Phase 2 → sparse traffic
Phase 3 → normal traffic
Phase 4 → dense traffic
```

Potential optional future:

```txt
Phase 5 → mixed/randomized
```

---

# Advancement Rules

Training should advance only when:

```txt
survival
fitness
stability
or recovery quality
```

reach thresholds.

Example:

```txt
average survival > threshold
best fitness > threshold
lane stability > threshold
```

Keep thresholds configurable.

---

# Curriculum State

Suggested structure:

```ts
interface CurriculumState {
  currentPhase: string;
  unlockedPhases: string[];
  generationProgress: number;
}
```

Keep it lightweight.

---

# Part E — Baseline Requirements

## Goal

Prevent neural training on fundamentally unstable environments.

New rule:

```txt
If heuristic baseline is not viable,
AI training should not be considered valid.
```

This acts as a simulation sanity check.

---

# Baseline Expectations

The heuristic driver should:

```txt
survive indefinitely in road-only
perform reasonably in sparse traffic
stay inside road bounds
recover after lane changes
```

Only then should neural AI progression matter.

---

# Part F — HUD & Diagnostics

## Goal

Expose architecture layers clearly.

Useful diagnostics:

```txt
Driver Mode
Current Lane
Target Lane
Lane Change Progress
Controller Steer
Tactical Output
Preferred Speed
Curriculum Phase
Phase Stability
```

Keep HUD compact.

Advanced diagnostics should remain toggleable.

---

# Part G — Validation

The system should now answer:

```txt
Is the controller stable?
```

separately from:

```txt
Is the tactical AI intelligent?
```

This separation is critical.

---

# Technical Scope

Expected files involved:

```txt
src/
  ai/
    Brain.ts
    NeuralNetwork.ts
    TacticalDriver.ts
  controller/
    LaneFollowingController.ts
    SteeringController.ts
  drivers/
    HeuristicDriver.ts
    DriverMode.ts
  world/
    Road.ts
    Lane.ts
  car/
    Car.ts
    Controls.ts
  population/
    PopulationManager.ts
  training/
    CurriculumManager.ts
  ui/
    Hud.ts
    ControlsPanel.ts
  utils/
    math.ts
```

Potential concepts introduced:

- tactical outputs
- lane intent
- target lane
- lane-following controller
- steering controller
- curriculum manager
- training phases
- stability thresholds
- controller diagnostics

---

# Architecture Notes

- Keep AI behavior emergent
- Do not implement pathfinding
- Do not implement RL
- Do not add RNN/LSTM
- Controller should stabilize behavior, not choose strategy
- Tactical AI should remain lightweight
- Curriculum should remain configurable
- Keep systems modular
- Preserve existing persistence where practical
- Preserve existing traffic tuning controls where practical

---

# Tasks

## Lane-Following Controller

- [ ] Create lane-following controller
- [ ] Implement lane centering correction
- [ ] Implement heading correction
- [ ] Implement edge correction
- [ ] Implement steering smoothing
- [ ] Produce continuous steering output
- [ ] Keep controller independent from neural AI

## Tactical Outputs

- [ ] Replace or abstract raw steering outputs
- [ ] Add tactical driving outputs
- [ ] Add lane preference or target lane output
- [ ] Add preferred speed output if practical
- [ ] Preserve compatibility with existing vehicle control flow

## Target Lane System

- [ ] Add current lane tracking
- [ ] Add target lane tracking
- [ ] Add lane-change convergence behavior
- [ ] Expose lane diagnostics
- [ ] Keep implementation lightweight

## Curriculum Training

- [ ] Add explicit curriculum phases
- [ ] Add training phase progression rules
- [ ] Add configurable thresholds
- [ ] Add curriculum state tracking
- [ ] Expose current phase in HUD if practical

## Baseline Validation

- [ ] Validate heuristic driver in road-only
- [ ] Validate heuristic driver in sparse traffic
- [ ] Prevent misleading AI evaluation on unstable baseline

## HUD / Diagnostics

- [ ] Show current lane
- [ ] Show target lane
- [ ] Show tactical output
- [ ] Show controller steering
- [ ] Show curriculum phase
- [ ] Keep HUD compact
- [ ] Preserve visualizer readability

## Validation

- [ ] Confirm controller stabilizes lane following
- [ ] Confirm steering remains smooth
- [ ] Confirm lane changes can stabilize
- [ ] Confirm heuristic survives road-only reliably
- [ ] Confirm sparse-traffic viability improves
- [ ] Confirm curriculum progression works
- [ ] Confirm existing persistence still works
- [ ] Confirm traffic controls still work

---

# Acceptance Criteria

This task is complete when:

- Vehicle stabilization is separated from tactical decisions
- Lane-following controller is stable
- Tactical AI no longer directly owns wheel-level steering
- Target lane abstraction exists
- Curriculum phases exist
- Heuristic baseline becomes reliably viable in road-only
- Sparse-traffic stability improves
- Steering recovery improves
- Existing systems remain functional
- HUD exposes the new architecture clearly

---

# Out of Scope

This task should NOT include:

- Full pathfinding
- RL frameworks
- RNN/LSTM
- Transformer models
- City navigation
- Replay system
- Advanced analytics dashboard
- Complex traffic planning
- Physics-engine replacement
- ThreeJS migration
- Massive neural scaling

---

# Risks

- Controller becomes accidental scripted AI
- Tactical outputs become too abstract
- Lane-target logic overfits straight roads
- Curriculum thresholds become hardcoded
- Controller fights neural intent
- Existing persistence becomes incompatible
- HUD becomes overloaded again

---

# Debug / UX Notes

The system should now make it obvious whether failure comes from:

```txt
bad tactical decision
```

or:

```txt
unstable low-level control
```

This separation is one of the main goals of the task.

---

# Future Improvements

- Curved-road controller
- Dynamic lane widths
- Speed-aware lane changes
- Multi-agent tactical traffic
- Replay debugging
- Imitation-seeded tactical networks
- Hybrid heuristic/neural controllers
- Scenario curriculum generation

---

# Deliverables

- Lane-following controller
- Tactical AI outputs
- Target lane abstraction
- Curriculum training system
- Stable steering translation layer
- Improved baseline viability
- Architecture separation between tactics and control

---

# Notes

This task is the transition point between:

```txt
simple neural driving demo
```

and:

```txt
structured autonomous-driving simulation
```

The priority is no longer adding more sensors or neurons.

The priority is:

```txt
better control architecture
better training structure
better stabilization
```

The desired result is:

```txt
a simulation where viable driving behavior
can realistically emerge and improve.
```