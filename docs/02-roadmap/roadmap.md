# NeuroDriveCar — Roadmap

This document defines the high-level evolution plan for NeuroDriveCar.

The roadmap is intentionally incremental.

The project evolves from:

```txt
Simple autonomous highway simulation
```

toward:

```txt
A complete AI driving sandbox with increasingly complex
traffic systems, procedural environments, and emergent behavior.
```

---

# Development Philosophy

The roadmap follows these principles:

- Simulation before visuals
- Correctness before optimization
- Debuggability before realism
- Incremental complexity
- Small stable milestones

Every MVP should leave the project in a:

```txt
Playable and testable state.
```

---

# Stage 1 — Autonomous Highway Simulation

Goal:

```txt
Train AI-controlled vehicles to survive as long as possible
on a multi-lane highway using sensor-based neural decisions.
```

This stage establishes:

- Physics
- Sensors
- Raycasting
- Neural networks
- Evolution systems
- Collision systems
- Real-time visualization

---

# MVP 01 — Foundation

Status:

```txt
Planned
```

Focus:

- Vite + TypeScript setup
- Canvas 2D initialization
- Game loop
- Resize handling
- Initial architecture

Deliverable:

```txt
Stable browser simulation foundation.
```

---

# MVP 02 — Highway Rendering

Status:

```txt
Planned
```

Focus:

- Infinite vertical highway
- 3-lane system
- Lane separators
- Camera baseline
- World coordinates

Deliverable:

```txt
Scrollable multi-lane highway environment.
```

---

# MVP 03 — Vehicle Physics & Controls

Status:

```txt
Planned
```

Focus:

- Vehicle movement
- Acceleration
- Friction
- Steering
- Rotation
- Keyboard controls

Deliverable:

```txt
Manually drivable vehicle with believable movement.
```

---

# MVP 04 — Collision System

Status:

```txt
Planned
```

Focus:

- Polygon generation
- Road collision detection
- Vehicle collision detection
- Damage state

Deliverable:

```txt
Reliable collision handling and vehicle destruction state.
```

---

# MVP 05 — Traffic Simulation

Status:

```txt
Planned
```

Focus:

- AI traffic cars
- Lane spawning
- Relative speed behavior
- Traffic density

Deliverable:

```txt
Dynamic traffic environment.
```

---

# MVP 06 — Sensor System

Status:

```txt
Planned
```

Focus:

- Raycasting
- Distance detection
- Road edge detection
- Traffic detection
- Sensor visualization

Deliverable:

```txt
Functional sensor-based environmental perception.
```

---

# MVP 07 — Neural Network Driving

Status:

```txt
Planned
```

Focus:

- Feed-forward neural network
- Sensor inputs
- Steering outputs
- AI-controlled driving

Deliverable:

```txt
Vehicles capable of autonomous behavior.
```

---

# MVP 08 — Neural Visualizer & HUD

Status:

```txt
Planned
```

Focus:

- Neural activity visualization
- HUD information
- Debug overlays
- Best-car highlighting

Deliverable:

```txt
Readable real-time AI debugging interface.
```

---

# MVP 09 — Population Training

Status:

```txt
Planned
```

Focus:

- Multiple simultaneous AI vehicles
- Evolution cycles
- Mutation systems
- Best-agent selection

Deliverable:

```txt
Emergent evolutionary driving behavior.
```

---

# MVP 10 — Brain Persistence

Status:

```txt
Planned
```

Focus:

- Save/load best brain
- Mutation refinement
- Simulation restart controls
- Brain reuse

Deliverable:

```txt
Persistent AI evolution between sessions.
```

---

# Stage 1 Completion Criteria

Stage 1 is complete when the project supports:

- Highway driving simulation
- Traffic vehicles
- Stable collisions
- Sensor-based AI
- Population evolution
- Brain persistence
- Neural visualization
- Real-time debugging
- Stable performance

Expected final experience:

```txt
Watch dozens of AI-controlled vehicles learn to survive
progressively longer on a highway environment.
```

---

# Stage 2 — Advanced Road Systems

Planned future focus:

- Curved roads
- Dynamic lane counts
- Road merging
- Intersections
- Ramps
- Split highways
- Camera improvements

Goal:

```txt
Increase environmental complexity beyond straight highways.
```

---

# Stage 3 — Urban Simulation

Planned future focus:

- City blocks
- Intersections
- Traffic lights
- Pedestrians
- Crosswalks
- Multi-directional traffic
- Sign systems

Goal:

