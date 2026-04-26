// i18n + RTL layer. Keeps English as source-of-truth; overlays translations.
import { store } from "./state.js";

let translations = null;      // { en: {...}, ur: {...} }
let current = "en";
let listeners = new Set();

const NASTALIQ_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap";

export async function initLocale() {
  try {
    translations = await fetch("data/translations.json").then(r => r.json());
  } catch {
    translations = { en: {}, ur: {} };
  }
  const stored = store.get("locale");
  const sys = (navigator.language || "en").slice(0, 2);
  const pick = stored || (translations[sys] ? sys : "en");
  await setLocale(pick, { silent: true });
}

export async function setLocale(code, { silent = false } = {}) {
  current = translations && translations[code] ? code : "en";
  store.set("locale", current);
  const html = document.documentElement;
  html.setAttribute("lang", current);
  html.setAttribute("dir", current === "ur" ? "rtl" : "ltr");
  if (current === "ur") await ensureNastaliqLoaded();
  applyI18n(document);
  if (!silent) listeners.forEach(fn => { try { fn(current); } catch {} });
}

export function getLocale() { return current; }

export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Dot-path lookup with {{var}} interpolation. Falls back to the key itself.
export function t(key, vars) {
  const dict = translations?.[current];
  const val = dict ? lookup(dict, key) : null;
  const str = val ?? lookup(translations?.en ?? {}, key) ?? key;
  if (!vars) return str;
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function lookup(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function applyI18n(root) {
  root.querySelectorAll("[data-i18n]").forEach(n => {
    const key = n.getAttribute("data-i18n");
    n.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-attr]").forEach(n => {
    // format: "attr:key,attr2:key2"
    n.getAttribute("data-i18n-attr").split(",").forEach(pair => {
      const [attr, key] = pair.split(":").map(s => s.trim());
      if (attr && key) n.setAttribute(attr, t(key));
    });
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach(n => {
    n.setAttribute("placeholder", t(n.getAttribute("data-i18n-placeholder")));
  });
}

export function localizedName(el) {
  const v = lookup(translations?.[current] ?? {}, `elements.${el.atomicNumber}.name`);
  return v || el.name;
}

function ensureNastaliqLoaded() {
  return new Promise(resolve => {
    if (document.querySelector(`link[data-nastaliq]`)) return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = NASTALIQ_HREF;
    link.dataset.nastaliq = "1";
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}
