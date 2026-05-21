# TASK 03 — Selected Car Diagnostics & Lane-Aware Inputs

Status:

```txt
Completed
```

---

# Goal

Improve AI explainability and lane-awareness by:

- refactoring the HUD around the selected/best car,
- exposing meaningful diagnostics,
- adding lane-aware neural inputs,
- and ensuring sensors can detect lane separator lines in addition to road borders and traffic.

This task focuses on observability and recovery learning.

The goal is not to script lane changes.

The goal is to provide enough environmental information for stable avoidance and recovery behavior to emerge naturally.

---

# Why This Matters

Current observations:

```txt
Cars can drive straight.
Cars can begin obstacle avoidance.
Cars rarely recover after steering.
Cars often continue drifting toward road edges.
```

This suggests the AI may lack:

- lane-position awareness,
- heading/alignment awareness,
- obstacle-context awareness,
- or enough diagnostic visibility to understand why decisions are being made.

At the same time, the HUD has become increasingly system-oriented instead of AI-debug-oriented.

The selected/best car should become the primary debugging target.

---

# Scope

This task includes:

- Selected-car diagnostics HUD
- Lane-aware neural inputs
- Lane-line sensor detection verification/improvement
- Saved-brain compatibility handling for input-count changes
- Fitness visibility improvements

This task does NOT include:

- scripted lane changes,
- pathfinding,
- replay systems,
- curved roads,
- or larger neural architectures as the primary fix.

---

# Features

- Selected-car diagnostics panel
- Reduced instruction clutter
- Lane-aware AI inputs
- Heading/alignment AI input
- Lane occupancy awareness inputs
- Sensor detection of lane separator lines
- Sensor hit-type debugging
- Saved-brain compatibility/version handling
- Expanded fitness diagnostics

---

# Selected Car Diagnostics HUD

## Goal

The left HUD should primarily explain:

```txt
Why is the selected AI car behaving this way?
```

Instead of functioning mainly as a global system dump.

---

## Desired Structure

Suggested conceptual grouping:

```txt
┌────────────────────────────────────┐
│ SELECTED CAR                      │
│ State / Speed / Progress          │
├────────────────────────────────────┤
│ STEERING                          │
│ Raw steer / smooth steer          │
│ Left/right outputs                │
├────────────────────────────────────┤
│ LANE AWARENESS                    │
│ Lane offset / heading error       │
│ Current lane blocked              │
│ Left/right lane clear             │
├────────────────────────────────────┤
│ SENSOR AWARENESS                  │
│ Front obstacle distance           │
│ Edge proximity                    │
│ Sensor hits                       │
├────────────────────────────────────┤
│ FITNESS                           │
│ Progress reward                   │
│ Steering penalty                  │
│ Recovery reward                   │
│ Survival score                    │
└────────────────────────────────────┘
```

---

## Instruction Cleanup

The current instruction section occupies too much visual space.

Preferred solutions:

```txt
- H key toggles help/instructions
- Minimal footer help line
- Collapsible instruction panel
```

The selected-car diagnostics should have visual priority.

---

# Required Diagnostic Values

Useful values to expose:

```txt
leftOutput
rightOutput
rawSteerIntent
smoothedSteer
laneCenterOffsetNormalized
headingErrorNormalized
currentLaneBlocked
leftLaneClear
rightLaneClear
frontObstacleDistance
edgeProximity
fitness
progressScore
survivalScore
steeringPenalty
laneRecoveryReward
```

Not all values must be visible simultaneously if the layout becomes noisy.

Clarity is more important than quantity.

---

# Lane-Aware Neural Inputs

## Goal

The neural network should receive enough information to understand:

```txt
Where am I?
Where is the lane?
Am I aligned?
Is my lane blocked?
Which side is safer?
```

Currently, the AI may be trying to infer all of this only from generic sensor rays.

---

# Required Inputs

## laneCenterOffsetNormalized

Definition:

```txt
negative → car is left of lane center
positive → car is right of lane center
zero     → centered
```

Normalized range preferred:

```txt
-1.0 → far left
 0.0 → centered
+1.0 → far right
```

---

## headingErrorNormalized

Definition:

```txt
difference between car heading
and road/lane direction
```

Meaning:

```txt
negative → rotated left
positive → rotated right
zero     → aligned
```

---

## currentLaneBlocked

Definition:

```txt
1 → obstacle ahead in current lane
0 → lane reasonably clear
```

Should use a useful forward distance threshold.

---

## leftLaneClear

Definition:

```txt
1 → left lane available and reasonably clear
0 → unavailable or blocked
```

---

## rightLaneClear

Definition:

```txt
1 → right lane available and reasonably clear
0 → unavailable or blocked
```

---

# Sensor Lane-Line Detection

## Goal

Ensure sensors can detect:

```txt
- road borders
- lane separator lines
- traffic vehicles
```

Currently, sensors may only detect road borders and traffic.

We must verify whether lane separator geometry is included.

---

# Architecture Direction

Road geometry should expose generic segments.

Preferred conceptual structure:

```txt
roadBorders: Segment[]
laneGuides: Segment[]
trafficPolygons: Polygon[]
```

Sensors should consume generic detectable geometry.

Avoid hardcoding:

```txt
leftBorder
rightBorder
```

inside the Sensor implementation.

---

# Sensor Hit Debugging

If practical, sensor hits should distinguish:

```txt
border
lane
traffic
none
```

If explicit hit typing is too invasive, at least:

