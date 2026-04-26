# Elementa V2 — Mobile Polish + Urdu/RTL + Flashcards + Trends

## Context

Elementa V1 (Periodic Table learning PWA) is complete at `/mnt/c/Users/win10/Desktop/example/` — 118 elements, 3D Bohr/molecule renders, bonding lab, quiz, theme toggle, PWA install. The v1 plan's §v2 Roadmap listed 8 candidate features; the user has locked in a **client-side polish pack** targeting the classroom use-case:

1. Mobile-first touch polish (existing CSS is responsive, but touch gestures, auto-pause for 3D rotation, long-press, and narrow-phone table scrolling are missing)
2. **Urdu language toggle with RTL** — top-tier V2 feature (unlocks South Asian student audience)
3. Flashcards with SM-2 spaced repetition — stored in `localStorage`
4. Trends visualizer — Chart.js charts of properties across period/group

**Constraints locked in:**
- Backend-less (100% static-hostable, no Firebase, no API keys)
- Offline-first (every V2 asset precached by `sw.js`)
- Deerflow signature pill preserved across all views
- No build step — ES modules + CDN imports only

The plan is phased so each phase ships independently; user can stop after any phase without breaking earlier ones.

---

## New files

| Path | Purpose |
|---|---|
| `js/localize.js` | Locale store, `t(key, vars)`, `setLocale()`, `applyI18n(root)`, `localizedName(el)`. Toggles `<html dir>`/`<html lang>`; lazy-loads Nastaliq font. |
| `js/flashcards.js` | SRS view — SM-2 scheduler, deck picker, review loop, `rate(cardId, q)`. |
| `js/trends.js` | Chart.js line charts for electronegativity / atomic radius / ionization energy / melting point across a chosen period or group. |
| `js/gestures.js` | Reusable helpers: `attachLongPress(el, cb, ms=550)`, `showGestureHint(key, text)` (first-run flag), `autoPauseRotate(controls, {idleMs})`. |
| `css/localize.css` | RTL rules — mirrored chips, Nastaliq fallback stack, `.ltr { direction:ltr; unicode-bidi:isolate }` preservation class. |
| `css/flashcards.css` | Card flip animation, deck grid, rating bar; breakpoints 680/480. |
| `css/trends.css` | Chart container sizing, control row; stacks at 520px. |
| `css/mobile.css` | Imported LAST. Horizontal-scroll-snap for `.ptable` <504px, `touch-action` rules, gesture-hint toast, bigger tap targets. |
| `data/translations.json` | `{ "ur": { "nav.*": "...", "elements.<Z>.name": "..." } }`. English strings live in source (fallback). |
| `data/flashcard-decks.json` | Preset deck manifest: `[{id, nameKey, generator: "symbols"\|"numbers"\|"categories", filter?}]`. Cards generated at runtime from `elements.json`. |

## Existing files to modify

