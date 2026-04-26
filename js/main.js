// Entry point: load data, mount views, wire navigation + theme + PWA.
import { loadData } from "./data.js";
import { initTheme } from "./theme.js";
import { renderTable } from "./table.js";
import { initSearch } from "./search.js";
import { initBondingLab } from "./bonding.js";
import { initQuiz } from "./quiz.js";
import { initLocale, setLocale, getLocale, applyI18n, onLocaleChange } from "./localize.js";
import { initFlashcards } from "./flashcards.js";
import { initTrends } from "./trends.js";

const VIEWS = ["table", "lab", "quiz", "cards", "trends"];

async function boot() {
  initTheme();
  await initLocale();
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
  wireLocale();
  applyI18n(document);
  onLocaleChange(() => {
    // re-render views that hold user-facing strings in JS
    renderTable();
    applyI18n(document);
  });
  registerSW();
}

function wireLocale() {
  const btn = document.getElementById("locale-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = getLocale() === "ur" ? "en" : "ur";
    setLocale(next);
    btn.textContent = next === "ur" ? "EN" : "اردو";
  });
  btn.textContent = getLocale() === "ur" ? "EN" : "اردو";
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
  };
  show("table");
  document.getElementById("nav-table").addEventListener("click",  () => show("table"));
  document.getElementById("nav-lab").addEventListener("click",    () => show("lab"));
  document.getElementById("nav-quiz").addEventListener("click",   () => show("quiz"));
  document.getElementById("nav-cards")?.addEventListener("click", () => show("cards"));
  document.getElementById("nav-trends")?.addEventListener("click",() => show("trends"));
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
