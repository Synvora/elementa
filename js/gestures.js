// Touch + pointer interaction helpers shared across views.
import { store } from "./state.js";

// OrbitControls auto-rotate toggles off on user interaction, resumes after idleMs.
export function autoPauseRotate(controls, { idleMs = 4000 } = {}) {
  if (!controls || !controls.domElement) return;
  const el = controls.domElement;
  let timer;
  const pause = () => {
    controls.autoRotate = false;
    clearTimeout(timer);
    timer = setTimeout(() => { controls.autoRotate = true; }, idleMs);
  };
  ["pointerdown", "wheel", "touchstart"].forEach(ev =>
    el.addEventListener(ev, pause, { passive: true })
  );
}

// Long-press handler that suppresses the trailing click.
export function attachLongPress(el, cb, ms = 550) {
  let timer, fired;
  el.addEventListener("pointerdown", (e) => {
    fired = false;
    timer = setTimeout(() => { fired = true; cb(e); }, ms);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
    el.addEventListener(ev, () => clearTimeout(timer))
  );
  el.addEventListener("click", (e) => {
    if (fired) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}

// One-time gesture hint toast. Keyed so each hint only ever shows once per device.
export function showGestureHint(key, text) {
  const seen = store.get("gestureHints") || {};
  if (seen[key]) return;
  seen[key] = true;
  store.set("gestureHints", seen);

  const toast = document.createElement("div");
  toast.className = "hint-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}
