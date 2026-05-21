

# TASK 02 — HUD Layout & Steering Recovery

Status:

```txt
Completed
```

---

# Goal

Improve two areas discovered during AI training:

1. The left HUD is too tall and difficult to read.
2. AI steering tends to commit to one side and does not reliably recover back toward the opposite direction or lane center.

This task improves usability and training quality without introducing a new MVP-scale feature.

---

# Why This Matters

The traffic tuning controls now work correctly, but the simulation is becoming harder to inspect because the left HUD has grown vertically.

At the same time, AI cars can sometimes begin an evasive maneuver, but they rarely correct back in the opposite direction.

That creates this failure pattern:

```txt
car avoids obstacle → keeps steering one way → reaches road edge → crashes
```

For stable lane changes, the AI needs to learn not only avoidance, but also recovery.

The desired behavior is:

```txt
avoid obstacle → stabilize → return/alignment correction → continue forward
```

---

# Scope

This task includes:

- Left HUD layout improvement
- Steering recovery investigation
- Steering intent sign-change support
- Fitness incentives for lane alignment/recovery
- Optional lane-center offset input if needed

This task should not redesign the whole UI or replace the neural network architecture.

---

# Part A — HUD Layout Improvement

## Problem

The left debug/status HUD is currently too long and visually difficult to scan.

It contains useful information, but the vertical layout makes related data feel buried.

---

## Desired Layout

Rework the left HUD into a compact two-column layout.

Suggested structure:

```txt
┌────────────────────────────────────────────┐
│ NEURODRIVECAR / MVP 12                     │
│ FPS / SIM                                  │
├──────────────────────┬─────────────────────┤
│ VEHICLE              │ POPULATION          │
│ ...                  │ ...                 │
├──────────────────────┼─────────────────────┤
│ PERSISTENCE          │ TRAFFIC             │
│ ...                  │ ...                 │
├──────────────────────┴─────────────────────┤
│ INSTRUCTIONS                               │
│ ... spans full width ...                   │
└────────────────────────────────────────────┘
```

---

## HUD Requirements

- Use two columns for main data sections
- Keep instructions at the bottom spanning the full HUD width
- Preserve all existing displayed information where practical
- Improve grouping and readability
- Avoid making the HUD wider than necessary
- Keep the same dark AI-lab aesthetic
- Keep HUD rendering Canvas-based if it already is
- Do not convert the HUD to a large DOM framework

---

# Part B — Steering Recovery Improvement

## Problem

Observed behavior:

- Cars can learn to drive straight
- Some cars start steering to avoid traffic
- Once steering begins, cars often continue in the same direction
- Cars rarely correct back toward the opposite direction
- Cars that deviate often crash into the road edge

This suggests possible issues in:

- AI output mapping
- steering smoothing
- steering saturation
- stale steering state
- fitness scoring
- missing lane-alignment signal
- insufficient recovery incentive

---

# Technical Investigation

Before changing behavior, inspect:

- Neural output mapping
- `steerIntent = rightOutput - leftOutput` logic
- smoothing implementation
- dead zone handling
- AI steering strength multiplier
- control state reset behavior
- whether steering can cross zero after changing sign
- whether LEFT/RIGHT outputs are still being treated as sticky booleans anywhere
- whether previous steering state persists after crash/restart incorrectly

The key check:

```txt
If target steer intent changes from negative to positive,
smoothed steering must eventually cross zero and become positive.
```

And the reverse:

```txt
If target steer intent changes from positive to negative,
smoothed steering must eventually cross zero and become negative.
```

---

# Steering Requirements

## Continuous Steering

AI steering should remain continuous, not purely binary.

Preferred conceptual model:

```txt
steerIntent = rightOutput - leftOutput
```

Expected range:

```txt
-1.0 → steer left
 0.0 → no steering
+1.0 → steer right
```

Apply a small dead zone:

```txt
if abs(steerIntent) < 0.10:
  steerIntent = 0
```

---

## Smoothing Must Not Stick

Smoothing should reduce jitter, but it must not prevent direction changes.

Preferred conceptual model:

```txt
smoothedSteer = lerp(smoothedSteer, steerIntent, smoothingFactor)
```

Suggested starting value:

```txt
smoothingFactor = 0.12
```

If steering feels too sluggish to recover, increase modestly:

```txt
0.16 to 0.22
```

---

## AI Steering Strength

AI steering should remain less aggressive than manual steering.

Suggested value:

```txt
aiSteeringStrength = manualSteeringStrength * 0.45 to 0.60
```

If cars cannot recover fast enough, prefer slightly improving smoothing response before increasing steering strength too much.

---

# Fitness Improvements

The fitness function should reward stable avoidance and recovery, not just raw distance.

Add or tune scoring terms for:

```txt
+ forward progress
+ survival time
+ safe obstacle avoidance
+ lane alignment recovery
- early crash
- excessive steering
- sustained steering in one direction
- road-edge proximity
- lateral drift without recovery
- near-zero-speed stagnation
```

---

## Lane Alignment / Recovery Incentive

Reward cars that remain aligned with a lane center or return toward lane center after an evasive maneuver.

Possible simple metrics:

```txt
laneCenterOffset = distance from car.x to nearest lane center
```

Then apply:

```txt
small penalty for large sustained laneCenterOffset
small reward when laneCenterOffset decreases while still making forward progress
```

The goal is not to force cars to stay perfectly centered.

The goal is to encourage recovery after deviation.

---

## Sustained Steering Penalty

Add a penalty when the AI keeps steering strongly in the same direction for too long.

