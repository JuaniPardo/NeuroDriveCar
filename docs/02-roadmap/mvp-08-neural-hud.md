

# MVP 08 — Neural Visualizer & HUD

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
[ ] MVP 09 — Population Training
[ ] MVP 10 — Brain Persistence
[ ] MVP 11 — Simulation Controls
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

Create a clear real-time visualization layer for the autonomous driving system.

This MVP makes the neural network and simulation state understandable while the vehicle drives.

The player/user should experience:

- A readable HUD with current simulation status
- A visual representation of the neural network
- Sensor inputs displayed as neural activity
- Neural outputs displayed as driving decisions
- Clear visibility into what the AI is doing and why

The technical milestone is:

- HUD rendering system
- Neural network visualizer
- Sensor input display
- Output/control display
- Debug panel architecture
- Separation between simulation data and visualization

This MVP matters because autonomous behavior is hard to evaluate if the internal decision process is invisible.

The goal is to make the AI inspectable.

---

# Summary

```txt
Implement a HUD and neural network visualizer that show sensor inputs,
hidden-layer activity, output decisions, control state, and basic simulation
information in real time.
```

---

# Features

- Simulation HUD
- Neural network visualizer
- Sensor input activity display
- Hidden layer activity display
- Output/control activity display
- Current control mode indicator
- Current speed/status display
- Damaged state indicator
- Lightweight debug panel
- Clean AI-lab visual style

---

# Technical Scope

Create or extend the following systems:

- `Hud` class
- `NeuralVisualizer` class
- Neural data extraction for visualization
- Sensor input display
- Output control display
- Debug text rendering
- HUD layout system
- Optional panel background rendering

Expected files involved:

```txt
src/
  ui/
    Hud.ts
    NeuralVisualizer.ts
  ai/
    NeuralNetwork.ts
    Brain.ts
  car/
    Car.ts
  sensors/
    Sensor.ts
  game/
    Game.ts
  utils/
    math.ts
```

Potential concepts introduced:

- HUD panel
- neural node
- neural connection
- activation intensity
- input layer display
- hidden layer display
- output layer display
- control labels
- simulation status text

---

# Architecture Notes

- HUD logic must not control simulation behavior
- Neural visualizer should read network state, not mutate it
- Visualization should remain independent from neural inference
- Rendering should stay lightweight and Canvas-based
- HUD layout should be simple and explicit
- Neural visualizer should support the current small network architecture
- Avoid turning the HUD into a UI framework
- Avoid adding DOM controls in this MVP unless already trivial

The HUD is an observability layer, not a gameplay system.

---

# Tasks

## HUD

- [ ] Create `Hud` class
- [ ] Render basic simulation panel
- [ ] Show control mode
- [ ] Show current speed
- [ ] Show damaged/alive state
- [ ] Show sensor count or active detections
- [ ] Keep text readable and aligned

## Neural Visualizer

- [ ] Create `NeuralVisualizer` class
- [ ] Draw input nodes
- [ ] Draw hidden layer nodes
- [ ] Draw output nodes
- [ ] Draw weighted connections
- [ ] Visualize activation intensity
- [ ] Label outputs clearly
- [ ] Suggested output labels: FWD, LEFT, RIGHT, REV

## Integration

- [ ] Expose neural network values needed for visualization
- [ ] Pass current sensor readings to visualizer
- [ ] Pass current output values to visualizer
- [ ] Render HUD after world rendering
- [ ] Ensure HUD uses screen coordinates, not world coordinates

## Technical

- [ ] Keep update/render separated
- [ ] Avoid unnecessary allocations during HUD rendering
- [ ] Keep visualization deterministic and non-mutating
- [ ] Keep layout constants centralized
- [ ] Ensure readable rendering at different viewport sizes

---

# Acceptance Criteria

This MVP is complete when:

- HUD renders on screen without interfering with world rendering
- HUD shows useful simulation state
- Neural network visualizer displays input, hidden, and output layers
- Sensor inputs are reflected in the visualizer
- Neural outputs are reflected in the visualizer
- Output labels are understandable
- Visualizer does not mutate neural network behavior
- Manual/AI control behavior remains working
- Existing sensors, traffic, collisions, and AI driving continue working
- Simulation remains stable at 60 FPS

---

# Debug Visualization

This MVP itself is primarily a debug visualization milestone.

Useful displayed information:

- Sensor values
- Hidden activations
- Output activations
- Active control decisions
- Control mode
- Speed
- Damaged/alive state
- Traffic count

Debug visuals should help answer:

```txt
What information is reaching the neural network?
```

and:

```txt
What decision is the network currently producing?
```

---

# Performance Considerations

- Keep node count small
- Avoid expensive gradients or effects in this MVP
- Avoid recalculating static layout every frame if unnecessary
- HUD rendering should remain cheap
- Neural visualization should scale later to population mode, but does not need to yet

Performance target:

```txt
Stable 60 FPS with HUD and neural visualizer enabled.
```

---

# Risks

- HUD becomes visually cluttered
- Neural visualizer becomes coupled to inference logic
- Screen-space HUD coordinates get mixed with world-space coordinates
- Text becomes unreadable on small screens
- Drawing connections becomes noisy or visually confusing
- Visualization hides important gameplay information
- Prematurely building a full UI system

---

# Out of Scope

This MVP should NOT include:

- Population training
- Brain persistence
- Mutation controls
- Full simulation control panel
- DOM-based UI system
- Charts or historical analytics
- Replay visualization
- Advanced styling/shaders
- Multi-agent neural comparison

The focus is current-state observability only.

---

# Future Improvements

- Collapsible HUD panels
- Simulation control buttons
- Population statistics
- Best-car tracking display
- Brain save/load controls
- Training analytics charts
- Network comparison tools
- Responsive HUD layout
- DOM overlay controls if needed
- Exportable debug snapshots

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

This MVP depends on:

- Stable game loop
- Working Canvas renderer
- Working vehicle state
- Working sensor readings
- Working neural network inference
- AI output values
- Traffic/collision state

---

# Deliverables

- HUD rendering system
- Neural visualizer
- Sensor input display
- Hidden/output activity display
- Control state display
- Basic simulation status panel
- Updated documentation if implementation decisions change

---

# Notes

This MVP turns the project from a black-box AI demo into an inspectable AI driving lab.

The visualizer does not need to be beautiful yet.

It needs to be clear.

The most important question it should answer is:

```txt
Why is the car doing that?
```

If the user can watch sensor inputs activate, see neural outputs change, and connect that behavior to the car movement, this MVP has succeeded.
