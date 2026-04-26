// Minimal service worker — cache-first for same-origin assets, network fallback.
const CACHE = "elementa-v2";
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "css/base.css",
  "css/layout.css",
  "css/table.css",
  "css/detail.css",
  "css/bonding.css",
  "css/quiz.css",
  "css/flashcards.css",
  "css/trends.css",
  "css/localize.css",
  "css/mobile.css",
  "js/main.js",
  "js/state.js",
  "js/data.js",
  "js/theme.js",
  "js/table.js",
  "js/search.js",
  "js/detail.js",
  "js/atom3d.js",
  "js/molecule3d.js",
  "js/bonding.js",
  "js/quiz.js",
  "js/localize.js",
  "js/flashcards.js",
  "js/trends.js",
  "js/gestures.js",
  "data/elements.json",
  "data/compounds.json",
  "data/translations.json",
  "data/flashcard-decks.json",
  "assets/icons/favicon.svg"
];
const WARM_CDN = [
  "https://unpkg.com/chart.js@4.4.1/dist/chart.umd.js",
  "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(SHELL); } catch {}
    // Best-effort warm the CDN bits so the app is offline-ready after first install.
    await Promise.allSettled(WARM_CDN.map(async url => {
      try {
        const res = await fetch(url, { mode: "no-cors" });
        await cache.put(url, res);
      } catch {}
    }));
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // cache-first for same-origin
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          // cache successful GETs for next time
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // stale-while-revalidate for CDN assets (fonts, three.js)
  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
