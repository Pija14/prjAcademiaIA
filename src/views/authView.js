import { esc } from "../utils/format.js";
import { GOOGLE_G_LOGO, mdIcon } from "./components/icons.js";

// Views da tela de login e cadastro.

function authTextField({id,label,type="text",icon,autocomplete,hint="",extra="",password=false}){
  return `
    <div class="md-field${password?" has-trailing":""}">
      <div class="md-field-box">
        ${mdIcon(icon,"md-icon md-field-leading")}
        <input id="${id}" class="md-field-input" type="${type}" placeholder=" " autocomplete="${autocomplete}" aria-describedby="${id}-support" aria-invalid="false" oninput="clearFieldError(this)" ${password?'onkeyup="authCapsHint(event)" onblur="this.closest(\'.md-field\').querySelector(\'.md-field-caps\').hidden=true"':""} ${extra}>
        <label class="md-field-label" for="${id}">${label}</label>
        ${password?`<button type="button" class="md-icon-button md-field-trailing" onclick="togglePassword('${id}',this)" aria-label="Mostrar senha" aria-pressed="false">${mdIcon("visibility")}</button>`:""}
      </div>
      <p id="${id}-support" class="md-field-support" data-hint="${hint}">${hint}</p>
      ${password?`<p id="${id}-caps" class="md-field-caps" hidden>Caps Lock está ativado</p>`:""}
    </div>`;
}

// Botão próprio exibido enquanto o botão oficial do Google carrega, ou quando ele não está disponível.
export function googleFallbackButtonView(state){
  const label=state==="loading"?"Carregando Google…":"Continuar com o Google";
  return `<button type="button" class="auth-google-fallback" ${state==="loading"?'aria-busy="true" disabled':""} onclick="handleGoogleUnavailable()">${GOOGLE_G_LOGO}<span>${label}</span></button>`;
}

export function authMessageContentView(text,type){ return `${mdIcon(type==="error"?"error":"info")}<span>${esc(text)}</span>`; }

function authSegmentView(mode,label,isLogin){
  const selected=(mode==="login")===isLogin;
  return `<button type="button" role="tab" id="auth-tab-${mode}" class="auth-segment${selected?" is-selected":""}" aria-selected="${selected}" aria-controls="auth-panel" tabindex="${selected?0:-1}" onclick="toggleAuthMode('${mode}')" onkeydown="if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();toggleAuthMode('${mode==="login"?"register":"login"}');}">${selected?mdIcon("check","md-icon auth-segment-check"):""}<span>${label}</span></button>`;
}

function authFeatureView(icon,title,text){ return `<li><span class="auth-feature-icon">${mdIcon(icon)}</span><span><strong>${title}</strong><span>${text}</span></span></li>`; }

export function authView({isLogin}){
  return `
    <div class="auth-shell">
      <main class="auth-layout">
        <section class="auth-hero" aria-labelledby="auth-hero-title">
          <div class="auth-brand">
            <span class="auth-logo">${mdIcon("logo")}</span>
            <span class="auth-brand-name">Meu Treino</span>
          </div>
          <h1 id="auth-hero-title" class="auth-hero-title">Seu treino. <br>Sua evolução.</h1>
          <p class="auth-hero-text">Planeje, execute e acompanhe cada treino em um só lugar — na academia ou fora dela.</p>
          <ul class="auth-features">
            ${authFeatureView("sparkle","Planos com IA","Monte treinos sob medida em segundos.")}
            ${authFeatureView("trending","Evolução visível","Histórico, calendário e meta semanal.")}
            ${authFeatureView("sync","Sempre com você","Seus dados sincronizados em qualquer aparelho.")}
          </ul>
        </section>
        <section class="auth-card" aria-labelledby="auth-title">
          <header class="auth-card-head">
            <h2 id="auth-title">${isLogin?"Entrar":"Criar sua conta"}</h2>
            <p>${isLogin?"Que bom ter você de volta. Continue de onde parou.":"Leva menos de um minuto para começar."}</p>
          </header>
          <div class="auth-segmented" role="tablist" aria-label="Escolha como acessar">
            ${authSegmentView("login","Entrar",isLogin)}${authSegmentView("register","Criar conta",isLogin)}
          </div>
          <div id="auth-panel" role="tabpanel" aria-labelledby="auth-tab-${isLogin?"login":"register"}">
            <div id="auth-message" class="auth-banner" hidden></div>
            <div id="auth-google" class="auth-google">
              <div id="auth-google-slot" class="auth-google-slot">${googleFallbackButtonView("loading")}</div>
            </div>
            <div class="auth-divider" role="separator"><span>ou use seu e-mail</span></div>
            <form id="auth-form" novalidate onsubmit="return ${isLogin?"handleLoginSubmit":"handleRegisterSubmit"}(event)">
              <fieldset id="auth-fieldset" class="auth-fieldset">
                <legend class="sr-only">${isLogin?"Entrar com e-mail e senha":"Dados da nova conta"}</legend>
                ${isLogin?`
                  ${authTextField({id:"auth-email",label:"E-mail",type:"email",icon:"mail",autocomplete:"username",extra:'inputmode="email" autocapitalize="off" spellcheck="false" required'})}
                  ${authTextField({id:"auth-password",label:"Senha",type:"password",icon:"lock",autocomplete:"current-password",password:true,extra:"required"})}
                  <div class="auth-row-end"><button type="button" class="md-text-button" onclick="handleForgotPassword()">Esqueceu a senha?</button></div>
                `:`
                  ${authTextField({id:"register-name",label:"Nome",icon:"person",autocomplete:"name",extra:'autocapitalize="words" maxlength="120" required'})}
                  ${authTextField({id:"register-email",label:"E-mail",type:"email",icon:"mail",autocomplete:"email",extra:'inputmode="email" autocapitalize="off" spellcheck="false" required'})}
                  ${authTextField({id:"register-password",label:"Senha",type:"password",icon:"lock",autocomplete:"new-password",hint:"Use pelo menos 6 caracteres.",password:true,extra:'minlength="6" maxlength="128" required'})}
                  ${authTextField({id:"register-password-confirm",label:"Confirmar senha",type:"password",icon:"lock",autocomplete:"new-password",password:true,extra:'minlength="6" maxlength="128" required'})}
                `}
                <button id="auth-submit" class="md-filled-button auth-submit" type="submit">
                  <span class="md-spinner" aria-hidden="true"></span>
                  <span class="md-button-label">${isLogin?"Entrar":"Criar conta"}</span>
                </button>
              </fieldset>
            </form>
          </div>
        </section>
      </main>
      <footer class="auth-footer">${mdIcon("shield")}<span>Seus dados ficam separados por conta e protegidos por login seguro.</span></footer>
    </div>`;
}
