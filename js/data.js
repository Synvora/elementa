// Loads elements.json + compounds.json and exposes lookup indexes.

let elements = null;
let compounds = null;
let bySymbol = new Map();
let byNumber = new Map();

export async function loadData() {
  if (elements && compounds) return { elements, compounds };
  const [e, c] = await Promise.all([
    fetch("data/elements.json").then(r => r.json()),
    fetch("data/compounds.json").then(r => r.json())
  ]);
  elements = e;
  compounds = c;
  bySymbol = new Map(elements.map(el => [el.symbol, el]));
  byNumber = new Map(elements.map(el => [el.atomicNumber, el]));
  return { elements, compounds };
}

export function getElements() { return elements; }
export function getCompounds() { return compounds; }
export function elementBySymbol(sym) { return bySymbol.get(sym); }
export function elementByNumber(n) { return byNumber.get(n); }

// Category display info — keeps labels and swatch colors in one place.
export const CATEGORIES = [
  { id: "alkali-metal",     label: "Alkali metals",     i18n: "category.alkaliMetal" },
  { id: "alkaline-earth",   label: "Alkaline earths",   i18n: "category.alkalineEarth" },
  { id: "transition-metal", label: "Transition metals", i18n: "category.transitionMetal" },
  { id: "post-transition",  label: "Post-transition",   i18n: "category.postTransition" },
  { id: "metalloid",        label: "Metalloids",        i18n: "category.metalloid" },
  { id: "nonmetal",         label: "Nonmetals",         i18n: "category.nonmetal" },
  { id: "halogen",          label: "Halogens",          i18n: "category.halogen" },
  { id: "noble-gas",        label: "Noble gases",       i18n: "category.nobleGas" },
  { id: "lanthanide",       label: "Lanthanides",       i18n: "category.lanthanide" },
  { id: "actinide",         label: "Actinides",         i18n: "category.actinide" },
  { id: "unknown",          label: "Unknown",           i18n: "category.unknown" }
];

// Format Kelvin to Celsius, rounded
export function kToC(k) {
  if (k == null) return "—";
  const c = k - 273.15;
  return `${Math.round(c * 100) / 100} °C`;
}

// Format density with units
export function formatDensity(el) {
  if (el.density == null) return "—";
  const unit = el.state === "gas" ? "g/L" : "g/cm³";
  return `${el.density} ${unit}`;
}
