/* =========================================================
   CONFIGURAÇÃO DO GOOGLE OAUTH 2.0
   ========================================================= */

// Configurações do Google OAuth
const GOOGLE_CONFIG = {
  // Client ID do Google Cloud Console
  CLIENT_ID: "8099264097-7ubvcmh5roaka5humfl5ugm0l7afd9p5.apps.googleusercontent.com",

  // Scope de permissões solicitadas
  SCOPES: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ],

  // Tipo de fluxo
  FLOW_TYPE: "implicit", // ou "authorization_code" para fluxo seguro

  // URLs de redirecionamento
  REDIRECT_URI: window.location.origin + "/auth-callback.html",

  // Descoberta de endpoints
  DISCOVERY_DOCS: [
    "https://www.googleapis.com/discovery/v1/apis/people/v1/rest"
  ]
};

// Função para carregar o SDK do Google
function loadGoogleSDK() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✓ Google SDK carregado");
      resolve();
    };
    script.onerror = () => reject(new Error("Falha ao carregar Google SDK"));
    document.head.appendChild(script);
  });
}

// Inicializar Google Sign-In
function initializeGoogleSignIn() {
  if (!window.google) {
    console.error("Google SDK não carregado");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    callback: handleGoogleSignInResponse,
    auto_select: false,
    itp_support: true
  });
}

// Callback do Google Sign-In
function handleGoogleSignInResponse(response) {
  console.log("Google Sign-In Response:", response);

  if (response.credential) {
    // Decodificar o JWT token
    const credential = decodeJWT(response.credential);
    console.log("Credencial decodificada:", credential);

    // Enviar para o backend para validação e criação de sessão
    validateGoogleToken(response.credential, credential);
  }
}

// Função para decodificar JWT
function decodeJWT(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Erro ao decodificar JWT:", error);
    return null;
  }
}

// Validar token do Google no backend
async function validateGoogleToken(token, decodedToken) {
  try {
    const apiUrl = window.MEU_TREINO_CONFIG?.AI_API_URL ||
                   "https://prjacademiaia.onrender.com";

    const response = await fetch(`${apiUrl}/api/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: token,
        userInfo: {
          email: decodedToken.email,
          name: decodedToken.name,
          picture: decodedToken.picture,
          sub: decodedToken.sub // Google User ID
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na autenticação: ${response.status}`);
    }

    const data = await response.json();
    console.log("Autenticação bem-sucedida:", data);

    // Salvar token no localStorage
    if (data.token || data.session) {
      localStorage.setItem("auth_token", data.token || data.session);
      localStorage.setItem("user_info", JSON.stringify(data.user || decodedToken));

      // Redirecionar para a aplicação principal
      window.location.href = "./index.html";
    }
  } catch (error) {
    console.error("Erro ao validar token do Google:", error);
    showError("Falha na autenticação com Google: " + error.message);
  }
}

// Exportar função de inicialização
window.initGoogleAuth = async function() {
  try {
    // Carregar SDK do Google
    await loadGoogleSDK();

    // Inicializar Sign-In
    initializeGoogleSignIn();

    console.log("✓ Google OAuth configurado");
  } catch (error) {
    console.error("Erro ao configurar Google Auth:", error);
  }
};
