// Bonding lab — element picker, reaction zone, compound lookup, 3D molecule render.
import { getElements, getCompounds, elementBySymbol } from "./data.js";
import { mountMolecule, unmountMolecule } from "./molecule3d.js";
import { attachLongPress, showGestureHint } from "./gestures.js";

const COMMON_SYMBOLS = [
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Fe", "Cu", "Zn", "Br", "I", "Ag", "Au"
];

let reactants = [];   // [{symbol, count}]
let moleculeHandle = null;

export function initBondingLab() {
  renderPicker();
  document.getElementById("btn-react").addEventListener("click", react);
  document.getElementById("btn-clear").addEventListener("click", clearAll);
}

function renderPicker() {
  const picker = document.getElementById("picker");
  picker.innerHTML = "";
  COMMON_SYMBOLS.forEach(sym => {
    const el = elementBySymbol(sym);
    if (!el) return;
    const b = document.createElement("button");
    b.className = `picker-tile cat-${el.category}`;
    b.type = "button";
    b.style.setProperty("--cat-color", `var(--cat-${el.category})`);
    b.title = el.name;
    b.textContent = el.symbol;
    b.setAttribute("aria-label", `Add ${el.name}`);
    b.addEventListener("click", () => addReactant(sym));
    picker.appendChild(b);
  });
}

function addReactant(symbol) {
  const existing = reactants.find(r => r.symbol === symbol);
  if (existing) existing.count++;
  else reactants.push({ symbol, count: 1 });
  renderReactionZone();
  if (reactants.length === 1) {
    showGestureHint("bonding-longpress", "Tip: long-press an atom to remove all of it");
  }
}

function removeReactant(symbol) {
  const i = reactants.findIndex(r => r.symbol === symbol);
  if (i < 0) return;
  reactants[i].count--;
  if (reactants[i].count <= 0) reactants.splice(i, 1);
  renderReactionZone();
}

function clearSymbol(symbol) {
  const i = reactants.findIndex(r => r.symbol === symbol);
  if (i < 0) return;
  reactants.splice(i, 1);
  renderReactionZone();
}

function renderReactionZone() {
  const zone = document.getElementById("reaction-zone");
  zone.innerHTML = "";
  zone.classList.toggle("has-items", reactants.length > 0);
  reactants.forEach(r => {
    const el = elementBySymbol(r.symbol);
    const a = document.createElement("button");
    a.className = "rz-atom";
    a.style.setProperty("--cat-color", `var(--cat-${el.category})`);
    a.textContent = el.symbol;
    a.type = "button";
    a.title = `${el.name} — click to remove one`;
    if (r.count > 1) {
      const c = document.createElement("span");
      c.className = "count";
      c.textContent = `×${r.count}`;
      a.appendChild(c);
    }
    a.addEventListener("click", () => removeReactant(r.symbol));
    attachLongPress(a, () => clearSymbol(r.symbol));
    zone.appendChild(a);
  });
}

function clearAll() {
  reactants = [];
  renderReactionZone();
  renderResult(null);
}

function react() {
  if (reactants.length === 0) return;
  const compounds = getCompounds();
  // normalize our reactants into a sorted canonical string and compare
  const key = canonical(reactants);
  const match = compounds.find(c => canonical(c.reactants) === key);
  renderResult(match);
}

function canonical(list) {
  return list
    .map(r => `${r.symbol}:${r.count}`)
    .sort()
    .join("|");
}

function renderResult(compound) {
  const host = document.getElementById("reaction-result");
  if (moleculeHandle) { unmountMolecule(moleculeHandle); moleculeHandle = null; }

  if (!compound) {
    host.innerHTML = reactants.length === 0
      ? `<div class="result-empty">Combine elements to see the result</div>`
      : `<div class="no-match">No known simple compound matches these atoms.<span class="hint">Try classic combos like 2 H + 1 O → water, or 1 Na + 1 Cl → salt.</span></div>`;
    return;
  }

  host.innerHTML = `
    <div class="result-header">
      <div>
        <div class="result-formula">${prettyFormula(compound.formula)}</div>
        <div class="result-name">${compound.name}</div>
      </div>
      <div class="result-badges">
        <span class="badge">${compound.bondType}</span>
        <span class="badge">${compound.state}</span>
      </div>
    </div>
    <div class="result-desc">${compound.description}</div>
    ${compound.uses?.length ? `<div class="result-uses">${compound.uses.map(u => `<span>${u}</span>`).join("")}</div>` : ""}
    <div class="molecule-stage" id="molecule-stage"></div>
  `;

  const stage = host.querySelector("#molecule-stage");
  moleculeHandle = mountMolecule(stage, compound);
}

function prettyFormula(f) {
  // e.g. H2O -> H<sub>2</sub>O,  Ca(OH)2 -> Ca(OH)<sub>2</sub>
  return f.replace(/(\d+)/g, "<sub>$1</sub>");
}
