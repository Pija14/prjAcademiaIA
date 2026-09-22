/* =========================================================
   PERSISTÊNCIA DA APLICAÇÃO
   Responsabilidade: leitura, normalização e gravação do estado
   persistente do Meu Treino.

   Este módulo não controla a UI nem a execução do treino.
   ========================================================= */
(function () {
  "use strict";

  const config = window.MeuTreinoConfig || {};
  const KEY = config.STORAGE_KEY || "meuTreinoDataV1";

  const DEFAULTS = {
    workouts: [], users: [], currentUserId: null, ownerId: null,
    settings: { rest: 30, exerciseDuration: 60, restDuration: 30, weeklyGoal: 4, sound: true, vibration: true, theme: "light" },
    excludedExercises: { A: [], B: [], C: [] }, customExercises: { A: [], B: [], C: [] },
    workoutPlans: { A: null, B: null, C: null }, workoutNames: { A: "Treino A", B: "Treino B", C: "Treino C" },
    myWorkouts: [], workoutHistory: []
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function createDefaults() { return clone(DEFAULTS); }

  function normalize(data) {
    const db = data && typeof data === "object" ? data : createDefaults();
    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.workouts)) db.workouts = [];
    if (!Array.isArray(db.myWorkouts)) db.myWorkouts = [];
    if (!Array.isArray(db.workoutHistory)) db.workoutHistory = [];
    if (!db.settings || typeof db.settings !== "object") db.settings = clone(DEFAULTS.settings);

    ["exerciseDuration", "restDuration", "rest"].forEach((key) => {
      const value = Number(db.settings[key]);
      if (!Number.isFinite(value) || value <= 0) db.settings[key] = DEFAULTS.settings[key];
    });
    const goal = Number(db.settings.weeklyGoal);
    db.settings.weeklyGoal = Number.isInteger(goal) && goal >= 1 && goal <= 7 ? goal : 4;

    if (!db.excludedExercises || typeof db.excludedExercises !== "object") db.excludedExercises = clone(DEFAULTS.excludedExercises);
    if (!db.customExercises || typeof db.customExercises !== "object") db.customExercises = clone(DEFAULTS.customExercises);
    if (!db.workoutPlans || typeof db.workoutPlans !== "object") db.workoutPlans = clone(DEFAULTS.workoutPlans);
    if (!db.workoutNames || typeof db.workoutNames !== "object") db.workoutNames = clone(DEFAULTS.workoutNames);

    ["A", "B", "C"].forEach((key) => {
      if (!Array.isArray(db.excludedExercises[key])) db.excludedExercises[key] = [];
      if (!Array.isArray(db.customExercises[key])) db.customExercises[key] = [];
    });
    return db;
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (error) {
      console.warn("[MeuTreinoDataStore] Falha ao ler dados locais:", error);
      return createDefaults();
    }
  }

  function write(data) {
    const normalized = normalize(clone(data));
    localStorage.setItem(KEY, JSON.stringify(normalized));
    return normalized;
  }

  function update(mutator) {
    const data = read();
    if (typeof mutator === "function") mutator(data);
    return write(data);
  }

  function getCurrentUser(data) {
    const db = data || read();
    return db.users.find((user) => user.id === db.currentUserId) || null;
  }

  function setCurrentUser(userId) {
    return update((data) => { data.currentUserId = userId || null; });
  }

  function getUserState(data) {
    const db = data || read();
    const userId = db.currentUserId || null;
    return {
      workouts: db.workouts.filter((w) => !w.userId || w.userId === userId).map(clone),
      settings: clone(db.settings),
      excludedExercises: clone(db.excludedExercises),
      customExercises: clone(db.customExercises),
      workoutPlans: clone(db.workoutPlans),
      workoutNames: clone(db.workoutNames),
      myWorkouts: clone(db.myWorkouts),
      workoutHistory: db.workoutHistory.filter((h) => !h.userId || h.userId === userId).map(clone)
    };
  }

  function saveUserState(payload, data) {
    const db = data || read();
    const userId = db.currentUserId || null;
    const next = payload || {};

    if (Array.isArray(next.workouts)) {
      const otherUsers = db.workouts.filter((w) => w.userId && w.userId !== userId);
      db.workouts = otherUsers.concat(next.workouts.map((w) => ({ ...clone(w), userId })));
    }
    if (next.settings && typeof next.settings === "object") db.settings = clone(next.settings);
    if (next.excludedExercises) db.excludedExercises = clone(next.excludedExercises);
    if (next.customExercises) db.customExercises = clone(next.customExercises);
    if (next.workoutPlans) db.workoutPlans = clone(next.workoutPlans);
    if (next.workoutNames) db.workoutNames = clone(next.workoutNames);
    if (Array.isArray(next.myWorkouts)) db.myWorkouts = clone(next.myWorkouts);

    if (Array.isArray(next.workoutHistory)) {
      const otherUsers = db.workoutHistory.filter((h) => h.userId && h.userId !== userId);
      db.workoutHistory = otherUsers.concat(next.workoutHistory.map((h) => ({ ...clone(h), userId })));
    }
    return write(db);
  }

  window.MeuTreinoDataStore = Object.freeze({
    KEY, defaults: createDefaults, clone, normalize, read, write, update,
    getCurrentUser, setCurrentUser, getUserState, saveUserState
  });
})();
