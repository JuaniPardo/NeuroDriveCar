

# TASK 04 — Driving Intent & Fitness Stabilization

Status:

```txt
Completed
```

---

# Goal

Improve AI driving quality by addressing the current failure mode:

```txt
The car reacts, but does not maintain a useful driving intention.
```

The current AI can often:

- drive straight,
- detect obstacles,
- begin avoidance,
- and sometimes steer away from traffic.

But it still struggles to:

```txt
avoid → recover → stabilize → continue
```

Instead, observed behavior often becomes:

```txt
avoid → drift → edge proximity → crash
```

This task introduces a lightweight driving-intent layer and improves the fitness signal so the population is selected for clean, stable driving rather than accidental short-term progress.

---

# Why This Matters

The project has already added:

- sensors,
- lane-aware inputs,
- steering smoothing,
- traffic difficulty controls,
- population training,
- persistence,
- and selected-car diagnostics.

The remaining issue is not simply missing inputs or insufficient hidden neurons.

The core issue is that the neural network is still mostly reactive:

```txt
current input → current output
```

It has no meaningful short-term driving intention.

This makes it hard to learn behaviors like:

- committing briefly to an avoidance maneuver,
- stabilizing after lateral movement,
- returning toward lane alignment,
- avoiding steering dithering,
- and judging whether a maneuver was good after a few frames.

This task adds lightweight intent/memory without introducing a full planner, RNN, LSTM, or scripted lane-change system.

---

# Scope

This task includes:

- lightweight driving intent state,
- steering recovery stabilization,
- fitness scoring improvements,
- selected-car diagnostics cleanup,
- HUD layout simplification,
- preserving neural visualizer space,
- and making training outcomes easier to interpret.

This task does NOT include:

- scripted lane changes,
- pathfinding,
- state-machine driving AI,
- recurrent neural networks,
- larger hidden layers as the primary fix,
- curved roads,
- replay system,
- or full analytics dashboard.

---

# Current Problems

## 1. AI is too reactive

The network decides every frame from the current input only.

That means it may not maintain a coherent short-term plan.

Observed pattern:

```txt
sees obstacle → steers away → next frame changes context → keeps drifting or fails to recover
```

---

## 2. Steering recovery is weak

Even after adding continuous steering and smoothing, the AI may still fail to correct back toward stable alignment.

The system needs to distinguish:

```txt
useful temporary steering
```

from:

```txt
dangerous sustained steering
```

---

## 3. Fitness still selects bad winners

If the best car in generation 80+ still crashes quickly or behaves poorly, then the fitness function is still rewarding accidental progress too strongly.

The population should select for:

```txt
clean progress
```

not merely:

```txt
furthest unstable drift before crashing
```

---

## 4. HUD is too crowded

The HUD now contains useful diagnostics, but too much is visible at once.

Problems:

- text overflow inside boxes,
- too many metrics competing for space,
- instructions taking room,
- controls covering neural visualizer,
- selected-car diagnostics not visually prioritized enough.

---

# Part A — Driving Intent Layer

## Goal

Add a small intent layer that smooths and stabilizes AI behavior without scripting lane changes.

The purpose is not to tell the AI which lane to choose.

The purpose is to give the control pipeline short-term continuity.

---

## Suggested Intent State

Introduce a lightweight structure such as:

```ts
interface DrivingIntentState {
  steeringIntent: number;
  smoothedSteer: number;
  previousSteer: number;
  sustainedSteerTime: number;
  steeringDirection: -1 | 0 | 1;
  recoveryTrend: number;
}
```

This can live in:

```txt
Controls
Car
or a small AI control helper
```

Choose the cleanest architecture based on the current codebase.

---

## Required Behavior

The intent layer should support:

- steering continuity,
- steering sign changes,
- recovery detection,
- sustained steering measurement,
- and smoother transition back toward neutral.

It must not prevent the AI from changing direction.

Critical check:

```txt
If target steer changes sign, smoothed steer must be able to cross zero.
```

---

## Steering Intent Rules

Continue using continuous steering:

```txt
rawSteerIntent = rightOutput - leftOutput
```

Apply dead zone:

```txt
if abs(rawSteerIntent) < 0.10:
  rawSteerIntent = 0
```

Smooth it:

```txt
smoothedSteer = lerp(previousSmoothedSteer, rawSteerIntent, smoothingFactor)
```

Recommended starting values:

```txt
smoothingFactor: 0.16 to 0.22
aiSteeringStrength: 0.45 to 0.60 of manual steering strength
```

