/**
 * gym.umer.ai v1.01 - SUB-MODULAR ZERO-PIXEL-WASTE CORE
 * CSR Native IndexedDB + Instant Scratchpad Double-Buffer.
 * Zero external libraries. 100% Offline-First. Pure SVGs.
 */

'use strict';

// --------------------------------------------------------------------------
// 1. SUB-MODULE: EVENT BUS (Decoupled Micro-Dispatcher)
// --------------------------------------------------------------------------
const EventBus = (() => {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
    },
    off(event, handler) {
      if (listeners.has(event)) listeners.get(event).delete(handler);
    },
    emit(event, payload) {
      if (listeners.has(event)) {
        listeners.get(event).forEach(fn => {
          try { fn(payload); } catch (err) { console.error(`[Bus Error] ${event}:`, err); }
        });
      }
    }
  };
})();

// --------------------------------------------------------------------------
// 2. SUB-MODULE: PERSISTENCE & ANTI-FRAGILE VAULT
// --------------------------------------------------------------------------
const StorageVault = (() => {
  const DB_NAME = 'gym_umer_ai_vault';
  const DB_VERSION = 1;
  const SCRATCHPAD_KEY = 'gym_active_session_buffer_v101';
  let dbInstance = null;

  // Request storage persistence from browser OS
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(granted => {
      EventBus.emit('STORAGE_PERSISTENCE_STATUS', granted);
    });
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('workouts')) {
          const ws = db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
          ws.createIndex('exercise', 'exercise', { unique: false });
          ws.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('nutrition')) {
          const ns = db.createObjectStore('nutrition', { keyPath: 'id', autoIncrement: true });
          ns.createIndex('date', 'date', { unique: false });
        }
      };
      req.onsuccess = () => {
        dbInstance = req.result;
        resolve(dbInstance);
      };
      req.onerror = () => reject(req.error);
    });
  }

  return {
    // Stage 1: Instant Synchronous Scratchpad (Memory + LocalStorage)
    saveScratchpad(data) {
      try {
        localStorage.setItem(SCRATCHPAD_KEY, JSON.stringify({
          timestamp: Date.now(),
          data
        }));
      } catch (err) {
        console.warn('Scratchpad write error:', err);
      }
    },
    loadScratchpad() {
      try {
        const raw = localStorage.getItem(SCRATCHPAD_KEY);
        if (!raw) return null;
        return JSON.parse(raw).data;
      } catch (err) {
        return null;
      }
    },
    clearScratchpad() {
      localStorage.removeItem(SCRATCHPAD_KEY);
    },

    // Stage 2: IndexedDB Permanent Transactions
    async saveSetLog(record) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('workouts', 'readwrite');
        const store = tx.objectStore('workouts');
        const req = store.add({
          ...record,
          date: record.date || new Date().toISOString().split('T')[0],
          created_at: Date.now()
        });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    async getPreviousStats(exerciseName) {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction('workouts', 'readonly');
        const store = tx.objectStore('workouts');
        const idx = store.index('exercise');
        const req = idx.getAll(exerciseName);
        req.onsuccess = () => {
          const records = req.result || [];
          if (!records.length) return resolve([]);
          // Group by last recorded date
          records.sort((a, b) => b.created_at - a.created_at);
          const latestDate = records[0].date;
          const lastSessionSets = records
            .filter(r => r.date === latestDate)
            .sort((a, b) => a.setIndex - b.setIndex);
          resolve(lastSessionSets);
        };
        req.onerror = () => resolve([]);
      });
    },

    async saveMealLog(entry) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('nutrition', 'readwrite');
        const store = tx.objectStore('nutrition');
        const req = store.add({
          ...entry,
          date: entry.date || new Date().toISOString().split('T')[0],
          created_at: Date.now()
        });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    async getTodayMeals() {
      const db = await openDB();
      const today = new Date().toISOString().split('T')[0];
      return new Promise((resolve) => {
        const tx = db.transaction('nutrition', 'readonly');
        const store = tx.objectStore('nutrition');
        const idx = store.index('date');
        const req = idx.getAll(today);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    },

    async deleteMealLog(id) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('nutrition', 'readwrite');
        const store = tx.objectStore('nutrition');
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    },

    async getVaultCounts() {
      const db = await openDB();
      return new Promise((resolve) => {
        const txW = db.transaction('workouts', 'readonly').objectStore('workouts').count();
        txW.onsuccess = () => {
          const setsCount = txW.result;
          const txN = db.transaction('nutrition', 'readonly').objectStore('nutrition').count();
          txN.onsuccess = () => resolve({ sets: setsCount, meals: txN.result });
          txN.onerror = () => resolve({ sets: setsCount, meals: 0 });
        };
        txW.onerror = () => resolve({ sets: 0, meals: 0 });
      });
    },

    // Stage 3: Full Backup Portability
    async exportDumpJSON() {
      const db = await openDB();
      return new Promise((resolve) => {
        const backup = {
          version: '1.01',
          app: 'gym.umer.ai',
          exported_at: new Date().toISOString(),
          workouts: [],
          nutrition: []
        };
        const tx = db.transaction(['workouts', 'nutrition'], 'readonly');
        tx.objectStore('workouts').getAll().onsuccess = (e) => {
          backup.workouts = e.target.result || [];
        };
        tx.objectStore('nutrition').getAll().onsuccess = (e) => {
          backup.nutrition = e.target.result || [];
        };
        tx.oncomplete = () => resolve(JSON.stringify(backup, null, 2));
      });
    },

    async importRestoreJSON(jsonString) {
      const data = JSON.parse(jsonString);
      if (!data.workouts && !data.nutrition) throw new Error('Invalid vault schema');
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['workouts', 'nutrition'], 'readwrite');
        const ws = tx.objectStore('workouts');
        const ns = tx.objectStore('nutrition');
        if (Array.isArray(data.workouts)) {
          data.workouts.forEach(item => {
            delete item.id;
            ws.add(item);
          });
        }
        if (Array.isArray(data.nutrition)) {
          data.nutrition.forEach(item => {
            delete item.id;
            ns.add(item);
          });
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    }
  };
})();

