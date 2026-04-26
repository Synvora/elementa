// Wires the header search input to the table filter.
import { setSearch } from "./table.js";

export function initSearch() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => setSearch(input.value));

  // "/" keyboard shortcut focuses search
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}