```txt
Create a realistic urban autonomous-driving sandbox.
```

---

# Stage 4 — Advanced AI Systems

Planned future focus:

- Improved evolutionary algorithms
- Reinforcement learning experiments
- Goal-based navigation
- Pathfinding
- Route planning
- Behavioral specialization

Goal:

```txt
Evolve from reactive driving to strategic autonomous behavior.
```

---

# Stage 5 — Simulation Sandbox

Planned future focus:

- Procedural worlds
- Replay systems
- Training analytics
- Simulation recording
- Experiment presets
- Scenario editor
- AI comparison tools

Goal:

```txt
Transform the project into a full autonomous-driving experimentation platform.
```

---

# Long-Term Vision

Long-term direction:

```txt
A visually clean, technically understandable,
fully controllable autonomous driving simulation platform
built entirely with custom systems.
```


The project should remain:

- Educational
- Extensible
- Visually debuggable
- Architecture-driven
- Simulation-focused

---

# Tentative MVP Backlog

The following MVPs are tentative future milestones.

They are intentionally flexible and may evolve as the project grows.

The purpose of this backlog is to:

- Preserve ideas
- Maintain long-term direction
- Avoid forgetting promising systems
- Keep scope visible and organized

These MVPs are NOT committed implementation order.

---

## Stage 1 Expansion

### MVP 11 — Simulation Controls

Focus:

- Pause/resume
- Simulation speed controls
- Population size controls
- Reset/restart tools
- Training controls

---

### MVP 12 — Visual Polish Pass

Focus:

- Improved road rendering
- Vehicle styling
- Better HUD visuals
- Shadows and contrast
- Cleaner debug visuals

---

### MVP 13 — Replay System

Focus:

- Record best runs
- Ghost replay
- Playback controls
- Replay export/import

---

## Stage 2 Expansion

### MVP 14 — Curved Roads

Focus:

- Curved lane rendering
- Curved world coordinates
- Curved sensor interactions
- Camera smoothing improvements

---

### MVP 15 — Dynamic Traffic Behaviors

Focus:

- Lane changes
- Relative speed adaptation
- Overtaking behavior
- Traffic density variation

---

### MVP 16 — Road Events

Focus:

- Obstacles
- Construction zones
- Closed lanes
- Random hazards

---

## Stage 3 Expansion

### MVP 17 — Intersections

Focus:

- Multi-directional roads
- Crossing traffic
- Basic traffic logic
- Intersection collision handling

---

### MVP 18 — Traffic Lights

Focus:

- Traffic light systems
- Light state timing
- AI stop/go behavior
- Rule-based navigation

---

### MVP 19 — Pedestrian System

Focus:

- Pedestrian entities
- Crosswalk logic
- Pedestrian avoidance
- Collision penalties

---

### MVP 20 — Urban Navigation

Focus:

- Destination targets
- Route selection
- Navigation decisions
- Goal-oriented AI behavior

---

## Advanced AI Research

### MVP 21 — Improved Evolution Algorithms

Focus:

- Better mutation strategies
- Population selection improvements
- Diversity preservation
- Training stability

---

### MVP 22 — Reinforcement Learning Experiments

Focus:

- Reward systems
- Policy experimentation
- Hybrid AI approaches
- Comparative training methods

---

### MVP 23 — Behavioral Specialization

Focus:

- Aggressive drivers
- Defensive drivers
- High-speed behaviors
- Adaptive driving personalities

---

## Sandbox Features

### MVP 24 — Scenario Editor

Focus:

- Custom road layouts
- Traffic configuration
- Spawn editing
- Training scenario presets

---

### MVP 25 — Analytics Dashboard

Focus:

- Training statistics
- Evolution metrics
- Performance graphs
- Simulation diagnostics

---

### MVP 26 — Procedural World Generation

Focus:

- Infinite procedural roads
- Dynamic environments
- Randomized scenarios
- Simulation replayability

---

### MVP 27 — Weather System

Focus:

- Rain
- Fog
- Reduced visibility
- Surface friction variation

---

### MVP 28 — Day/Night Cycle

Focus:

- Dynamic lighting
- Headlight systems
- Visibility challenges
- Time-based rendering

---

### MVP 29 — Multi-Agent Experiments

Focus:

- Cooperative AI
- Competitive AI
- Swarm behaviors
- Emergent traffic ecosystems

---

### MVP 30 — Experimental Research Playground

Focus:

- Rapid AI experimentation
- Alternate sensor systems
- New training models
- Simulation sandbox tooling
