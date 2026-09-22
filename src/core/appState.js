/* =========================================================
   ESTADO CENTRAL DO APP
   Responsabilidade: criar e normalizar o estado de runtime.
   ========================================================= */
(function () {
  "use strict";

  const runtimeDefaults = Object.freeze({
    page: "home",
    training: null,
    exerciseIndex: 0,
    exerciseTimer: 0,
    exerciseOneMinuteAlerted: false,
    exerciseRunning: false,
    exerciseStartedAt: null,
    currentSetIndex: 0,
    restTimer: 0,
    restRunning: false,
    timerInterval: null,
    restInterval: null
  });

  function create(overrides = {}) {
    return {
      ...runtimeDefaults,
      ...overrides
    };
  }

  function reset(state) {
    const next = create();

    if (state && typeof state === "object") {
      Object.keys(state).forEach(key => {
        if (key === "timerInterval" || key === "restInterval") return;
        delete state[key];
      });
      Object.assign(state, next);
      return state;
    }

    return next;
  }

  function stopTimers(state) {
    if (!state) return;

    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    if (state.restInterval) {
      clearInterval(state.restInterval);
      state.restInterval = null;
    }

    state.exerciseRunning = false;
    state.restRunning = false;
  }

  window.MeuTreinoAppState = Object.freeze({
    defaults: runtimeDefaults,
    create,
    reset,
    stopTimers
  });
})();
