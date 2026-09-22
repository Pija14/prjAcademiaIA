/* =========================================================
   PERSISTÊNCIA DA APLICAÇÃO
   Camada de compatibilidade para centralizar o acesso ao localStorage.
   ========================================================= */
(function () {
  const KEY = window.MeuTreinoConfig?.STORAGE_KEY || "meuTreinoDataV1";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(defaultValue = null) {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(defaultValue);
      return JSON.parse(raw);
    } catch (error) {
      console.error("[Meu Treino] Erro ao ler dados persistidos:", error);
      return clone(defaultValue);
    }
  }

  function write(value) {
    const data = clone(value);
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function update(mutator, defaultValue = {}) {
    const current = read(defaultValue);
    const next = typeof mutator === "function" ? mutator(current) : current;
    return write(next === undefined ? current : next);
  }

  window.MeuTreinoPersistence = {
    key: KEY,
    clone,
    read,
    write,
    update
  };
})();
