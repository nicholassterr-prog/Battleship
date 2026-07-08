// Hunt/target AI opponent.
//
// Strategy:
//   * "Hunt" mode: fire at unshot cells on a checkerboard parity (the
//     smallest ship is length 2, so every ship touches at least one parity
//     cell). This roughly halves the search space.
//   * "Target" mode: once a hit lands, queue its orthogonal neighbours. After
//     two hits in a line, prefer continuing along that line.

export class AI {
  constructor(size) {
    this.size = size;
    // Cells queued for targeting after a hit.
    this.targetQueue = [];
    // Hits belonging to the ship currently being hunted down.
    this.currentHits = [];
    // Remember every cell we have already fired at.
    this.tried = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false)
    );
  }

  inBounds(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  // Pick the next cell to fire at.
  nextShot() {
    // Target mode: work through queued neighbours.
    while (this.targetQueue.length > 0) {
      const cell = this.targetQueue.shift();
      if (!this.tried[cell.row][cell.col]) return cell;
    }
    // Hunt mode: choose randomly among parity cells, falling back to any cell.
    const parity = [];
    const any = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.tried[r][c]) continue;
        any.push({ row: r, col: c });
        if ((r + c) % 2 === 0) parity.push({ row: r, col: c });
      }
    }
    const pool = parity.length > 0 ? parity : any;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Feed back the result of the AI's shot so it can adapt.
  registerResult(row, col, result) {
    this.tried[row][col] = true;

    if (!result.hit) return;

    if (result.sunk) {
      // Ship destroyed: clear target state and go back to hunting.
      this.targetQueue = [];
      this.currentHits = [];
      return;
    }

    this.currentHits.push({ row, col });
    this.enqueueNeighbours(row, col);
  }

  enqueueNeighbours(row, col) {
    let neighbours;
    if (this.currentHits.length >= 2) {
      // Two or more hits: we know the ship's axis, so only extend along it.
      const sameRow = this.currentHits.every((h) => h.row === this.currentHits[0].row);
      const sameCol = this.currentHits.every((h) => h.col === this.currentHits[0].col);
      if (sameRow) {
        neighbours = [
          { row, col: col - 1 },
          { row, col: col + 1 },
        ];
      } else if (sameCol) {
        neighbours = [
          { row: row - 1, col },
          { row: row + 1, col },
        ];
      } else {
        neighbours = this.orthogonal(row, col);
      }
    } else {
      neighbours = this.orthogonal(row, col);
    }

    for (const n of neighbours) {
      if (this.inBounds(n.row, n.col) && !this.tried[n.row][n.col]) {
        this.targetQueue.push(n);
      }
    }
  }

  orthogonal(row, col) {
    return [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];
  }
}