---

## Steering Recovery Tracking

Track whether the car is improving lateral alignment after steering.

Useful concepts:

```txt
previousLaneOffset
currentLaneOffset
laneOffsetDelta
recoveryTrend
```

Example:

```txt
if abs(currentLaneOffset) < abs(previousLaneOffset):
  recoveryTrend is positive
else:
  recoveryTrend is negative
```

This should be used for diagnostics and fitness, not scripted control.

---

# Part B — Fitness Stabilization

## Goal

Rewrite or tune fitness so the selected best car represents actually useful driving.

The best car should not be the one that accidentally moved furthest while drifting toward a crash.

---

# Fitness Components

Use a simple readable scoring model.

Suggested positive components:

```txt
+ forward progress
+ survival time
+ stable forward speed
+ safe obstacle avoidance
+ lane recovery improvement
+ lane alignment while progressing
```

Suggested negative components:

```txt
- early crash penalty
- road-edge proximity penalty
- sustained steering penalty
- steering oscillation penalty
- excessive lateral drift penalty
- stagnation penalty
- front obstacle collision-risk penalty
```

---

## Clean Progress

Reward forward progress, but discount it when the car is in a bad state.

Example concept:

```txt
cleanProgress = progress
  - edgePenalty
  - driftPenalty
  - sustainedSteeringPenalty
```

Do not allow raw distance to dominate everything.

---

## Crash Penalty

Crashes should strongly reduce fitness, especially early crashes.

Example concept:

```txt
if crashed:
  fitness -= crashPenalty
  fitness -= earlyCrashPenalty based on short survival/progress
```

---

## Edge Proximity Penalty

A car near the road edge should be penalized before collision.

This teaches danger earlier than crash-only feedback.

---

## Sustained Steering Penalty

If the car steers strongly in the same direction for too long, apply a penalty.

Purpose:

```txt
Discourage endless drift.
```

---

## Lane Recovery Reward

Reward reduction in lane offset while still moving forward.

Purpose:

```txt
Encourage avoid → recover → stabilize.
```

---

## Obstacle Avoidance Reward

Reward successful avoidance only when:

```txt
traffic was blocking useful forward path
and car avoids collision
and continues forward
and does not drift dangerously toward edge
```

Keep this simple.

Avoid complex scenario analytics.

---

# Part C — HUD & Layout Cleanup

## Goal

Make diagnostics useful without overwhelming the screen.

The current HUD should be simplified into:

```txt
essential diagnostics always visible
advanced diagnostics hidden/toggleable
controls not covering neural visualizer
```

---

# Left HUD Recommendation

Left panel should show only high-signal selected-car data:

```txt
Selected Car
Speed / Progress / Fitness
Steer raw/smoothed
Lane offset / heading
Front obstacle / edge proximity
Alive/crashed status
```

Advanced details should move behind a debug toggle.

---

# Right Panel Recommendation

Right side currently allows controls to cover the neural visualizer.

Refactor so:

- Neural visualizer has reserved space.
- Controls panel does not overlap it.
- Controls can be collapsed or moved below without hiding the visualizer.

Suggested behavior:

```txt
V key → toggle neural visualizer
C key → toggle controls panel
H key → toggle help/instructions
D key → toggle advanced diagnostics
```

Use existing input architecture if available.

Do not build a big UI framework.

---

# HUD Overflow Rules

Prevent text overflow:

- shorten labels,
- clamp values,
- use fixed-width value columns,
- reduce decimal places,
- avoid long strings inside narrow boxes,
- truncate long status text,
- move explanatory text to help panel.

---

# Part D — Diagnostics

Expose values needed to understand AI behavior.

Useful diagnostics:

```txt
rawSteerIntent
smoothedSteer
sustainedSteerTime
steeringDirection
laneCenterOffset
laneOffsetDelta
recoveryTrend
edgeProximity
frontObstacleDistance
currentLaneBlocked
leftLaneClear
rightLaneClear
fitness
progressReward
survivalReward
laneRecoveryReward
edgePenalty
steeringPenalty
stagnationPenalty
```

Keep advanced diagnostics toggleable.

---

# Technical Scope

Expected files involved:

```txt
src/
  car/
    Car.ts
    Controls.ts
  ai/
    Brain.ts
    NeuralNetwork.ts
  population/
    PopulationManager.ts
  ui/
    Hud.ts
    ControlsPanel.ts
    NeuralVisualizer.ts
  world/
    Road.ts
  traffic/
    TrafficManager.ts
  utils/
    math.ts
```

