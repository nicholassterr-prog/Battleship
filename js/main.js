// Entry point: wires the DOM to the game model and drives the turn loop.

import { BOARD_SIZE, ORIENTATION, SHIPS } from "./constants.js";
import { Board, Ship } from "./board.js";
import { AI } from "./ai.js";
import { placeFleetRandomly } from "./placement.js";
import {
  buildGrid,
  renderBoard,
  renderShipList,
  renderFleetStatus,
  showPlacementPreview,
  clearPreview,
  setStatus,
} from "./ui.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  playerBoard: null,
  enemyBoard: null,
  ai: null,
  orientation: ORIENTATION.HORIZONTAL,
  activeIndex: 0, // index into SHIPS during setup
  placedNames: new Set(),
  acceptingInput: false,
  gameOver: false,
  phase: "setup", // "setup" | "battle"
  hover: null, // last hovered setup cell, for live preview refresh
  // Incremented on every new game so a queued AI turn from a previous game
  // can detect it is stale and abort.
  generation: 0,
};

// DOM references
const el = {
  setup: document.getElementById("setup"),
  battle: document.getElementById("battle"),
  setupBoard: document.getElementById("setup-board"),
  playerBoard: document.getElementById("player-board"),
  enemyBoard: document.getElementById("enemy-board"),
  shipList: document.getElementById("ship-list"),
  enemyFleet: document.getElementById("enemy-fleet-status"),
  playerFleet: document.getElementById("player-fleet-status"),
  rotateBtn: document.getElementById("rotate-btn"),
  randomBtn: document.getElementById("random-btn"),
  resetBtn: document.getElementById("reset-btn"),
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalText: document.getElementById("modal-text"),
  modalBtn: document.getElementById("modal-btn"),
};

// ---------------------------------------------------------------------------
// Setup phase
// ---------------------------------------------------------------------------
function initSetup() {
  state.generation += 1; // invalidate any pending AI turn
  state.phase = "setup";
  state.playerBoard = new Board(BOARD_SIZE);
  state.orientation = ORIENTATION.HORIZONTAL;
  state.activeIndex = 0;
  state.placedNames = new Set();
  state.hover = null;
  state.gameOver = false;
  state.acceptingInput = false;

  buildGrid(el.setupBoard, BOARD_SIZE, onSetupCellClick);
  refreshSetup();
}

function refreshSetup() {
  renderBoard(el.setupBoard, state.playerBoard, { revealShips: true });
  renderShipList(el.shipList, SHIPS, state.placedNames, state.activeIndex);
  el.startBtn.disabled = state.placedNames.size !== SHIPS.length;
}

function currentShipDef() {
  return SHIPS[state.activeIndex] || null;
}

function onSetupCellClick(row, col) {
  const def = currentShipDef();
  if (!def) return;
  const ship = new Ship(def.name, def.length);
  if (state.playerBoard.placeShip(ship, row, col, state.orientation)) {
    state.placedNames.add(def.name);
    state.activeIndex += 1;
    clearPreview(el.setupBoard);
    refreshSetup();
  }
}

function attachSetupHover() {
  el.setupBoard.addEventListener("mousemove", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const def = currentShipDef();
    if (!def) {
      clearPreview(el.setupBoard);
      return;
    }
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    state.hover = { row, col };
    drawPreview();
  });
  el.setupBoard.addEventListener("mouseleave", () => {
    state.hover = null;
    clearPreview(el.setupBoard);
  });
}

// Draw the placement preview for the currently-hovered cell, if any.
function drawPreview() {
  const def = currentShipDef();
  if (!def || !state.hover) {
    clearPreview(el.setupBoard);
    return;
  }
  const { row, col } = state.hover;
  const cells = state.playerBoard.cellsFor(
    row,
    col,
    def.length,
    state.orientation
  );
  if (!cells) {
    clearPreview(el.setupBoard);
    return;
  }
  const valid = state.playerBoard.canPlace(
    row,
    col,
    def.length,
    state.orientation
  );
  showPlacementPreview(el.setupBoard, cells, valid);
}

function rotate() {
  if (state.phase !== "setup") return;
  state.orientation =
    state.orientation === ORIENTATION.HORIZONTAL
      ? ORIENTATION.VERTICAL
      : ORIENTATION.HORIZONTAL;
  drawPreview(); // reflect the new orientation immediately
}

