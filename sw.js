// sw.js — service worker. Keeps the app shell cached so the app opens with zero internet.

const CACHE = "gym-umer-ai-v1.18";

const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/db.js",
  "./js/ui.js",
  "./js/app.js",
  "./js/food.js",
  "./js/progress.js",
  "./js/pin.js",
  "./js/media.js",
  "./media/videos.js",
  "./manifest.json",
  "./icon.svg",
  "./media/index.json",
  "https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.min.js"
];

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
  if (url.origin !== location.origin && !url.hostname.includes("jsdelivr") && url.hostname !== "raw.githubusercontent.com") return;
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