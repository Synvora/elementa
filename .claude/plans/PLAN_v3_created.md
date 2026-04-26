# Elementa V3 — Mobile Fixes, De-Urdu, Legal Pages, Polish

## Context

Elementa V2 is live at `https://synvora.github.io/elementa/` (just deployed to GitHub Pages). The user is preparing it for public sharing and a possible Play Store wrap (PWABuilder), so V3 is a **production-readiness pass**, not a feature pass.

Three classes of work:

1. **Mobile bugs** — user reports right-side cutoff and "half black" rendering on phones. Audit (Phase 1) shows the architecture is sound (`viewport-fit=cover`, horizontal-scroll table under 504px, `min-height: 100vh` is safe). Symptoms therefore likely stem from: chips/topbar overflowing, the `.ptable-scroll` parent missing on small screens (V2 plan added the wrapper but `js/table.js` may not emit it), iOS Safari Safe Area not being padded, and 100dvh-vs-100vh on mobile browsers with a dynamic URL bar.
2. **Remove Urdu/RTL completely** — keeps the codebase smaller and the audience clearly defined for the deployed site. Audit lists every locale touchpoint (§Files below).
3. **Add legal/info pages + remove the third-party Deerflow footer credit** — required before publishing publicly or wrapping for Play Store (Google requires a Privacy Policy URL).

User decisions (locked in):
- Legal pages as **in-app views** (new `#view-privacy`, `#view-terms`, `#view-disclaimer`, `#view-contact`) — keeps SPA, works offline.
- Contact = **`mailto:syedurrahman804@gmail.com`** only.
- Mobile fix = **patch the existing horizontal-scroll approach**, not a rewrite.
- Default theme stays **dark** with system-pref detection (already implemented in `js/theme.js`).

No backend, no build step, no new runtime deps. Everything ships as a static push to `main`; GitHub Pages redeploys automatically.

---

## Phased build order (each phase ships independently)

### Phase A — Remove Urdu / RTL

Touch every locale call-site so nothing imports a deleted module.

**Delete:**
- `js/localize.js`
- `css/localize.css`
- `data/translations.json`

**Modify:**
- `index.html` — remove `<link rel="stylesheet" href="css/localize.css">`; remove `<button id="locale-toggle">اردو</button>` (line 62); strip every `data-i18n="..."` and `data-i18n-placeholder="..."` attribute (replace with the English fallback string already inlined). Keep `class="ltr"` on numeric/code spans (lines 52, 82–84) — they're chemistry-correctness wrappers, not locale code.
- `js/main.js` — drop `import { initLocale, applyI18n, onLocaleChange } from "./localize.js"`; delete `await initLocale()` and `applyI18n(document)` calls; delete the `wireLocale()` function and its invocation.
- `js/table.js` — replace `localizedName(el)` (line 41) with `el.name`; replace `t(cat.i18n)` (line 91) with the English category label (use a small inline map: `{ "alkali-metal": "Alkali metal", … }`).
- `js/flashcards.js` — drop `localizedName`/`t` import; replace with `el.name` and English deck names.
- `js/state.js` — remove the `locale: null` default from the v2 schema. Bump `KEY` to `elementa.v3` and migrate v2 state by stripping the `locale` field.
- `sw.js` — `CACHE = "elementa-v3"`; remove `css/localize.css`, `data/translations.json`, `js/localize.js` from `SHELL`; remove the Nastaliq Google Fonts URL from `WARM_CDN`.
- `manifest.json` — bump `"version": "3.0.0"`; drop `"dir": "auto"` (force LTR).

Add a tiny utility CSS rule (move from `localize.css` so the `<span class="ltr">` wrappers in `index.html` keep working):

```css
/* css/base.css, append */
.ltr { direction: ltr; unicode-bidi: isolate; }
```

### Phase B — Mobile rendering fixes

Goal: kill the cutoff and "half black" reports without rewriting the layout.

**`index.html`** — already has `viewport-fit=cover`. Confirm no horizontal-scroll trap on the body.

**`css/base.css`** — replace `body { min-height: 100vh; }` with `min-height: 100dvh;` (with `100vh` fallback above it for older browsers). Same for `#app` in `css/layout.css`. This kills the "blank strip below the table when the address bar collapses" symptom on iOS/Android Chrome.

**`css/layout.css`** — add iOS Safe Area insets to the topbar and footer:
```css
.topbar { padding-left: max(16px, env(safe-area-inset-left));
          padding-right: max(16px, env(safe-area-inset-right));
          padding-top: max(10px, env(safe-area-inset-top)); }
.foot   { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
```

