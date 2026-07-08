// DOM rendering helpers. Keeps all board-drawing logic in one place.

import { CELL } from "./constants.js";

// Build an empty grid of cell buttons inside `container`.
// `onCell` is called with (row, col) when a cell is activated.
export function buildGrid(container, size, onCell) {
  container.innerHTML = "";
  container.style.setProperty("--size", size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
      if (onCell) {
        cell.addEventListener("click", () => onCell(r, c));
      }
      container.appendChild(cell);
    }
  }
}

function cellEl(container, row, col) {
  return container.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`
  );
}

// Render a board's state. When `revealShips` is false (enemy board) intact
// ships stay hidden.
export function renderBoard(container, board, { revealShips }) {
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const el = cellEl(container, r, c);
      if (!el) continue;
      el.classList.remove("ship", "hit", "miss", "sunk");
      const ship = board.grid[r][c];
      const shot = board.shots[r][c];
      if (shot && ship) {
        el.classList.add(ship.isSunk ? "sunk" : "hit");
      } else if (shot && !ship) {
        el.classList.add("miss");
      } else if (ship && revealShips) {
        el.classList.add("ship");
      }
    }
  }
}

// Highlight a preview of where the current ship would land during setup.
export function showPlacementPreview(container, cells, valid) {
  clearPreview(container);
  for (const { row, col } of cells) {
    const el = cellEl(container, row, col);
    if (el) el.classList.add(valid ? "preview" : "preview-bad");
  }
}

export function clearPreview(container) {
  container
    .querySelectorAll(".preview, .preview-bad")
    .forEach((el) => el.classList.remove("preview", "preview-bad"));
}

// Render the setup fleet list, marking the active and placed ships.
export function renderShipList(listEl, shipDefs, placedNames, activeIndex) {
  listEl.innerHTML = "";
  shipDefs.forEach((def, i) => {
    const li = document.createElement("li");
    li.className = "ship-item";
    if (placedNames.has(def.name)) li.classList.add("placed");
    if (i === activeIndex) li.classList.add("active");
    li.innerHTML = `
      <span class="ship-name">${def.name}</span>
      <span class="ship-cells">${"◼".repeat(def.length)}</span>
    `;
    listEl.appendChild(li);
  });
}

// Render fleet-status pills (one per ship, struck through when sunk).
export function renderFleetStatus(listEl, ships) {
  listEl.innerHTML = "";
  for (const ship of ships) {
    const li = document.createElement("li");
    li.className = "pill" + (ship.isSunk ? " sunk" : "");
    li.textContent = ship.name;
    listEl.appendChild(li);
  }
}

export function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}
