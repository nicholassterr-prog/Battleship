# Battleship — Debugging Notes

This document records the bugs found while building and testing the game and how
each was fixed. Bugs fall into two groups: **logic bugs** caught by the automated
test suite (`tests/logic.test.js`), and **UI / interaction bugs** caught while
play-testing in the browser.

The test suite can be run with:

```bash
npm test        # node --test
```

---

## How the game was tested

1. **Unit tests** for the pure game model (`Board`, `Ship`, random placement,
   and the AI) — 9 tests covering placement rules, shot resolution, win
   detection, and AI behaviour over hundreds of simulated games.
2. **Manual play-testing** in Chrome: ship placement (manual + random),
   rotation, firing, AI responses, win/lose modal, and restarting.

---

## Bugs found and fixed

### 1. Rotation did not update the placement preview

**Symptom.** During setup, hovering a cell shows a green preview of where the
current ship will land. If you pressed **R** (or clicked *Rotate*) while the
cursor was already resting on a cell, the preview kept its old orientation until
you nudged the mouse. It looked like rotation had no effect.

**Cause.** The preview was only ever recomputed inside the board's `mousemove`
handler. Rotating changed `state.orientation` but never re-rendered the preview.

**Fix.** The hovered cell is now stored in `state.hover`, and the preview is
drawn by a single `drawPreview()` helper. `rotate()` calls `drawPreview()` so the
preview reflects the new orientation immediately.
(`js/main.js` — `drawPreview`, `rotate`.)

### 2. A stale AI move could fire after starting a new game

**Symptom.** After you fire, the AI's reply is delayed by ~0.65 s so the player
can see the result. If you clicked **New game** (or hit an end-game restart)
during that delay, a "ghost" AI shot from the finished game could still execute
against the freshly-created board, corrupting the new game's state.

**Cause.** The AI turn was scheduled with `setTimeout(aiTurn, 650)` and the
callback only bailed out on `gameOver`, which is `false` for a brand-new game.

**Fix.** Added a monotonically increasing `state.generation` counter that is
bumped whenever a game starts or resets. The scheduled callback captures the
generation at scheduling time and aborts if it no longer matches the current
generation. (`js/main.js` — `startGame`, `initSetup`, `aiTurn`.)

### 3. Hover listeners leaked on every reset

**Symptom.** Not visible at first, but each *Reset* / *New game* made the
placement preview progressively heavier, because the same work ran multiple
times per mouse move.

**Cause.** `attachSetupHover()` — which adds `mousemove`/`mouseleave` listeners
to the setup board **container** — was being called inside `initSetup()`, which
runs on every reset. Since `buildGrid` only clears the container's *children*,
the container-level listeners accumulated (one extra pair per reset).

**Fix.** The hover listeners are now attached exactly once at start-up, outside
`initSetup()`. (`js/main.js` — module init calls `attachSetupHover()` once.)

### 4. Out-of-bounds and overlapping ship placement (caught by tests)

**Symptom / risk.** A naive placement routine can let a ship run off the edge of
the board (index wrap-around) or overlap another ship.

**Guard.** `Board.cellsFor` returns `null` if any cell is off-board, and
`Board.canPlace` rejects placement if any target cell is occupied. Covered by
`placeShip rejects out-of-bounds placement` and
`placeShip rejects overlapping ships`, plus a 200-iteration randomized test that
asserts the random fleet always occupies exactly the expected number of cells
(i.e. no overlaps ever).

### 5. Firing twice on the same cell (caught by tests)

**Symptom / risk.** Re-firing an already-hit/missed cell could double-count a hit
(sinking ships too early) or waste the AI's turn.

**Guard.** `Board.receiveShot` tracks a `shots` grid and returns
`{ valid: false }` for any repeat shot; the UI ignores invalid shots so the turn
is not consumed. The AI additionally tracks a `tried` grid and is verified by the
`AI never fires at the same cell twice over a full game` test.

---

## AI quality check

Beyond correctness, a test simulates 50 full games and asserts the hunt/target
AI sinks a fleet in **fewer than 80 shots on average** (random firing needs ~96).
This guards against regressions that would silently make the AI play randomly —
for example if the "target after a hit" queue stopped working.