- **`index.html`** — add `<link>`s for 4 new CSS (mobile.css last); add `#nav-cards`, `#nav-trends`, `#locale-toggle` buttons to topbar; add `<section id="view-cards">`/`<section id="view-trends">` stubs; add `aria-label="Search"`; swap static button text for `data-i18n="nav.table"` etc.
- **`js/main.js`** — `await initLocale()` before `renderTable()`; extend `VIEWS` to `["table","lab","quiz","cards","trends"]`; wire new nav buttons; add arrow-key navigation on `.ptable`.
- **`js/state.js`** — bump `KEY` to `elementa.v2` (migrate v1 on first read); add defaults `locale:null`, `cards:{}`, `gestureHints:{}`, `trendsLast:{...}`.
- **`js/data.js`** — add `localizedName(el)` that reads translations map; keep English `name` on object (recommended over polluting `elements.json` — keeps dataset stable for future locales, avoids bloating fetch when English-only).
- **`js/table.js`** — use `localizedName(el)` for `.nm`; wrap grid in `.ptable-scroll` parent; add arrow-key handler walking `data-atomic-number` by row/col.
- **`js/atom3d.js`, `js/molecule3d.js`** — call `autoPauseRotate(controls)` after `new OrbitControls(...)`; first-time `showGestureHint("atom3d", t("hints.dragRotate"))`; replace 300px canvas height with CSS var `--stage-h: min(48vh, 360px)`.
- **`js/bonding.js`** — `attachLongPress(tile, () => clearSymbol(symbol))` on reaction-zone atoms; short click still decrements by one; first-time hint "Long-press to remove all".
- **`css/table.css`** — remove the 480px rule; moved to mobile.css horizontal-scroll approach. Enlarge tap target under 680px to `min-height:44px`.
- **`css/layout.css`** — nav buttons `min-height:40px`; `#locale-toggle` uses Nastaliq font; verify Deerflow `.foot .deer` pill sits outside `<main>` (it already does — renders on all new views automatically).
- **`manifest.json`** — bump description; add `"version":"2.0.0"` for tracking.
- **`sw.js`** — rename `CACHE` → `elementa-v2` (triggers old-cache purge via existing activate handler); append new files to `SHELL`; add `WARM_CDN` array with Chart.js + Nastaliq font CSS, precached best-effort on install.

## Mobile polish — key snippets

**`js/gestures.js`** (all mobile glue in one module):
```js
export function autoPauseRotate(controls, { idleMs = 4000 } = {}) {
  let t; const el = controls.domElement;
  const pause = () => { controls.autoRotate = false; clearTimeout(t);
    t = setTimeout(() => controls.autoRotate = true, idleMs); };
  ["pointerdown","wheel","touchstart"].forEach(ev =>
    el.addEventListener(ev, pause, { passive: true }));
}
export function attachLongPress(el, cb, ms = 550) {
  let t, fired;
  el.addEventListener("pointerdown", e => {
    fired = false; t = setTimeout(() => { fired = true; cb(e); }, ms);
  });
  ["pointerup","pointercancel","pointerleave"].forEach(ev =>
    el.addEventListener(ev, () => clearTimeout(t)));
  el.addEventListener("click", e => {
    if (fired) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}
export function showGestureHint(key, text) { /* one-time toast via store.gestureHints */ }
```

**`css/mobile.css`** (horizontal-scroll table under 504px):
```css
@media (max-width: 504px) {
  .ptable-scroll {
    overflow-x: auto; scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch; padding-bottom: 8px;
  }
  .ptable { --tile-size: 44px; width: max-content; gap: 3px; }
  .ptable .tile { scroll-snap-align: start; min-height: 44px; }
}
.ptable { touch-action: pan-x pan-y; }
canvas { touch-action: none; }   /* 3D canvases own their gestures */
.hint-toast { position: fixed; inset: auto 16px 16px 16px; /* animated */ }
```

## Urdu + RTL

**`data/translations.json` schema**:
```json
{ "ur": {
  "nav":   { "table":"جدول","lab":"تجربہ گاہ","quiz":"کوئز","cards":"کارڈز","trends":"رجحانات" },
  "search.placeholder": "نام، علامت یا ایٹمی نمبر سے تلاش کریں…",
  "hints": { "dragRotate": "گھمانے کے لیے گھسیٹیں" },
  "elements": { "1": { "name": "ہائیڈروجن" }, "2": { "name": "ہیلیم" } }
}}
```

**`js/localize.js` API**:
```js
export async function initLocale()           // loads translations.json, reads store.locale or navigator.language, applies
export function t(key, vars)                  // dot-path lookup + {{var}} interpolation, falls back to English source string
export async function setLocale(code)         // store, html[dir,lang], ensureNastaliqLoaded(), applyI18n(document), re-render dynamic views
export function applyI18n(root)                // root.querySelectorAll("[data-i18n]") → textContent = t(...)
export function localizedName(el)              // t(`elements.${el.atomicNumber}.name`) ?? el.name
```

