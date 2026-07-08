import { test } from "node:test";
import assert from "node:assert/strict";

import { Board, Ship } from "../js/board.js";
import { AI } from "../js/ai.js";
import { placeFleetRandomly } from "../js/placement.js";
import { ORIENTATION, SHIPS, BOARD_SIZE } from "../js/constants.js";

test("ship reports sunk only after enough hits", () => {
  const ship = new Ship("Destroyer", 2);
  assert.equal(ship.isSunk, false);
  ship.hits = 1;
  assert.equal(ship.isSunk, false);
  ship.hits = 2;
  assert.equal(ship.isSunk, true);
});

test("placeShip rejects out-of-bounds placement", () => {
  const board = new Board(10);
  const ship = new Ship("Carrier", 5);
  assert.equal(board.placeShip(ship, 0, 7, ORIENTATION.HORIZONTAL), false);
  assert.equal(board.ships.length, 0);
});

test("placeShip rejects overlapping ships", () => {
  const board = new Board(10);
  assert.equal(
    board.placeShip(new Ship("A", 3), 0, 0, ORIENTATION.HORIZONTAL),
    true
  );
  assert.equal(
    board.placeShip(new Ship("B", 3), 0, 2, ORIENTATION.HORIZONTAL),
    false
  );
});

test("receiveShot resolves hit, miss, and sink", () => {
  const board = new Board(10);
  const ship = new Ship("Destroyer", 2);
  board.placeShip(ship, 0, 0, ORIENTATION.HORIZONTAL);

  const miss = board.receiveShot(5, 5);
  assert.equal(miss.hit, false);

  const hit = board.receiveShot(0, 0);
  assert.equal(hit.hit, true);
  assert.equal(hit.sunk, null);

  const sink = board.receiveShot(0, 1);
  assert.equal(sink.hit, true);
  assert.equal(sink.sunk, ship);
  assert.equal(board.allSunk, true);
});

test("receiveShot rejects repeat shots on the same cell", () => {
  const board = new Board(10);
  board.placeShip(new Ship("Destroyer", 2), 0, 0, ORIENTATION.HORIZONTAL);
  assert.equal(board.receiveShot(0, 0).valid, true);
  assert.equal(board.receiveShot(0, 0).valid, false);
});

test("allSunk is false on an empty board", () => {
  const board = new Board(10);
  assert.equal(board.allSunk, false);
});

test("random fleet places every ship without overlap", () => {
  for (let i = 0; i < 200; i++) {
    const board = new Board(BOARD_SIZE);
    placeFleetRandomly(board);
    assert.equal(board.ships.length, SHIPS.length);
    // Count occupied cells; must equal total ship length with no overlap.
    let occupied = 0;
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        if (board.grid[r][c]) occupied++;
      }
    }
    const expected = SHIPS.reduce((sum, s) => sum + s.length, 0);
    assert.equal(occupied, expected);
  }
});

test("AI never fires at the same cell twice over a full game", () => {
  const board = new Board(BOARD_SIZE);
  placeFleetRandomly(board);
  const ai = new AI(BOARD_SIZE);
  const seen = new Set();
  let guard = 0;
  while (!board.allSunk && guard < 200) {
    guard++;
    const shot = ai.nextShot();
    const key = `${shot.row},${shot.col}`;
    assert.equal(seen.has(key), false, `AI repeated shot ${key}`);
    seen.add(key);
    const result = board.receiveShot(shot.row, shot.col);
    assert.equal(result.valid, true);
    ai.registerResult(shot.row, shot.col, result);
  }
  assert.equal(board.allSunk, true, "AI failed to sink the fleet");
});

test("AI sinks a fleet within a reasonable number of shots on average", () => {
  let total = 0;
  const games = 50;
  for (let g = 0; g < games; g++) {
    const board = new Board(BOARD_SIZE);
    placeFleetRandomly(board);
    const ai = new AI(BOARD_SIZE);
    let shots = 0;
    while (!board.allSunk && shots < 200) {
      const shot = ai.nextShot();
      const result = board.receiveShot(shot.row, shot.col);
      ai.registerResult(shot.row, shot.col, result);
      shots++;
    }
    total += shots;
  }
  const avg = total / games;
  // A hunt/target AI should comfortably beat random (~96); assert < 80.
  assert.ok(avg < 80, `AI averaged ${avg} shots, expected < 80`);
});
