// js/progress.js — Progress screen: streak, weekly work, personal bests, history.

import * as data from "./db.js";
import { $, escapeHtml } from "./ui.js";

export async function renderProgress() {
  $("progress-streak").textContent = await data.getStreak();

  const cats = await data.allCategories();
  const vol = await data.weekVolume();
  const vals = cats.map((c) => vol.get(c.id) || 0);
  const max = Math.max(...vals, 1);
  $("volume-list").innerHTML = cats.length
    ? cats
        .map(
          (c, i) => `
    <div class="vol-row">
      <span class="vol-label">${escapeHtml(c.name)}</span>
      <div class="vol-bar"><div class="vol-fill" style="width:${Math.round((vals[i] / max) * 100)}%"></div></div>
      <span class="muted small">${Math.round(vals[i])}</span>
    </div>`
        )
        .join("")
    : `<p class="muted small">No categories yet.</p>`;

  const exs = await data.db.exercises.toArray();
  const prs = [];
  for (const ex of exs) {
    const best = await data.bestSet(ex.id);
    if (best) prs.push({ name: ex.name, weight: best.weight, reps: best.reps });
  }
  $("pr-list").innerHTML = prs.length
    ? prs
        .map(
          (p) =>
            `<div class="row"><span>${escapeHtml(p.name)}</span><strong>${p.weight}kg x ${p.reps}</strong></div>`
        )
        .join("")
    : `<p class="muted small">Log some sets and your best lifts show up here.</p>`;

  const hist = await data.last7Days();
  $("history-list").innerHTML = hist
    .map((h) => {
      const label = h.workout ? "Workout" : h.rest ? "Rest day" : "Missed";
      return `<div class="row"><span>${h.date.slice(5)}</span><span class="muted">${label}</span><strong>${Math.round(h.kcal)} kcal</strong></div>`;
    })
    .join("");
}