**Nastaliq loader** — `ensureNastaliqLoaded()` injects `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap">` **once, only when user picks Urdu** (keeps English-only users fast). Font-family inside `[dir="rtl"]`: `"Noto Nastaliq Urdu", var(--font-display), serif`.

**Preserved-LTR zones** (numbers, formulas, grid, 3D canvases stay LTR even in RTL mode — chemistry/periodic-table convention):
- Wrap content with `<span class="ltr">` OR add `direction: ltr; unicode-bidi: isolate;` via CSS scoped to `.tile, .mono, .formula, .ptable, .stats`.
- `.ptable-scroll { direction: ltr; }` so the 1→118 grid never mirrors.

## Flashcards (SRS)

**`js/flashcards.js` API**:
```js
export function initFlashcards()              // render deck grid into #view-cards
function buildDeck(generator)                 // → [{id, front, back, meta}]
function getDue(deckId, now)                  // filter from store.cards by dueDate
function rate(cardId, q)                       // SM-2: q∈[0..5]; updates interval/ease/reps/dueDate
function renderReviewSession(deckId)
```

**SM-2 essentials**:
- Initial: `ease=2.5, interval=0, reps=0`
- `q<3`: reset `reps=0, interval=1`
- `q>=3`: `reps++`; `interval = reps===1?1 : reps===2?6 : round(prevInterval*ease)`
- `ease = max(1.3, ease + (0.1 - (5-q)*(0.08+(5-q)*0.02)))`
- `dueDate = now + interval * 86_400_000`

**localStorage schema** (`store.cards`):
```js
{ "sym:H": { interval:6, ease:2.6, reps:2, dueDate:1714003200000, lapses:0 } }
```

**Decks** (`data/flashcard-decks.json`): 3 preset generators — `symbols` (front = symbol, back = localized name), `numbers` (front = atomic number, back = name), `categories` (front = symbol, back = category). All cards generated at runtime from `elements.json` so there's one source of truth.

## Trends visualizer

**`js/trends.js`** loads Chart.js from `https://unpkg.com/chart.js@4.4.1/dist/chart.umd.js` via one-time `<script>` injection (Promise-wrapped; cached by SW). Exposes `initTrends()`; re-renders on locale change (axis labels translate via `t()`).

**Controls**: segmented axis (`period` | `group`), numeric selector (1–7 periods or 1–18 groups), single-metric selector (`electronegativity`, `atomicRadius`, `ionizationEnergy`, `meltingPoint`). X = atomic number along the slice; Y = metric value. Single metric at a time keeps units clean.

**`css/trends.css`**: `.trend-chart { position:relative; height: min(55vh, 440px); }`; control row flex, stacks under 520px.

## PWA updates — concrete `sw.js` diff

```js
const CACHE = "elementa-v2";
const SHELL = [ /* existing v1 list */,
  "css/localize.css","css/flashcards.css","css/trends.css","css/mobile.css",
  "js/localize.js","js/flashcards.js","js/trends.js","js/gestures.js",
  "data/translations.json","data/flashcard-decks.json"
];
const WARM_CDN = [
  "https://unpkg.com/chart.js@4.4.1/dist/chart.umd.js",
  "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
];
// install handler: addAll(SHELL); then Promise.allSettled(
//   WARM_CDN.map(u => fetch(u,{mode:"no-cors"}).then(r => cache.put(u, r)))
// )
```
No fetch-handler rewrite needed — existing same-origin branch covers SHELL, existing SWR branch covers CDN.

## Build order (phased, shippable at each stop)