function randomPlacement() {
  state.playerBoard = new Board(BOARD_SIZE);
  placeFleetRandomly(state.playerBoard);
  state.placedNames = new Set(SHIPS.map((s) => s.name));
  state.activeIndex = SHIPS.length;
  clearPreview(el.setupBoard);
  refreshSetup();
}

// ---------------------------------------------------------------------------
// Battle phase
// ---------------------------------------------------------------------------
function startGame() {
  if (state.placedNames.size !== SHIPS.length) return;

  state.generation += 1; // invalidate any pending AI turn from a prior game
  state.phase = "battle";
  state.enemyBoard = new Board(BOARD_SIZE);
  placeFleetRandomly(state.enemyBoard);
  state.ai = new AI(BOARD_SIZE);
  state.gameOver = false;
  state.acceptingInput = true;

  el.setup.classList.add("hidden");
  el.battle.classList.remove("hidden");

  buildGrid(el.enemyBoard, BOARD_SIZE, onEnemyCellClick);
  buildGrid(el.playerBoard, BOARD_SIZE, null);

  renderAll();
  setStatus("Your turn — fire at the enemy!");
}

function renderAll() {
  renderBoard(el.enemyBoard, state.enemyBoard, { revealShips: false });
  renderBoard(el.playerBoard, state.playerBoard, { revealShips: true });
  renderFleetStatus(el.enemyFleet, state.enemyBoard.ships);
  renderFleetStatus(el.playerFleet, state.playerBoard.ships);
}

function onEnemyCellClick(row, col) {
  if (!state.acceptingInput || state.gameOver) return;

  const result = state.enemyBoard.receiveShot(row, col);
  if (!result.valid) return; // already-fired cell, ignore

  renderAll();

  if (result.sunk) {
    setStatus(`You sank the enemy ${result.sunk.name}!`);
  } else if (result.hit) {
    setStatus("Direct hit!");
  } else {
    setStatus("Miss.");
  }

  if (state.enemyBoard.allSunk) {
    return endGame(true);
  }

  // Hand the turn to the AI after a short beat so the player sees the result.
  state.acceptingInput = false;
  const gen = state.generation;
  setTimeout(() => aiTurn(gen), 650);
}

function aiTurn(gen) {
  // Abort if the game was restarted while this turn was queued.
  if (gen !== state.generation || state.gameOver) return;

  const shot = state.ai.nextShot();
  const result = state.playerBoard.receiveShot(shot.row, shot.col);
  state.ai.registerResult(shot.row, shot.col, result);

  renderAll();

  if (result.sunk) {
    setStatus(`The enemy sank your ${result.sunk.name}!`);
  } else if (result.hit) {
    setStatus("The enemy scored a hit on your fleet.");
  } else {
    setStatus("The enemy missed. Your turn.");
  }

  if (state.playerBoard.allSunk) {
    return endGame(false);
  }

  state.acceptingInput = true;
}

function endGame(playerWon) {
  state.gameOver = true;
  state.acceptingInput = false;
  // Reveal the enemy fleet so the final board is readable.
  renderBoard(el.enemyBoard, state.enemyBoard, { revealShips: true });

  el.modalTitle.textContent = playerWon ? "Victory!" : "Defeat";
  el.modalText.textContent = playerWon
    ? "You sank the entire enemy fleet. Well played, Admiral."
    : "The enemy sank your fleet. Better luck next time.";
  el.modal.classList.remove("hidden");
  setStatus(playerWon ? "You win!" : "You lose.");
}

function restart() {
  el.modal.classList.add("hidden");
  el.battle.classList.add("hidden");
  el.setup.classList.remove("hidden");
  initSetup();
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
el.rotateBtn.addEventListener("click", rotate);
el.randomBtn.addEventListener("click", randomPlacement);
el.resetBtn.addEventListener("click", initSetup);
el.startBtn.addEventListener("click", startGame);
el.restartBtn.addEventListener("click", restart);
el.modalBtn.addEventListener("click", restart);

document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") rotate();
});

// Hover preview listeners live on the persistent board container, so attach
// them exactly once rather than on every setup reset.
attachSetupHover();
initSetup();
