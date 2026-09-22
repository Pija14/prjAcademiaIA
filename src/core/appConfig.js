/* =========================================================
   CONFIGURAÇÃO CENTRAL DO APP
   Valores estáveis e compartilhados pelo frontend.
   ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "meuTreinoDataV1";
  const AUTH_TOKEN_KEY = "meuTreinoAccessTokenV1";

  const DEFAULTS = Object.freeze({
    workouts: [],
    users: [],
    currentUserId: null,
    ownerId: null,
    settings: {
      rest: 30,
      exerciseDuration: 60,
      restDuration: 30,
      weeklyGoal: 4,
      sound: true,
      vibration: true,
      theme: "light"
    },
    excludedExercises: { A: [], B: [], C: [] },
    customExercises: { A: [], B: [], C: [] },
    workoutPlans: { A: null, B: null, C: null },
    workoutNames: { A: "Treino A", B: "Treino B", C: "Treino C" },
    myWorkouts: [],
    workoutHistory: []
  });

  const TRAINING_DEFAULTS = Object.freeze({
    exerciseSeconds: 60,
    restSeconds: 30
  });

  window.MeuTreinoConfig = Object.freeze({
    STORAGE_KEY,
    AUTH_TOKEN_KEY,
    DEFAULTS,
    TRAINING_DEFAULTS
  });
})();