- render lane hits differently in debug mode,
- or expose debug visualization proving lane detection exists.

---

# Saved Brain Compatibility

Adding neural inputs changes input count.

The system must:

- detect incompatible saved brains,
- fail safely,
- avoid crashes,
- avoid corrupt behavior,
- and clearly communicate compatibility issues.

Preferred behavior:

```txt
Saved brain incompatible → fallback to random population
```

Optional:

```txt
brain version field
```

HUD/control panel should communicate incompatibility clearly.

---

# Fitness Visibility

Expose at least major scoring components.

Useful categories:

```txt
progressReward
survivalReward
laneRecoveryReward
steeringPenalty
edgePenalty
obstaclePenalty
```

This should help answer:

```txt
Why was this car selected as best?
```

---

# Technical Scope

Expected files involved:

```txt
src/
  ui/
    Hud.ts
    ControlsPanel.ts
  sensors/
    Sensor.ts
    Ray.ts
  world/
    Road.ts
    Lane.ts
  car/
    Car.ts
    Controls.ts
  ai/
    Brain.ts
    NeuralNetwork.ts
  population/
    PopulationManager.ts
  traffic/
    TrafficManager.ts
  collision/
    geometry.ts
  utils/
    math.ts
    storage.ts
```

Potential concepts introduced:

- selected-car diagnostics
- lane-center offset
- heading error
- lane occupancy awareness
- lane guide detection
- sensor hit typing
- brain input versioning
- compatibility fallback
- fitness breakdown

---

# Architecture Notes

- Keep AI behavior emergent
- Do not introduce scripted lane changes
- Keep lane awareness generic enough for future curved roads
- Keep sensors geometry-based
- Keep HUD diagnostic-oriented
- Avoid turning the HUD into a giant analytics dashboard
- Avoid increasing hidden-layer complexity as the first fix
- Preserve manual driving behavior
- Preserve existing simulation controls and traffic controls

---

# Tasks

## HUD Diagnostics

- [ ] Refactor left HUD into selected-car diagnostics layout
- [ ] Reduce instruction clutter
- [ ] Add optional help toggle if useful
- [ ] Add steering diagnostics
- [ ] Add lane-awareness diagnostics
- [ ] Add sensor-awareness diagnostics
- [ ] Add fitness breakdown diagnostics

## Lane-Aware Inputs

- [ ] Add laneCenterOffsetNormalized
- [ ] Add headingErrorNormalized
- [ ] Add currentLaneBlocked
- [ ] Add leftLaneClear
- [ ] Add rightLaneClear
- [ ] Normalize all new inputs
- [ ] Document input ordering clearly

## Sensor Improvements

- [ ] Verify whether sensors currently detect lane lines
- [ ] Add lane-guide detection if missing
- [ ] Ensure lane geometry is exposed as generic segments
- [ ] Keep sensor architecture road-geometry agnostic
- [ ] Add optional sensor hit debugging

## Brain Compatibility

- [ ] Detect incompatible saved brains
- [ ] Fail safely on incompatible brain load
- [ ] Fallback safely to random population
- [ ] Communicate compatibility issue in HUD/control panel
- [ ] Add optional brain versioning if practical

## Fitness Visibility

- [ ] Expose major fitness components
- [ ] Show recovery-related scoring
- [ ] Show steering penalties
- [ ] Show edge penalties
- [ ] Keep diagnostics readable

---

# Acceptance Criteria

This task is complete when:

- Left HUD focuses on selected-car diagnostics
- Instructions no longer dominate the layout
- AI input vector includes lane-aware inputs
- Sensors detect or visibly process lane separator lines
- Saved-brain incompatibility is handled safely
- HUD explains steering/lane behavior more clearly
- Existing traffic tuning still works
- Existing population controls still work
- Existing brain persistence still works
- Existing simulation controls still work
- Existing training loop remains stable

---

# Out of Scope

This task should NOT include:

- Scripted lane changes
- Pathfinding
- State-machine driving AI
- Curved roads
- Replay system
- Analytics dashboard
- New traffic AI
- City driving
- Major UI framework
- Hidden-layer expansion as primary solution

---

# Risks

- Too many diagnostics clutter the HUD
- Lane-awareness inputs overfit only straight roads
- Input-count changes invalidate all saved brains
- Sensor hit typing becomes invasive/refactor-heavy
- Fitness breakdown becomes noisy and unreadable
- AI becomes dependent on handcrafted lane logic

---

# Debug / UX Notes

Useful debug values:

```txt
leftOutput
rightOutput
rawSteerIntent
smoothedSteer
laneCenterOffset
headingError
frontObstacleDistance
edgeProximity
currentLaneBlocked
leftLaneClear
rightLaneClear
```

The system should help answer:

```txt
What does the AI think is happening right now?
```

and:

```txt
Why did it decide to steer?
```

---

# Future Improvements

- Sensor heatmaps
- Lane occupancy visualization
- Selected-car deep diagnostics mode
- Input contribution visualization
- Replay debugging
- Fitness history graphs
- Curved-road lane awareness

---

# Deliverables

- Selected-car diagnostics HUD
- Lane-aware neural inputs
- Lane-line sensor detection
- Saved-brain compatibility handling
- Expanded fitness visibility
- Preserved existing training systems

---

# Notes

This task should make the AI easier to understand.

The simulation is now complex enough that:

```txt
Better diagnostics = faster AI iteration.
```

The objective is not to “cheat” the AI.

The objective is to expose enough environmental structure for recovery and stabilization behavior to emerge naturally.
