// Tiny persisted state wrapper around localStorage.
const KEY = "elementa.v3";
const LEGACY_KEYS = ["elementa.v2", "elementa.v1"];

const defaults = {
  theme: null,              // null = follow system
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
      // one-time migration from older versions; strip removed fields (locale).
      for (const lk of LEGACY_KEYS) {
        const legacy = localStorage.getItem(lk);
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            delete parsed.locale;
            localStorage.setItem(KEY, JSON.stringify(parsed));
            raw = JSON.stringify(parsed);
          } catch {}
          break;
        }
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
