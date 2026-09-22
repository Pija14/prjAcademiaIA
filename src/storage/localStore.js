/* Meu Treino — persistência local isolada. */
(function () {
  const KEY = "meuTreinoDataV1";
  const AUTH_TOKEN_KEY = "meuTreinoAccessTokenV1";

  function read(fallback = {}) {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null") || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function write(value) {
    localStorage.setItem(KEY, JSON.stringify(value));
  }

  function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  window.MeuTreinoStorage = Object.freeze({ KEY, AUTH_TOKEN_KEY, read, write, getToken, setToken });
})();
