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
    ${videosHtml || `<p class="muted small">No video saved yet. Paste a video link below, or use the MuscleWiki button.</p>`}
    ${notes ? `<div class="demo-notes"><h4>How to do it</h4><p>${escapeHtml(notes)}</p></div>` : ""}
    <div class="grid-2">
      <input type="url" class="input" id="demo-url" placeholder="Paste video link" value="${videoUrl ? escapeHtml(videoUrl) : ""}">
      <button class="btn" id="demo-save"><svg class="icon"><use href="#i-check"/></svg> Save link</button>
    </div>
    <div class="actions">
      <p class="muted small">MuscleWiki blocks web apps from loading its videos directly. Search below, then paste the video link in the box above — it's saved here for next time.</p>
      <a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(name + " proper form")}"><svg class="icon"><use href="#i-video"/></svg> Search YouTube</a>
      <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(name + " MuscleWiki")}">Search Google</a>
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
}