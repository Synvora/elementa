import { store } from "./state.js";

export function initTheme() {
  const saved = store.get("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved ?? (prefersDark ? "dark" : "light");
  apply(theme);

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    apply(next);
    store.set("theme", next);
  });
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  // update meta theme-color for mobile address bar
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", theme === "dark" ? "#0a0e1a" : "#fbf8f3");
}