**`css/mobile.css`** — the V2 plan added `.ptable-scroll` and assumed `js/table.js` wraps `.ptable` in it. Verify that wrapper actually exists; if not, emit it in `renderTable()`:
```js
// js/table.js — inside renderTable(), wrap once
if (!grid.parentElement.classList.contains("ptable-scroll")) {
  const w = document.createElement("div");
  w.className = "ptable-scroll";
  grid.parentElement.insertBefore(w, grid);
  w.appendChild(grid);
}
```
Add scroll-shadow indicators so users on phones realise the table scrolls horizontally:
```css
.ptable-scroll {
  background:
    linear-gradient(to right, var(--ink-0), transparent 16px),
    linear-gradient(to left,  var(--ink-0), transparent 16px) right;
  background-attachment: local, scroll;
  background-repeat: no-repeat;
}
```
Also enforce 44×44 minimum tap targets on mobile nav buttons (`.btn { min-height: 44px }` under 680px) and chips (`.chip { min-height: 36px }`), and let chips wrap instead of horizontally overflowing (`.chips { flex-wrap: wrap; gap: 6px; }`).

**Topbar overflow fix (the "right side cut off" symptom on phones)** — the topbar has 5 nav buttons + locale + theme; after Phase A locale is gone, but on a 360px screen the row still overflows. Make `.topbar` a 3-area grid that collapses below 680px to a stacked layout: row 1 = brand + theme, row 2 = full-width search, row 3 = horizontally-scrolling button strip with `overflow-x:auto; scrollbar-width:none`.

**3D canvases (atom3d, molecule3d)** — they already have `touch-action: none`. Confirm canvas height uses `min(48vh, 360px)` (V2 plan) — if not, set it. This is the second most common "half black" cause: a canvas sized larger than the viewport while the parent overlay is shorter.

### Phase C — Footer cleanup

**`index.html`** lines 158–160 — replace the Deerflow `<a class="deer">` with a row of footer links to the new in-app pages:

```html
<footer class="foot">
  <span>Elementa · © 2026 Synvora</span>
  <nav class="foot-links">
    <a href="#/privacy">Privacy</a>
    <a href="#/terms">Terms</a>
    <a href="#/disclaimer">Disclaimer</a>
    <a href="#/contact">Contact</a>
  </nav>
</footer>
```

**`css/layout.css`** — delete the `.deer` and `.star` rules (~lines 210–224). Replace with `.foot-links` flex row styling.

### Phase D — Legal & info pages

Pattern follows the existing router (`VIEWS` array in `js/main.js:12`, view-section + nav button per audit §8).

**`index.html`** — add four new sections after `#view-trends`:
```html
<section id="view-privacy" class="view info-view" aria-label="Privacy Policy">…</section>
<section id="view-terms"      class="view info-view" aria-label="Terms & Conditions">…</section>
<section id="view-disclaimer" class="view info-view" aria-label="Disclaimer">…</section>
<section id="view-contact"    class="view info-view" aria-label="Contact">…</section>
```

Each holds static prose. **Privacy Policy** must cover:
- localStorage usage (theme, quiz scores, flashcard SRS state, last element)
- No analytics, no cookies, no third-party tracking, no account, no PII collected
- 3D libraries served from `unpkg.com` CDN — IP visible to that CDN
- User rights: clear localStorage in browser settings to wipe all stored data
- Contact email for questions

**Terms** = educational use, no warranty, MIT-style permissive language for the data, no liability for academic decisions.

**Disclaimer** = educational tool, scientific values from public datasets (Periodic-Table-JSON, MIT) and may contain errors; not a substitute for textbooks; verify with authoritative sources before lab/exam use.

**Contact** = single `<a href="mailto:syedurrahman804@gmail.com">` plus a small note that issues can also be filed at the GitHub repo (link to `https://github.com/Synvora/elementa/issues`).

**`js/main.js`** — extend the `VIEWS` array:
```js
const VIEWS = ["table","lab","quiz","cards","trends","privacy","terms","disclaimer","contact"];
```
The existing `show()` already hides `#filter-chips` when name !== "table", so info views automatically get a clean header. Wire each footer link `<a href="#/privacy">` etc. via a small hash-router added to `wireNav()`:

```js
window.addEventListener("hashchange", () => {
  const m = location.hash.match(/^#\/([a-z]+)/);
  if (m && VIEWS.includes(m[1])) show(m[1]);
});
```

This also means the public site can be deep-linked: `https://synvora.github.io/elementa/#/privacy`. Useful for the Play Store listing's mandatory Privacy Policy URL.

**`css/layout.css`** — add `.info-view { max-width: 720px; margin: 0 auto; padding: 24px 16px; line-height: 1.7; }` plus simple typographic styles for `h2`, `h3`, `p`, `ul` inside info views.

### Phase E — Polish (lazy-priority)

Only do these if Phases A–D land cleanly and time allows.

- **Skeleton on boot**: replace the `loading…` flash with a one-screen skeleton (4 grey rows of tiles) shown until `data.js` resolves. Implement in `js/main.js` between data-fetch start and `renderTable()`.
- **Smoother view transitions**: add `transition: opacity .18s ease` on `.view.active` (CSS only).
- **Lazy 3D**: defer `three.module.js` import until the first detail overlay opens (already an ES dynamic import target in `atom3d.js`? confirm during execution; if not, wrap in `import("three")` on demand).

