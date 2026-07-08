// Board model: owns ship placement and shot resolution for one player.

import { BOARD_SIZE, ORIENTATION } from "./constants.js";

export class Ship {
  constructor(name, length) {
    this.name = name;
    this.length = length;
    // Coordinates occupied by this ship, filled in on placement.
    this.cells = [];
    this.hits = 0;
  }

  get isSunk() {
    return this.hits >= this.length;
  }
}

export class Board {
  constructor(size = BOARD_SIZE) {
    this.size = size;
    this.ships = [];
    // Grid stores a reference to the ship occupying a cell, or null.
    this.grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => null)
    );
    // Track shots so we never resolve the same cell twice.
    this.shots = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false)
    );
  }

  inBounds(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  // Returns the list of cells a ship would occupy, or null if off-board.
  cellsFor(row, col, length, orientation) {
    const cells = [];
    for (let i = 0; i < length; i++) {
      const r = orientation === ORIENTATION.VERTICAL ? row + i : row;
      const c = orientation === ORIENTATION.HORIZONTAL ? col + i : col;
      if (!this.inBounds(r, c)) return null;
      cells.push({ row: r, col: c });
    }
    return cells;
  }

  canPlace(row, col, length, orientation) {
    const cells = this.cellsFor(row, col, length, orientation);
    if (!cells) return false;
    // Reject overlap with any already-placed ship.
    return cells.every(({ row: r, col: c }) => this.grid[r][c] === null);
  }

  placeShip(ship, row, col, orientation) {
    if (!this.canPlace(row, col, ship.length, orientation)) return false;
    const cells = this.cellsFor(row, col, ship.length, orientation);
    ship.cells = cells;
    ship.hits = 0;
    for (const { row: r, col: c } of cells) {
      this.grid[r][c] = ship;
    }
    this.ships.push(ship);
    return true;
  }

  removeShip(ship) {
    for (const { row, col } of ship.cells) {
      this.grid[row][col] = null;
    }
    ship.cells = [];
    ship.hits = 0;
    this.ships = this.ships.filter((s) => s !== ship);
  }

  // Resolve a shot. Returns { valid, hit, sunk, ship }.
  receiveShot(row, col) {
    if (!this.inBounds(row, col) || this.shots[row][col]) {
      return { valid: false, hit: false, sunk: null, ship: null };
    }
    this.shots[row][col] = true;
    const ship = this.grid[row][col];
    if (ship) {
      ship.hits += 1;
      return {
        valid: true,
        hit: true,
        sunk: ship.isSunk ? ship : null,
        ship,
      };
    }
    return { valid: true, hit: false, sunk: null, ship: null };
  }

  get allSunk() {
    return this.ships.length > 0 && this.ships.every((s) => s.isSunk);
  }
}
