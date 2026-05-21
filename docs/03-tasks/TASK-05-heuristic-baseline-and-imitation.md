# TASK 05 — Heuristic Baseline Driver & Imitation Seed

Status:

```txt
Completed
```

---

# Summary

Added an explicit driver-mode layer with:

- `manual`
- `ai`
- `heuristic`

The simulation now keeps the neural population intact while exposing a deterministic heuristic baseline car for comparison and future imitation seeding.

---

# Implemented

- explicit driver mode selection in the control panel
- safe mode switching between manual, AI, and heuristic views
- `HeuristicDriver` as a separate deterministic module
- target-lane support limited to the heuristic driver
- compact heuristic diagnostics in the HUD
- AI vs heuristic baseline comparison metrics in the HUD
- lightweight imitation sample recording structure for future seeding work
- persistence and traffic controls preserved

---

# Validation

Validated after implementation:

- manual driving still works
- AI driving still works
- heuristic driving works
- heuristic survives longer than the current random/saved AI baseline in sparse traffic
- traffic tuning still works and applies on restart
- persistence save/load still works
- HUD remains readable with the neural visualizer visible
- production build passes

---

# Result

The project now has a dumb-but-viable heuristic baseline driver that can stay on-road, recover toward lane centers, avoid obvious sparse-traffic obstacles, and provide a stable comparison target while leaving neural behavior emergent.
