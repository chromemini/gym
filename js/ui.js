// js/ui.js — small shared screen helpers. No data logic here.

export function $(id) {
  return document.getElementById(id);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

let toastTimer = null;

export function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

export function closeDemo() {
  $("demo-modal").classList.add("hidden");
}

let exerciseDbPromise = null;

function loadExerciseDb() {
  if (exerciseDbPromise) return exerciseDbPromise;
  exerciseDbPromise = (async () => {
    const CACHE_KEY = "gym.exdb.v1";
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && cached.t && Date.now() - cached.t < CACHE_TTL && Array.isArray(cached.d)) {
        return cached.d;
      }
    } catch (e) {}
    try {
      const res = await fetch(
        "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json"
      );
      if (!res.ok) return [];
      const data = await res.json();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: data }));
      } catch (e) {}
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  })();
  return exerciseDbPromise;
}

function normalize(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findExerciseMedia(list, name) {
  if (!list || !list.length) return null;
  const target = normalize(name);
  const targetTokens = target.split(" ").filter(Boolean);
  if (!targetTokens.length) return null;
  let best = null;
  let bestScore = 0;
  for (const ex of list) {
    const n = normalize(ex.name);
    if (n === target) return ex;
    const tokens = n.split(" ");
    let overlap = 0;
    for (const t of targetTokens) if (tokens.includes(t)) overlap++;
    const score = overlap / Math.max(targetTokens.length, tokens.length);
    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }
  return bestScore >= 0.4 ? best : null;
}

function mediaUrls(ex) {
  if (!ex || !Array.isArray(ex.images) || !ex.images.length) return [];
  return ex.images.map(
    (p) => "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/" + p
  );
}

export async function openDemo({ name, notes, videoUrl, onSave }) {
  $("demo-title").textContent = name;
  const body = $("demo-body");

  let videosHtml = "";
  if (videoUrl) {
    videosHtml += `<video class="demo-video" controls playsinline src="${escapeHtml(videoUrl)}"></video>`;
  }
  const cacheKey = "gym.demo." + name;
  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
  } catch (e) {}
  if (cached && cached.length) {
    videosHtml += cached
      .map((u) => `<video class="demo-video" controls playsinline src="${escapeHtml(u)}"></video>`)
      .join("");
  }

  body.innerHTML = `
    <div id="demo-gif-wrap"></div>
    ${videosHtml || `<p class="muted small">No saved video yet. The animation above loads automatically.</p>`}
    ${notes ? `<div class="demo-notes"><h4>How to do it</h4><p>${escapeHtml(notes)}</p></div>` : ""}
    <div class="grid-2">
      <input type="url" class="input" id="demo-url" placeholder="Paste video link" value="${videoUrl ? escapeHtml(videoUrl) : ""}">
      <button class="btn" id="demo-save"><svg class="icon"><use href="#i-check"/></svg> Save link</button>
    </div>
    <div class="actions">
      <p class="muted small">Need a video walkthrough? Search YouTube below and paste the link above to save it for this exercise.</p>
      <a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(name + " proper form")}"><svg class="icon"><use href="#i-video"/></svg> Search YouTube</a>
    </div>`;

  $("demo-save").onclick = async () => {
    const url = $("demo-url").value.trim();
    await onSave(url);
    if (url) {
      try {
        const list = JSON.parse(localStorage.getItem(cacheKey) || "[]");
        if (!list.includes(url)) list.push(url);
        localStorage.setItem(cacheKey, JSON.stringify(list));
      } catch (e) {}
    }
    closeDemo();
  };

  $("demo-modal").classList.remove("hidden");

  const gifWrap = $("demo-gif-wrap");
  gifWrap.innerHTML = `<p class="muted small">Loading demonstration…</p>`;
  const list = await loadExerciseDb();
  const match = findExerciseMedia(list, name);
  const urls = mediaUrls(match);
  if (urls.length) {
    gifWrap.innerHTML = urls
      .map(
        (u) =>
          `<img class="demo-video" src="${escapeHtml(u)}" alt="${escapeHtml(match.name)} demonstration" loading="lazy">`
      )
      .join("");
  } else {
    gifWrap.innerHTML = `<p class="muted small">No demonstration found for this exercise.</p>`;
  }
}