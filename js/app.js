// js/app.js — screens: Today, Gym, Settings. Loads the app and connects everything.

import * as data from "./db.js";
import * as media from "./media.js";
import { $, showToast, openDemo, closeDemo, escapeHtml, isPlayableUrl } from "./ui.js";
import { initFood, renderFood } from "./food.js";
import { renderProgress } from "./progress.js";
import { promptPin, promptNewPin } from "./pin.js";

let currentScreen = "today";

function niceDate(key) {
  return new Date(key + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

async function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.screen === name);
  });
  window.scrollTo(0, 0);
  await renderScreen(name);
}

async function renderScreen(name) {
  if (name === "today") await renderToday();
  else if (name === "workout") await renderWorkout();
  else if (name === "food") await renderFood();
  else if (name === "progress") await renderProgress();
  else if (name === "settings") await renderSettings();
}

async function updateStreakBadge() {
  $("streak-num").textContent = await data.getStreak();
}

async function renderToday() {
  const date = data.todayKey();
  $("today-date").textContent = niceDate(date);
  const exCount = await data.db.exercises.count();
  const cats = await data.allCategories();
  $("today-split").textContent = "Daily workout";
  $("today-split-ex").textContent =
    cats.map((c) => c.name).join(" · ") + " · " + exCount + " exercises";

  const target = await data.getSetting("calorieTarget", 2500);
  const kcal = await data.dayKcal(date);
  const day = await data.getDay(date);

  $("today-kcal").textContent = Math.round(kcal) + " kcal";
  $("today-target").textContent = target + " kcal";
  $("today-workout").textContent = day.workoutDone
    ? "Done"
    : day.restDay
      ? "Rest day"
      : "Not done";

  const pct = ((day.workoutDone || day.restDay) ? 50 : 0) + (kcal > 0 ? 50 : 0);
  const C = 2 * Math.PI * 52;
  $("ring-fill").style.strokeDasharray = `${(C * pct) / 100} ${C}`;
  $("ring-pct").textContent = pct + "%";

  await updateStreakBadge();
}

function setChip(s) {
  return `<span class="chip">${s.weight}kg x ${s.reps}<button class="chip-x" data-del="${s.id}" aria-label="Remove set"><svg class="icon small-icon"><use href="#i-x"/></svg></button></span>`;
}

async function renderWorkout() {
  const date = data.todayKey();

  $("workout-title").textContent = "Daily workout";
  $("workout-date").textContent = niceDate(date);

  const day = await data.getDay(date);
  const done = !!day.workoutDone;
  $("workout-done-banner").classList.toggle("hidden", !done);
  $("btn-finish").disabled = done;
  $("btn-rest").disabled = !!day.restDay;

  const cats = await data.allCategories();
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const exs = await data.allExercises();
  const list = $("workout-list");
  list.innerHTML = "";

  let lastCatId = null;
  for (const ex of exs) {
    if (ex.categoryId !== lastCatId) {
      lastCatId = ex.categoryId;
      const head = document.createElement("h3");
      head.className = "group-title";
      const cat = catMap.get(ex.categoryId);
      head.textContent = cat ? cat.name : "Uncategorized";
      list.appendChild(head);
    }
    const prev = await data.previousSets(ex.id, date);
    const today = await data.setsFor(date, ex.id);
    const lastW = prev.length ? prev[prev.length - 1].weight : "";
    const lastR = prev.length ? prev[prev.length - 1].reps : "";

    const card = document.createElement("div");
    card.className = "card ex-card";
    card.dataset.exId = ex.id;
    card.innerHTML = `
      <div class="ex-head">
        <div>
          <h3>${escapeHtml(ex.name)}</h3>
          <p class="muted small">Last: ${prev.length ? prev.map((s) => `${s.weight}kg x ${s.reps}`).join(", ") : "first time"}</p>
        </div>
        <div class="ex-actions">
          <button class="icon-btn demo-btn" data-demo="${ex.id}" aria-label="How to do it">
            <svg class="icon"><use href="#i-video"/></svg>
          </button>
          <button class="icon-btn del-ex-btn" data-del-ex="${ex.id}" aria-label="Delete exercise">
            <svg class="icon"><use href="#i-trash"/></svg>
          </button>
        </div>
      </div>
      <div class="set-chips">${today.length ? today.map(setChip).join("") : `<span class="muted small">No sets yet today</span>`}</div>
      <div class="grid-3">
        <input type="number" class="input in-weight" value="${lastW}" placeholder="kg" inputmode="decimal">
        <input type="number" class="input in-reps" value="${lastR}" placeholder="reps" inputmode="numeric">
        <button class="btn primary add-set"><svg class="icon"><use href="#i-plus"/></svg> Set</button>
      </div>`;
    list.appendChild(card);
  }

  const catChips = cats
    .map((c) => {
      const cnt = exs.filter((e) => e.categoryId === c.id).length;
      const delBtn =
        cnt === 0
          ? `<button class="chip-x" data-del-cat="${c.id}" aria-label="Delete category"><svg class="icon small-icon"><use href="#i-x"/></svg></button>`
          : "";
      return `<span class="chip">${escapeHtml(c.name)} <span class="muted small">${cnt}</span>${delBtn}</span>`;
    })
    .join("");
  $("cat-list").innerHTML = catChips || `<p class="muted small">No categories yet.</p>`;
}