Example concept:

```txt
if abs(smoothedSteer) > strongSteerThreshold for sustained duration:
  apply penalty
```

This discourages endless drift toward the road edge.

---

# Optional Sensor/Input Improvement

If the neural network currently lacks any information about lane position, add a simple normalized lane-center offset input.

Example:

```txt
nearestLaneCenterOffsetNormalized
```

Expected meaning:

```txt
negative → car is left of nearest lane center
positive → car is right of nearest lane center
zero     → car is centered
```

Important:

- Keep this road-geometry aware but not hardcoded only to straight roads if avoidable
- Use existing road/lane utilities if available
- Document the input order clearly
- Handle saved brain compatibility if input count changes

If adding this input would break too much saved-brain compatibility, prefer fitness-only recovery first.

---

# Technical Scope

Expected files involved:

```txt
src/
  ui/
    Hud.ts
    ControlsPanel.ts
  car/
    Controls.ts
    Car.ts
  ai/
    Brain.ts
    NeuralNetwork.ts
  population/
    PopulationManager.ts
  world/
    Road.ts
  utils/
    math.ts
```

Potential concepts introduced:

- two-column HUD layout
- HUD section grid
- instruction full-span row
- steering recovery score
- sustained steering penalty
- lane center offset
- steering sign change tracking
- AI steering debug values

---

# Architecture Notes

- HUD layout changes must not affect simulation logic
- Steering fixes must not alter manual driving feel unless explicitly necessary
- Fitness changes should remain readable and tunable
- Neural network architecture should not be increased as the first fix
- Avoid adding complex path planning
- Avoid adding lane-changing state machines
- Keep AI emergent rather than scripted
- Keep recovery incentives simple and measurable

---

# Tasks

## HUD Layout

- [ ] Refactor left HUD into two-column main layout
- [ ] Keep header/status visible at the top
- [ ] Place Vehicle and Population sections side by side
- [ ] Place Persistence and Traffic sections side by side
- [ ] Keep Instructions section at the bottom spanning full width
- [ ] Preserve existing displayed values where practical
- [ ] Improve spacing, alignment, and readability

## Steering Investigation

- [ ] Inspect current AI output mapping
- [ ] Confirm steering is calculated as continuous value
- [ ] Confirm smoothing can cross zero
- [ ] Confirm LEFT/RIGHT are not sticky booleans in AI mode
- [ ] Confirm steering state resets correctly on restart/new generation
- [ ] Add temporary debug values if useful

## Steering Recovery

- [ ] Ensure AI steering can alternate left/right over time
- [ ] Tune smoothing factor if recovery is too slow
- [ ] Keep AI steering strength configurable
- [ ] Avoid oversteering into road edges
- [ ] Preserve straight-driving stability

## Fitness / Training

- [ ] Add lane alignment or lane recovery scoring
- [ ] Add sustained steering penalty
- [ ] Tune road-edge proximity penalty if needed
- [ ] Preserve progress/survival rewards
- [ ] Keep scoring readable and documented

## Optional Input

- [ ] Evaluate whether lane-center offset input is needed
- [ ] Add normalized lane-center offset only if beneficial
- [ ] Document input order if changed
- [ ] Handle saved-brain compatibility if input shape changes

---

# Acceptance Criteria

This task is complete when:

- Left HUD is easier to read and less vertically stretched
- HUD uses two-column organization for main sections
- Instructions span the full width at the bottom
- Existing HUD information is preserved where practical
- AI steering can recover from left to right and right to left
- AI vehicles are capable of correcting after an evasive maneuver
- Cars are less likely to continue steering into road edges indefinitely
- Straight-driving behavior is not significantly degraded
- Existing traffic controls still work
- Existing population/mutation controls still work
- Existing brain persistence still works
- Existing HUD/neural visualizer still works

---

# Out of Scope

This task should NOT include:

- Bigger neural network as primary fix
- New hidden layers
- Full lane-change planner
- Scripted lane-change behavior
- Curved roads
- City driving
- New traffic AI
- Replay system
- Analytics dashboard
- Full UI redesign
- DOM framework migration

---

# Risks

- HUD becomes too wide
- Two-column layout reduces readability on smaller screens
- Steering smoothing becomes too slow
- Steering smoothing becomes too twitchy
- Fitness penalties overcorrect and discourage lane changes entirely
- Lane-center reward causes cars to ignore traffic
- Input-count changes invalidate saved brains
- Debug values clutter the HUD

---

# Debug / UX Notes

Useful temporary debug values:

```txt
leftOutput
rightOutput
rawSteerIntent
smoothedSteer
laneCenterOffset
edgeProximity
sustainedSteerTime
```

These can help answer:

```txt
Is the AI trying to correct back?
```

and:

```txt
Is steering stuck, or is the network choosing not to recover?
```

---

# Future Improvements

- Dedicated selected-car diagnostics panel
- Lane-change success metric
- Automatic curriculum progression
- Better fitness visualization
- Steering history graph
- Sensor/input contribution debugging
- Replay-based behavior inspection

---

# Deliverables

- Refined two-column left HUD
- Full-width instruction section
- Steering recovery investigation/fix
- Improved recovery-oriented fitness scoring
- Optional lane-center offset input if needed
- Preserved existing traffic and training controls

---

# Notes

This task should keep the AI emergent.

The goal is not to script lane changes.

The goal is to give the training system enough control stability and reward structure for lane-change recovery to emerge naturally.

The target behavior is:

```txt
avoid → correct → stabilize → continue
```

not:

```txt
avoid → drift forever → crash
```
