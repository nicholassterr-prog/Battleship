// Shared game constants.

export const BOARD_SIZE = 10;

// Ship definitions: name + length. Order is the placement order.
export const SHIPS = [
  { name: "Carrier", length: 5 },
  { name: "Battleship", length: 4 },
  { name: "Cruiser", length: 3 },
  { name: "Submarine", length: 3 },
  { name: "Destroyer", length: 2 },
];

// Cell states used by the Board model.
export const CELL = {
  EMPTY: "empty",
  SHIP: "ship",
  MISS: "miss",
  HIT: "hit",
};

export const ORIENTATION = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
};
