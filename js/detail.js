// Element detail overlay — slide-up card with stats + tabs + 3D Bohr atom.
import { elementByNumber, getElements, kToC, formatDensity } from "./data.js";
import { mountAtom, unmountAtom } from "./atom3d.js";

const host = document.getElementById("detail");
let currentNumber = null;
let atomHandle = null;

export function openDetail(atomicNumber) {
  currentNumber = atomicNumber;
  host.hidden = false;
  host.classList.add("open");
  document.body.style.overflow = "hidden";
  render();
  document.addEventListener("keydown", onKey);
}

export function closeDetail() {
  host.classList.remove("open");
  host.hidden = true;
  document.body.style.overflow = "";
  if (atomHandle) { unmountAtom(atomHandle); atomHandle = null; }
  document.removeEventListener("keydown", onKey);
}

function onKey(e) {
  if (e.key === "Escape") closeDetail();
  else if (e.key === "ArrowRight") step(+1);
  else if (e.key === "ArrowLeft") step(-1);
}

function step(dir) {
  const max = getElements().length;
  let n = currentNumber + dir;
  if (n < 1) n = max;
  if (n > max) n = 1;
  currentNumber = n;
  render();
}

function render() {
  const el = elementByNumber(currentNumber);
  if (!el) return;
  const catVar = `var(--cat-${el.category})`;

  const card = host.querySelector(".detail-card");
  card.style.setProperty("--cat-color", catVar);

  card.innerHTML = `
    <div class="detail-head">
      <div class="title-wrap">Element · ${String(el.atomicNumber).padStart(3, "0")} · ${el.category.replace(/-/g, " ")}</div>
      <div class="nav">
        <button aria-label="Previous element" data-act="prev">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button aria-label="Next element" data-act="next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button aria-label="Close" data-act="close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-left">
        <div class="detail-hero">
          <div class="detail-sym">${el.symbol}</div>
          <div class="detail-meta">
            <div class="num">Atomic No. ${el.atomicNumber} · Period ${el.period ?? "—"} · Group ${el.group ?? "—"}</div>
            <h2 id="detail-title">${el.name}</h2>
            <div class="mass">Atomic mass · ${el.atomicMass ?? "—"} u</div>
            <span class="badge">${el.category.replace(/-/g, " ")}</span>
          </div>
        </div>

        <div class="stat-grid">
          ${stat("State", capitalize(el.state))}
          ${stat("Block", el.block?.toUpperCase() || "—")}
          ${stat("Electron config", el.electronConfiguration || "—")}
          ${stat("Shells", el.shells?.join(" · ") || "—")}
          ${stat("Electronegativity", el.electronegativity ?? "—")}
          ${stat("Density", formatDensity(el))}
          ${stat("Melting point", kToC(el.meltingPoint))}
          ${stat("Boiling point", kToC(el.boilingPoint))}
          ${stat("Discovered by", el.discoveredBy || "—")}
          ${stat("Named by", el.namedBy || "—")}
        </div>
      </div>

      <div class="detail-right">
        <div class="atom-stage" id="atom-stage">
          <div class="atom-overlay">Bohr model · live</div>
        </div>

        <div class="tabs" role="tablist">
          <button class="tab" role="tab" aria-selected="true"  data-tab="overview">Overview</button>
          <button class="tab" role="tab" aria-selected="false" data-tab="uses">Uses</button>
          <button class="tab" role="tab" aria-selected="false" data-tab="history">History</button>
          <button class="tab" role="tab" aria-selected="false" data-tab="facts">Facts</button>
        </div>

        <div class="tab-panel active" data-panel="overview">
          <p>${el.summary || "No summary available."}</p>
          ${el.appearance ? `<p style="margin-top:8px;color:var(--muted);font-size:12px">Appearance: ${el.appearance}</p>` : ""}
        </div>

        <div class="tab-panel" data-panel="uses">
          ${el.uses?.length
            ? `<h4>Common uses</h4><ul>${el.uses.map(u => `<li>${u}</li>`).join("")}</ul>`
            : `<p>${el.summary ? "Used in scientific research and specialty applications." : "Uses not documented here yet."}</p>`}
        </div>

        <div class="tab-panel" data-panel="history">
          <p><b>Discovered by:</b> ${el.discoveredBy || "Unknown"}</p>
          ${el.namedBy ? `<p><b>Named by:</b> ${el.namedBy}</p>` : ""}
        </div>

        <div class="tab-panel" data-panel="facts">
          ${el.funFacts?.length
            ? `<ul>${el.funFacts.map(f => `<li>${f}</li>`).join("")}</ul>`
            : `<p>Nothing curated yet — but every element has a story!</p>`}
        </div>
      </div>
    </div>
  `;

  // wire actions
  card.querySelector('[data-act="prev"]').addEventListener("click", () => step(-1));
  card.querySelector('[data-act="next"]').addEventListener("click", () => step(+1));
  card.querySelector('[data-act="close"]').addEventListener("click", closeDetail);

  // tabs
  card.querySelectorAll(".tab").forEach(t => {
    t.addEventListener("click", () => {
      card.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-selected", "false"));
      card.querySelectorAll(".tab-panel").forEach(x => x.classList.remove("active"));
      t.setAttribute("aria-selected", "true");
      card.querySelector(`.tab-panel[data-panel="${t.dataset.tab}"]`).classList.add("active");
    });
  });

  // click on scrim closes
  host.onclick = (e) => { if (e.target === host) closeDetail(); };

  // mount 3D atom
  if (atomHandle) { unmountAtom(atomHandle); atomHandle = null; }
  const stage = card.querySelector("#atom-stage");
  atomHandle = mountAtom(stage, el);
}

function stat(k, v) {
  return `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
}

function capitalize(s) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
