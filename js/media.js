// js/media.js — exercise media resolver and self-healing player.
// Resolution order: curated manifest (Tier 0) → bundled index (Tier 1) →
// user-cached runtime result (Tier 2) → YouTube search (Tier 3, rendered by
// ui.openDemo). Never shows a wrong video: below the confidence threshold we
// fall through silently, and the demo modal always offers a YouTube search
// link as the guaranteed floor.

import * as data from "./db.js";
import { VIDEOS } from "../media/videos.js";

const MATCH_THRESHOLD = 0.85;

let INDEX = null;
let NORMALIZED_VIDEOS = null;

// Turn any supported URL into a candidate object. Returns null if the URL
// doesn't look like anything we know how to play.
function urlToCandidate(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i.exec(u);
  if (yt) {
    const portrait = /youtube\.com\/shorts\//i.test(u);
    return { kind: "yt", id: yt[1], portrait, source: "YouTube", license: "YouTube ToS" };
  }
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(u)) return { kind: "video", url: u, source: "video" };
  if (/\.gif(\?|#|$)/i.test(u)) return { kind: "gif", url: u, source: "gif" };
  if (/\.(png|jpe?g|webp|avif)(\?|#|$)/i.test(u)) return { kind: "image", url: u, source: "image" };
  return null;
}

// Build a normalized lookup from media/videos.js once, lazily.
function getNormalizedVideos() {
  if (NORMALIZED_VIDEOS) return NORMALIZED_VIDEOS;
  NORMALIZED_VIDEOS = {};
  const src = VIDEOS || {};
  for (const key of Object.keys(src)) {
    const c = urlToCandidate(src[key]);
    if (c) NORMALIZED_VIDEOS[normalize(key)] = c;
  }
  return NORMALIZED_VIDEOS;
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n];
}

function confidence(a, b) {
  if (!a || !b) return 0;
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return Math.max(0, 1 - levenshtein(a, b) / max);
}

async function loadIndex() {
  if (INDEX) return INDEX;
  try {
    const res = await fetch("./media/index.json", { cache: "force-cache" });
    if (res.ok) {
      const j = await res.json();
      if (Array.isArray(j)) INDEX = j;
    }
  } catch (e) {}
  if (!INDEX) INDEX = [];
  return INDEX;
}

export async function isAutoMediaEnabled() {
  return await data.getSetting("autoMedia", true);
}

export async function resolveMedia(name) {
  const out = [];
  const slug = normalize(name);
  if (!slug) return out;

  // Tier 0 — user-editable video links from media/videos.js
  const fromVideos = getNormalizedVideos()[slug];
  if (fromVideos) out.push(fromVideos);

  // Tier 1 — bundled index with confidence-gated fuzzy match
  if (!out.length) {
    const idx = await loadIndex();
    let best = null;
    let bestScore = 0;
    for (const entry of idx) {
      if (!entry || !entry.name) continue;
      const s = confidence(slug, normalize(entry.name));
      if (s > bestScore) { bestScore = s; best = entry; }
    }
    if (best && bestScore >= MATCH_THRESHOLD && best.image) {
      out.push({
        kind: "image",
        url: best.image,
        source: "free-exercise-db",
        license: "Unlicense",
        confidence: Number(bestScore.toFixed(3))
      });
    }
  }

  // Tier 2 — user-cached runtime resolution (saved under settings)
  if (!out.length) {
    try {
      const saved = await data.getSetting("autoMedia:" + slug, null);
      if (Array.isArray(saved) && saved.length) out.push(...saved);
    } catch (e) {}
  }

  return out;
}

export function renderCandidates(container, candidates) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(candidates) || !candidates.length) return;

  let idx = 0;

  function fail() {
    tryNext();
  }

  function tryNext() {
    if (idx >= candidates.length) {
      container.insertAdjacentHTML(
        "beforeend",
        `<p class="muted small">Preview unavailable. Use the search link below.</p>`
      );
      return;
    }
    const c = candidates[idx++];
    if (!c) { tryNext(); return; }

    if (c.kind === "yt") {
      const iframe = document.createElement("iframe");
      iframe.className = c.portrait ? "demo-video portrait" : "demo-video";
      iframe.src = "https://www.youtube-nocookie.com/embed/" + c.id;
      iframe.title = "Exercise demo";
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      container.appendChild(iframe);
      return;
    }

    if (c.kind === "video") {
      const v = document.createElement("video");
      v.className = "demo-video";
      v.src = c.url;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.autoplay = true;
      v.setAttribute("playsinline", "");
      v.onerror = fail;
      v.onstalled = fail;
      container.appendChild(v);
      return;
    }

    if (c.kind === "image" || c.kind === "webp" || c.kind === "gif") {
      const img = document.createElement("img");
      img.className = "demo-video";
      img.src = c.url;
      img.alt = "Exercise demonstration";
      img.loading = "lazy";
      img.onerror = fail;
      container.appendChild(img);
      return;
    }

    tryNext();
  }

  tryNext();
}