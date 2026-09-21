/* =========================================================
   LÓGICA DE LOGIN - GymIA
   ========================================================= */

class LoginPage {
  constructor() {
    this.form = document.getElementById("loginForm");
    this.emailInput = document.getElementById("emailInput");
    this.passwordInput = document.getElementById("passwordInput");
    this.passwordToggle = document.querySelector(".password-toggle");
    this.googleLoginBtn = document.getElementById("googleLoginBtn");
    this.init();
  }

  init() {
    // Evento de submit do formulário
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Toggle de visibilidade de senha
    if (this.passwordToggle) {
      this.passwordToggle.addEventListener("click", (e) => {
        e.preventDefault();
        this.togglePasswordVisibility();
      });
    }

    // Login com Google
    if (this.googleLoginBtn) {
      this.googleLoginBtn.addEventListener("click", () => this.handleGoogleLogin());
    }

    // Redirecionar se já está autenticado
    if (window.authManager?.isLoggedIn()) {
      window.location.href = "/index.html";
    }

    // Inicializar Google Sign-In
    this.initializeGoogleSignIn();
  }

  /**
   * Lidar com login via email/senha
   */
  async handleLogin(event) {
    event.preventDefault();

    const email = this.emailInput?.value?.trim();
    const password = this.passwordInput?.value;

    // Validação básica
    if (!email || !password) {
      this.showError("Por favor, preencha todos os campos");
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError("Por favor, insira um email válido");
      return;
    }

    if (password.length < 6) {
      this.showError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      // Desabilitar botão
      this.setFormDisabled(true);

      // Fazer login
      await window.authManager.login(email, password);

      // Redirecionar
      this.showSuccess("Login realizado com sucesso! Redirecionando...");
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 1500);
    } catch (error) {
      this.showError(error.message || "Falha no login. Tente novamente.");
    } finally {
      this.setFormDisabled(false);
    }
  }

  /**
   * Lidar com login via Google
   */
  async handleGoogleLogin() {
    try {
      this.setFormDisabled(true);

      // Verificar se Google SDK está carregado
      if (!window.google?.accounts?.id) {
        this.showError("Google Sign-In não está disponível. Tente mais tarde.");
        return;
      }

      // Trigger do Google Sign-In
      google.accounts.id.renderButton(
        document.createElement("div"),
        { theme: "outline", size: "large" }
      );

      // Disparar o fluxo de login do Google
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          // Fallback se o prompt não for exibido
          this.googleLoginBtn.textContent = "Aguardando...";
          this.waitForGoogleResponse();
        }
      });
    } catch (error) {
      console.error("Erro no login com Google:", error);
      this.showError("Falha ao iniciar Google Sign-In");
      this.setFormDisabled(false);
    }
  }

  /**
   * Aguardar resposta do Google Sign-In
   */
  waitForGoogleResponse() {
    // Esta função será chamada pelo callback do Google
    // quando a autenticação for concluída
  }

  /**
   * Inicializar Google Sign-In
   */
  initializeGoogleSignIn() {
    // Carregar SDK do Google de forma assíncrona
    this.loadGoogleSDK();
  }

  /**
   * Carregar SDK do Google
   */
  loadGoogleSDK() {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("✓ Google SDK carregado");

      // Substituir callback padrão
      const originalCallback = window.handleGoogleSignInResponse;
      window.handleGoogleSignInResponse = async (response) => {
        try {
          this.setFormDisabled(true);
          await window.authManager.loginWithGoogle(response.credential);
          this.showSuccess("Login com Google realizado com sucesso!");
          setTimeout(() => {
            window.location.href = "/index.html";
          }, 1500);
        } catch (error) {
          this.showError(error.message || "Falha na autenticação com Google");
          this.setFormDisabled(false);
        }
      };

      // Inicializar Google Sign-In
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CONFIG?.CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          callback: window.handleGoogleSignInResponse,
          auto_select: false
        });
      }
    };

    script.onerror = () => {
      console.error("Erro ao carregar Google SDK");
      this.googleLoginBtn.disabled = true;
      this.googleLoginBtn.title = "Google Sign-In indisponível";
    };

    document.head.appendChild(script);
  }

  /**
   * Toggle de visibilidade de senha
   */
  togglePasswordVisibility() {
    if (!this.passwordInput) return;

    const isPassword = this.passwordInput.type === "password";
    this.passwordInput.type = isPassword ? "text" : "password";

    // Mudar ícone visualmente (opcional)
    const icon = this.passwordToggle?.querySelector(".eye-icon");
    if (icon) {
      icon.style.opacity = isPassword ? 1 : 0.5;
    }
  }

  /**
   * Validar email
   */
  isValidEmail(email) {
    const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return re.test(email);
  }

  /**
   * Mostrar erro
   */
  showError(message) {
    this.clearMessages();
    const errorDiv = document.createElement("div");
    errorDiv.className = "form-error";
    errorDiv.innerHTML = `
      <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${message}</span>
    `;
    this.form?.insertBefore(errorDiv, this.form.firstChild);
  }

  /**
   * Mostrar sucesso
   */
  showSuccess(message) {
    this.clearMessages();
    const successDiv = document.createElement("div");
    successDiv.className = "form-success";
    successDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #e8f5e9;
      border: 1px solid #4caf50;
      border-radius: 0.75rem;
      color: #2e7d32;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      animation: slideDown 0.3s ease-out;
    `;
    successDiv.innerHTML = `
      <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    this.form?.insertBefore(successDiv, this.form.firstChild);
  }

  /**
   * Limpar mensagens
   */
  clearMessages() {
    const messages = this.form?.querySelectorAll(".form-error, .form-success");
    messages?.forEach((msg) => msg.remove());
  }

  /**
   * Desabilitar/habilitar formulário
   */
  setFormDisabled(disabled) {
    if (!this.form) return;

    const inputs = this.form.querySelectorAll("input, button");
    inputs.forEach((input) => {
      input.disabled = disabled;
    });
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  new LoginPage();
});
