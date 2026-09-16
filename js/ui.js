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

const GIF_CACHE = {};

async function fetchExerciseGif(name) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (GIF_CACHE[key] !== undefined) return GIF_CACHE[key];
  try {
    const res = await fetch(
      "https://oss.exercisedb.dev/api/v1/exercises?name=" + encodeURIComponent(name)
    );
    if (!res.ok) return null;
    const json = await res.json();
    const list = Array.isArray(json) ? json : json.data || json.exercises || [];
    if (!list.length) return null;
    const match =
      list.find((e) => (e.name || "").toLowerCase() === name.toLowerCase()) || list[0];
    const url = match.gifUrl || match.gif || null;
    GIF_CACHE[key] = url;
    return url;
  } catch (e) {
    GIF_CACHE[key] = null;
    return null;
  }
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
  const gifUrl = await fetchExerciseGif(name);
  if (gifUrl) {
    gifWrap.innerHTML = `<img class="demo-video" src="${escapeHtml(gifUrl)}" alt="${escapeHtml(name)} demonstration" loading="lazy">`;
  } else {
    gifWrap.innerHTML = `<p class="muted small">No GIF found for this exercise.</p>`;
  }
}