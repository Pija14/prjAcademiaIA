/**
 * Configuração do GymIA
 * Detecta automaticamente se está em desenvolvimento ou produção
 */

// Determinar URL da API baseado no ambiente
let API_URL = "https://prjacademiaia.onrender.com"; // Produção (Render)

// Se em localhost, usar backend local
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  API_URL = "http://localhost:3001"; // Desenvolvimento
}

window.MEU_TREINO_CONFIG = {
  AI_API_URL: API_URL,
  ENVIRONMENT: window.location.hostname === "localhost" ? "development" : "production",
  DEBUG: window.location.hostname === "localhost"
};

// Log de configuração (apenas em desenvolvimento)
if (window.MEU_TREINO_CONFIG.DEBUG) {
  console.log("🔧 Configuração do GymIA:", window.MEU_TREINO_CONFIG);
}

