// Tiny persisted state wrapper around localStorage.
const KEY = "elementa.v2";
const LEGACY_KEY = "elementa.v1";

const defaults = {
  theme: null,              // null = follow system
  locale: null,             // null = follow navigator.language
  quizBest: {},             // { mode: score }
  streak: { lastPlayed: null, count: 0 },
  lastViewedElement: null,
  cards: {},                // { cardId: { interval, ease, reps, dueDate, lapses } }
  gestureHints: {},         // { hintKey: true }
  trendsLast: { axis: "period", value: 2, metric: "electronegativity" }
};

function read() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      // one-time migration from v1
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        raw = legacy;
        localStorage.setItem(KEY, legacy);
      }
    }
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota / private mode */ }
}

export const store = {
  get(key) { return read()[key]; },
  set(key, value) {
    const s = read();
    s[key] = value;
    write(s);
  },
  update(patch) {
    const s = read();
    write({ ...s, ...patch });
  },
  all() { return read(); }
};

// Quiz helpers
export function recordQuizScore(mode, score) {
  const best = store.get("quizBest") || {};
  if (!best[mode] || score > best[mode]) {
    best[mode] = score;
    store.set("quizBest", best);
  }
  // streak
  const today = new Date().toISOString().slice(0, 10);
  const streak = store.get("streak") || { lastPlayed: null, count: 0 };
  if (streak.lastPlayed === today) { /* no change */ }
  else {
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak.count = streak.lastPlayed === y ? streak.count + 1 : 1;
    streak.lastPlayed = today;
    store.set("streak", streak);
  }
}
