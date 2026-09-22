/* Meu Treino — regras de autenticação isoladas. */
(function () {
  "use strict";

  const API = () => window.MeuTreinoAPI;
  const Session = () => window.MeuTreinoAuthSession;

  async function login(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) throw new Error("Informe seu e-mail.");
    if (!password) throw new Error("Informe sua senha.");

    const response = await API().request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: normalized, password: String(password) })
    });

    Session().setToken(response.access_token);
    Session().setUser(response.user || response.usuario || null);
    return response;
  }

  async function register(name, email, password) {
    const safeName = String(name || "").trim();
    const normalized = String(email || "").trim().toLowerCase();
    if (!safeName) throw new Error("Informe seu nome.");
    if (!normalized) throw new Error("Informe seu e-mail.");
    if (String(password || "").length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

    const response = await API().request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: safeName, email: normalized, password: String(password) })
    });

    Session().setToken(response.access_token);
    Session().setUser(response.user || response.usuario || null);
    return response;
  }

  function logout() {
    Session().clear();
  }

  function isAuthenticated() {
    return Session().isAuthenticated();
  }

  function currentUser() {
    return Session().getUser();
  }

  window.MeuTreinoAuth = Object.freeze({ login, register, logout, isAuthenticated, currentUser });
})();
