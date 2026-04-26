// Flashcards with SM-2 spaced repetition. All state in localStorage.
import { getElements, elementByNumber, CATEGORIES } from "./data.js";
import { store } from "./state.js";
import { t, localizedName, onLocaleChange } from "./localize.js";

let decksManifest = null;
let activeSession = null;  // { deckId, queue:[card], idx, shown, stats: {correct, total} }

export async function initFlashcards() {
  if (!decksManifest) {
    try {
      decksManifest = await fetch("data/flashcard-decks.json").then(r => r.json());
    } catch {
      decksManifest = defaultDecks();
    }
  }
  renderDeckGrid();
  onLocaleChange(() => {
    if (activeSession) renderCard();
    else renderDeckGrid();
  });
}

function defaultDecks() {
  return [
    { id: "symbols",    generator: "symbols" },
    { id: "numbers",    generator: "numbers" },
    { id: "categories", generator: "categories", filter: { upToZ: 36 } }
  ];
}

function renderDeckGrid() {
  const root = document.getElementById("cards-root");
  if (!root) return;
  activeSession = null;
  const now = Date.now();
  const state = store.get("cards") || {};

  const deckCards = decksManifest.map(deck => {
    const cards = buildDeck(deck);
    const dueCount = cards.filter(c => {
      const cs = state[c.id];
      return !cs || cs.dueDate <= now;
    }).length;
    const newCount = cards.filter(c => !state[c.id]).length;
    return { deck, cards, dueCount, newCount };
  });

  root.innerHTML = `
    <div class="cards-head">
      <div class="eyebrow" data-i18n="cards.pickDeck">Pick a deck</div>
    </div>
    <div class="deck-grid">
      ${deckCards.map(({ deck, cards, dueCount, newCount }) => `
        <button class="deck-card" data-deck-id="${deck.id}">
          <div class="deck-title">${t(`cards.decks.${deck.id}`) || deck.id}</div>
          <div class="deck-stats">
            <span><b class="ltr">${dueCount}</b> ${t("cards.due")}</span>
            <span><b class="ltr">${newCount}</b> ${t("cards.new")}</span>
            <span class="muted ltr">${cards.length} total</span>
          </div>
          <div class="deck-cta" data-i18n="cards.start">Start review</div>
        </button>
      `).join("")}
    </div>
  `;
  root.querySelectorAll(".deck-card").forEach(btn => {
    btn.addEventListener("click", () => startSession(btn.dataset.deckId));
  });
}

function buildDeck(deck) {
  const all = getElements();
  const pool = deck.filter?.upToZ ? all.filter(e => e.atomicNumber <= deck.filter.upToZ) : all;
  switch (deck.generator) {
    case "symbols":
      return pool.map(el => ({
        id: `sym:${el.symbol}`,
        front: el.symbol,
        back: localizedName(el),
        meta: { Z: el.atomicNumber }
      }));
    case "numbers":
      return pool.map(el => ({
        id: `num:${el.atomicNumber}`,
        front: String(el.atomicNumber),
        back: `${el.symbol} · ${localizedName(el)}`,
        meta: { Z: el.atomicNumber }
      }));
    case "categories":
      return pool.map(el => ({
        id: `cat:${el.symbol}`,
        front: el.symbol,
        back: categoryLabel(el.category),
        meta: { Z: el.atomicNumber }
      }));
    default:
      return [];
  }
}

function categoryLabel(id) {
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) return id;
  return t(cat.i18n) || cat.label;
}

function startSession(deckId) {
  const deck = decksManifest.find(d => d.id === deckId);
  if (!deck) return;
  const cards = buildDeck(deck);
  const now = Date.now();
  const state = store.get("cards") || {};
  const queue = cards.filter(c => {
    const cs = state[c.id];
    return !cs || cs.dueDate <= now;
  });
  // randomize
  queue.sort(() => Math.random() - 0.5);
  if (queue.length === 0) {
    const root = document.getElementById("cards-root");
    root.innerHTML = `
      <div class="card-empty">${t("cards.nothingDue")}</div>
      <div><button class="btn" id="cards-back" data-i18n="nav.cards">Back</button></div>
    `;
    root.querySelector("#cards-back").addEventListener("click", renderDeckGrid);
    return;
  }
  activeSession = { deckId, queue, idx: 0, shown: false, stats: { total: queue.length, done: 0 } };
  renderCard();
}

function renderCard() {
  const root = document.getElementById("cards-root");
  if (!root || !activeSession) return;
  const { queue, idx, shown, stats } = activeSession;
  if (idx >= queue.length) return renderSessionEnd();
  const card = queue[idx];
  root.innerHTML = `
    <div class="card-stage">
      <div class="card-progress">
        <div class="bar"><div class="fill" style="width:${(idx / queue.length) * 100}%"></div></div>
        <span class="ltr">${idx + 1} / ${queue.length}</span>
      </div>
      <div class="flashcard ${shown ? "flipped" : ""}" tabindex="0">
        <div class="face front">
          <div class="card-content">${escapeHtml(card.front)}</div>
        </div>
        <div class="face back">
          <div class="card-content">${escapeHtml(card.back)}</div>
        </div>
      </div>
      ${shown ? `
        <div class="rate">
          <div class="rate-label" data-i18n="cards.rate">How well did you know it?</div>
          <div class="rate-buttons">
            <button class="btn rate-btn" data-q="0" data-i18n="cards.again">Again</button>
            <button class="btn rate-btn" data-q="3" data-i18n="cards.hard">Hard</button>
            <button class="btn rate-btn primary" data-q="4" data-i18n="cards.good">Good</button>
            <button class="btn rate-btn" data-q="5" data-i18n="cards.easy">Easy</button>
          </div>
        </div>
      ` : `
        <div class="show-row">
          <button class="btn primary" id="cards-show" data-i18n="cards.show">Show answer</button>
        </div>
      `}
    </div>
  `;
  if (!shown) {
    root.querySelector("#cards-show").addEventListener("click", () => {
      activeSession.shown = true;
      renderCard();
    });
    root.querySelector(".flashcard").addEventListener("click", () => {
      activeSession.shown = true;
      renderCard();
    });
  } else {
    root.querySelectorAll(".rate-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const q = Number(btn.dataset.q);
        rate(card.id, q);
        activeSession.idx++;
        activeSession.shown = false;
        activeSession.stats.done++;
        renderCard();
      });
    });
  }
}

function renderSessionEnd() {
  const root = document.getElementById("cards-root");
  const { stats } = activeSession;
  root.innerHTML = `
    <div class="session-end">
      <h2 data-i18n="cards.sessionEnd">Session complete</h2>
      <p>${t("cards.reviewed", { n: stats.done })}</p>
      <button class="btn primary" id="cards-back">↺</button>
    </div>
  `;
  root.querySelector("#cards-back").addEventListener("click", renderDeckGrid);
}

// SM-2 scheduler. q ∈ [0..5]. Returns updated card state.
export function rate(cardId, q) {
  const state = store.get("cards") || {};
  const prev = state[cardId] || { interval: 0, ease: 2.5, reps: 0, dueDate: Date.now(), lapses: 0 };
  let { interval, ease, reps, lapses } = prev;
  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses++;
  } else {
    reps++;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  state[cardId] = {
    interval,
    ease: Math.round(ease * 1000) / 1000,
    reps,
    lapses,
    dueDate: Date.now() + interval * 86_400_000
  };
  store.set("cards", state);
  return state[cardId];
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
  ));
}
