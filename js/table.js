// Renders the periodic table grid and owns search + category filter state.
import { getElements, CATEGORIES } from "./data.js";
import { openDetail } from "./detail.js";
import { localizedName, t } from "./localize.js";

let activeCategories = new Set();  // empty = all
let searchTerm = "";

export function renderTable() {
  let root = document.getElementById("ptable");
  // Wrap the grid in a horizontal-scroll container once, so narrow phones can pan.
  if (root && !root.parentElement?.classList.contains("ptable-scroll")) {
    const wrap = document.createElement("div");
    wrap.className = "ptable-scroll";
    root.parentNode.insertBefore(wrap, root);
    wrap.appendChild(root);
  }
  const elements = getElements();
  root.innerHTML = "";

  // Place elements in a CSS grid by (row, col). Lanthanides/actinides are rows 9-10
  // but live directly under the main table with a visual gap — a spacer row at row 8.
  elements.forEach((el, i) => {
    const tile = document.createElement("button");
    tile.className = `tile cat-${el.category}`;
    tile.type = "button";
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", `${el.name}, symbol ${el.symbol}, atomic number ${el.atomicNumber}`);
    tile.dataset.symbol = el.symbol;
    tile.dataset.category = el.category;
    tile.dataset.atomicNumber = el.atomicNumber;
    tile.style.setProperty("--cat-color", `var(--cat-${el.category})`);
    // row 8 is reserved as a visual gap; shift lanth (was row 9) and actin (was row 10) up by 1 row
    // so they render directly below the gap without leaving an empty row.
    const row = el.row;
    tile.style.gridRow = row;
    tile.style.gridColumn = el.col;
    tile.style.setProperty("--i", i);

    const mass = el.atomicMass != null ? el.atomicMass.toFixed(2) : "—";
    const displayName = localizedName(el);
    tile.innerHTML = `
      <div class="z ltr"><span>${el.atomicNumber}</span><span>${mass}</span></div>
      <div class="sym ltr">${el.symbol}</div>
      <div class="nm">${displayName}</div>
    `;
    tile.addEventListener("click", () => openDetail(el.atomicNumber));
    root.appendChild(tile);
  });

  // spacer row between main table and lanth/actin strip
  const gap = document.createElement("div");
  gap.className = "ptable-gap";
  gap.style.gridRow = 8;
  gap.style.gridColumn = "1 / -1";
  root.appendChild(gap);

  renderFilterChips();
  updateStats();
  wireKeyboardNav(root);
}

function wireKeyboardNav(root) {
  if (root.dataset.kbwired) return;
  root.dataset.kbwired = "1";
  root.addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(e.key)) return;
    const current = document.activeElement;
    if (!current?.classList.contains("tile")) return;
    const row = parseInt(current.style.gridRow, 10);
    const col = parseInt(current.style.gridColumn, 10);
    const dRow = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    const dCol = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    const target = root.querySelector(
      `.tile[style*="grid-row: ${row + dRow}"][style*="grid-column: ${col + dCol}"]`
    );
    if (target) { e.preventDefault(); target.focus(); }
  });
}

function renderFilterChips() {
  const chips = document.getElementById("filter-chips");
  chips.innerHTML = "";
  CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.dataset.cat = cat.id;
    const label = t(cat.i18n || "") || cat.label;
    b.innerHTML = `<span class="swatch" style="background: var(--cat-${cat.id})"></span>${label}`;
    b.addEventListener("click", () => toggleCategory(cat.id, b));
    chips.appendChild(b);
  });
}

function toggleCategory(id, btn) {
  if (activeCategories.has(id)) {
    activeCategories.delete(id);
    btn.setAttribute("aria-pressed", "false");
  } else {
    activeCategories.add(id);
    btn.setAttribute("aria-pressed", "true");
  }
  applyFilter();
}

export function setSearch(term) {
  searchTerm = term.trim().toLowerCase();
  applyFilter();
}

function applyFilter() {
  const tiles = document.querySelectorAll("#ptable .tile");
  let visible = 0;
  tiles.forEach(t => {
    const sym = t.dataset.symbol.toLowerCase();
    const num = t.dataset.atomicNumber;
    const cat = t.dataset.category;
    const name = t.querySelector(".nm").textContent.toLowerCase();

    const matchesCategory = activeCategories.size === 0 || activeCategories.has(cat);
    const matchesSearch = !searchTerm
      || sym.includes(searchTerm)
      || name.includes(searchTerm)
      || num === searchTerm;

    const show = matchesCategory && matchesSearch;
    t.classList.toggle("dim", !show);
    if (show) visible++;
  });
  const s = document.getElementById("stat-visible");
  if (s) s.textContent = visible;
}

function updateStats() {
  const el = getElements();
  document.getElementById("stat-total").textContent = el.length;
  document.getElementById("stat-visible").textContent = el.length;
}
