// js/ui.js — small shared screen helpers. No data logic here.

import { renderCandidates } from "./media.js";

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

function mediaType(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i.exec(u);
  if (yt) return { kind: "yt", id: yt[1] };
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(u)) return { kind: "video" };
  if (/\.(gif|png|jpe?g|webp|avif)(\?|#|$)/i.test(u)) return { kind: "image" };
  return null;
}

function renderMedia(url) {
  const t = mediaType(url);
  if (!t) return "";
  if (t.kind === "yt") {
    return `<iframe class="demo-video" src="https://www.youtube.com/embed/${t.id}" title="Exercise demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }
  if (t.kind === "video") {
    return `<video class="demo-video" controls playsinline src="${escapeHtml(url)}"></video>`;
  }
  return `<img class="demo-video" src="${escapeHtml(url)}" alt="Exercise demonstration" loading="lazy">`;
}

export function isPlayableUrl(url) {
  return !!mediaType(url);
}

export async function openDemo({ name, notes, videoUrl, candidates, onSave } = {}) {
  const titleEl = $("demo-title");
  const body = $("demo-body");
  const modal = $("demo-modal");
  if (!titleEl || !body || !modal) return;
  name = name || "Exercise";
  notes = notes || "";
  videoUrl = videoUrl || "";
  const hasCandidates = Array.isArray(candidates) && candidates.length > 0;
  if (typeof onSave !== "function") onSave = async () => {};
  titleEl.textContent = name;

  const cacheKey = "gym.demo.v2." + name;
  let videosHtml = renderMedia(videoUrl);
  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
  } catch (e) {}
  if (Array.isArray(cached) && cached.length) {
    const seen = new Set();
    if (videoUrl) seen.add(videoUrl);
    const unique = [];
    for (const u of cached) {
      if (!u || seen.has(u)) continue;
      seen.add(u);
      unique.push(u);
    }
    if (unique.length) videosHtml += unique.map(renderMedia).join("");
  }

  const showAuto = hasCandidates && !videosHtml;
  const mediaBlock = showAuto
    ? `<div id="demo-media-area"></div>`
    : (videosHtml || `<p class="muted small">No video saved yet. Search YouTube below and paste the link — it will play right here, every time.</p>`);

  body.innerHTML = `
    ${mediaBlock}
    ${notes ? `<div class="demo-notes"><h4>How to do it</h4><p>${escapeHtml(notes)}</p></div>` : ""}
    <div class="grid-2">
      <input type="url" class="input" id="demo-url" placeholder="YouTube or .mp4 link" value="${videoUrl ? escapeHtml(videoUrl) : ""}">
      <button class="btn" id="demo-save"><svg class="icon"><use href="#i-check"/></svg> Save link</button>
    </div>
    <div class="actions">
      <p class="muted small">YouTube, .mp4, .webm, or .gif links all play inline. Once saved, they stay on this exercise.</p>
      <a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(name + " proper form")}"><svg class="icon"><use href="#i-video"/></svg> Search YouTube</a>
    </div>`;

  if (showAuto) {
    try {
      const area = $("demo-media-area");
      if (area) renderCandidates(area, candidates);
    } catch (e) {}
  }

  const saveBtn = $("demo-save");
  const urlInput = $("demo-url");
  if (saveBtn && urlInput) {
    saveBtn.onclick = async () => {
      const url = urlInput.value.trim();
      if (url && !isPlayableUrl(url)) {
        if (!confirm("This link doesn't look like a YouTube, video, or gif link. Save anyway?")) return;
      }
      try { await onSave(url); } catch (e) {}
      if (url && isPlayableUrl(url)) {
        try {
          let list = JSON.parse(localStorage.getItem(cacheKey) || "[]");
          if (!Array.isArray(list)) list = [];
          if (!list.includes(url)) list.push(url);
          list = list.slice(-5);
          localStorage.setItem(cacheKey, JSON.stringify(list));
        } catch (e) {}
      }
      closeDemo();
    };
  }

  modal.classList.remove("hidden");
}