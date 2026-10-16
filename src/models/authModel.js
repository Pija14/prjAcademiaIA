import { AUTH_TIMEOUT_MS, SESSION_CHECK_TIMEOUT_MS } from "../config/constants.js";
import { apiConfigured, apiRequest } from "./api.js";
import { getAccessToken, setAccessToken } from "./session.js";
import { applyUserState, db, ensureAuthState, getCurrentUser, hasUserData, legacyStateForEmail, persistLocal } from "./store.js";
import { syncStateNow } from "./sync.js";
import { normalizeEmail } from "../utils/format.js";

// Model de autenticação: sessão com a API e aplicação do estado do usuário.
// As funções lançam erros da API (com .status); quem decide a mensagem é o controller.

async function authenticateFromResponse(response, legacySnapshot){
  setAccessToken(response.access_token);
  const serverState=response.state || {};
  const canMigrate=legacySnapshot && hasUserData(legacySnapshot) && !hasUserData(serverState);
  applyUserState(serverState,response.user);
  if(canMigrate){
    db.workouts=legacySnapshot.workouts;
    db.settings=legacySnapshot.settings;
    db.excludedExercises=legacySnapshot.excludedExercises;
    db.customExercises=legacySnapshot.customExercises;
    db.workoutPlans=legacySnapshot.workoutPlans;
    db.workoutNames=legacySnapshot.workoutNames;
    db.myWorkouts=legacySnapshot.myWorkouts;
    db.workoutHistory=legacySnapshot.workoutHistory;
    await syncStateNow();
  }
  persistLocal();
}

export async function registerAccount({name,email,password}){
  const normalized=normalizeEmail(email);
  const legacySnapshot=legacyStateForEmail(normalized);
  const response=await apiRequest("/auth/register",{method:"POST",timeoutMs:AUTH_TIMEOUT_MS,body:JSON.stringify({name:String(name||"").trim(),email:normalized,password:String(password)})});
  await authenticateFromResponse(response,legacySnapshot);
}

export async function loginAccount({email,password}){
  const normalized=normalizeEmail(email);
  const legacySnapshot=legacyStateForEmail(normalized);
  const response=await apiRequest("/auth/login",{method:"POST",timeoutMs:AUTH_TIMEOUT_MS,body:JSON.stringify({email:normalized,password:String(password)})});
  await authenticateFromResponse(response,legacySnapshot);
}

export async function loginWithGoogleCredential(credential){
  const result=await apiRequest("/auth/google",{method:"POST",timeoutMs:AUTH_TIMEOUT_MS,body:JSON.stringify({credential})});
  await authenticateFromResponse(result,legacyStateForEmail(result.user.email));
}

// Recupera a sessão salva (token local). Resultado:
//  "online"     — token válido; estado do servidor aplicado
//  "offline"    — servidor inacessível (sem rede, timeout, 5xx); segue com os dados salvos no aparelho
//  "signed-out" — sem sessão ou token rejeitado (401/403)
export async function restoreSession(){
  ensureAuthState();
  if(!apiConfigured()){ setAccessToken(""); return "signed-out"; }
  const token=getAccessToken();
  if(!token) return "signed-out";
  try{
    const user=await apiRequest("/auth/me",{timeoutMs:SESSION_CHECK_TIMEOUT_MS});
    const serverState=await apiRequest("/state",{timeoutMs:SESSION_CHECK_TIMEOUT_MS});
    await authenticateFromResponse({access_token:token,user,state:serverState},legacyStateForEmail(user.email));
    return "online";
  }catch(err){
    const rejected=err?.status===401||err?.status===403;
    if(!rejected && getCurrentUser()) return "offline";
    clearLocalSession();
    return "signed-out";
  }
}

function clearLocalSession(){
  setAccessToken("");
  db.currentUserId=null;
  db.users=[];
  persistLocal();
}

export async function signOut(){
  try{ if(getAccessToken()) await apiRequest("/auth/logout",{method:"POST"}); }catch(_){ /* sessão já pode ter expirado */ }
  clearLocalSession();
}

// Client ID público do Google: do config.js local ou do backend (/auth/google/config). Cacheado.
let googleConfigPromise=null;
export function loadGoogleConfig(){
  const local=String(window.MEU_TREINO_CONFIG?.GOOGLE_CLIENT_ID||"").trim();
  if(local) return Promise.resolve(local);
  if(!googleConfigPromise){
    googleConfigPromise=apiRequest("/auth/google/config",{method:"GET",timeoutMs:AUTH_TIMEOUT_MS})
      .then(config=>config?.enabled&&config.client_id?String(config.client_id):"")
      .catch(err=>{ googleConfigPromise=null; throw err; });
  }
  return googleConfigPromise;
}
