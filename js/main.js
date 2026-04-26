// Entry point: load data, mount views, wire navigation + theme + PWA.
import { loadData } from "./data.js";
import { initTheme } from "./theme.js";
import { renderTable } from "./table.js";
import { initSearch } from "./search.js";
import { initBondingLab } from "./bonding.js";
import { initQuiz } from "./quiz.js";
import { initFlashcards } from "./flashcards.js";
import { initTrends } from "./trends.js";

const VIEWS = ["table", "lab", "quiz", "cards", "trends", "privacy", "terms", "disclaimer", "contact"];

async function boot() {
  initTheme();
  try {
    await loadData();
  } catch (e) {
    console.error("Data load failed", e);
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif">Failed to load element data. Please serve this directory via a local HTTP server (browsers block fetch() from file://).</div>`;
    return;
  }
  renderTable();
  initSearch();
  initBondingLab();
  initQuiz();
  initFlashcards();
  initTrends();
  wireNav();
  registerSW();
}

function wireNav() {
  const show = (name) => {
    VIEWS.forEach(v => {
      document.getElementById(`view-${v}`)?.classList.toggle("active", v === name);
      document.getElementById(`nav-${v}`)?.classList.toggle("primary", v === name);
    });
    // the filter chips only make sense on the table view
    const chips = document.getElementById("filter-chips");
    if (chips) chips.style.display = name === "table" ? "" : "none";
    // scroll to top so deep-linking to Privacy/Terms doesn't land mid-page
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  };

  // Hash router — supports #/privacy, #/terms, etc. Falls back to "table".
  const fromHash = () => {
    const m = location.hash.match(/^#\/([a-z]+)/);
    return m && VIEWS.includes(m[1]) ? m[1] : "table";
  };
  show(fromHash());
  window.addEventListener("hashchange", () => show(fromHash()));

  // Topbar nav buttons
  document.getElementById("nav-table").addEventListener("click",  () => { location.hash = ""; show("table"); });
  document.getElementById("nav-lab").addEventListener("click",    () => { location.hash = ""; show("lab"); });
  document.getElementById("nav-quiz").addEventListener("click",   () => { location.hash = ""; show("quiz"); });
  document.getElementById("nav-cards")?.addEventListener("click", () => { location.hash = ""; show("cards"); });
  document.getElementById("nav-trends")?.addEventListener("click",() => { location.hash = ""; show("trends"); });
}

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  // Only register when served over http(s); skip on file://
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW register failed", err));
  });
}

boot();
