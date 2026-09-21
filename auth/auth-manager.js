/* =========================================================
   GERENCIADOR DE AUTENTICAÇÃO
   ========================================================= */

class AuthManager {
  constructor() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
    this.apiUrl = window.MEU_TREINO_CONFIG?.AI_API_URL ||
                  "https://gymia-backend.onrender.com";
    this.loadStoredSession();
  }

  /**
   * Carregar sessão armazenada no localStorage
   */
  loadStoredSession() {
    try {
      const token = localStorage.getItem("auth_token");
      const userInfo = localStorage.getItem("user_info");

      if (token && userInfo) {
        this.token = token;
        this.user = JSON.parse(userInfo);
        this.isAuthenticated = true;
        console.log("✓ Sessão carregada do localStorage");
      }
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      this.clearSession();
    }
  }

  /**
   * Login com email e senha
   */
  async login(email, password) {
    try {
      this.showLoading(true);

      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha no login");
      }

      const data = await response.json();

      // Salvar sessão
      this.setSession(data.token, data.user);

      console.log("✓ Login bem-sucedido");
      return data;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Login com Google (usando credencial JWT)
   */
  async loginWithGoogle(googleToken) {
    try {
      this.showLoading(true);

      const decodedToken = decodeJWT(googleToken);

      const response = await fetch(`${this.apiUrl}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: googleToken,
          userInfo: {
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
            sub: decodedToken.sub
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha na autenticação com Google");
      }

      const data = await response.json();

      // Salvar sessão
      this.setSession(data.token, data.user || decodedToken);

      console.log("✓ Login com Google bem-sucedido");
      return data;
    } catch (error) {
      console.error("Erro no login com Google:", error);
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Registrar novo usuário
   */
  async register(email, password, name) {
    try {
      this.showLoading(true);

      const response = await fetch(`${this.apiUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha no registro");
      }

      const data = await response.json();
      console.log("✓ Registro bem-sucedido");
      return data;
    } catch (error) {
      console.error("Erro no registro:", error);
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      if (this.token) {
        await fetch(`${this.apiUrl}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.token}`,
            "Content-Type": "application/json"
          }
        }).catch(() => {}); // Ignorar erros de logout no servidor
      }

      this.clearSession();
      console.log("✓ Logout bem-sucedido");
    } catch (error) {
      console.error("Erro no logout:", error);
      this.clearSession();
    }
  }

  /**
   * Salvar sessão (token + user info)
   */
  setSession(token, user) {
    this.token = token;
    this.user = user;
    this.isAuthenticated = true;

    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_info", JSON.stringify(user));
  }

  /**
   * Limpar sessão
   */
  clearSession() {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;

    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
  }

  /**
   * Verificar se está autenticado
   */
  isLoggedIn() {
    return this.isAuthenticated && this.token && this.user;
  }

  /**
   * Obter header de autorização
   */
  getAuthHeader() {
    return {
      "Authorization": `Bearer ${this.token}`
    };
  }

  /**
   * Fazer requisição autenticada
   */
  async fetch(endpoint, options = {}) {
    const headers = {
      ...options.headers,
      ...this.getAuthHeader()
    };

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers
    });

    return response;
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(userData) {
    try {
      const response = await this.fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar perfil");
      }

      const data = await response.json();
      this.user = { ...this.user, ...data.user };
      localStorage.setItem("user_info", JSON.stringify(this.user));

      console.log("✓ Perfil atualizado");
      return data;
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      throw error;
    }
  }

  /**
   * Recuperar senha
   */
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error("Falha ao solicitar reset de senha");
      }

      const data = await response.json();
      console.log("✓ Email de recuperação enviado");
      return data;
    } catch (error) {
      console.error("Erro ao solicitar reset de senha:", error);
      throw error;
    }
  }

  /**
   * Resetar senha
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, newPassword })
      });

      if (!response.ok) {
        throw new Error("Falha ao resetar senha");
      }

      console.log("✓ Senha resetada com sucesso");
      return await response.json();
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      throw error;
    }
  }

  /**
   * Mostrar/esconder loading spinner
   */
  showLoading(show) {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.style.display = show ? "flex" : "none";
    }
  }
}

// Criar instância global
window.authManager = new AuthManager();
