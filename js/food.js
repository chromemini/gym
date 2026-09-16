// js/food.js — Food screen and the calorie engine.
// Saved foods always work offline. Online search adds Open Food Facts and USDA.

import * as data from "./db.js";
import { $, showToast, escapeHtml } from "./ui.js";

let searchTimer = null;

export async function renderFood() {
  const date = data.todayKey();
  const target = await data.getSetting("calorieTarget", 2500);
  const total = await data.dayKcal(date);

  $("food-total").textContent = Math.round(total) + " kcal";
  $("food-target").textContent = target + " kcal";

  const pct = Math.min(100, target ? (total / target) * 100 : 0);
  $("food-bar").style.width = pct + "%";

  const left = target - total;
  $("food-left").textContent =
    left > 0
      ? Math.round(left) + " kcal left today"
      : Math.round(-left) + " kcal over target";

  await renderLog();
}

async function renderLog() {
  const date = data.todayKey();
  const logs = await data.db.foodLog.where("date").equals(date).toArray();
  const wrap = $("food-log-list");

  if (!logs.length) {
    wrap.innerHTML = `<p class="muted small">Nothing logged yet.</p>`;
    return;
  }
  wrap.innerHTML = logs
    .map(
      (l) => `
      <div class="row">
        <span>${escapeHtml(l.name)} <span class="muted small">${l.unit === "100g" ? l.qty + "g" : "x" + l.qty}</span></span>
        <span class="log-right">
          <strong>${Math.round(data.entryKcal(l))}</strong>
          <button class="chip-x" data-delog="${l.id}" aria-label="Remove"><svg class="icon small-icon"><use href="#i-trash"/></svg></button>
        </span>
      </div>`
    )
    .join("");
}

function renderResults(items, fromWeb) {
  const wrap = $("food-results");
  for (const f of items) {
    const row = document.createElement("div");
    row.className = "result-row";
    row.dataset.food = JSON.stringify(f);
    row.innerHTML = `
      <div class="result-info">
        <span>${escapeHtml(f.name)}</span>
        <span class="muted small">${f.kcal} kcal ${f.unit === "100g" ? "per 100g" : "per " + f.unit}${fromWeb ? " · web" : ""}</span>
      </div>
      <input type="number" class="input small-input r-qty" value="${f.unit === "100g" ? 100 : 1}" inputmode="decimal">
      <button class="btn primary small r-add">Add</button>`;
    wrap.appendChild(row);
  }
}

async function searchWeb(q) {
  const out = [];
  const usdaKey = await data.getUsdaKey();

  if (usdaKey) {
    try {
      const res = await fetch(
        "https://api.nal.usda.gov/fdc/v1/foods/search?api_key=" +
          encodeURIComponent(usdaKey) +
          "&query=" +
          encodeURIComponent(q) +
          "&pageSize=5"
      );
      if (res.ok) {
        const j = await res.json();
        for (const f of j.foods || []) {
          const e = (f.foodNutrients || []).find(
            (n) => n.nutrientName === "Energy" && n.unitName === "KCAL"
          );
          if (e && e.value > 0) {
            out.push({
              name: f.description,
              kcal: Math.round(e.value),
              protein: 0,
              unit: "100g",
              source: "usda"
            });
          }
        }
      }
    } catch (err) {}
  }

  try {
    const res = await fetch(
      "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
        encodeURIComponent(q) +
        "&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments"
    );
    if (res.ok) {
      const j = await res.json();
      for (const p of j.products || []) {
        const k = p.nutriments ? parseFloat(p.nutriments["energy-kcal_100g"]) : NaN;
        if (p.product_name && k > 0) {
          out.push({
            name: p.product_name,
            kcal: Math.round(k),
            protein: Math.round(parseFloat((p.nutriments && p.nutriments.proteins_100g) || 0)),
            unit: "100g",
            source: "web"
          });
        }
      }
    }
  } catch (err) {}

  return out.slice(0, 8);
}

async function doSearch(q) {
  q = q.trim();
  const wrap = $("food-results");
  wrap.innerHTML = "";
  if (q.length < 2) return;

  const local = await data.searchLocalFoods(q);
  renderResults(local, false);

  if (navigator.onLine) {
    const web = await searchWeb(q).catch(() => []);
    const localNames = new Set(local.map((f) => f.name.toLowerCase()));
    const fresh = web.filter((f) => !localNames.has(f.name.toLowerCase()));
    if (fresh.length) renderResults(fresh, true);
  }
}

export function initFood() {
  $("food-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(e.target.value), 300);
  });

  $("food-results").addEventListener("click", async (e) => {
    const btn = e.target.closest(".r-add");
    if (!btn) return;
    const row = btn.closest(".result-row");
    const food = JSON.parse(row.dataset.food);
    const qty =
      parseFloat(row.querySelector(".r-qty").value) ||
      (food.unit === "100g" ? 100 : 1);
    await data.addFoodLog({
      date: data.todayKey(),
      name: food.name,
      kcal: food.kcal,
      protein: food.protein || 0,
      unit: food.unit,
      qty,
      source: food.source || "seed"
    });
    $("food-search").value = "";
    $("food-results").innerHTML = "";
    await renderFood();
    showToast("Added " + food.name);
  });

  $("food-log-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-delog]");
    if (!btn) return;
    await data.removeFoodLog(parseInt(btn.dataset.delog, 10));
    await renderFood();
  });

  $("btn-manual-add").addEventListener("click", async () => {
    const name = $("manual-name").value.trim();
    const kcal = parseFloat($("manual-kcal").value);
    if (!name || !kcal) {
      showToast("Enter a name and kcal");
      return;
    }
    await data.addFoodLog({
      date: data.todayKey(),
      name,
      kcal,
      protein: 0,
      unit: "piece",
      qty: 1,
      source: "manual"
    });
    $("manual-name").value = "";
    $("manual-kcal").value = "";
    await renderFood();
    showToast("Added " + name);
  });
}