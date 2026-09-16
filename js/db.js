// js/db.js — all data lives here. Dexie.js sits on top of IndexedDB.
// The rest of the app only talks to this file, never to the database directly.

const APP_VERSION = "1.11";

// Keys shared with everyone using this app. Paste your keys here once and every
// user gets them automatically. If a user saves their own key in Settings, that
// one wins over these.
const EMBEDDED_MUSCLEWIKI_KEY = "mw_ZQd9cu2XlsGHzmBgbyyb9l7NOWjoU29MWASrEqXIRbM";
const EMBEDDED_USDA_KEY = "8eM9b8LYdNkKFtI7Pj0c0aRfDyBh0ZU8jt9phqMW";

// One daily plan. Every group below is trained in the same workout, every day.
const SPLIT = [
  { name: "Forearms", exercises: ["Reverse EZ Bar Curl", "Hammer Curl"] },
  { name: "Shoulders", exercises: ["Cable Side Lateral Raise"] },
  { name: "Back", exercises: ["Lat Pulldown", "Seated Cable Row"] },
  { name: "Chest", exercises: ["Incline DB Press", "Incline Smith Press"] },
  { name: "Triceps", exercises: ["Overhead Extension"] },
  { name: "Biceps", exercises: ["Incline DB Curl", "Bayesian Curl"] },
  { name: "Legs", exercises: ["Hack Squat"] }
];

const FORM_NOTES = {
  "Reverse EZ Bar Curl": "Palms facing down on the EZ bar. Elbows pinned to your sides. Curl up slow, lower slow. The forearms do all the work.",
  "Hammer Curl": "Hold the dumbbells like hammers, thumbs up. Curl straight up without turning your wrists.",
  "Cable Side Lateral Raise": "Stand beside the cable with the arm across your body. Raise out to the side up to shoulder height. Come back down slow.",
  "Lat Pulldown": "Wide grip. Pull the bar to your upper chest. Squeeze the shoulder blades together. Let it back up slow.",
  "Seated Cable Row": "Sit tall. Pull the handle to your stomach. Squeeze the back. Return with control, no swinging.",
  "Incline DB Press": "Bench set at 30 to 45 degrees. Press the dumbbells up and slightly toward each other. Lower down to chest level.",
  "Incline Smith Press": "Same path as the dumbbell press but the bar runs on rails. Take 2 to 3 seconds on the way down.",
  "Overhead Extension": "One dumbbell held with both hands overhead. Lower it behind your head, elbows pointing forward. Press back up.",
  "Incline DB Curl": "Lie back on the incline bench, arms hanging straight down. Curl up and keep the elbows behind your body.",
  "Bayesian Curl": "Face away from a low cable, arm held back. Curl up against the cable pull. Get a deep stretch at the bottom.",
  "Hack Squat": "Shoulders under the pads, feet shoulder width. Go down deep with control. Push through the whole foot."
};

