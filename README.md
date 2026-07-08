# Battleship 🚢

A simple, dependency-free **Battleship** game you play in the browser against an
AI opponent. Built with vanilla HTML, CSS, and JavaScript (ES modules).

## ▶️ Play

**Live demo:** https://REPLACE_WITH_PAGES_URL

Or run it locally (see below).

## Features

- Classic 10×10 Battleship with the standard 5-ship fleet
  (Carrier, Battleship, Cruiser, Submarine, Destroyer).
- **Manual ship placement** with a live hover preview and rotation
  (button or press **R**), plus a one-click **Random placement**.
- A genuine **hunt/target AI**: it fires on a checkerboard parity while hunting,
  then focuses fire around hits and follows the ship's axis until it sinks.
- Hit / miss / sunk feedback, per-ship fleet status, and a win/lose screen.
- Fully client-side — no build step, no dependencies.

## Run locally

Because the game uses ES modules, open it through a web server (not `file://`):

```bash
# from the repo root
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tests

Game logic (board, placement, shot resolution, and the AI) is covered by the
Node built-in test runner:

```bash
npm test
```

## Project structure

```
index.html          # markup + phases (setup / battle)
css/styles.css      # styling
js/
  constants.js      # board size, ship list, enums
  board.js          # Board + Ship models (placement, shots, win detection)
  placement.js      # random fleet placement
  ai.js             # hunt/target AI opponent
  ui.js             # DOM rendering helpers
  main.js           # game controller / turn loop
tests/
  logic.test.js     # unit tests for the game model + AI
BUGS.md             # bugs found while building/testing and how they were fixed
```

## License

MIT — see [LICENSE](LICENSE).
