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

export async function openDemo({ name, notes, videoUrl, mwKey, onSave }) {
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
      <p class="muted small">Tap below to load MuscleWiki videos for this exercise. If a video opens, copy its link and paste it in the box above to save it.</p>
      <button class="btn" id="demo-mw"><svg class="icon"><use href="#i-video"/></svg> Load MuscleWiki videos</button>
      <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(name + " form MuscleWiki")}">Search on Google</a>
    </div>
    <div id="demo-mw-list"></div>`;

  $("demo-save").onclick = async () => {
    const url = $("demo-url").value.trim();
    await onSave(url);
    closeDemo();
  };

  const mwBtn = $("demo-mw");
  if (mwBtn) {
    mwBtn.onclick = async () => {
      const listEl = $("demo-mw-list");
      listEl.textContent = "Loading...";
      try {
        const res = await fetch(
          "https://api.musclewiki.com/search?q=" + encodeURIComponent(name) + "&limit=3",
          { headers: { "X-API-Key": mwKey } }
        );
        if (!res.ok) throw new Error("api said no");
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];
        const urls = [];
        for (const it of items) {
          for (const v of it.videos || []) {
            const u = v && (v.url || v.video);
            if (u) urls.push(u);
          }
        }
        const uniq = [...new Set(urls)].slice(0, 4);
        if (!uniq.length) {
          listEl.textContent = "No videos found for this exercise.";
          return;
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(uniq));
        } catch (e) {}
        listEl.innerHTML = uniq
          .map((u) => `<video class="demo-video" controls playsinline src="${escapeHtml(u)}"></video>`)
          .join("");
      } catch (err) {
        listEl.textContent = "Could not load videos. Check your key and internet.";
      }
    };
  }

  $("demo-modal").classList.remove("hidden");
  if (mwBtn) mwBtn.click();
}