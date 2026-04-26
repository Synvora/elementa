# Periodic Table Learning Web App — Specification

## Context

The user wants to build an **interactive chemistry learning app** centered on the **Periodic Table** — not a generic school app, but a focused tool where students explore elements, see 3D atomic structures, and combine elements via a bonding simulator (e.g. H + O → H₂O). The existing `PERIODIC_TABLE_APP_PLAN.md` in the project is a broad brainstorm covering Flutter, SwiftUI, AR, teacher mode, accounts, etc. — too large to execute as a single v1.

The user has explicitly directed:
1. **Build the website first** ("first we will create a website")
2. **Take full ownership of decisions and setup** ("you do everything yourself")
3. Should eventually be **install-able** and usable on both desktop and mobile browsers

This plan narrows the brainstorm into a **shippable v1 web app** that delivers the signature features (periodic table UI, element details, 3D atom, bonding simulator, quiz) without a backend, accounts, native builds, or AR. Those can come in v2 once v1 proves the concept.

The existing `index.html` in the project is a dashboard demo, not the real app — it will be replaced.

---

## Goals for v1

- **Beautiful, distinctive UI** — dark lab aesthetic, category color-coding, smooth animations (matches the `.claude/frontend-design` skill direction already used).
- **All 118 elements** with full offline data (name, symbol, atomic number/mass, category, period/group, electron configuration, physical props, uses, discovery, fun facts).
- **Element detail view** with an animated **Bohr-model 3D atom** (Three.js) showing nucleus + orbiting electrons in the correct shells.
- **Bonding Simulator** — drag 2+ element tiles into a reaction zone, app looks up the compound in a curated table and visualizes the result (formula, bond type, description, molecule ball-and-stick render).
- **Quiz mode** — 3 game types (Symbol Match, Atomic Number Guess, Category Sort) with timer, score, streaks saved in localStorage.
- **Search + filter** — by name/symbol/atomic number; filter by category, state, period, group.
- **Dark/Light theme toggle**, persisted.
- **PWA install** — manifest + service worker so users can "Add to Home Screen" on mobile and install on desktop. Works fully offline after first load.
- **No backend, no accounts** — all progress in `localStorage`. Ship-friendly, private, fast.

**Explicitly out of scope for v1** (defer to v2): teacher mode, accounts/login, Urdu translation, AR, AI tutor, video embeds, multiplayer, flashcards with spaced repetition, trends visualizer graphs, Lewis-structure drawing, native apps.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Markup/Style | Plain HTML + CSS (CSS variables, grid, custom properties) | Zero build step, fast iteration, matches existing project style. |
| Logic | Plain JavaScript modules (ES modules, `type="module"`) | No framework overhead; app is presentational + a small state layer. |
| 3D | [Three.js](https://threejs.org/) via ESM import from a CDN (`https://unpkg.com/three@0.160.0/build/three.module.js`) | Industry standard, well-documented, handles Bohr atom and molecule rendering cheaply. |
| Data | Static `elements.json` + `compounds.json` in `/data/` | 118 elements is small (~100KB). Ship in the bundle, load with `fetch`. |
| Persistence | `localStorage` | Quiz scores, streaks, theme, last-viewed element. |
| PWA | `manifest.json` + `sw.js` (service worker) with cache-first strategy | Offline + installable on all modern browsers. |
| Fonts | Google Fonts: **Fraunces** (display serif) + **JetBrains Mono** (numbers/symbols) + **Space Grotesk** (UI body) | Distinctive, matches `.claude/frontend-design` SKILL.md guidance to avoid generic fonts. |
| Hosting | Any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages) | Free, trivial to deploy. |

No npm, no bundler, no transpiler. Open `index.html` → it runs. Deploy = upload the folder.

---

## File Structure

Everything lives in `/mnt/c/Users/win10/Desktop/example/`:

```
example/
├── index.html                  # Shell + main Periodic Table view
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker (offline caching)
├── css/
│   ├── base.css                # Reset, variables, typography, theme tokens
│   ├── layout.css              # Grid, header, nav, page transitions
│   ├── table.css               # Periodic table grid + element tiles
│   ├── detail.css              # Element detail overlay
│   ├── bonding.css             # Bonding lab
│   └── quiz.css                # Quiz screens
├── js/
│   ├── main.js                 # Entry point, router, init
│   ├── state.js                # App state + localStorage wrapper
│   ├── data.js                 # Loads + indexes elements.json / compounds.json
│   ├── table.js                # Renders periodic table, handles filter/search
│   ├── detail.js               # Element detail view + opens 3D atom
│   ├── atom3d.js               # Three.js Bohr-model renderer
│   ├── bonding.js              # Drag-drop simulator, compound lookup
│   ├── molecule3d.js           # Three.js ball-and-stick molecule renderer
│   ├── quiz.js                 # Quiz engine (3 modes) + scoring
│   ├── search.js               # Search + filter logic
│   └── theme.js                # Dark/light toggle, persists
├── data/
│   ├── elements.json           # 118 elements, full schema (see below)
│   └── compounds.json          # ~40 common compounds for the simulator
├── assets/
│   ├── icons/                  # PWA icons (192, 512), favicon, UI icons (SVG)
│   └── fonts/                  # (optional — using Google Fonts CDN instead)
└── docs/
    └── EXPLANATION.md          # (keep existing — explains project in Urdu)
```