async function openDemoModal(exId) {
  const ex = await data.db.exercises.get(exId);
  let videoUrl = await data.getSetting("video:" + exId, "");
  if (videoUrl && !isPlayableUrl(videoUrl)) videoUrl = "";
  let candidates = [];
  if (!videoUrl && (await media.isAutoMediaEnabled())) {
    try {
      candidates = await media.resolveMedia(ex.name);
    } catch (e) {
      candidates = [];
    }
  }
  await openDemo({
    name: ex.name,
    notes: data.FORM_NOTES[ex.name] || "",
    videoUrl,
    candidates,
    onSave: async (url) => {
      await data.setSetting("video:" + exId, url);
      showToast(url ? "Video link saved" : "Video link cleared");
    }
  });
}

async function renderSettings() {
  $("app-version").textContent = "v" + data.APP_VERSION;
  $("set-calorie").value = await data.getSetting("calorieTarget", 2500);
  $("set-usda").value = await data.getSetting("usdaKey", "");
  $("set-mw").value = await data.getSetting("musclewikiKey", "");
  const theme = await data.getSetting("theme", "dark");
  $("theme-label").textContent = theme === "dark" ? "Switch to light" : "Switch to dark";

  const autoOn = await data.getSetting("autoMedia", true);
  $("auto-media-label").textContent = autoOn ? "On" : "Off";

  const pin = await data.getPin();
  $("pin-status").textContent = pin
    ? "PIN is set. Deleting requires the code."
    : "No PIN set — deletes happen without a code.";
  $("pin-btn-label").textContent = pin ? "Change PIN" : "Set PIN";

  let status = "normal";
  if (navigator.storage && navigator.storage.persisted) {
    try {
      status = (await navigator.storage.persisted()) ? "protected" : "normal";
    } catch (e) {}
  }
  $("storage-status").textContent = status;
}

async function ensureTheme() {
  const theme = await data.getSetting("theme", "dark");
  document.body.classList.toggle("light", theme === "light");
}

async function maybePromptForPin() {
  if (await data.hasPin()) return;
  if (await data.getSetting("pinPrompted", false)) return;
  await data.setSetting("pinPrompted", true);
  const pin = await promptNewPin();
  if (pin) showToast("PIN set. You're protected.");
}

async function confirmDelete(what) {
  const pin = await data.getPin();
  if (!pin) {
    return confirm(
      "Delete " + what + "?\n\nTip: set a PIN in Settings to protect against accidental deletes."
    );
  }
  return promptPin({
    title: "Confirm delete",
    hint: "Enter your PIN to delete " + what + ".",
    expected: pin
  });
}