const SEED_FOODS = [
  { name: "Chicken breast, cooked", kcal: 165, protein: 31, unit: "100g" },
  { name: "Chicken thigh, cooked", kcal: 209, protein: 26, unit: "100g" },
  { name: "Beef mince, cooked", kcal: 250, protein: 26, unit: "100g" },
  { name: "Egg, boiled", kcal: 78, protein: 6, unit: "piece" },
  { name: "Omelette, 2 eggs", kcal: 180, protein: 12, unit: "piece" },
  { name: "White rice, cooked", kcal: 130, protein: 3, unit: "100g" },
  { name: "Brown rice, cooked", kcal: 123, protein: 3, unit: "100g" },
  { name: "Roti", kcal: 120, protein: 4, unit: "piece" },
  { name: "Paratha", kcal: 300, protein: 6, unit: "piece" },
  { name: "Bread slice", kcal: 80, protein: 3, unit: "piece" },
  { name: "Oats, dry", kcal: 380, protein: 13, unit: "100g" },
  { name: "Milk, full fat", kcal: 150, protein: 8, unit: "glass" },
  { name: "Milk, low fat", kcal: 100, protein: 8, unit: "glass" },
  { name: "Yogurt, plain", kcal: 60, protein: 10, unit: "100g" },
  { name: "Lassi, sweet", kcal: 180, protein: 6, unit: "glass" },
  { name: "Tea with sugar and milk", kcal: 60, protein: 2, unit: "cup" },
  { name: "Black coffee", kcal: 5, protein: 0, unit: "cup" },
  { name: "Whey protein scoop", kcal: 120, protein: 24, unit: "scoop" },
  { name: "Banana", kcal: 105, protein: 1, unit: "piece" },
  { name: "Apple", kcal: 95, protein: 0, unit: "piece" },
  { name: "Orange", kcal: 62, protein: 1, unit: "piece" },
  { name: "Dates, 3 pieces", kcal: 200, protein: 3, unit: "piece" },
  { name: "Almonds, 10 pieces", kcal: 70, protein: 3, unit: "piece" },
  { name: "Peanut butter", kcal: 95, protein: 4, unit: "tbsp" },
  { name: "Daal, cooked", kcal: 116, protein: 9, unit: "100g" },
  { name: "Chickpeas, cooked", kcal: 164, protein: 9, unit: "100g" },
  { name: "Mixed salad", kcal: 30, protein: 2, unit: "bowl" },
  { name: "Biryani plate", kcal: 550, protein: 20, unit: "plate" },
  { name: "Chicken karahi serving", kcal: 400, protein: 30, unit: "plate" },
  { name: "Kabab", kcal: 120, protein: 10, unit: "piece" },
  { name: "Burger, fast food", kcal: 550, protein: 25, unit: "piece" },
  { name: "Pizza slice", kcal: 285, protein: 12, unit: "piece" },
  { name: "Fries, medium", kcal: 340, protein: 4, unit: "piece" },
  { name: "Cold drink can, 330ml", kcal: 139, protein: 0, unit: "piece" },
  { name: "Fresh juice glass", kcal: 112, protein: 2, unit: "glass" },
  { name: "Protein bar", kcal: 220, protein: 20, unit: "piece" },
  { name: "Pasta, cooked", kcal: 158, protein: 6, unit: "100g" },
  { name: "Potato, boiled", kcal: 87, protein: 2, unit: "100g" },
  { name: "Olive oil", kcal: 119, protein: 0, unit: "tbsp" },
  { name: "Grapes", kcal: 69, protein: 1, unit: "100g" }
];

const db = new Dexie("gymUmerAI");
db.version(1).stores({
  exercises: "++id, &name, splitIndex, orderIndex",
  sets: "++id, date, exerciseId, [date+exerciseId]",
  foods: "++id, &name",
  foodLog: "++id, date",
  days: "&date",
  settings: "&key"
});
db.version(2).stores({
  exercises: "++id, &name, categoryId, orderIndex",
  sets: "++id, date, exerciseId, [date+exerciseId]",
  foods: "++id, &name",
  foodLog: "++id, date",
  days: "&date",
  settings: "&key",
  categories: "++id, &name, orderIndex"
});

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return dateKey(new Date());
}

async function seedAll() {
  let cats = await db.categories.toArray();
  if (cats.length === 0) {
    await db.categories.bulkAdd(SPLIT.map((s, i) => ({ name: s.name, orderIndex: i })));
    cats = await db.categories.toArray();
  }
  cats.sort((a, b) => a.orderIndex - b.orderIndex);

  // migrate any pre-v2 exercises that only had splitIndex
  const exs = await db.exercises.toArray();
  for (const ex of exs) {
    if (typeof ex.categoryId !== "number" && typeof ex.splitIndex === "number") {
      const cat = cats[ex.splitIndex];
      if (cat) await db.exercises.update(ex.id, { categoryId: cat.id });
    }
  }

  const exCount = await db.exercises.count();
  if (exCount === 0) {
    const rows = [];
    for (const cat of cats) {
      const def = SPLIT.find((s) => s.name === cat.name);
      if (!def) continue;
      def.exercises.forEach((name, j) => {
        rows.push({ name, categoryId: cat.id, orderIndex: j });
      });
    }
    await db.exercises.bulkAdd(rows);
  }

  const foodCount = await db.foods.count();
  if (foodCount === 0) {
    await db.foods.bulkAdd(SEED_FOODS.map((f) => ({ ...f, source: "seed" })));
  }
}

async function getSetting(key, fallback) {
  try {
    const raw = localStorage.getItem("gym." + key);
    if (raw !== null) return JSON.parse(raw);
  } catch (e) {}
  const rec = await db.settings.get(key);
  return rec ? rec.value : fallback;
}

async function setSetting(key, value) {
  try {
    localStorage.setItem("gym." + key, JSON.stringify(value));
  } catch (e) {}
  await db.settings.put({ key, value });
}

async function getDay(date) {
  return (await db.days.get(date)) || { date, workoutDone: 0, restDay: 0 };
}

