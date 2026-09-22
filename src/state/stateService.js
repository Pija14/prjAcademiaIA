/* Meu Treino — estado de execução isolado. */
(function () {
  const DEFAULT_STATE = Object.freeze({
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
    return { ...DEFAULT_STATE, ...overrides };
  }

  function reset(state, overrides = {}) {
    const next = create(overrides);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, next);
    return state;
  }

  function stopTimers(state) {
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (state.restInterval) clearInterval(state.restInterval);
    state.timerInterval = null;
    state.restInterval = null;
    state.exerciseRunning = false;
    state.restRunning = false;
  }

  window.MeuTreinoState = Object.freeze({
    DEFAULT_STATE,
    create,
    reset,
    stopTimers
  });
})();