1. **Phase A — Mobile polish**: `gestures.js` + patches to `atom3d.js`/`molecule3d.js`/`bonding.js`/`table.js` + `mobile.css` + search aria-label. **Ship.**
2. **Phase B — Localize scaffold**: `localize.js`, English-only `translations.json`, `data-i18n` attributes, locale toggle button wiring, `applyI18n()` on boot. **Ship (English still works).**
3. **Phase C — Urdu content + RTL**: Urdu strings + 118 element names, Nastaliq loader, `localize.css`, LTR-preservation classes. **Ship.**
4. **Phase D — Flashcards**: `flashcards.js`, `flashcards.css`, decks.json, `state.cards` schema, router wiring. **Ship.**
5. **Phase E — Trends**: `trends.js` + Chart.js CDN, `trends.css`, router wiring. **Ship.**
6. **Phase F — PWA finalize**: `sw.js` cache bump + SHELL/WARM_CDN, manifest bump, Lighthouse PWA score check. **Ship.**

## Verification

Serve with `python3 -m http.server 8080` from project root, then:

- **Mobile polish** (Chrome DevTools → iPhone SE):
  - Periodic table scrolls horizontally with snap; first-run hint toast appears once
  - Open atom 3D overlay, touch canvas → auto-rotate stops; idle 4s → resumes
  - Bonding lab: tap H twice, long-press the H atom → both removed; short tap removes one
  - Arrow keys walk tiles on desktop
- **Urdu/RTL**: click اردو → flips to RTL, Nastaliq loads, element tiles show Urdu names, symbols/atomic numbers remain LTR inside RTL flow, periodic grid stays LTR. Toggle back — no layout damage.
- **Flashcards**: pick Symbols deck, rate cards 0–5, reload → states persist, `getDue()` correctly gates by `dueDate`.
- **Trends**: pick Period 2 + electronegativity → Chart.js line renders Li→Ne. Switch locale → axis labels update.
- **Offline**: load once online → DevTools → Application → Service Workers → check Offline → hard reload. All 5 views work. Urdu still works (font cached). Trends still renders (Chart.js cached).
- **Real phone**: connect to same Wi-Fi, browse `http://<laptop-lan-ip>:8080`, repeat touch checks.
- **Deerflow pill**: visible on table, lab, quiz, cards, trends — it's in `<footer>` outside `<main>`, so automatic.

## Final file tree

```
/mnt/c/Users/win10/Desktop/example/
├── ~ index.html                (+links, +nav buttons, +data-i18n, +aria-label)
├── ~ manifest.json             (version bump)
├── ~ sw.js                     (v2 cache, +SHELL, +WARM_CDN)
├── assets/icons/               (unchanged)
├── css/
│   ├── base.css
│   ├── ~ layout.css            (nav sizing, Nastaliq var)
│   ├── ~ table.css             (480px rule moved to mobile.css)
│   ├── detail.css
│   ├── bonding.css
│   ├── quiz.css
│   ├── ★ localize.css
│   ├── ★ flashcards.css
│   ├── ★ trends.css
│   └── ★ mobile.css
├── data/
│   ├── elements.json
│   ├── compounds.json
│   ├── ★ translations.json
│   └── ★ flashcard-decks.json
└── js/
    ├── ~ main.js               (+views, +locale boot, +arrow-nav)
    ├── ~ state.js              (v2 key, +defaults, migration)
    ├── ~ data.js               (+localizedName)
    ├── theme.js
    ├── ~ table.js              (localized names, scroll wrapper, arrow-nav)
    ├── search.js
    ├── detail.js
    ├── ~ atom3d.js             (autoPauseRotate, hint, CSS var height)
    ├── ~ molecule3d.js         (autoPauseRotate)
    ├── ~ bonding.js            (long-press remove, hint)
    ├── quiz.js
    ├── ★ localize.js
    ├── ★ flashcards.js
    ├── ★ trends.js
    └── ★ gestures.js
```

★ = new · ~ = modified · unmarked = unchanged

## Critical files to touch first

- `js/gestures.js` (new) — unlocks Phase A and unblocks the 3D patches
- `js/localize.js` (new) — unlocks Phases B/C and is imported by `main.js`, `table.js`, `data.js`
- `sw.js` — last, after every new asset path is stable (Phase F)