Potential concepts introduced:

- driving intent state
- recovery trend
- clean progress score
- fitness breakdown
- advanced diagnostics toggle
- visualizer visibility toggle
- controls visibility toggle
- help visibility toggle
- overflow-safe HUD rendering

---

# Architecture Notes

- Keep AI behavior emergent
- Do not script lane changes
- Do not implement path planning
- Do not increase neural network size as the first fix
- Intent layer should stabilize control, not decide route
- Fitness should remain readable and tunable
- HUD should observe state, not mutate simulation
- Controls panel should not own simulation entities
- Preserve saved-brain compatibility where practical
- If compatibility breaks due to previous input changes, fail safely

---

# Tasks

## Driving Intent

- [ ] Add or refine driving intent state
- [ ] Track rawSteerIntent
- [ ] Track smoothedSteer
- [ ] Track previousSteer
- [ ] Track sustainedSteerTime
- [ ] Track steering direction
- [ ] Track lane recovery trend
- [ ] Ensure smoothed steering can cross zero
- [ ] Ensure steering state resets on restart/new generation

## Fitness Stabilization

- [ ] Define a clearer fitness breakdown
- [ ] Reduce dominance of raw distance
- [ ] Add or strengthen crash penalty
- [ ] Add edge proximity penalty
- [ ] Add sustained steering penalty
- [ ] Add lateral drift penalty
- [ ] Add lane recovery reward
- [ ] Add stagnation penalty
- [ ] Expose fitness components for diagnostics

## HUD Cleanup

- [ ] Reduce always-visible left HUD metrics
- [ ] Prevent text overflow in HUD boxes
- [ ] Add advanced diagnostics toggle if practical
- [ ] Shorten labels and clamp values
- [ ] Move long instructions to help toggle
- [ ] Preserve essential selected-car diagnostics

## Right Panel / Visualizer Layout

- [ ] Ensure controls do not cover neural visualizer
- [ ] Reserve space for neural visualizer
- [ ] Add controls visibility toggle if useful
- [ ] Add visualizer visibility toggle if useful
- [ ] Keep layout readable at current viewport sizes

## Validation

- [ ] Confirm traffic controls still work
- [ ] Confirm simulation controls still work
- [ ] Confirm brain persistence still works
- [ ] Confirm population training still works
- [ ] Confirm selected-car diagnostics still work
- [ ] Confirm AI can still drive straight
- [ ] Confirm steering can recover across zero

---

# Acceptance Criteria

This task is complete when:

- HUD no longer has obvious text overflow
- Left HUD is easier to scan
- Long instructions are hidden or minimized
- Controls do not cover the neural visualizer
- Driving intent state is visible in diagnostics
- Fitness breakdown is visible in diagnostics
- Raw distance no longer dominates bad behavior selection
- Edge drift and sustained steering are penalized
- Lane recovery is rewarded
- AI steering can recover across zero
- Existing systems remain stable

---

# Out of Scope

This task should NOT include:

- Bigger neural network as primary fix
- New hidden layers
- Scripted lane changes
- Lane-change planner
- Pathfinding
- Recurrent neural networks
- Traffic AI redesign
- Curved roads
- Replay system
- Full analytics dashboard
- UI framework migration

---

# Risks

- Fitness becomes too punitive and cars stop exploring
- Recovery reward overpowers obstacle avoidance
- Steering penalties discourage useful avoidance
- HUD toggles add complexity
- Intent layer becomes accidental scripted driving
- Saved brains become difficult to compare after scoring changes
- Visualizer layout becomes too cramped

---

# Debug / UX Notes

The user should be able to answer:

```txt
Why is this car considered the best?
```

and:

```txt
Is this car recovering after steering, or drifting toward failure?
```

The HUD should show fewer values by default, but better values.

---

# Future Improvements

- Fitness graph over time
- Selected-car replay
- Steering history chart
- Per-generation fitness summary
- Lane-change success metric
- Auto-curriculum based on performance
- Named training experiments

---

# Deliverables

- Lightweight driving intent state
- Improved fitness breakdown
- Recovery-oriented scoring
- Cleaner HUD layout
- Toggleable advanced diagnostics/help
- Controls/visualizer layout separation
- Preserved existing training systems

---

# Notes

This task is a stabilization pass.

The project has enough raw features.

Now the priority is:

```txt
make the training signal better
make behavior easier to inspect
make UI stop fighting the simulation
```

The desired result is not perfect driving.

The desired result is a training loop where better behavior is actually selected more reliably.