Files to **delete** before starting: the current `index.html` (dashboard demo). Keep `EXPLANATION.md`, `PERIODIC_TABLE_APP_PLAN.md`, and `.claude/` directory.

---

## Data Schemas

### `data/elements.json` — array of 118 objects

```json
{
  "atomicNumber": 1,
  "symbol": "H",
  "name": "Hydrogen",
  "atomicMass": 1.008,
  "category": "nonmetal",
  "period": 1,
  "group": 1,
  "row": 1,
  "col": 1,
  "block": "s",
  "state": "gas",
  "electronConfiguration": "1s1",
  "shells": [1],
  "electronegativity": 2.20,
  "meltingPoint": 13.99,
  "boilingPoint": 20.271,
  "density": 0.00008988,
  "discoveredBy": "Henry Cavendish",
  "discoveryYear": 1766,
  "valency": [1, -1],
  "uses": ["Rocket fuel", "Ammonia production", "Fuel cells"],
  "funFacts": ["Makes up ~75% of the universe by mass.", "Lightest element."],
  "color": "colorless",
  "summary": "The lightest element; essential for life as part of water and organic molecules."
}
```

**Categories** (drives color + filter): `alkali-metal`, `alkaline-earth`, `transition-metal`, `post-transition`, `metalloid`, `nonmetal`, `halogen`, `noble-gas`, `lanthanide`, `actinide`, `unknown`.

**Data source**: Use the open dataset at https://github.com/Bowserinator/Periodic-Table-JSON (MIT licensed, already has all 118). I will `fetch` that JSON once, map its schema to ours, and save locally.

### `data/compounds.json` — array of ~40 common compounds

```json
{
  "formula": "H2O",
  "name": "Water",
  "reactants": [{"symbol": "H", "count": 2}, {"symbol": "O", "count": 1}],
  "bondType": "covalent",
  "state": "liquid",
  "description": "Essential for all known life. Polar molecule with bent geometry (104.5°).",
  "uses": ["Drinking", "Solvent", "Industrial cooling"],
  "geometry": "bent",
  "atoms": [
    {"element": "O", "position": [0, 0, 0]},
    {"element": "H", "position": [0.76, 0.59, 0]},
    {"element": "H", "position": [-0.76, 0.59, 0]}
  ],
  "bonds": [[0, 1], [0, 2]]
}
```

Curated compound list for v1 (covers the classroom staples):
H₂O, H₂, O₂, N₂, CO₂, CO, NaCl, KCl, HCl, H₂SO₄, HNO₃, NH₃, CH₄, C₂H₆, C₂H₄, C₂H₂, C₆H₆, C₆H₁₂O₆, NaOH, KOH, CaCO₃, CaO, Ca(OH)₂, MgO, Al₂O₃, Fe₂O₃, FeO, CuO, CuSO₄, ZnO, SO₂, SO₃, NO, NO₂, P₂O₅, PCl₃, PCl₅, SiO₂, Na₂CO₃, NaHCO₃.

Matching logic (in `bonding.js`): normalize dropped-in elements into a sorted `{symbol: count}` map, then look up the first compound whose `reactants` match. If no match → show "No known simple compound — try different proportions."

---

## Feature Specs

### 1. Periodic Table Home (`index.html` + `table.js`)

- **Layout**: CSS grid, 18 columns × 10 rows (rows 8-9 are lanthanides/actinides strip, offset with a gap between row 6 and row 8).
- **Tile** per element: atomic number (top-left), symbol (center, Fraunces bold), name (bottom), atomic mass (top-right, JetBrains Mono). Category-tinted background using a CSS variable per category.
- **Hover**: tile lifts, glow border in accent color, shows mini-tooltip with full name + state.
- **Click**: opens detail overlay (see §2).
- **Top bar**: app name "Elementa" (or similar), search input, filter chips (category toggles), quiz button, bonding-lab button, theme toggle.
- **Search**: live-filter as user types. Matches symbol, name, atomic number. Non-matching tiles fade to 15% opacity instead of disappearing (keeps the table shape).
- **Filter chips**: click a category → only that category stays full opacity.
- **Staggered load animation**: each tile fades+rises in with `animation-delay: calc(var(--i) * 8ms)`.