async function updateDay(date, patch) {
  await db.transaction("rw", db.days, async () => {
    const day = await getDay(date);
    await db.days.put({ ...day, ...patch, date });
  });
}

async function getMuscleWikiKey() {
  return (await getSetting("musclewikiKey", "")) || EMBEDDED_MUSCLEWIKI_KEY;
}

async function getUsdaKey() {
  return (await getSetting("usdaKey", "")) || EMBEDDED_USDA_KEY;
}

// Kept for API stability. Returns the day-rotation index into the categories
// list (0..catCount-1) so any external caller still gets a sane value.
async function splitIndexFor(date) {
  const anchor = await getSetting("planAnchor", null);
  if (!anchor) {
    await setSetting("planAnchor", date);
    return 0;
  }
  const diff = Math.floor(
    (new Date(date + "T00:00:00") - new Date(anchor + "T00:00:00")) / 86400000
  );
  const catCount = (await db.categories.count()) || 1;
  return ((diff % catCount) + catCount) % catCount;
}

// Kept for API stability. Returns exercises belonging to the Nth category,
// sorted by their order within that category.
async function exercisesForSplit(idx) {
  const cats = await allCategories();
  const cat = cats[idx];
  if (!cat) return [];
  return db.exercises.where("categoryId").equals(cat.id).sortBy("orderIndex");
}

async function getStreak() {
  const days = await db.days.toArray();
  const map = new Map(days.map((d) => [d.date, d]));
  let streak = 0;
  let d = new Date();
  const today = map.get(dateKey(d));
  if (!(today && (today.workoutDone || today.restDay))) {
    d = addDays(d, -1);
  }
  while (true) {
    const rec = map.get(dateKey(d));
    if (rec && (rec.workoutDone || rec.restDay)) {
      streak++;
      d = addDays(d, -1);
    } else {
      break;
    }
  }
  return streak;
}

async function allExercises() {
  const cats = await allCategories();
  const catOrder = new Map(cats.map((c, i) => [c.id, i]));
  const all = await db.exercises.toArray();
  return all.sort((a, b) => {
    const ca = catOrder.has(a.categoryId) ? catOrder.get(a.categoryId) : 999;
    const cb = catOrder.has(b.categoryId) ? catOrder.get(b.categoryId) : 999;
    return ca - cb || (a.orderIndex || 0) - (b.orderIndex || 0);
  });
}

async function allCategories() {
  const all = await db.categories.toArray();
  return all.sort((a, b) => a.orderIndex - b.orderIndex);
}

async function addCategory(name) {
  name = (name || "").trim();
  if (!name) throw new Error("Name required");
  const existing = await db.categories.where("name").equals(name).first();
  if (existing) throw new Error("That category already exists");
  const count = await db.categories.count();
  return db.categories.add({ name, orderIndex: count });
}

async function deleteCategory(id) {
  const exCount = await db.exercises.where("categoryId").equals(id).count();
  if (exCount > 0) throw new Error("Remove its exercises first");
  await db.categories.delete(id);
}

async function addExercise({ name, categoryId }) {
  name = (name || "").trim();
  if (!name) throw new Error("Name required");
  if (typeof categoryId !== "number" || isNaN(categoryId)) throw new Error("Pick a category");
  const existing = await db.exercises.where("name").equals(name).first();
  if (existing) throw new Error("That exercise already exists");
  const count = await db.exercises.where("categoryId").equals(categoryId).count();
  return db.exercises.add({ name, categoryId, orderIndex: count });
}

async function deleteExercise(id) {
  await db.transaction("rw", db.exercises, db.sets, async () => {
    await db.sets.where("exerciseId").equals(id).delete();
    await db.exercises.delete(id);
  });
}

async function previousSets(exerciseId, date) {
  const all = await db.sets
    .where("exerciseId")
    .equals(exerciseId)
    .and((s) => s.date < date)
    .toArray();
  if (!all.length) return [];
  const latest = all.reduce((m, s) => (s.date > m ? s.date : m), "");
  return all.filter((s) => s.date === latest);
}

async function setsFor(date, exerciseId) {
  return db.sets.where("[date+exerciseId]").equals([date, exerciseId]).toArray();
}

async function bestSet(exerciseId) {
  const all = await db.sets.where("exerciseId").equals(exerciseId).toArray();
  if (!all.length) return null;
  return all.reduce((a, b) =>
    b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a
  );
}

