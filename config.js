/**
 * Configuração do GymIA
 * Detecta automaticamente o ambiente (desenvolvimento/produção)
 */

let API_URL = "https://gymia-backend.onrender.com"; // Produção - Backend no Render

// Se em localhost, usar backend local
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  API_URL = "http://localhost:3001"; // Desenvolvimento - Backend local
}

// Se em GitHub Pages, usar backend local (temporário para testes)
// Em produção, isso apontará para o Render
if (window.location.hostname.includes("github.io")) {
  // Para testar localmente, mude para: http://localhost:3001
  // Para produção, mude para: https://gymia-backend.onrender.com
  API_URL = "http://localhost:3001"; // 🔄 TESTE LOCAL
}

window.MEU_TREINO_CONFIG = {
  AI_API_URL: API_URL,
  ENVIRONMENT: window.location.hostname === "localhost" ? "development" : "production",
  DEBUG: window.location.hostname === "localhost"
};

// Log de configuração (apenas em desenvolvimento)
if (window.MEU_TREINO_CONFIG.DEBUG) {
  console.log("🔧 Configuração do GymIA:", window.MEU_TREINO_CONFIG);
  console.log("API URL:", API_URL);
}

