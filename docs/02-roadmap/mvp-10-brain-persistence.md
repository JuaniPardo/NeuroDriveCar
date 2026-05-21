MVP 10 — Brain Persistence

Status:

Completed

⸻

Roadmap Position
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
[→] MVP 10 — Brain Persistence
[ ] MVP 11 — Simulation Controls
[ ] MVP 12 — Visual Polish Pass
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
⸻

Goal

Add persistence for the best-performing neural brain so training progress can continue across simulation runs and browser sessions.

This MVP turns population training from a one-off experiment into an iterative evolutionary workflow.

The player/user should experience:

* Ability to save the best-performing brain
* Ability to load a previously saved brain
* Ability to delete/reset the saved brain
* New populations initialized from the saved best brain
* Mutated variants of the saved brain competing against each other
* A visible sense of continued improvement between runs

The technical milestone is:

* Brain serialization
* Brain deserialization
* localStorage persistence
* Brain cloning
* Brain mutation
* Population initialization from saved brain
* Basic persistence controls or keyboard shortcuts

This MVP matters because the core learning loop becomes practical:
```txt
train → select best → save brain → restart → mutate copies → improve
```
Without persistence, every run starts from scratch.

With persistence, the project becomes an actual training lab.

⸻

Summary
```txt
Implement save/load/delete support for the best neural brain using localStorage,
then use the saved brain to seed future populations with mutated copies for
iterative evolutionary improvement.
```

⸻

Features

* Save best brain
* Load saved brain
* Delete saved brain
* Brain serialization
* Brain deserialization
* Brain cloning
* Mutation utility
* Population seeding from saved brain
* Mutation rate configuration placeholder
* HUD indication of saved brain status
* Safe fallback to random brains when no saved brain exists

⸻

Technical Scope

Create or extend the following systems:

* Brain persistence utilities
* Brain clone utilities
* Brain mutation utilities
* localStorage integration
* Population initialization strategy
* Best-brain save flow
* Saved-brain load flow
* Saved-brain delete/reset flow
* HUD status integration

Expected files involved:
```txt
src/
ai/
Brain.ts
NeuralNetwork.ts
mutation.ts
population/
PopulationManager.ts
utils/
storage.ts
ui/
Hud.ts
game/
Game.ts
```

Potential concepts introduced:

* saved brain key
* brain snapshot
* mutation rate
* mutation amount
* cloned brain
* baseline brain
* persisted best brain
* seeded population
* random fallback

⸻

Architecture Notes

* Persistence should store brain data, not full car state
* localStorage logic should be isolated in utility functions
* Brain serialization should remain explicit and readable
* Mutation should operate on brain/network data, not on car instances
* PopulationManager should be able to generate either random brains or mutated copies of a saved brain
* Saved brain loading should not silently break if data is invalid
* HUD should display persistence status without controlling simulation directly
* Avoid adding a full UI framework in this MVP
* Avoid implementing advanced genetic algorithms in this MVP

The saved brain is the training artifact.

The car is only the runtime body using that artifact.

⸻

Tasks

Persistence

* Define localStorage key for best brain
* Implement save best brain
* Implement load saved brain
* Implement delete saved brain
* Validate loaded brain structure safely
* Handle missing or invalid saved brain gracefully

Brain Utilities

* Ensure brain/network data is serializable
* Implement brain cloning
* Implement mutation utility
* Mutate weights and biases by configurable amount
* Keep mutation deterministic where practical if seeded randomness exists
* Keep mutation simple and readable

Population Integration

* Allow population to start from random brains when no saved brain exists
* Allow population to start from saved brain when available
* Create mutated copies of saved brain for population members
* Keep at least one exact copy of the saved brain if useful
* Preserve best-car selection from MVP 09
* Ensure crashed/inactive behavior still works

Controls / Interaction

* Add simple way to save best brain
* Add simple way to load/restart from saved brain
* Add simple way to delete saved brain
* Keep interaction minimal and explicit
* Avoid full simulation control panel in this MVP

HUD / Debug

* Show whether a saved brain exists
* Show mutation rate placeholder/value
* Show generation number if already present
* Show when current population is seeded from saved brain
* Show save/load/delete feedback if practical

Technical

* Keep persistence independent from rendering
* Avoid storing circular references
* Avoid storing runtime-only car state
* Keep saved data versionable if practical
* Ensure app does not crash on corrupted localStorage data

⸻

Acceptance Criteria

This MVP is complete when:

* Best-performing brain can be saved
* Saved brain persists after page refresh
* Saved brain can be loaded safely
* Saved brain can seed a new population
* Population members can be mutated copies of the saved brain
* Saved brain can be deleted/reset
* App falls back to random brains when no saved brain exists
* Invalid saved data does not crash the app
* HUD communicates saved-brain status clearly
* Existing population training, HUD, sensors, traffic, collisions, and AI behavior continue working

⸻

Debug Visualization

Useful debug/status information:

* Saved brain exists: yes/no
* Current population source: random/saved
* Mutation rate
* Generation number
* Best distance
* Save/load/delete status message
* Best car index

Debug information should help answer:

Am I training from scratch or improving a saved brain?

and:

Was the best brain saved successfully?

⸻

Performance Considerations

* Brain save/load should not happen every frame
* localStorage writes should only happen on explicit save actions
* Mutation should happen during population creation, not during every update
* Avoid deep cloning every frame
* Keep saved brain data compact and readable

Performance target:

No measurable runtime performance cost during normal simulation.

⸻

Risks

* Saving runtime car state instead of brain data
* Corrupted localStorage breaking app startup
* Mutation accidentally modifying the saved baseline brain directly
* All population members sharing the same brain object reference
* Loaded brain shape mismatching current network architecture
* UI controls becoming too complex too early
* Persistence logic becoming coupled to rendering or HUD

⸻

Out of Scope

This MVP should NOT include:

* Full simulation control panel
* Advanced generation management
* Crossover/reproduction algorithms
* Fitness history charts
* Cloud persistence
* User accounts
* Export/import files
* Replay system
* Scenario editor
* Advanced analytics dashboard

This MVP is about local best-brain persistence and mutated population seeding only.

⸻

Future Improvements

* Export/import brain JSON
* Save multiple brains
* Named training runs
* Brain versioning
* Training history
* Fitness charts
* Mutation controls in UI
* Generation comparison
* Best-run replay
* Cloud sync
* Scenario-specific saved brains

⸻

Dependencies

Required:

* MVP 01 — Foundation
* MVP 02 — Highway Rendering
* MVP 03 — Vehicle Physics & Controls
* MVP 04 — Collision System
* MVP 05 — Traffic Simulation
* MVP 06 — Sensor System
* MVP 07 — Neural Network Driving
* MVP 08 — Neural Visualizer & HUD
* MVP 09 — Population Training

This MVP depends on:

* Working population manager
* Independent brain instances
* Best-car selection
* Serializable neural network structure
* Working mutation-ready brain data
* HUD status display
* Stable AI control behavior

⸻

Deliverables

* Brain persistence utility
* Brain save/load/delete flow
* Brain cloning utility
* Brain mutation utility
* Population seeding from saved brain
* HUD saved-brain status
* Safe localStorage fallback behavior
* Updated documentation if implementation decisions change

⸻

Notes

This MVP completes the first practical training loop.

The goal is not advanced evolution yet.

The goal is simple:

Keep the best brain, make variants, and try again.

This is the point where NeuroDriveCar starts behaving like an actual iterative AI training experiment instead of a single-run demo.
