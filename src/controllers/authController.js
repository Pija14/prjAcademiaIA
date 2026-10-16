import { AUTH_SLOW_HINT_MS, GOOGLE_GSI_SRC } from "../config/constants.js";
import { renderHome } from "./homeController.js";
import { stopIntervals } from "./workoutController.js";
import { apiConfigured } from "../models/api.js";
import { loadGoogleConfig, loginAccount, loginWithGoogleCredential, registerAccount, restoreSession, signOut } from "../models/authModel.js";
import { abandonSession } from "../models/workoutSession.js";
import { normalizeEmail } from "../utils/format.js";
import { authMessageContentView, authView, googleFallbackButtonView } from "../views/authView.js";
import { setFieldError } from "../views/components/fields.js";
import { mdIcon } from "../views/components/icons.js";

// Controller de autenticação: formulários de login/cadastro, botão do Google e início do app.

let authMode="login";
let authBusy=false;
let authSlowTimer=null;
// Integração com o Google Identity Services (SDK de terceiros carregado só nesta tela).
const googleAuth={status:"idle",scriptPromise:null,initializedFor:""};

// Traduz erros da API/rede para mensagens ao usuário.
function authErrorMessage(err,fallback){
  if(err?.name==="AbortError") return "O servidor demorou demais para responder. Tente novamente em instantes.";
  if(err instanceof TypeError) return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  if(err?.status===429) return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  if(err?.status>=500) return err.message && !/^Erro \d+$/.test(err.message) ? err.message : "O servidor está indisponível no momento. Tente novamente em instantes.";
  return err?.message || fallback;
}

function setAuthMessage(text,type="error"){
  const box=document.getElementById("auth-message");
  if(!box) return;
  if(!text){ box.hidden=true; box.innerHTML=""; return; }
  box.className=`auth-banner auth-banner-${type}`;
  box.setAttribute("role",type==="error"?"alert":"status");
  box.innerHTML=authMessageContentView(text,type);
  box.hidden=false;
}

export function authCapsHint(event){
  const input=event.target;
  const hint=document.getElementById(`${input.id}-caps`);
  if(hint && typeof event.getModifierState==="function") hint.hidden=!event.getModifierState("CapsLock");
}

function setAuthBusy(busy,source="email"){
  authBusy=busy;
  const fieldset=document.getElementById("auth-fieldset");
  const submit=document.getElementById("auth-submit");
  const google=document.getElementById("auth-google");
  if(fieldset) fieldset.disabled=busy;
  document.querySelectorAll(".auth-segment").forEach(button=>{ button.disabled=busy; });
  if(submit){
    submit.classList.toggle("is-loading",busy&&source==="email");
    const label=submit.querySelector(".md-button-label");
    if(label) label.textContent=busy&&source==="email"?(authMode==="register"?"Criando conta…":"Entrando…"):(authMode==="register"?"Criar conta":"Entrar");
  }
  if(google){ google.classList.toggle("is-busy",busy); google.setAttribute("aria-busy",busy&&source==="google"?"true":"false"); }
  clearTimeout(authSlowTimer);
  if(busy){
    setAuthMessage("");
    authSlowTimer=setTimeout(()=>setAuthMessage("Conectando ao servidor… Na primeira vez do dia isso pode levar até um minuto.","info"),AUTH_SLOW_HINT_MS);
  }
}

function validateEmailField(id){
  const input=document.getElementById(id);
  const value=normalizeEmail(input?.value);
  if(!value){ setFieldError(id,"Informe seu e-mail."); return false; }
  if(input && !input.checkValidity()){ setFieldError(id,"Digite um e-mail válido, como nome@exemplo.com."); return false; }
  return true;
}

function focusFirstInvalid(){ document.querySelector(".md-field.is-error input")?.focus(); }

export async function handleLoginSubmit(event){
  event.preventDefault();
  if(authBusy) return false;
  setAuthMessage("");
  const password=document.getElementById("auth-password")?.value||"";
  let valid=validateEmailField("auth-email");
  if(!password){ setFieldError("auth-password","Informe sua senha."); valid=false; }
  if(!valid){ focusFirstInvalid(); return false; }
  setAuthBusy(true,"email");
  try{
    await loginAccount({email:document.getElementById("auth-email").value,password});
    setAuthBusy(false);
    renderHome();
  }catch(err){
    setAuthBusy(false);
    setAuthMessage(err?.status===401?"E-mail ou senha incorretos. Confira os dados ou entre com o Google.":authErrorMessage(err,"Não foi possível entrar."));
  }
  return false;
}