### 2. Element Detail Overlay (`detail.js` + `css/detail.css`)

Full-screen overlay sliding up from below (not a new page — keeps the table state).

- **Left column**: huge symbol (Fraunces, ~200px), name, atomic number, category badge, quick stats grid (mass, period, group, state, melting/boiling pt, density, electronegativity).
- **Right column**: 3D Bohr atom viewer (`<canvas>` powered by `atom3d.js`), below it — tabs: **Overview**, **Properties**, **Uses**, **History**, **Facts**.
- **Close button** (ESC also works), **prev/next** arrows to cycle through elements.

### 3. 3D Bohr Atom (`atom3d.js`)

- Scene: black/dark background, nucleus = glowing sphere (red for protons, center), each shell = a torus/ring, electrons = small glowing spheres orbiting along their shell ring.
- Shell radii: `shellRadius = baseRadius + shellIndex * spacing`.
- Electron count per shell from `element.shells` array.
- Each electron orbits at a constant angular velocity, with a slight per-electron phase offset so they don't overlap.
- Camera auto-rotates slowly; user can orbit-drag with mouse (OrbitControls from three/examples, imported via CDN).
- Pauses animation when overlay is closed (cleanup on unmount).

### 4. Bonding Simulator (`bonding.js` + `molecule3d.js`)

- Dedicated view triggered from top-bar button. Layout: left = mini periodic table of "available" elements; right = reaction zone (a big circular drop target) + output panel.
- User clicks an element → adds one atom to the reaction zone (a small floating tile with a ×N counter if clicked multiple times). Click the tile to remove.
- "React" button runs the lookup. If a compound matches, show:
  - Formula in large type
  - Name
  - Bond type badge (ionic/covalent/metallic)
  - State of matter
  - Description
  - 3D ball-and-stick molecule (rendered by `molecule3d.js` using atom positions from `compounds.json`)
- Animation on successful react: particle burst from each atom tile converging into the molecule position.
- "No match" state: friendly message + hint ("Try 2 H and 1 O").

### 5. Quiz (`quiz.js` + `css/quiz.css`)

Three modes, each 10 questions, 30s/question:

1. **Symbol Match** — "What is the symbol for Sodium?" → 4 choices.
2. **Atomic Number** — "Which element has atomic number 26?" → 4 choices (names).
3. **Category Sort** — Given a symbol, pick its category from 4 choices.

- Randomly sample 10 elements per run (seeded by `Date.now()`).
- Per-question: countdown ring, correct → green flash + +10 pts; wrong → red flash + correct answer revealed.
- End screen: score, accuracy %, time, "best score" (from localStorage), retry button.
- Streak tracking: consecutive days any quiz played; stored as `{lastPlayed: ISODate, count: N}`.

### 6. Theme (`theme.js`)

- Toggle button in top bar. Two themes: `dark` (default) and `light`.
- Applies `data-theme="..."` on `<html>`; CSS variables switch.
- Persisted to `localStorage.theme`. Respects `prefers-color-scheme` on first load.

### 7. PWA (`manifest.json` + `sw.js`)

- `manifest.json`: name, short_name, start_url `/`, display `standalone`, theme_color, background_color, icons (192, 512).
- `sw.js`: on install, pre-cache shell files + `elements.json` + `compounds.json` + fonts. On fetch, cache-first with network fallback.
- Registered from `main.js` with `navigator.serviceWorker.register('/sw.js')`.
- Result: "Install app" prompt on Chrome/Edge desktop; "Add to Home Screen" on iOS Safari + Android.

---

## Design Direction (locked in)

Per the project's `.claude/frontend-design/SKILL.md`, commit to a clear aesthetic. Choice: **"Editorial Laboratory"** —

- **Palette (dark, default)**: deep ink `#0a0e1a` background; off-white `#eef2ff` text; cyan `#7ef9ff`, amber `#ffb454`, rose `#ff6b9a` accents for element categories; glassmorphic panels.
- **Palette (light)**: warm paper `#fbf8f3` background; ink `#0a0e1a` text; same accents slightly darkened.
- **Grid overlay**: subtle blueprint grid on the background (fixed, low opacity) — same technique as the existing dashboard `index.html`.
- **Grain**: SVG noise overlay at 5-10% opacity for texture.
- **Typography**: `Fraunces` (display, element symbols + section headers) + `Space Grotesk` (UI body) + `JetBrains Mono` (numbers, atomic data, codes).
- **Motion**: staggered tile reveal, smooth overlay slide-ups, 3D atom continuous rotation, subtle parallax on background.
- **Branding**: per `frontend-design` skill's mandatory signature — a small "✦ Created by Deerflow" pill in the footer linking to https://deerflow.tech (target="_blank"), styled to match theme.