### Phase F — Service Worker bump & verify

`sw.js` — `CACHE = "elementa-v3"` (the existing activate-handler purges `elementa-v2` automatically). Remove the deleted assets, add the hash router never adds new files (info views are inline HTML), so `SHELL` only changes by subtraction in this phase.

`manifest.json` — `"version":"3.0.0"`; verify `start_url`, `scope`, icons unchanged.

Then push to `main`. GitHub Pages redeploy is automatic; SW activates on next visit.

---

## Critical files to modify

| File | Phase | What changes |
|---|---|---|
| `js/main.js` | A, D | drop locale boot; extend `VIEWS`; add hash router |
| `js/table.js` | A, B | drop `localizedName`/`t`; ensure `.ptable-scroll` wrapper exists |
| `js/flashcards.js` | A | drop locale calls |
| `js/state.js` | A | bump KEY to v3, drop `locale` default, migrate |
| `index.html` | A, C, D | strip `data-i18n`, drop locale button, swap footer, add 4 info sections |
| `css/base.css` | A, B | absorb `.ltr` rule, switch `100vh`→`100dvh` |
| `css/layout.css` | B, C, D | safe-area insets, drop `.deer`, add `.foot-links`, add `.info-view` |
| `css/mobile.css` | B | scroll shadows, 44px tap targets, topbar collapse |
| `sw.js` | A, F | cache bump, prune deleted assets, drop Nastaliq |
| `manifest.json` | A, F | version bump, drop `dir:auto` |

**Files to delete:** `js/localize.js`, `css/localize.css`, `data/translations.json`.

## Reused helpers / patterns

- View-switch router: `show()` in `js/main.js:54` (audit §8) — extend, don't replace.
- localStorage wrapper: `store.get/set` in `js/state.js` — already used by theme + quiz + flashcards; v3 just adds key migration.
- Service-worker activate handler purges old caches automatically — no code change needed beyond bumping `CACHE`.
- `.ltr` utility class is already applied in `index.html` (lines 52, 82–84) and `css/table.css:43` — moving the rule into `base.css` keeps those call-sites working.

## Verification

Serve from project root: `python3 -m http.server 8080`.

**Phase A (de-Urdu):**
- Hard reload (`Cmd+Shift+R`) — no console errors about missing `localize.js` / `translations.json`.
- DevTools Network tab: no request for `data/translations.json` or Noto Nastaliq font.
- `<html>` shows `lang="en"`, no `dir` attribute.
- Locale toggle gone from topbar.

**Phase B (mobile):**
- Chrome DevTools → iPhone SE (375×667) and iPhone 14 Pro (393×852) and Galaxy S8 (360×740):
  - Periodic table fully scrollable horizontally, no element clipped on the right.
  - Scroll-shadow gradient visible at edges.
  - Topbar wraps to 3 rows under 680px, no horizontal overflow on body.
  - Chips wrap, no horizontal overflow.
  - Tap a tile — detail overlay 3D canvas renders fully, no half-black band.
  - Address-bar collapse on real Safari/Chrome doesn't leave a black strip below the footer (`100dvh` confirmed).
- Real-phone test via `http://<lan-ip>:8080`.

**Phase C+D (footer + legal pages):**
- Footer shows four links, no Deerflow credit anywhere.
- Click each link → URL becomes `#/privacy` etc. and the matching view activates.
- Direct-load `http://localhost:8080/#/privacy` → privacy view is what renders, table is hidden.
- Privacy text mentions localStorage, no-analytics, mailto, GitHub issues.
- Contact link → opens default mail client to `syedurrahman804@gmail.com`.

**Phase F (PWA):**
- DevTools → Application → Service Workers → `elementa-v3` is active, `elementa-v2` is gone.
- Application → Manifest → version 3.0.0, no `dir`.
- Go offline → reload — every view (table, lab, quiz, cards, trends, privacy, terms, disclaimer, contact) loads from cache.

**Push & live verify:**
- `git add -A && git commit -m "v3: mobile fixes, remove Urdu, add legal pages" && git push`
- Wait ~60s, hard-reload `https://synvora.github.io/elementa/` and `https://synvora.github.io/elementa/#/privacy`.
- Run Lighthouse (mobile) — PWA + Accessibility scores ≥ 90.
- Send link to friend — confirm no cutoff on their phone.

## Out of scope (explicitly deferred)

- Pinch-zoom / adaptive scaling (rejected during planning — keeps tap targets accessible).
- Backend contact form (mailto only).
- Analytics — staying tracking-free is a Privacy Policy commitment.
- New features (no flashcard decks, no quiz modes, no AR). V3 is hardening, not expansion.
