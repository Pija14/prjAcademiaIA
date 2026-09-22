/*
 * Ponte de compatibilidade durante a migração do app.js.
 *
 * O app.js antigo ainda declara window.ExerciseLibrary. Este módulo é
 * carregado depois dele e substitui a implementação legada pela versão
 * modular, sem alterar as chamadas existentes do aplicativo.
 */
(function () {
  const library = window.MeuTreinoExerciseLibrary;
  if (!library) {
    console.error("[Meu Treino] Biblioteca modular de exercícios não carregada.");
    return;
  }

  window.ExerciseLibrary = library;
})();
