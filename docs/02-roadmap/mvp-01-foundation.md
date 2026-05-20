# MVP 01 — Foundation

Status:

```txt
Planned
```

---

# Goal

Create the technical foundation for NeuroDriveCar.

This MVP establishes the minimum working application structure required to build the autonomous driving simulation incrementally.

The player/user should experience:

- A working browser application
- A visible full-window Canvas 2D surface
- A stable real-time render loop
- A basic dark laboratory-style visual baseline

The technical milestone is:

- A Vite + TypeScript project prepared for a custom Canvas 2D simulation engine
- Clear separation between initialization, game loop, rendering, and future simulation systems

This MVP matters because every future system depends on a stable foundation:

- Road rendering
- Vehicle physics
- Sensors
- Collisions
- AI behavior
- HUD and neural visualizer

---

# Summary

```txt
Initialize the application shell, Canvas 2D rendering surface,
game loop, resize handling, and basic project structure for the
NeuroDriveCar simulation.
```

---

# Features

- Browser app boots successfully
- Canvas fills the available viewport
- Canvas resizes with the browser window
- Game loop runs continuously with `requestAnimationFrame`
- Basic dark background is rendered
- Initial debug information can be displayed on screen
- Foundation folders and core files are prepared

---

# Technical Scope

Create or prepare the following systems:

- Application entry point
- Canvas creation and setup
- Canvas resize handling
- Main `Game` class
- Game loop with update/render separation
- Basic timing using `deltaTime`
- Initial renderer baseline
- Initial project folder structure

Suggested initial structure:

```txt
src/
  main.ts
  game/
    Game.ts
    Loop.ts
    Camera.ts
  world/
    Road.ts
  car/
    Car.ts
    Controls.ts
  sensors/
    Sensor.ts
  collision/
    geometry.ts
  ai/
    NeuralNetwork.ts
    mutation.ts
  ui/
    Hud.ts
    NeuralVisualizer.ts
  utils/
    math.ts
    storage.ts
```

Not all files need full implementation in this MVP.

Empty placeholder files are acceptable only when they clarify near-term architecture.

---

# Architecture Notes

- Rendering and simulation must remain separated from the beginning
- `main.ts` should only bootstrap the application
- `Game` should coordinate update and render calls
- The game loop should be reusable and not tied to a specific feature
- Screen coordinates and future world coordinates should not be mixed unnecessarily
- The Canvas context should be initialized once and passed explicitly where needed
- Avoid introducing React, PixiJS, Three.js, Phaser, or any game engine
- Avoid building UI frameworks before the simulation exists

The foundation should stay simple enough to understand in one sitting.

---

# Tasks

## Core

- [ ] Confirm Vite + TypeScript project setup
- [ ] Create or clean `src/main.ts`
- [ ] Create full-window Canvas element
- [ ] Get `CanvasRenderingContext2D` safely
- [ ] Create `Game` class
- [ ] Create `Loop` class or loop function
- [ ] Implement `update(deltaTime)` method
- [ ] Implement `render(ctx)` method
- [ ] Start loop using `requestAnimationFrame`

## Visual

- [ ] Render dark background
- [ ] Add subtle lab/simulation visual baseline
- [ ] Add temporary debug text for FPS or frame delta
- [ ] Ensure canvas looks clean on desktop browser

## Technical

- [ ] Handle browser resize
- [ ] Account for `devicePixelRatio` if practical
- [ ] Keep initialization code small and explicit
- [ ] Add basic folder structure for future systems
- [ ] Avoid feature implementation beyond foundation scope

---

# Acceptance Criteria

This MVP is complete when:

- App runs locally with the Vite dev server
- Canvas is visible and fills the screen
- Canvas resizes correctly when the browser window changes size
- Render loop runs continuously without console errors
- `update()` and `render()` are clearly separated
- Project has a clean initial folder structure
- No heavy rendering/game framework has been introduced
- Code remains simple, readable, and TypeScript-safe

---

# Debug Visualization

Initial debug display may include:

- FPS
- Delta time
- Canvas size
- Device pixel ratio

This should be minimal and temporary.

The goal is to confirm that the application loop and rendering surface are working.

---

# Performance Considerations

- Avoid unnecessary allocations inside the animation loop
- Avoid recreating the Canvas context
- Avoid attaching duplicate event listeners
- Keep resize logic centralized
- Do not optimize prematurely

Performance goal for MVP 01:

```txt
Stable 60 FPS baseline on a normal desktop browser.
```

---

# Risks

- Mixing DOM/UI responsibilities with simulation code too early
- Creating an overcomplicated engine before the first visible feature
- Handling resize incorrectly and causing blurry Canvas rendering
- Forgetting `devicePixelRatio`, resulting in poor visual sharpness
- Adding premature abstractions that slow down iteration

---

# Out of Scope

This MVP should NOT include:

- Road rendering
- Car physics
- Keyboard controls
- Traffic
- Sensors
- Collisions
- Neural networks
- Population training
- Brain persistence
- HUD controls
- Visual polish beyond a clean baseline

---

# Future Improvements

- Add camera system
- Add world coordinate helpers
- Add road rendering
- Add reusable debug overlay
- Add simulation speed controls
- Add pause/resume
- Add screenshot or recording support

---

# Dependencies

None.

This is the first implementation MVP.

---

# Deliverables

- Working Vite + TypeScript app
- Canvas 2D initialized and rendered
- Stable update/render loop
- Resize-safe rendering surface
- Initial folder structure
- Updated documentation if implementation decisions change

---

# Notes

MVP 01 should stay intentionally small.

The purpose is not to build the game yet.

The purpose is to create a clean base that makes the next MVPs easy to implement without rewriting the project.
