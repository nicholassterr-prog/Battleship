// Random ship placement, reused for the AI fleet and the "Random" button.

import { ORIENTATION, SHIPS } from "./constants.js";
import { Ship } from "./board.js";

function randInt(max) {
  return Math.floor(Math.random() * max);
}

// Fill a board with a randomly-placed standard fleet.
export function placeFleetRandomly(board) {
  for (const def of SHIPS) {
    const ship = new Ship(def.name, def.length);
    let placed = false;
    // Bounded retry loop; the standard fleet always fits well within this.
    for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
      const orientation =
        Math.random() < 0.5 ? ORIENTATION.HORIZONTAL : ORIENTATION.VERTICAL;
      const row = randInt(board.size);
      const col = randInt(board.size);
      placed = board.placeShip(ship, row, col, orientation);
    }
    if (!placed) {
      // Extremely unlikely; restart the whole layout to stay consistent.
      resetBoard(board);
      return placeFleetRandomly(board);
    }
  }
  return board;
}

function resetBoard(board) {
  for (const ship of [...board.ships]) {
    board.removeShip(ship);
  }
}
