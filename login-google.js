/*
 * Meu Treino — camada exclusiva da tela de login.
 * Mantém os handlers existentes de e-mail/senha e cadastro.
 */
(function () {
  const originalRenderAuthScreen = window.renderAuthScreen;
  const originalToggleAuthMode = window.toggleAuthMode;

  function googleClientId() {
    return String(window.MEU_TREINO_CONFIG?.GOOGLE_CLIENT_ID || "").trim();
  }

  function loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      const existing = document.querySelector('script[data-meu-treino-google-gsi]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client?hl=pt-BR";
      script.async = true;
      script.defer = true;
      script.dataset.meuTreinoGoogleGsi = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não foi possível carregar o Login do Google."));
      document.head.appendChild(script);
    });
  }

  async function startGoogleLogin() {
    const clientId = googleClientId();
    if (!clientId) {
      alert("O Login do Google ainda não está configurado para este aplicativo.");
      return;
    }

    try {
      await loadGoogleIdentityServices();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error(error);
      alert("Não foi possível iniciar o Login do Google.");
    }
  }

  async function handleGoogleCredential(response) {
    const credential = response?.credential;
    if (!credential) {
      alert("O Google não retornou uma credencial válida.");
      return;
    }

    try {
      const apiRequestFn = window.apiRequest;
      if (typeof apiRequestFn !== "function") {
        throw new Error("A API de autenticação não está disponível.");
      }
      const result = await apiRequestFn("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential })
      });

      if (typeof window.authenticateFromResponse === "function") {
        await window.authenticateFromResponse(result, null);
      }
      window.authMode = "login";
      window.renderHome();
    } catch (error) {
      console.error("Login Google:", error);
      alert(error?.message || "Não foi possível entrar com o Google.");
    }
  }

  function googleLogo() {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M24 9.5c3.94 0 7.48 1.35 10.27 3.99l7.58-7.58C37.26 2.13 31.02 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.82 6.85C13.3 13.82 18.2 9.5 24 9.5z"/><path fill="#34A853" d="M46.5 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.65c-.54 2.9-2.17 5.36-4.64 7.01l7.5 5.82C43.89 37.46 46.5 31.55 46.5 24.5z"/><path fill="#FBBC05" d="M11.38 28.07A14.54 14.54 0 0 1 10.5 24c0-1.41.24-2.78.67-4.07l-8.82-6.85A23.93 23.93 0 0 0 0 24c0 3.92.94 7.62 2.61 10.92l8.77-6.85z"/><path fill="#EA4335" d="M24 48c6.48 0 11.92-2.14 15.89-5.82l-7.5-5.82c-2.08 1.4-4.74 2.23-8.39 2.23-5.8 0-10.7-4.32-12.47-10.07l-8.77 6.85C6.51 42.62 14.62 48 24 48z"/></svg>`;
  }

  function renderGoogleLoginScreen() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <div class="auth-google-screen">
        <div class="auth-google-brand">
          <div class="auth-google-logo" aria-hidden="true">
            <svg viewBox="0 0 64 64"><rect x="8" y="25" width="9" height="14" rx="3"/><rect x="17" y="19" width="8" height="26" rx="3"/><rect x="25" y="28" width="14" height="8" rx="4" transform="rotate(-28 32 32)"/><rect x="39" y="19" width="8" height="26" rx="3"/><rect x="47" y="25" width="9" height="14" rx="3"/></svg>
          </div>
          <div class="auth-google-brand-name">Meu <span class="accent">Treino</span></div>
          <p class="auth-google-tagline">Seu treino. Sua evolução.</p>
        </div>

        <section class="auth-google-card" aria-labelledby="login-title">
          <div class="auth-google-eyebrow">ACESSO À CONTA</div>
          <h1 class="auth-google-title" id="login-title">Bem-vindo de volta</h1>
          <p class="auth-google-subtitle">Entre para continuar seu treino.</p>

          <form class="auth-google-form" onsubmit="return handleLoginSubmit(event)">
            <label class="auth-google-field">
              <span>E-mail</span>
              <input id="auth-email" type="email" placeholder="rafaellouzadaa@gmail.com" autocomplete="email" required>
            </label>

            <label class="auth-google-field auth-google-password">
              <span>Senha</span>
              <input id="auth-password" type="password" placeholder="Sua senha" autocomplete="current-password" required>
              <button type="button" class="auth-google-eye" onclick="togglePassword('auth-password',this)" aria-label="Mostrar senha">◉</button>
            </label>

            <button class="auth-google-submit" type="submit">Entrar</button>
            <button class="auth-google-forgot" type="button" onclick="alert('A recuperação de senha será disponibilizada em uma próxima etapa.')">Esqueci minha senha?</button>
          </form>

          <div class="auth-google-divider"><span>ou</span></div>

          <button class="auth-google-button" type="button" onclick="startGoogleLogin()">
            ${googleLogo()}
            <span>Fazer login com o Google</span>
          </button>

          <p class="auth-google-account">
            Ainda não tem conta?
            <button class="auth-google-create" type="button" onclick="toggleAuthMode('register')">Criar conta.</button>
          </p>
        </section>

        <div class="auth-google-security">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.2 8.3-8 10-4.8-1.7-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>
          <span>Seus dados ficam separados por conta e protegidos pela API.</span>
        </div>
      </div>`;
  }

  window.startGoogleLogin = startGoogleLogin;
  window.handleGoogleCredential = handleGoogleCredential;

  window.renderAuthScreen = renderGoogleLoginScreen;

  window.toggleAuthMode = function (mode) {
    if (mode === "login") {
      originalToggleAuthMode("login");
      renderGoogleLoginScreen();
      return;
    }
    originalToggleAuthMode(mode);
  };

  // bootApp() já pode ter renderizado a tela antes deste arquivo ser carregado.
  if (document.querySelector(".auth-shell") && !document.querySelector(".auth-google-screen")) {
    renderGoogleLoginScreen();
  }
})();
