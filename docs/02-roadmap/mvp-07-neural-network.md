

# MVP 07 — Neural Network Driving

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
[ ] MVP 08 — Neural Visualizer & HUD
[ ] MVP 09 — Population Training
[ ] MVP 10 — Brain Persistence
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

Connect sensor perception to autonomous vehicle control using a simple feed-forward neural network.

This MVP gives the vehicle its first actual autonomous driving behavior.

The player/user should experience:

- A vehicle controlled by sensor inputs instead of keyboard input
- Neural outputs mapped to driving commands
- Visible autonomous behavior, even if initially imperfect
- A clear distinction between manual and AI-controlled vehicles
- A foundation for future population training and evolution

The technical milestone is:

- Feed-forward neural network implementation
- Sensor readings converted into AI inputs
- Neural outputs converted into vehicle controls
- Support for AI control mode
- Initial random brain generation
- Deterministic inference step during simulation

This MVP matters because it connects the previous systems:

```txt
vehicle physics + traffic + sensors
```

to:

```txt
autonomous decision making
```

At this stage the AI does not need to be good.

It only needs to drive through the same control interface a human driver uses.

---

# Summary

```txt
Implement a small feed-forward neural network that receives normalized
sensor readings and outputs vehicle control commands for autonomous driving.
```

---

# Features

- Feed-forward neural network
- Randomized neural weights and biases
- Sensor input vector
- AI control mode
- Neural output-to-control mapping
- Autonomous vehicle behavior
- Manual/AI control separation
- Debug-friendly network state

---

# Technical Scope

Create or extend the following systems:

- `NeuralNetwork` class
- Neural layer implementation
- Feed-forward inference
- Random brain initialization
- AI control mode in vehicle controls
- Sensor input conversion
- Control output mapping
- Optional brain serialization preparation

Expected files involved:

```txt
src/
  ai/
    NeuralNetwork.ts
    Brain.ts
  car/
    Car.ts
    Controls.ts
  sensors/
    Sensor.ts
  utils/
    math.ts
```

Potential concepts introduced:

- input layer
- hidden layer
- output layer
- weights
- biases
- activation values
- binary outputs
- control mode
- brain
- inference

---

# Architecture Notes

- Neural network logic must remain independent from rendering
- Sensor readings should be passed as normalized inputs
- The network should not know about cars, roads, or traffic directly
- Vehicle controls should accept AI-generated commands through the same conceptual interface as keyboard input
- AI control mode should not break manual control mode
- Feed-forward inference should be deterministic for a given brain and input vector
- Brain data should be easy to serialize later
- Avoid external ML libraries
- Avoid backpropagation in this MVP

The neural network is the decision layer, not the simulation layer.

---

# Tasks

## Core

- [ ] Create `NeuralNetwork` class
- [ ] Create supporting neural layer structure
- [ ] Initialize random weights and biases
- [ ] Implement feed-forward inference
- [ ] Accept normalized sensor readings as inputs
- [ ] Produce output values for driving commands
- [ ] Map outputs to vehicle controls
- [ ] Add AI control mode
- [ ] Ensure manual control mode still works

## AI Behavior

- [ ] Define output order clearly
- [ ] Suggested outputs: forward, left, right, reverse/brake
- [ ] Convert neural output values into boolean controls
- [ ] Keep behavior simple and deterministic
- [ ] Allow the AI vehicle to drive without keyboard input

## Visual

- [ ] Make AI-controlled vehicle visually distinguishable from manual vehicle if both modes exist
- [ ] Add minimal debug display for current AI outputs if useful
- [ ] Keep rendering lightweight
- [ ] Do not implement full neural visualizer yet

## Technical

- [ ] Keep network code independent from rendering
- [ ] Keep network code independent from car implementation
- [ ] Ensure sensor readings handle `null` detections safely
- [ ] Avoid unnecessary allocations in hot loops where practical
- [ ] Keep brain data future-compatible with mutation and persistence

---

# Acceptance Criteria

This MVP is complete when:

- A neural network can be created with random weights and biases
- Sensor readings can be converted into neural inputs
- Neural inference produces driving outputs
- AI outputs can control the vehicle
- AI-controlled vehicle can move without keyboard input
- Manual control mode is not broken
- Existing physics, collisions, traffic, and sensors continue working
- Neural network code is independent from rendering
- Brain structure is future-compatible with mutation and persistence
- Simulation remains stable at 60 FPS

---

# Debug Visualization

Useful optional debug visuals:

- Current sensor input values
- Current neural output values
- Active control outputs
- Control mode indicator
- Brain summary

Do not implement the full neural network visualizer in this MVP.

That belongs to MVP 08.

Debug visuals should help answer:

```txt
What is the AI deciding right now?
```

---

# Performance Considerations

- Keep network size small
- Avoid external ML libraries
- Avoid heavy matrix abstractions
- Feed-forward inference should be very cheap
- Avoid allocations during every inference step where practical

Suggested initial network shape:

```txt
inputs: sensor count
hidden: 6 neurons
outputs: 4 controls
```

Performance target:

```txt
Stable 60 FPS with one AI-controlled vehicle.
```

---

# Risks

- Output mapping feels inverted or confusing
- AI control mode breaks manual control mode
- Sensor `null` values produce bad inputs
- Neural outputs oscillate rapidly
- Vehicle appears broken because random brain is poor
- Network becomes too coupled to car implementation
- Overengineering the AI before population training exists

---

# Out of Scope

This MVP should NOT include:

- Population training
- Genetic selection
- Mutation refinement
- Brain save/load
- Full neural network visualizer
- Reinforcement learning
- Backpropagation
- External ML libraries
- AI fitness scoring
- Multiple AI cars

This MVP only connects one brain to one vehicle.

The AI is allowed to be bad.

---

# Future Improvements

- Population of AI vehicles
- Mutation-based evolution
- Best-agent selection
- Brain persistence
- Neural network visualizer
- Output smoothing
- Better activation functions
- Multiple network architectures
- Fitness scoring
- Training analytics

---

# Dependencies

Required:

- MVP 01 — Foundation
- MVP 02 — Highway Rendering
- MVP 03 — Vehicle Physics & Controls
- MVP 04 — Collision System
- MVP 05 — Traffic Simulation
- MVP 06 — Sensor System

This MVP depends on:

- Stable game loop
- Working vehicle physics
- Working controls abstraction
- Sensor readings
- Traffic detection
- Collision state
- Road world coordinates

---

# Deliverables

- Simple feed-forward neural network
- Random brain generation
- AI control mode
- Sensor-to-input conversion
- Neural output-to-control mapping
- First autonomous driving behavior
- Updated documentation if implementation decisions change

---

# Notes

This MVP is where the project starts to feel alive.

The AI does not need to drive well yet.

Random brains will often crash, turn incorrectly, or do nothing useful.

That is expected.

The goal is only to prove the control pipeline works:

```txt
sensors → neural network → controls → vehicle movement
```

Once that pipeline is stable, population training and evolution can be introduced safely in the next stages.