export async function handleRegisterSubmit(event){
  event.preventDefault();
  if(authBusy) return false;
  setAuthMessage("");
  const name=(document.getElementById("register-name")?.value||"").trim();
  const password=document.getElementById("register-password")?.value||"";
  const confirm=document.getElementById("register-password-confirm")?.value||"";
  let valid=true;
  if(name.length<2){ setFieldError("register-name","Informe seu nome (mínimo de 2 letras)."); valid=false; }
  if(!validateEmailField("register-email")) valid=false;
  if(password.length<6){ setFieldError("register-password","A senha precisa ter pelo menos 6 caracteres."); valid=false; }
  if(!confirm){ setFieldError("register-password-confirm","Repita a senha para confirmar."); valid=false; }
  else if(password!==confirm){ setFieldError("register-password-confirm","As senhas não são iguais."); valid=false; }
  if(!valid){ focusFirstInvalid(); return false; }
  setAuthBusy(true,"email");
  try{
    await registerAccount({name,email:document.getElementById("register-email").value,password});
    authMode="login";
    setAuthBusy(false);
    renderHome();
  }catch(err){
    setAuthBusy(false);
    if(err?.status===409){ setFieldError("register-email","Este e-mail já está cadastrado. Entre com sua senha ou com o Google."); setAuthMessage(""); }
    else setAuthMessage(authErrorMessage(err,"Não foi possível criar a conta."));
    focusFirstInvalid();
  }
  return false;
}

export function handleForgotPassword(){
  setAuthMessage("A recuperação de senha chega em breve. Se sua conta usa um e-mail do Google, você já pode entrar com o botão do Google.","info");
}

export function toggleAuthMode(mode){
  if(authBusy || authMode===mode) return;
  authMode=mode;
  renderAuthScreen();
  document.getElementById(mode==="register"?"register-name":"auth-email")?.focus({preventScroll:true});
}

export function togglePassword(id,button){
  const input=document.getElementById(id); if(!input) return;
  const visible=input.type==="text"; input.type=visible?"password":"text";
  if(button){
    button.innerHTML=mdIcon(visible?"visibility":"visibilityOff");
    button.setAttribute("aria-label",visible?"Mostrar senha":"Ocultar senha");
    button.setAttribute("aria-pressed",visible?"false":"true");
  }
}

// ---- Google
function loadGoogleScript(){
  if(window.google?.accounts?.id) return Promise.resolve();
  if(!googleAuth.scriptPromise){
    googleAuth.scriptPromise=new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src=GOOGLE_GSI_SRC; script.async=true; script.defer=true;
      script.onload=()=>resolve();
      script.onerror=()=>{ googleAuth.scriptPromise=null; script.remove(); reject(new Error("Não foi possível carregar o login do Google.")); };
      document.head.appendChild(script);
    });
  }
  return googleAuth.scriptPromise;
}

export function handleGoogleUnavailable(){
  if(googleAuth.status==="error"){ googleAuth.status="idle"; mountGoogleButton(); return; }
  setAuthMessage("O login com Google ainda não foi ativado neste servidor. Use seu e-mail e senha por enquanto.","info");
}

async function mountGoogleButton(){
  const slot=document.getElementById("auth-google-slot");
  if(!slot || !apiConfigured()) return;
  if(googleAuth.status!=="ready") slot.innerHTML=googleFallbackButtonView("loading");
  try{
    const clientId=await loadGoogleConfig();
    if(!clientId){ googleAuth.status="disabled"; slot.innerHTML=googleFallbackButtonView("disabled"); slot.dataset.state="disabled"; return; }
    await loadGoogleScript();
    if(googleAuth.initializedFor!==clientId){
      window.google.accounts.id.initialize({client_id:clientId,callback:handleGoogleCredential,ux_mode:"popup",auto_select:false,cancel_on_tap_outside:true,itp_support:true,use_fedcm_for_button:true});
      googleAuth.initializedFor=clientId;
    }
    const current=document.getElementById("auth-google-slot");
    if(!current) return;
    const width=Math.round(Math.min(400,Math.max(220,current.clientWidth||320)));
    const dark=window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    current.innerHTML="";
    window.google.accounts.id.renderButton(current,{type:"standard",theme:dark?"filled_black":"outline",size:"large",shape:"pill",text:authMode==="register"?"signup_with":"continue_with",logo_alignment:"center",width,locale:"pt-BR"});
    current.dataset.state="ready";
    googleAuth.status="ready";
  }catch(err){
    googleAuth.status="error";
    const current=document.getElementById("auth-google-slot");
    if(current){ current.innerHTML=googleFallbackButtonView("error"); current.dataset.state="error"; }
    console.warn("Login com Google:",err);
  }
}

async function handleGoogleCredential(response){
  if(authBusy) return;
  if(!response?.credential){ setAuthMessage("O Google não retornou uma credencial. Tente novamente."); return; }
  setAuthBusy(true,"google");
  try{
    await loginWithGoogleCredential(response.credential);
    setAuthBusy(false);
    authMode="login";
    renderHome();
  }catch(err){
    setAuthBusy(false);
    setAuthMessage(authErrorMessage(err,"Não foi possível entrar com o Google."));
  }
}

// ---- Telas e sessão
export function renderAuthScreen(){
  const app=document.getElementById("app");
  if(!app) return;
  authBusy=false;
  clearTimeout(authSlowTimer);
  app.innerHTML=authView({isLogin:authMode!=="register"});
  mountGoogleButton();
}

export async function logoutUser(){
  await signOut();
  try{ window.google?.accounts?.id?.disableAutoSelect(); }catch(_){ /* GIS não carregado */ }
  authMode="login";
  stopIntervals();
  abandonSession();
  renderAuthScreen();
}

// Sessão expirada (401 durante a sincronização): volta para o login.
export function handleSessionExpired(){ renderAuthScreen(); }

export async function bootApp(){
  if(await restoreSession()) renderHome();
  else renderAuthScreen();
}
