/* =========================================================
   SESSÃO DE AUTENTICAÇÃO
   Responsabilidade: token e identidade da sessão.
   Não contém regras de UI.
   ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY =
    window.MeuTreinoConfig?.AUTH_TOKEN_KEY || "meuTreinoAccessTokenV1";
  const USER_KEY = "meuTreinoCurrentUserV1";

  function getToken() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setToken(token) {
    try {
      const value = String(token || "");
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setUser(user) {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch (_) {}
  }

  function clear() {
    setToken("");
    setUser(null);
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  window.MeuTreinoAuthSession = Object.freeze({
    getToken,
    setToken,
    getUser,
    setUser,
    clear,
    isAuthenticated
  });
})();
