// js/db.js — all data lives here. Dexie.js sits on top of IndexedDB.
// The rest of the app only talks to this file, never to the database directly.

const APP_VERSION = "1.08";

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
  const exCount = await db.exercises.count();
  if (exCount === 0) {
    const rows = [];
    SPLIT.forEach((day, i) => {
      day.exercises.forEach((name, j) => {
        rows.push({ name, splitIndex: i, orderIndex: j });
      });
    });
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
  const all = await db.exercises.toArray();
  return all.sort(
    (a, b) => a.splitIndex - b.splitIndex || a.orderIndex - b.orderIndex
  );
}

async function splitIndexFor(date) {
  const day = await db.days.get(date);
  if (day && typeof day.splitIndex === "number") return day.splitIndex;
  const anchor = await getSetting("planAnchor", null);
  if (!anchor) {
    await setSetting("planAnchor", date);
    return 0;
  }
  const diff = Math.floor(
    (new Date(date + "T00:00:00") - new Date(anchor + "T00:00:00")) / 86400000
  );
  return ((diff % 7) + 7) % 7;
}

async function exercisesForSplit(idx) {
  return db.exercises.where("splitIndex").equals(idx).sortBy("orderIndex");
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
  const vol = new Array(SPLIT.length).fill(0);
  for (const s of sets) {
    const ex = map.get(s.exerciseId);
    if (ex) vol[ex.splitIndex] += (s.weight || 0) * (s.reps || 0);
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
    [db.exercises, db.sets, db.foods, db.foodLog, db.days, db.settings],
    async () => {
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
  getStreak,
  allExercises,
  exercisesForSplit,
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