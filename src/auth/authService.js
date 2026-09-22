/* Meu Treino — regras de autenticação isoladas. */
(function () {
  const API = () => window.MeuTreinoAPI;
  const Storage = () => window.MeuTreinoStorage;

  async function login(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) throw new Error("Informe seu e-mail.");
    if (!password) throw new Error("Informe sua senha.");
    const response = await API().request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: normalized, password: String(password) })
    });
    Storage().setToken(response.access_token);
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
    Storage().setToken(response.access_token);
    return response;
  }

  function logout() {
    Storage().setToken("");
  }

  window.MeuTreinoAuth = Object.freeze({ login, register, logout });
})();
