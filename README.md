## Project Details
**Objective**: 
- Developed a classic Tetris game, utilizing functional programming principles within the TypeScript language for a maintainable and scalable codebase.

**Core Logic**: 
- Implemented the game's core mechanics, including tetromino generation, collision detection, line clearing, and scoring system. Ensured that the game logic adheres strictly to the functional programming paradigm, with a focus on pure functions and immutable data.

**Keyboard Interaction:**
- Managed keyboard interactions through a reactive programming model using Observables.
- Set up listeners for specific keypress events to allow real-time game control without polling or manual event loop handling.
- Enabled a non-blocking game loop that reacts to user inputs asynchronously, ensuring a responsive gaming experience.

**Controls:**
- W: Rotate the current tetromino.
- A: Move the current tetromino left.
- S: Accelerate the descent of the current tetromino.
- D: Move the current tetromino right.

**Tetromino Movement:**
- Adjusted the tetromino's coordinates in response to keypress Observables, modifying the game state in a functional manner.
- Encapsulated movement and rotation logic within pure functions to facilitate testing and debugging.
- Managed game state updates efficiently to minimize redraws and optimize performance.

## Usage

Setup (requires node.js):
```
> npm install
```

Start tests:
```
> npm test
```

Serve up the App (and ctrl-click the URL that appears in the console)
```
> npm run dev
```

```
src/
  main.ts        -- main code logic inc. core game loop
  types.ts       -- common types and type aliases
  util.ts        -- util functions
  state.ts       -- state processing and transformation
  view.ts        -- rendering
  observable.ts  -- functions to create Observable streams
```
