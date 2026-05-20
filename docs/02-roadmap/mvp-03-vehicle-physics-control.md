# MVP 03 — Vehicle Physics & Controls

Status:

```txt
Completed
```

---

# Goal

Introduce the first controllable vehicle into the NeuroDriveCar simulation.

This MVP establishes the foundation for all future driving behavior:

- Manual driving
- AI driving
- Sensor positioning
- Collision geometry
- Traffic interaction
- Evolutionary learning

The player/user should experience:

- A vehicle that feels responsive and believable
- Smooth acceleration and deceleration
- Friction-based slowdown
- Steering with rotational movement
- Camera-followed driving through the highway

The technical milestone is:

- Stable vehicle physics baseline
- Keyboard control system
- Rotation-based movement
- World-space vehicle simulation
- Vehicle update lifecycle

This MVP matters because:

```txt
If manual driving does not feel good,
AI driving will inherit bad behavior.
```

The quality of the physics directly affects:

- AI learning
- Sensor behavior
- Collision reliability
- Gameplay feel
- Future tuning systems

---

# Summary

```txt
Implement a controllable vehicle with acceleration,
friction, steering, rotation-based movement,
and camera-followed driving behavior.
```

---

# Features

- Controllable vehicle
- Keyboard input
- Forward/reverse movement
- Acceleration
- Friction/deceleration
- Steering behavior
- Rotation-based movement
- Camera-followed driving
- Vehicle rendering with rotation
- Stable world-space movement

---

# Technical Scope

Create or extend the following systems:

- `Car` class
- `Controls` class
- Vehicle physics update system
- Rotation-based transform logic
- Input handling
- Camera-follow integration
- Vehicle rendering

Expected files involved:

```txt
src/
  car/
    Car.ts
    Controls.ts
    Physics.ts
  game/
    Camera.ts
  utils/
    math.ts
```

Potential concepts introduced:

- velocity
- acceleration
- angle
- angular steering
- friction coefficient
- forward vector
- local movement direction

---

# Architecture Notes

- Vehicle logic must remain independent from rendering
- Input handling should remain separate from physics
- Physics should update in world coordinates
- Rotation should affect movement direction
- The car should not directly manipulate camera state
- Steering sensitivity should depend on movement speed
- Avoid hardcoded screen-space movement
- The vehicle should be future-compatible with AI controls

The car is a simulation entity first and a visual object second.

---

# Tasks

## Core

- [ ] Create `Car` class
- [ ] Create `Controls` class
- [ ] Add keyboard input handling
- [ ] Implement acceleration
- [ ] Implement reverse movement
- [ ] Implement friction/deceleration
- [ ] Implement steering
- [ ] Implement rotation-based movement
- [ ] Implement velocity handling
- [ ] Integrate camera follow behavior

## Physics

- [ ] Add acceleration coefficient
- [ ] Add friction coefficient
- [ ] Add steering sensitivity
- [ ] Limit maximum speed
- [ ] Limit reverse speed
- [ ] Ensure stable motion at low speed
- [ ] Prevent unrealistic instant direction changes

## Visual

- [ ] Render vehicle rectangle
- [ ] Render rotated vehicle
- [ ] Ensure vehicle remains centered in camera view
- [ ] Create visually readable vehicle proportions
- [ ] Maintain dark simulation aesthetic

## Technical

- [ ] Keep update/render separated
- [ ] Avoid frame-dependent movement bugs
- [ ] Use deltaTime correctly if already implemented
- [ ] Keep physics deterministic where practical
- [ ] Keep code readable and debuggable

---

# Acceptance Criteria

This MVP is complete when:

- Vehicle responds to keyboard controls
- Vehicle accelerates smoothly
- Vehicle slows naturally through friction
- Vehicle can reverse
- Vehicle rotates while steering
- Rotation affects movement direction correctly
- Camera follows the vehicle reliably
- Vehicle remains stable during movement
- No major jitter or drift occurs
- Physics feel believable and controllable
- Driving feels satisfying even without AI

---

# Debug Visualization

Useful optional debug visuals:

- Velocity vector
- Forward direction vector
- Vehicle center point
- Steering direction
- Current speed
- Rotation angle

Debug visuals should remain lightweight and optional.

---

# Performance Considerations

- Avoid unnecessary allocations inside update loops
- Keep movement math lightweight
- Avoid excessive trigonometric recalculation
- Ensure rendering remains stable at 60 FPS
- Keep physics calculations deterministic and predictable

Performance target:

```txt
Stable 60 FPS while driving continuously.
```

---

# Risks

- Incorrect rotation math
- Vehicle drifting unnaturally
- Steering feeling too sensitive or too stiff
- Frame-rate-dependent movement
- Camera jitter during movement
- Reverse movement behaving inconsistently
- Friction producing unstable stop behavior

---

# Out of Scope

This MVP should NOT include:

- Collisions
- Sensors
- Traffic vehicles
- Neural networks
- AI driving
- Population systems
- Drift physics
- Tire simulation
- Suspension systems
- Curved roads
- Damage states

The focus is foundational controllable movement only.

---

# Future Improvements

- Improved steering model
- Drift behavior
- Weight transfer simulation
- Tire grip systems
- Suspension feel
- Vehicle tuning parameters
- Multiple vehicle types
- Camera smoothing
- Motion blur effects
- Engine sound systems

---

# Dependencies

Required:

- MVP 01 — Foundation
- MVP 02 — Highway Rendering

This MVP depends on:

- Stable game loop
- Working world-space rendering
- Camera infrastructure
- Highway rendering system

---

# Deliverables

- Fully controllable vehicle
- Stable vehicle physics baseline
- Keyboard control system
- Rotation-based movement
- Camera-follow driving experience
- Updated documentation if implementation changes occur

---

# Notes

This MVP is one of the most important milestones in the project.

The goal is NOT realism.

The goal is:

```txt
Simple, believable, enjoyable movement.
```

The vehicle should feel:

- responsive
- understandable
- controllable
- predictable

before introducing:

- AI
- sensors
- collisions
- traffic

A strong physics baseline will make every later MVP easier and more satisfying.
