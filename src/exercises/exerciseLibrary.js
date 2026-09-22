/* =========================================================
   BIBLIOTECA DE EXERCÍCIOS
   IndexedDB isolado do app.js.
   ========================================================= */
(function () {
  "use strict";

  const EX_DB_NAME = "PrjAcademiaDB";
  const EX_DB_VERSION = 2;
  const EX_STORE = "exercicios";
  const WORKOUT_STORE = "treino_exercicios";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(EX_DB_NAME, EX_DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;

        if (!db.objectStoreNames.contains(EX_STORE)) {
          const store = db.createObjectStore(EX_STORE, {
            keyPath: "id",
            autoIncrement: true
          });
          store.createIndex("nome", "nome", { unique: false });
          store.createIndex("ativo", "ativo", { unique: false });
        }

        if (!db.objectStoreNames.contains(WORKOUT_STORE)) {
          const store = db.createObjectStore(WORKOUT_STORE, {
            keyPath: "id",
            autoIncrement: true
          });
          store.createIndex("exerciseId", "exerciseId", { unique: false });
          store.createIndex("treinoId", "treinoId", { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function list() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EX_STORE, "readonly");
      const req = tx.objectStore(EX_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function save(exercise) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EX_STORE, "readwrite");
      const store = tx.objectStore(EX_STORE);

      const req = store.put({
        ...exercise,
        nome: String(exercise.nome || exercise.name || "").trim(),
        ativo: exercise.ativo !== false,
        atualizadoEm: new Date().toISOString()
      });

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function search(term = "") {
    const all = await list();
    const normalized = String(term || "").trim().toLowerCase();

    return all
      .filter(exercise => exercise.ativo !== false)
      .filter(exercise =>
        !normalized ||
        String(exercise.nome || "").toLowerCase().includes(normalized)
      )
      .sort((a, b) =>
        String(a.nome || "").localeCompare(
          String(b.nome || ""),
          "pt-BR"
        )
      );
  }

  async function create(nome, dados = {}) {
    const nomeLimpo = String(nome || "").trim();
    if (!nomeLimpo) {
      throw new Error("Informe o nome do exercício.");
    }

    const all = await list();
    const existente = all.find(
      exercise =>
        String(exercise.nome || "").trim().toLowerCase() ===
        nomeLimpo.toLowerCase()
    );

    if (existente) {
      await save({
        ...existente,
        ...dados,
        nome: existente.nome
      });
      return existente;
    }

    const id = await save({
      nome: nomeLimpo,
      grupoMuscular: dados.grupoMuscular || dados.grupo || "",
      equipamento: dados.equipamento || "",
      ativo: true
    });

    return (await list()).find(exercise => exercise.id === id);
  }

  async function seed(source) {
    const existing = await list();
    if (existing.length) return existing;

    const candidates = [
      source,
      window.exercises,
      window.exercicios,
      window.exerciseList,
      window.workoutExercises,
      window.treinoExercicios
    ];

    const raw = candidates.find(Array.isArray) || [];

    const normalized = raw
      .map((exercise, index) => {
        if (typeof exercise === "string") {
          return { nome: exercise, ativo: true };
        }

        return {
          ...exercise,
          nome:
            exercise.nome ||
            exercise.name ||
            exercise.titulo ||
            `Exercício ${index + 1}`,
          ativo: exercise.ativo !== false
        };
      })
      .filter(exercise => exercise.nome);

    for (const exercise of normalized) {
      await save(exercise);
    }

    return list();
  }

  const api = Object.freeze({
    list,
    search,
    save,
    create,
    seed
  });

  window.MeuTreinoExerciseLibrary = api;

  // Compatibilidade temporária com o app.js legado.
  // Permite remover a implementação duplicada sem quebrar referências existentes.
  window.ExerciseLibrary = api;
})();
