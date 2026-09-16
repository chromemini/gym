// sw.js — service worker. Keeps the app shell cached so the app opens with zero internet.

const CACHE = "gym-umer-ai-v1.07";

const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/db.js",
  "./js/ui.js",
  "./js/app.js",
  "./js/food.js",
  "./js/progress.js",
  "./manifest.json",
  "./icon.svg",
  "https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.min.js"
];

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("free-exercise-db")) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(e.request).then(
          (hit) =>
            hit ||
            fetch(e.request).then((res) => {
              c.put(e.request, res.clone());
              return res;
            })
        )
      )
    );
  }
});

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !url.hostname.includes("jsdelivr")) return;
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});