// --------------------------------------------------------------------------
// 3. SUB-MODULE: 7-PILLARS ROUTINE REGISTRY
// --------------------------------------------------------------------------
const RoutineRegistry = [
  {
    id: 'incline_db_press',
    group: 'CHEST',
    name: 'Incline DB Press',
    cue: '30° bench angle. Elbow path tucked at 45°. Full stretch.',
    defaultWeight: 26.0,
    defaultReps: 8,
    setsCount: 3
  },
  {
    id: 'incline_smith_press',
    group: 'CHEST',
    name: 'Incline Smith Machine',
    cue: 'Clavicle touch line. Constant tension at top (no soft lockout).',
    defaultWeight: 60.0,
    defaultReps: 8,
    setsCount: 3
  },
  {
    id: 'cable_lateral_raise',
    group: 'SHOULDER',
    name: 'Cable Side Lateral Raise',
    cue: 'Pulley at wrist level. Lean 15° forward. Lead with elbows.',
    defaultWeight: 7.5,
    defaultReps: 12,
    setsCount: 4
  },
  {
    id: 'lat_pulldown',
    group: 'BACK',
    name: 'Lat Pulldown',
    cue: 'Depress scapula before pulling. Drive elbows to ribs.',
    defaultWeight: 65.0,
    defaultReps: 10,
    setsCount: 3
  },
  {
    id: 'seated_cable_row',
    group: 'BACK',
    name: 'Seated Cable Rows',
    cue: 'Vertical torso. Pull to navel. 1-second isometric contraction.',
    defaultWeight: 60.0,
    defaultReps: 10,
    setsCount: 3
  },
  {
    id: 'overhead_extension',
    group: 'TRICEPS',
    name: 'Overhead Extension',
    cue: 'Pin elbows close to ears. Full elbow flexion deep stretch.',
    defaultWeight: 22.5,
    defaultReps: 10,
    setsCount: 3
  },
  {
    id: 'incline_db_curl',
    group: 'BICEPS',
    name: 'Incline DB Curl',
    cue: 'Bench 55°. Arms hang behind torso. Supinate at peak.',
    defaultWeight: 14.0,
    defaultReps: 10,
    setsCount: 3
  },
  {
    id: 'bayesian_curl',
    group: 'BICEPS',
    name: 'Bayesian Cable Curl',
    cue: 'Face away from low pulley. Maintain shoulder extension load.',
    defaultWeight: 12.5,
    defaultReps: 12,
    setsCount: 3
  },
  {
    id: 'reverse_ez_curl',
    group: 'FOREARMS',
    name: 'Reverse EZ Bar Curl',
    cue: 'Pronated grip. Keep wrists rigid, lock elbows to side.',
    defaultWeight: 25.0,
    defaultReps: 12,
    setsCount: 3
  },
  {
    id: 'hammer_curls',
    group: 'FOREARMS',
    name: 'Hammer Curls',
    cue: 'Neutral grip. Control the 2-second negative drop.',
    defaultWeight: 16.0,
    defaultReps: 10,
    setsCount: 3
  },
  {
    id: 'hack_squat',
    group: 'LEGS',
    name: 'Hack Squat',
    cue: 'Feet mid-platform. Knees travel over toes. Deep 90° flexion.',
    defaultWeight: 100.0,
    defaultReps: 8,
    setsCount: 4
  }
];