function bindNavigation() {
  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => showScreen(t.dataset.screen));
  });
  document.querySelectorAll("[data-goto]").forEach((b) => {
    b.addEventListener("click", () => showScreen(b.dataset.goto));
  });
  $("demo-close").addEventListener("click", closeDemo);
  $("demo-modal").addEventListener("click", (e) => {
    if (e.target === $("demo-modal")) closeDemo();
  });
}

function bindWorkout() {
  $("workout-list").addEventListener("click", async (e) => {
    const demo = e.target.closest(".demo-btn");
    if (demo) {
      await openDemoModal(parseInt(demo.dataset.demo, 10));
      return;
    }
    const del = e.target.closest("[data-del]");
    if (del) {
      await data.db.sets.delete(parseInt(del.dataset.del, 10));
      await renderWorkout();
      return;
    }
    const delEx = e.target.closest(".del-ex-btn");
    if (delEx) {
      const id = parseInt(delEx.dataset.delEx, 10);
      if (!(await confirmDelete("this exercise and all its sets"))) return;
      try {
        await data.deleteExercise(id);
        showToast("Exercise removed");
        await renderWorkout();
      } catch (err) {
        showToast("Could not delete");
      }
      return;
    }
    const delCat = e.target.closest("[data-del-cat]");
    if (delCat) {
      if (!(await confirmDelete("this category"))) return;
      try {
        await data.deleteCategory(parseInt(delCat.dataset.delCat, 10));
        showToast("Category removed");
        await renderWorkout();
      } catch (err) {
        showToast(err.message || "Could not delete");
      }
      return;
    }
    const add = e.target.closest(".add-set");
    if (add) {
      const card = add.closest(".ex-card");
      const exId = parseInt(card.dataset.exId, 10);
      const weight = parseFloat(card.querySelector(".in-weight").value);
      const reps = parseInt(card.querySelector(".in-reps").value, 10);
      if (!weight || !reps) {
        showToast("Enter weight and reps first");
        return;
      }
      const res = await data.logSet({
        date: data.todayKey(),
        exerciseId: exId,
        weight,
        reps
      });
      if (res.isNewPr) showToast("New personal best. " + weight + "kg x " + reps);
      await renderWorkout();
    }
  });

  $("btn-finish").addEventListener("click", async () => {
    const date = data.todayKey();
    const count = await data.db.sets.where("date").equals(date).count();
    if (count === 0) {
      showToast("Log at least one set first");
      return;
    }
    await data.updateDay(date, { workoutDone: 1, restDay: 0 });
    showToast("Workout done. Streak alive.");
    await updateStreakBadge();
    await renderWorkout();
  });

  $("btn-rest").addEventListener("click", async () => {
    await data.updateDay(data.todayKey(), { restDay: 1 });
    showToast("Rest day saved. Streak stays alive.");
    await updateStreakBadge();
    await renderWorkout();
  });

  $("btn-add-exercise").addEventListener("click", async () => {
    const cats = await data.allCategories();
    if (!cats.length) {
      showToast("Add a category first");
      return;
    }
    $("new-ex-cat").innerHTML = cats
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
    $("new-ex-name").value = "";
    $("add-ex-modal").classList.remove("hidden");
    setTimeout(() => $("new-ex-name").focus(), 60);
  });

  $("add-ex-modal").addEventListener("click", (e) => {
    if (e.target === $("add-ex-modal")) $("add-ex-modal").classList.add("hidden");
  });
  document.querySelectorAll("[data-close-add-ex]").forEach((b) =>
    b.addEventListener("click", () => $("add-ex-modal").classList.add("hidden"))
  );

  $("btn-save-ex").addEventListener("click", async () => {
    const name = $("new-ex-name").value.trim();
    const categoryId = parseInt($("new-ex-cat").value, 10);
    try {
      await data.addExercise({ name, categoryId });
      $("add-ex-modal").classList.add("hidden");
      showToast("Exercise added");
      await renderWorkout();
    } catch (err) {
      showToast(err.message || "Could not add");
    }
  });

  $("new-ex-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("btn-save-ex").click();
  });

  $("btn-add-category").addEventListener("click", () => {
    $("new-cat-name").value = "";
    $("add-cat-modal").classList.remove("hidden");
    setTimeout(() => $("new-cat-name").focus(), 60);
  });

  $("add-cat-modal").addEventListener("click", (e) => {
    if (e.target === $("add-cat-modal")) $("add-cat-modal").classList.add("hidden");
  });
  document.querySelectorAll("[data-close-add-cat]").forEach((b) =>
    b.addEventListener("click", () => $("add-cat-modal").classList.add("hidden"))
  );

  $("btn-save-cat").addEventListener("click", async () => {
    const name = $("new-cat-name").value.trim();
    try {
      await data.addCategory(name);
      $("add-cat-modal").classList.add("hidden");
      showToast("Category added");
      await renderWorkout();
    } catch (err) {
      showToast(err.message || "Could not add");
    }
  });

  $("new-cat-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("btn-save-cat").click();
  });
}

