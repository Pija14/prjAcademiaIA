/* Meu Treino — cliente HTTP centralizado. */
(function () {
  function baseUrl() {
    const raw = window.MEU_TREINO_CONFIG?.AI_API_URL;
    return typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";
  }

  function configured() {
    const url = baseUrl();
    return /^https:\/\//i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(url);
  }

  function getToken() {
    return localStorage.getItem("meuTreinoAccessTokenV1") || "";
  }

  async function request(path, options = {}) {
    if (!configured()) throw new Error("API não configurada.");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl()}${path}`, { ...options, headers });
    let body = null;
    try { body = await response.json(); } catch (_) {}

    if (!response.ok) {
      const error = new Error(body?.detail || `Erro ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  window.MeuTreinoAPI = Object.freeze({ baseUrl, configured, getToken, request });
})();
