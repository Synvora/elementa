// Periodic trends — line charts of a single metric along a period or group.
// Chart.js loaded once from CDN; service worker caches it for offline.
import { getElements } from "./data.js";
import { store } from "./state.js";
import { t, onLocaleChange } from "./localize.js";

const CHART_JS_URL = "https://unpkg.com/chart.js@4.4.1/dist/chart.umd.js";
let chartReady = null;
let activeChart = null;

const METRICS = [
  { id: "electronegativity",  pick: el => el.electronegativity_pauling ?? el.electronegativity },
  { id: "atomicRadius",       pick: el => el.atomic_radius ?? el.radius ?? el.atomicRadius },
  { id: "ionizationEnergy",   pick: el => el.ionization_energies?.[0] ?? el.ionizationEnergy },
  { id: "meltingPoint",       pick: el => el.melt ?? el.meltingPoint }
];

export function initTrends() {
  const root = document.getElementById("trends-root");
  if (!root) return;
  const last = store.get("trendsLast") || { axis: "period", value: 2, metric: "electronegativity" };
  render(root, last);
  onLocaleChange(() => {
    const cur = store.get("trendsLast") || last;
    render(root, cur);
  });
}

function render(root, cfg) {
  const axisOptions = cfg.axis === "period"
    ? [1, 2, 3, 4, 5, 6, 7]
    : Array.from({ length: 18 }, (_, i) => i + 1);
  if (!axisOptions.includes(cfg.value)) cfg.value = axisOptions[1] || axisOptions[0];

  root.innerHTML = `
    <div class="trend-controls">
      <div class="seg">
        <span class="seg-label">${t("trends.axis")}</span>
        <button class="seg-btn ${cfg.axis === "period" ? "active" : ""}" data-axis="period">${t("trends.period")}</button>
        <button class="seg-btn ${cfg.axis === "group" ? "active" : ""}" data-axis="group">${t("trends.group")}</button>
      </div>
      <label class="seg">
        <span class="seg-label">${cfg.axis === "period" ? t("trends.period") : t("trends.group")}</span>
        <select id="trend-value" class="ltr">
          ${axisOptions.map(v => `<option value="${v}" ${v === cfg.value ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
      <label class="seg">
        <span class="seg-label">${t("trends.metric")}</span>
        <select id="trend-metric">
          ${METRICS.map(m => `<option value="${m.id}" ${m.id === cfg.metric ? "selected" : ""}>${t(`trends.metrics.${m.id}`)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="trend-chart"><canvas id="trend-canvas"></canvas></div>
    <div class="trend-note" id="trend-note"></div>
  `;

  root.querySelectorAll(".seg-btn").forEach(b => {
    b.addEventListener("click", () => {
      cfg.axis = b.dataset.axis;
      cfg.value = cfg.axis === "period" ? 2 : 1;
      store.set("trendsLast", cfg);
      render(root, cfg);
    });
  });
  root.querySelector("#trend-value").addEventListener("change", (e) => {
    cfg.value = Number(e.target.value);
    store.set("trendsLast", cfg);
    drawChart(cfg);
  });
  root.querySelector("#trend-metric").addEventListener("change", (e) => {
    cfg.metric = e.target.value;
    store.set("trendsLast", cfg);
    drawChart(cfg);
  });

  drawChart(cfg);
}

async function drawChart(cfg) {
  await loadChartJs();
  const metric = METRICS.find(m => m.id === cfg.metric) || METRICS[0];
  const elements = getElements()
    .filter(el => cfg.axis === "period" ? el.period === cfg.value : el.group === cfg.value)
    .sort((a, b) => a.atomicNumber - b.atomicNumber);

  const points = elements
    .map(el => ({ x: el.atomicNumber, y: metric.pick(el), label: el.symbol }))
    .filter(p => p.y != null && !Number.isNaN(p.y));

  const canvas = document.getElementById("trend-canvas");
  if (!canvas) return;
  const note = document.getElementById("trend-note");

  if (activeChart) { activeChart.destroy(); activeChart = null; }
  if (points.length === 0) {
    note.textContent = `No data for this combination.`;
    return;
  }
  note.textContent = "";

  activeChart = new window.Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: points.map(p => p.label),
      datasets: [{
        label: t(`trends.metrics.${cfg.metric}`),
        data: points.map(p => p.y),
        borderColor: getCssVar("--accent") || "#7ef9ff",
        backgroundColor: "rgba(126,249,255,0.15)",
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: getCssVar("--ink") || "#eef2ff" } },
        tooltip: { callbacks: {
          title: (items) => items[0]?.label,
          label: (item) => `${item.dataset.label}: ${item.parsed.y}`
        }}
      },
      scales: {
        x: {
          ticks: { color: getCssVar("--ink-2") || "#a8b2cb" },
          grid:  { color: "rgba(128,140,180,0.15)" }
        },
        y: {
          beginAtZero: false,
          ticks: { color: getCssVar("--ink-2") || "#a8b2cb" },
          grid:  { color: "rgba(128,140,180,0.15)" }
        }
      }
    }
  });
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function loadChartJs() {
  if (chartReady) return chartReady;
  chartReady = new Promise((resolve, reject) => {
    if (window.Chart) return resolve();
    const s = document.createElement("script");
    s.src = CHART_JS_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Chart.js failed to load"));
    document.head.appendChild(s);
  });
  return chartReady;
}