async function logSet({ date, exerciseId, weight, reps }) {
  const prev = await bestSet(exerciseId);
  await db.sets.add({ date, exerciseId, weight, reps, ts: Date.now() });
  const isNewPr = prev
    ? weight > prev.weight || (weight === prev.weight && reps > prev.reps)
    : false;
  return { isNewPr, prev };
}

function entryKcal(l) {
  return l.unit === "100g" ? (l.kcal * l.qty) / 100 : l.kcal * l.qty;
}

async function dayKcal(date) {
  const logs = await db.foodLog.where("date").equals(date).toArray();
  return logs.reduce((sum, l) => sum + entryKcal(l), 0);
}

async function addFoodLog({ date, name, kcal, protein, unit, qty, source }) {
  const exists = await db.foods.where("name").equals(name).first();
  if (!exists) {
    await db.foods.add({ name, kcal, protein: protein || 0, unit, source: source || "manual" });
  }
  await db.foodLog.add({ date, name, kcal, protein: protein || 0, unit, qty: qty || 1 });
}

async function removeFoodLog(id) {
  await db.foodLog.delete(id);
}

async function searchLocalFoods(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const all = await db.foods.toArray();
  return all.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12);
}

async function weekVolume() {
  const cutoff = dateKey(addDays(new Date(), -6));
  const sets = await db.sets.where("date").aboveOrEqual(cutoff).toArray();
  const exs = await db.exercises.toArray();
  const map = new Map(exs.map((e) => [e.id, e]));
  const vol = new Map();
  for (const s of sets) {
    const ex = map.get(s.exerciseId);
    if (!ex || typeof ex.categoryId !== "number") continue;
    const v = (s.weight || 0) * (s.reps || 0);
    vol.set(ex.categoryId, (vol.get(ex.categoryId) || 0) + v);
  }
  return vol;
}

async function last7Days() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const key = dateKey(addDays(new Date(), -i));
    const day = await getDay(key);
    out.push({
      date: key,
      workout: !!day.workoutDone,
      rest: !!day.restDay,
      kcal: await dayKcal(key)
    });
  }
  return out;
}

async function exportAll() {
  const data = {
    app: "gym.umer.ai",
    version: APP_VERSION,
    exported: new Date().toISOString(),
    categories: await db.categories.toArray(),
    exercises: await db.exercises.toArray(),
    sets: await db.sets.toArray(),
    foods: await db.foods.toArray(),
    foodLog: await db.foodLog.toArray(),
    days: await db.days.toArray(),
    settings: await db.settings.toArray()
  };
  return JSON.stringify(data, null, 2);
}

async function importAll(json) {
  const data = JSON.parse(json);
  if (!data || data.app !== "gym.umer.ai") {
    throw new Error("Not a gym.umer.ai backup file");
  }
  await db.transaction(
    "rw",
    [db.categories, db.exercises, db.sets, db.foods, db.foodLog, db.days, db.settings],
    async () => {
      if (Array.isArray(data.categories)) await db.categories.bulkPut(data.categories);
      if (Array.isArray(data.exercises)) await db.exercises.bulkPut(data.exercises);
      if (Array.isArray(data.sets)) await db.sets.bulkPut(data.sets);
      if (Array.isArray(data.foods)) await db.foods.bulkPut(data.foods);
      if (Array.isArray(data.foodLog)) await db.foodLog.bulkPut(data.foodLog);
      if (Array.isArray(data.days)) await db.days.bulkPut(data.days);
      if (Array.isArray(data.settings)) {
        await db.settings.bulkPut(data.settings);
        for (const s of data.settings) {
          try {
            localStorage.setItem("gym." + s.key, JSON.stringify(s.value));
          } catch (e) {}
        }
      }
    }
  );
}

export {
  APP_VERSION,
  SPLIT,
  FORM_NOTES,
  db,
  addDays,
  dateKey,
  todayKey,
  seedAll,
  getSetting,
  setSetting,
  getDay,
  updateDay,
  getMuscleWikiKey,
  getUsdaKey,
  splitIndexFor,
  exercisesForSplit,
  getStreak,
  allCategories,
  addCategory,
  deleteCategory,
  addExercise,
  deleteExercise,
  allExercises,
  previousSets,
  setsFor,
  bestSet,
  logSet,
  entryKcal,
  dayKcal,
  addFoodLog,
  removeFoodLog,
  searchLocalFoods,
  weekVolume,
  last7Days,
  exportAll,
  importAll
};