// --------------------------------------------------------------------------
// 4. SUB-MODULE: SINGLETON 3-SECOND FORM VISUALIZER
// --------------------------------------------------------------------------
const VisualLoopPlayer = (() => {
  let canvas, ctx;
  let animId = null;
  let currentExerciseId = 'incline_db_press';
  let startTime = 0;

  function init() {
    canvas = document.getElementById('motionCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    startTime = performance.now();
    startLoop();
  }

  function setExercise(exId) {
    currentExerciseId = exId;
  }

  function startLoop() {
    if (animId) cancelAnimationFrame(animId);
    const render = (now) => {
      const elapsed = (now - startTime) % 3000; // 3.0s cycle
      const phase = elapsed / 3000; // 0 to 1
      drawFrame(phase, currentExerciseId);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
  }

  function drawFrame(p, exId) {
    if (!ctx) return;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 120, 90);

    // Sinusoidal movement: 0 -> 1 -> 0 (concentric, hold, eccentric)
    const sinProgress = (Math.sin(p * Math.PI * 2 - Math.PI / 2) + 1) / 2;

    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Biomechanical Line Rendering
    switch (exId) {
      case 'incline_db_press':
      case 'incline_smith_press': {
        // Bench at 30 deg
        ctx.strokeStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(25, 75);
        ctx.lineTo(85, 35);
        ctx.stroke();

        // Torso along bench
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(35, 68);
        ctx.lineTo(75, 42); // spine
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(80, 38, 4, 0, Math.PI * 2);
        ctx.fill();

        // Arm pressing
        const pressDist = sinProgress * 14;
        const elbowX = 55 + (pressDist * 0.4);
        const elbowY = 55 - (pressDist * 0.5);
        const handX = 60 + (pressDist * 0.8);
        const handY = 40 - (pressDist * 1.0);

        ctx.beginPath();
        ctx.moveTo(68, 46); // shoulder
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Dumbbell / Bar
        ctx.fillRect(handX - 4, handY - 2, 8, 4);
        break;
      }

      case 'hack_squat': {
        // 45 deg sled backrest
        ctx.strokeStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(30, 80);
        ctx.lineTo(80, 30);
        ctx.stroke();

        // Platform
        ctx.beginPath();
        ctx.moveTo(70, 85);
        ctx.lineTo(95, 70);
        ctx.stroke();

        // Torso on sled
        const squat = sinProgress * 15;
        const hipX = 45 + squat;
        const hipY = 65 - squat;
        const kneeX = 75;
        const kneeY = 65 + (squat * 0.2);

        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(hipX + 15, hipY - 15); // shoulder
        ctx.lineTo(hipX, hipY); // back
        ctx.lineTo(kneeX, kneeY); // femur
        ctx.lineTo(82, 78); // tibia to platform
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(hipX + 18, hipY - 18, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'cable_lateral_raise': {
        // Standing torso
        ctx.beginPath();
        ctx.moveTo(60, 40);
        ctx.lineTo(60, 75);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(60, 35, 4, 0, Math.PI * 2);
        ctx.fill();

        // Raising arm (30 to 90 degrees)
        const armAngle = -Math.PI / 4 - (sinProgress * (Math.PI / 2.8));
        const handX = 60 + Math.cos(armAngle) * 26;
        const handY = 44 + Math.sin(armAngle) * 26;

        ctx.beginPath();
        ctx.moveTo(60, 44);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Cable line from bottom corner
        ctx.strokeStyle = '#444444';
        ctx.beginPath();
        ctx.moveTo(25, 85);
        ctx.lineTo(handX, handY);
        ctx.stroke();
        break;
      }

      case 'lat_pulldown': {
        // Seat
        ctx.strokeStyle = '#333333';
        ctx.strokeRect(50, 70, 20, 10);

        // Torso
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(60, 45);
        ctx.lineTo(60, 70);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(60, 40, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pulling arms
        const pullY = 32 + (sinProgress * 16);
        ctx.beginPath();
        ctx.moveTo(60, 46);
        ctx.lineTo(48, pullY + 4);
        ctx.lineTo(44, pullY);
        ctx.moveTo(60, 46);
        ctx.lineTo(72, pullY + 4);
        ctx.lineTo(76, pullY);
        ctx.stroke();

        // Lat bar
        ctx.fillRect(38, pullY - 1, 44, 2);
        break;
      }

      case 'bayesian_curl':
      case 'incline_db_curl':
      case 'reverse_ez_curl':
      case 'hammer_curls': {
        // Torso
        ctx.beginPath();
        ctx.moveTo(55, 40);
        ctx.lineTo(55, 75);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(55, 35, 4, 0, Math.PI * 2);
        ctx.fill();

        // Arm curl
        const curlAngle = Math.PI / 3 - (sinProgress * (Math.PI * 0.7));
        const elbowX = 57;
        const elbowY = 56;
        const handX = elbowX + Math.cos(curlAngle) * 16;
        const handY = elbowY + Math.sin(curlAngle) * 16;

        ctx.beginPath();
        ctx.moveTo(55, 44);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Weight dot
        ctx.beginPath();
        ctx.arc(handX, handY, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default: {
        // Generic Overhead Extension / Movement
        ctx.beginPath();
        ctx.moveTo(60, 42);
        ctx.lineTo(60, 75);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(60, 36, 4, 0, Math.PI * 2);
        ctx.fill();

        const extY = 22 + ((1 - sinProgress) * 16);
        ctx.beginPath();
        ctx.moveTo(60, 42);
        ctx.lineTo(60, 24);
        ctx.lineTo(54, extY);
        ctx.stroke();
        ctx.fillRect(52, extY - 2, 6, 4);
      }
    }
  }

  return { init, setExercise };
})();

// --------------------------------------------------------------------------
// 5. SUB-MODULE: NUTRITION & WHOLE-FOOD REGISTRY
// --------------------------------------------------------------------------
const NutritionEngine = (() => {
  const STAPLE_FOODS = [
    { name: 'Cooked Chicken Breast (100g)', cal: 165, p: 31, c: 0, f: 3.6 },
    { name: 'Raw Chicken Breast (100g)', cal: 120, p: 22.5, c: 0, f: 2.5 },
    { name: 'Large Whole Egg (1 unit)', cal: 72, p: 6.3, c: 0.4, f: 4.8 },
    { name: 'Cooked White Rice (100g)', cal: 130, p: 2.7, c: 28.2, f: 0.3 },
    { name: 'Whey Protein Scoop (30g)', cal: 120, p: 24.0, c: 2.0, f: 1.5 },
    { name: 'Rolled Oats (50g)', cal: 190, p: 6.5, c: 33.5, f: 3.5 },
    { name: 'Whole Milk (250ml)', cal: 150, p: 8.0, c: 12.0, f: 8.0 }
  ];

  const TARGETS = {
    calories: 2400,
    protein: 180,
    carbs: 260,
    fats: 65
  };

  let todayMeals = [];

  async function init() {
    todayMeals = await StorageVault.getTodayMeals();
    render();
  }

  async function logFood(item) {
    const record = {
      name: item.name,
      cal: Number(item.cal) || 0,
      p: Number(item.p) || 0,
      c: Number(item.c) || 0,
      f: Number(item.f) || 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const id = await StorageVault.saveMealLog(record);
    todayMeals.unshift({ ...record, id });
    render();
    EventBus.emit('NUTRITION_UPDATED', getTotals());
  }

  async function deleteFood(id) {
    await StorageVault.deleteMealLog(id);
    todayMeals = todayMeals.filter(m => m.id !== id);
    render();
    EventBus.emit('NUTRITION_UPDATED', getTotals());
  }

  function getTotals() {
    return todayMeals.reduce((acc, m) => {
      acc.cal += m.cal;
      acc.p += m.p;
      acc.c += m.c;
      acc.f += m.f;
      return acc;
    }, { cal: 0, p: 0, c: 0, f: 0, targetCal: TARGETS.calories, targetP: TARGETS.protein });
  }

  function render() {
    const totals = getTotals();

    // DOM Elements
    const elRem = document.getElementById('nutrCalRemaining');
    const elTarget = document.getElementById('nutrTargetCal');
    const elConsumed = document.getElementById('nutrConsumedCal');
    const elBar = document.getElementById('calProgressBar');
    const elP = document.getElementById('macroP');
    const elC = document.getElementById('macroC');
    const elF = document.getElementById('macroF');
    const elList = document.getElementById('intakeList');

    if (elTarget) elTarget.textContent = TARGETS.calories;
    if (elConsumed) elConsumed.textContent = totals.cal;
    if (elRem) {
      const remaining = TARGETS.calories - totals.cal;
      elRem.textContent = remaining;
      elRem.style.color = remaining < 0 ? '#888888' : '#FFFFFF';
    }

    if (elBar) {
      const pct = Math.min(100, Math.round((totals.cal / TARGETS.calories) * 100));
      elBar.style.width = `${pct}%`;
    }

    if (elP) elP.textContent = `${Math.round(totals.p)} / ${TARGETS.protein}g`;
    if (elC) elC.textContent = `${Math.round(totals.c)} / ${TARGETS.carbs}g`;
    if (elF) elF.textContent = `${Math.round(totals.f)} / ${TARGETS.fats}g`;

    // Render list
    if (elList) {
      if (!todayMeals.length) {
        elList.innerHTML = '<div class="empty-intake-note">No meals recorded today yet.</div>';
      } else {
        elList.innerHTML = todayMeals.map(m => `
          <div class="intake-row">
            <div>
              <strong>${m.name}</strong>
              <div style="font-size: 8px; color: var(--text-muted);">
                ${m.cal} kcal • ${m.p}g P • ${m.c}g C • ${m.f}g F (${m.timestamp})
              </div>
            </div>
            <button class="intake-del-btn" data-del-id="${m.id}" title="Delete entry">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        `).join('');
      }
    }
  }

  return { init, logFood, deleteFood, getTotals, STAPLE_FOODS };
})();

// --------------------------------------------------------------------------
// 6. SUB-MODULE: WORKOUT TRACKER & TACTILE CONTROLLER
// --------------------------------------------------------------------------
const WorkoutController = (() => {
  let activeRoutine = RoutineRegistry[0];
  let currentSets = [];
  let previousSessionSets = [];

  async function init() {
    // Check Scratchpad first for crash recovery
    const cached = StorageVault.loadScratchpad();
    if (cached && cached.activeExerciseId) {
      const matched = RoutineRegistry.find(r => r.id === cached.activeExerciseId);
      if (matched) activeRoutine = matched;
      currentSets = cached.sets || [];
    } else {
      initDefaultSets();
    }
    await loadHistory();
    render();
  }

  function initDefaultSets() {
    currentSets = [];
    for (let i = 0; i < activeRoutine.setsCount; i++) {
      currentSets.push({
        setIndex: i + 1,
        weight: activeRoutine.defaultWeight,
        reps: activeRoutine.defaultReps,
        completed: false
      });
    }
  }

  async function switchExercise(exId) {
    const next = RoutineRegistry.find(r => r.id === exId);
    if (!next) return;
    activeRoutine = next;
    VisualLoopPlayer.setExercise(next.id);
    initDefaultSets();
    await loadHistory();
    syncScratchpad();
    render();
  }

  async function loadHistory() {
    previousSessionSets = await StorageVault.getPreviousStats(activeRoutine.name);
  }

  function syncScratchpad() {
    StorageVault.saveScratchpad({
      activeExerciseId: activeRoutine.id,
      sets: currentSets
    });
  }

  function updateWeight(idx, delta) {
    currentSets[idx].weight = Math.max(0, +(currentSets[idx].weight + delta).toFixed(1));
    syncScratchpad();
    renderRowsOnly();
  }

  function updateReps(idx, delta) {
    currentSets[idx].reps = Math.max(1, currentSets[idx].reps + delta);
    syncScratchpad();
    renderRowsOnly();
  }

  async function toggleSetComplete(idx) {
    const s = currentSets[idx];
    s.completed = !s.completed;
    if (s.completed) {
      await StorageVault.saveSetLog({
        exercise: activeRoutine.name,
        setIndex: s.setIndex,
        weight: s.weight,
        reps: s.reps
      });
      EventBus.emit('SET_COMMITTED', { exercise: activeRoutine.name, ...s });
    }
    syncScratchpad();
    render();
  }

  function addSet() {
    const last = currentSets[currentSets.length - 1] || { weight: activeRoutine.defaultWeight, reps: activeRoutine.defaultReps };
    currentSets.push({
      setIndex: currentSets.length + 1,
      weight: last.weight,
      reps: last.reps,
      completed: false
    });
    syncScratchpad();
    render();
  }

  function isOverloadPR(s, prev) {
    if (!prev) return false;
    return (s.weight > prev.weight) || (s.weight === prev.weight && s.reps > prev.reps);
  }

  function render() {
    // Header labels
    document.getElementById('currentMuscleGroup').textContent = activeRoutine.group;
    document.getElementById('currentExerciseName').textContent = activeRoutine.name;
    document.getElementById('currentFormCue').textContent = activeRoutine.cue;

    // PR / Target Banner
    const banner = document.getElementById('overloadBanner');
    const text = document.getElementById('overloadText');
    if (previousSessionSets.length > 0) {
      const topSet = previousSessionSets[0];
      text.textContent = `LAST: ${topSet.weight}kg x ${topSet.reps} reps (Aim +1 rep or +1kg)`;
    } else {
      text.textContent = `TARGET: ${activeRoutine.defaultWeight}kg x ${activeRoutine.defaultReps} reps`;
    }

    renderRowsOnly();
    renderExerciseQueue();
  }

  function renderRowsOnly() {
    const container = document.getElementById('setsRowsContainer');
    if (!container) return;

    container.innerHTML = currentSets.map((s, idx) => {
      const prev = previousSessionSets[idx] || null;
      const prevStr = prev ? `${prev.weight}k×${prev.reps}` : '--';
      const prAchieved = isOverloadPR(s, prev);

      return `
        <div class="set-row ${prAchieved ? 'is-pr' : ''}">
          <span class="set-idx">${s.setIndex}</span>
          <span class="set-prev">${prevStr}</span>
          
          <!-- Weight Stepper -->
          <div class="stepper-unit">
            <button class="step-btn" data-act="w-minus" data-idx="${idx}">-</button>
            <span class="step-val">${s.weight}</span>
            <button class="step-btn" data-act="w-plus" data-idx="${idx}">+</button>
          </div>

          <!-- Reps Stepper -->
          <div class="stepper-unit">
            <button class="step-btn" data-act="r-minus" data-idx="${idx}">-</button>
            <span class="step-val">${s.reps}</span>
            <button class="step-btn" data-act="r-plus" data-idx="${idx}">+</button>
          </div>

          <!-- Done Check -->
          <button class="done-btn ${s.completed ? 'active' : ''}" data-act="done" data-idx="${idx}">
            ${s.completed ? 'DONE' : 'LOG'}
          </button>
        </div>
      `;
    }).join('');
  }

  function renderExerciseQueue() {
    const queue = document.getElementById('exerciseQueue');
    if (!queue) return;
    queue.innerHTML = RoutineRegistry.map(r => `
      <div class="queue-pill ${r.id === activeRoutine.id ? 'active' : ''}" data-queue-id="${r.id}">
        <span>${r.name}</span>
      </div>
    `).join('');
  }

  return {
    init,
    switchExercise,
    updateWeight,
    updateReps,
    toggleSetComplete,
    addSet
  };
})();

// --------------------------------------------------------------------------
// 7. SUB-MODULE: CONSISTENCY STREAK & TOP HUD CONTROLLER
// --------------------------------------------------------------------------
const HudController = (() => {
  function init() {
    renderStreakMatrix();
    EventBus.on('NUTRITION_UPDATED', updateNutritionHUD);
    EventBus.on('SET_COMMITTED', refreshHUDStats);
    EventBus.on('STORAGE_PERSISTENCE_STATUS', updateVaultStatusBadge);
  }

  function renderStreakMatrix() {
    const matrix = document.getElementById('streakMatrix');
    if (!matrix) return;
    // 30-Day binary consistency dots
    let html = '';
    const activeBlocks = 14; // Habit demonstration base
    for (let i = 0; i < 30; i++) {
      html += `<div class="matrix-dot ${i < activeBlocks ? 'active' : ''}"></div>`;
    }
    matrix.innerHTML = html;
    document.getElementById('streakCount').textContent = `${activeBlocks}D`;
  }

  function updateNutritionHUD(totals) {
    const cEl = document.getElementById('hudCalories');
    const pEl = document.getElementById('hudProtein');
    if (cEl) cEl.textContent = `${totals.cal}/${totals.targetCal} kcal`;
    if (pEl) pEl.textContent = `${Math.round(totals.p)}/${totals.targetP}g P`;
  }

  async function refreshHUDStats() {
    const counts = await StorageVault.getVaultCounts();
    const setElem = document.getElementById('vaultSetsCount');
    const mealElem = document.getElementById('vaultMealsCount');
    if (setElem) setElem.textContent = counts.sets;
    if (mealElem) mealElem.textContent = counts.meals;
  }

  function updateVaultStatusBadge(isPersisted) {
    const badge = document.getElementById('vaultPersistStatus');
    if (badge) badge.textContent = isPersisted ? 'ACTIVE' : 'DEFAULT';
  }

  return { init, refreshHUDStats };
})();

// --------------------------------------------------------------------------
// 8. MASTER DOM WIRING & TOUCH DISPATCHER
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Visual Loop Engine
  VisualLoopPlayer.init();

  // 2. Initialize Sub-Modules
  await NutritionEngine.init();
  await WorkoutController.init();
  HudController.init();
  HudController.refreshHUDStats();

  // 3. Tab Switching
  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetId = tab.dataset.target;
      document.querySelectorAll('.dock-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view-tab').forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      const view = document.getElementById(targetId);
      if (view) view.classList.add('active');
    });
  });

  // 4. Workout Stepper Clicks (Delegated, fast-tap, no keyboard)
  const setsContainer = document.getElementById('setsRowsContainer');
  setsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    const idx = parseInt(btn.dataset.idx, 10);
    if (isNaN(idx)) return;

    if (act === 'w-minus') WorkoutController.updateWeight(idx, -2.5);
    if (act === 'w-plus') WorkoutController.updateWeight(idx, 2.5);
    if (act === 'r-minus') WorkoutController.updateReps(idx, -1);
    if (act === 'r-plus') WorkoutController.updateReps(idx, 1);
    if (act === 'done') WorkoutController.toggleSetComplete(idx);
  });

  // 5. Add Set Button
  document.getElementById('btnAddSet').addEventListener('click', () => {
    WorkoutController.addSet();
  });

  // 6. Rest Timer Button
  let timerSeconds = 90;
  let timerInterval = null;
  const timerBtn = document.getElementById('btnRestTimer');
  const timerDisplay = document.getElementById('restTimerDisplay');
  timerBtn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerDisplay.textContent = 'REST 90s';
      return;
    }
    timerSeconds = 90;
    timerDisplay.textContent = `REST ${timerSeconds}s`;
    timerInterval = setInterval(() => {
      timerSeconds--;
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerDisplay.textContent = 'REST READY';
      } else {
        timerDisplay.textContent = `REST ${timerSeconds}s`;
      }
    }, 1000);
  });

  // 7. Exercise Queue Selector
  document.getElementById('exerciseQueue').addEventListener('click', (e) => {
    const pill = e.target.closest('.queue-pill');
    if (pill && pill.dataset.queueId) {
      WorkoutController.switchExercise(pill.dataset.queueId);
    }
  });

  // 8. Populate Whole-Food Bank
  const foodGrid = document.getElementById('foodBankGrid');
  foodGrid.innerHTML = NutritionEngine.STAPLE_FOODS.map(f => `
    <button class="food-item-btn" data-food-json='${JSON.stringify(f)}'>
      <span class="food-name">${f.name}</span>
      <span class="food-macros">${f.cal} kcal | ${f.p}g P | ${f.c}g C</span>
    </button>
  `).join('');

  foodGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.food-item-btn');
    if (btn && btn.dataset.foodJson) {
      const food = JSON.parse(btn.dataset.foodJson);
      NutritionEngine.logFood(food);
    }
  });

  // 9. Quick Food Buttons
  document.querySelectorAll('.quick-food-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      NutritionEngine.logFood({
        name: 'Quick Log',
        cal: +btn.dataset.cal,
        p: +btn.dataset.p,
        c: +btn.dataset.c,
        f: +btn.dataset.f
      });
    });
  });

  // 10. Intake List Delete
  document.getElementById('intakeList').addEventListener('click', (e) => {
    const delBtn = e.target.closest('.intake-del-btn');
    if (delBtn && delBtn.dataset.delId) {
      NutritionEngine.deleteFood(Number(delBtn.dataset.delId));
    }
  });

  // 11. Vault Data Export & Import
  document.getElementById('btnExportJSON').addEventListener('click', async () => {
    const dump = await StorageVault.exportDumpJSON();
    const blob = new Blob([dump], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym_umer_ai_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        await StorageVault.importRestoreJSON(evt.target.result);
        alert('Vault successfully restored! Reloading...');
        location.reload();
      } catch (err) {
        alert('Restore failed: Invalid or corrupted JSON file.');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btnClearCache').addEventListener('click', () => {
    if (confirm('Clear today\'s active session staging buffer? (Permanent logs will remain intact)')) {
      StorageVault.clearScratchpad();
      location.reload();
    }
  });

  // 12. Register Service Worker for Complete Offline Resilience
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('SW registration skipped:', err);
    });
  }
});