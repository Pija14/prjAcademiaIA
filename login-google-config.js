/* Obtém somente o Client ID público do Google pelo backend. Nenhum segredo é exposto. */
(function () {
  const originalStartGoogleLogin = window.startGoogleLogin;

  window.startGoogleLogin = async function () {
    try {
      const apiUrl = String(window.MEU_TREINO_CONFIG?.AI_API_URL || "").replace(/\/$/, "");
      if (!apiUrl) throw new Error("API não configurada.");

      const response = await fetch(`${apiUrl}/auth/google/config`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      const config = await response.json().catch(() => ({}));

      if (!response.ok || !config.enabled || !config.client_id) {
        throw new Error("Login do Google não está configurado no servidor.");
      }

      window.MEU_TREINO_CONFIG = {
        ...(window.MEU_TREINO_CONFIG || {}),
        GOOGLE_CLIENT_ID: config.client_id
      };

      await originalStartGoogleLogin();
    } catch (error) {
      console.error("Configuração Google:", error);
      alert(error?.message || "Não foi possível iniciar o Login do Google.");
    }
  };
})();