function bindSettings() {
  $("btn-save-calorie").addEventListener("click", async () => {
    const v = parseInt($("set-calorie").value, 10);
    if (!v || v < 500) {
      showToast("Enter a target like 2500");
      return;
    }
    await data.setSetting("calorieTarget", v);
    showToast("Target saved");
  });

  $("btn-theme").addEventListener("click", async () => {
    const cur = await data.getSetting("theme", "dark");
    const next = cur === "dark" ? "light" : "dark";
    await data.setSetting("theme", next);
    document.body.classList.toggle("light", next === "light");
    $("theme-label").textContent = next === "dark" ? "Switch to light" : "Switch to dark";
  });

  $("btn-auto-media").addEventListener("click", async () => {
    const cur = await data.getSetting("autoMedia", true);
    await data.setSetting("autoMedia", !cur);
    $("auto-media-label").textContent = !cur ? "On" : "Off";
    showToast(!cur ? "Auto demos on" : "Auto demos off");
  });

  $("btn-set-pin").addEventListener("click", async () => {
    const pin = await promptNewPin();
    if (pin) {
      showToast("PIN saved");
      await renderSettings();
    }
  });

  $("btn-save-keys").addEventListener("click", async () => {
    await data.setSetting("usdaKey", $("set-usda").value.trim());
    await data.setSetting("musclewikiKey", $("set-mw").value.trim());
    showToast("Keys saved");
  });

  $("btn-export").addEventListener("click", async () => {
    const json = await data.exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gym-umer-backup-" + data.todayKey() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    $("backup-status").textContent = "Backup file saved on your device.";
  });

  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await data.importAll(await file.text());
      showToast("Backup loaded");
      await updateStreakBadge();
      await renderScreen(currentScreen);
    } catch (err) {
      showToast("Could not read that file");
    }
    e.target.value = "";
  });

  $("btn-clear-cache").addEventListener("click", async () => {
    if (
      !confirm(
        "Clear the app cache and reload?\n\n" +
          "This removes cached files and saved demo links so the newest version loads fresh.\n" +
          "Your workouts, food log, targets and PIN are NOT deleted."
      )
    )
      return;

    const status = $("cache-status");
    if (status) status.textContent = "Clearing…";

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
      }
    } catch (e) {}

    try {
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}

    try {
      const stale = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("gym.demo.v2.")) stale.push(k);
      }
      stale.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}

    if (status) status.textContent = "Cache cleared. Reloading…";
    showToast("Cache cleared");
    setTimeout(() => location.reload(), 500);
  });
}

async function init() {
  await data.seedAll();
  $("app-version-top").textContent = "v" + data.APP_VERSION;
  await ensureTheme();
  await maybePromptForPin();

  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch (e) {}
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  bindNavigation();
  bindWorkout();
  bindSettings();
  initFood();

  await updateStreakBadge();
  await showScreen("today");
}

init();