---

## Build Order (how I'll execute)

1. **Scaffold**: delete the old dashboard `index.html`, create folder structure, write `base.css` + `layout.css` with variables + typography + theme tokens.
2. **Data**: fetch the Periodic-Table-JSON dataset, map to our schema, write `elements.json`. Hand-author `compounds.json` (40 entries).
3. **Periodic Table**: `index.html` shell + `table.js` renders all 118 tiles from JSON. Add search + filters.
4. **Detail overlay**: opens on click, renders left-column stats + right-column placeholder.
5. **3D atom**: `atom3d.js` with Three.js Bohr model; wire into detail overlay.
6. **Bonding simulator**: view, drag/click-to-add, compound lookup, result panel.
7. **Molecule 3D**: `molecule3d.js` ball-and-stick renderer for the result panel.
8. **Quiz**: all 3 modes, scoring, localStorage.
9. **Theme toggle** + **Deerflow signature**.
10. **PWA**: manifest + service worker, icons, test install.
11. **Polish pass**: animations, accessibility (keyboard nav, ARIA labels, focus rings), responsive breakpoints for tablet/phone.

---

## Verification

To confirm v1 works end-to-end:

1. **Open locally**: `python3 -m http.server 8000` in the project folder → visit `http://localhost:8000`.
2. **Table renders**: all 118 elements visible in correct grid positions, colored by category, no console errors.
3. **Search**: typing "sod" fades all but Sodium to low opacity.
4. **Filter**: clicking "Noble gas" chip leaves only He, Ne, Ar, Kr, Xe, Rn, Og full-opacity.
5. **Detail**: click H → overlay opens, 3D atom rotates showing 1 electron in shell 1; click next arrow → He with 2 electrons in shell 1; ESC closes.
6. **Bonding**: open Bonding Lab, click H twice + O once, press React → shows "H₂O — Water — Covalent", 3D bent molecule renders.
7. **No match**: drop 3 × Au, React → shows "No known simple compound" message.
8. **Quiz**: play Symbol Match, finish 10 questions, see score. Refresh → best score persists.
9. **Theme**: toggle dark→light, refresh → theme persists.
10. **PWA**: open Chrome DevTools → Application → Manifest shows no errors; install icon appears in URL bar. Install, go offline, reload → app still works.
11. **Mobile**: open on phone browser (ngrok or deploy to Vercel), confirm responsive grid collapses sensibly and touch gestures work.

---

## Files to Modify / Create

**Delete**:
- `/mnt/c/Users/win10/Desktop/example/index.html` (old dashboard)

**Create** (all new):
- `/mnt/c/Users/win10/Desktop/example/index.html`
- `/mnt/c/Users/win10/Desktop/example/manifest.json`
- `/mnt/c/Users/win10/Desktop/example/sw.js`
- `/mnt/c/Users/win10/Desktop/example/css/{base,layout,table,detail,bonding,quiz}.css`
- `/mnt/c/Users/win10/Desktop/example/js/{main,state,data,table,detail,atom3d,bonding,molecule3d,quiz,search,theme}.js`
- `/mnt/c/Users/win10/Desktop/example/data/{elements,compounds}.json`
- `/mnt/c/Users/win10/Desktop/example/assets/icons/` (favicon, 192.png, 512.png — simple atom logo)

**Keep**:
- `/mnt/c/Users/win10/Desktop/example/EXPLANATION.md` (Urdu explanation)
- `/mnt/c/Users/win10/Desktop/example/PERIODIC_TABLE_APP_PLAN.md` (reference)
- `/mnt/c/Users/win10/Desktop/example/.claude/` (skill + config)

---

## v2 Roadmap (not for this cycle)

Once v1 ships and is in students' hands, pick from:

- Urdu language toggle (translate all UI + element names).
- Teacher mode: class-code login (Firebase Anonymous Auth), assign quizzes, see class leaderboard.
- Flashcards with spaced repetition.
- Trends visualizer (charts for radius/electronegativity/IE across period/group).
- Virtual lab experiments (temperature/pressure effects).
- AI tutor panel (Claude API) for open-ended questions.
- Flutter wrapper for Play Store / App Store (reuses the same JSON data + recreates UI in Flutter — or stays web via WebView).
- AR mode (mobile only, WebXR or native).
