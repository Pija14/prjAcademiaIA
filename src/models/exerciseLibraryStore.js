const EX_DB_NAME = "PrjAcademiaDB";

const EX_DB_VERSION = 2;

const EX_STORE = "exercicios";

const WORKOUT_STORE = "treino_exercicios";

function openExerciseDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EX_DB_NAME, EX_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EX_STORE)) {
        const store = db.createObjectStore(EX_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("nome", "nome", { unique: false });
        store.createIndex("ativo", "ativo", { unique: false });
      }
      if (!db.objectStoreNames.contains(WORKOUT_STORE)) {
        const store = db.createObjectStore(WORKOUT_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("exerciseId", "exerciseId", { unique: false });
        store.createIndex("treinoId", "treinoId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function exerciseDBGetAll() {
  const db = await openExerciseDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EX_STORE, "readonly");
    const req = tx.objectStore(EX_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function exerciseDBSave(exercise) {
  const db = await openExerciseDB();
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

export async function exerciseDBSeedFromCurrentData() {
  const existing = await exerciseDBGetAll();
  if (existing.length) return existing;

  // Tenta localizar arrays de exercícios já utilizados pelo aplicativo.
  const candidates = [
    window.exercises, window.exercicios, window.exerciseList,
    window.workoutExercises, window.treinoExercicios
  ];
  let source = candidates.find(Array.isArray) || [];

  const normalized = source.map((e, i) => {
    if (typeof e === "string") return { nome: e, ativo: true };
    return {
      ...e,
      nome: e.nome || e.name || e.titulo || `Exercício ${i + 1}`,
      ativo: e.ativo !== false
    };
  }).filter(e => e.nome);

  for (const e of normalized) await exerciseDBSave(e);

  return exerciseDBGetAll();
}

export async function exerciseLibrarySearch(term = "") {
  const all = await exerciseDBGetAll();
  const t = term.trim().toLowerCase();
  return all
    .filter(e => e.ativo !== false)
    .filter(e => !t || String(e.nome).toLowerCase().includes(t))
    .sort((a,b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}

export async function salvarNovoExercicio(nome, dados = {}) {
  const nomeLimpo = String(nome || "").trim();
  if (!nomeLimpo) throw new Error("Informe o nome do exercício.");

  const all = await exerciseDBGetAll();
  const existente = all.find(e => String(e.nome).trim().toLowerCase() === nomeLimpo.toLowerCase());

  if (existente) {
    await exerciseDBSave({ ...existente, ...dados, nome: existente.nome });
    return existente;
  }

  const id = await exerciseDBSave({
    nome: nomeLimpo,
    grupoMuscular: dados.grupoMuscular || dados.grupo || "",
    equipamento: dados.equipamento || "",
    ativo: true
  });

  return (await exerciseDBGetAll()).find(e => e.id === id);
}
