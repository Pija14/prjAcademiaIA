import { getAccessToken } from "./session.js";

function apiBaseUrl(){
  const raw=window.MEU_TREINO_CONFIG?.AI_API_URL;
  return typeof raw==="string" ? raw.trim().replace(/\/$/,"") : "";
}

export function apiConfigured(){ return /^https:\/\//i.test(apiBaseUrl()) || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(apiBaseUrl()); }

export async function apiRequest(path, options={}){
  if(!apiConfigured()) throw new Error("API não configurada.");
  const {timeoutMs,...fetchOptions}=options;
  const headers={"Content-Type":"application/json",...(fetchOptions.headers||{})};
  const token=getAccessToken();
  if(token) headers.Authorization=`Bearer ${token}`;
  const controller=timeoutMs?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
  let response;
  try{ response=await fetch(`${apiBaseUrl()}${path}`,{...fetchOptions,headers,signal:controller?.signal}); }
  finally{ if(timer) clearTimeout(timer); }
  let body=null;
  try{ body=await response.json(); }catch(_){ body=null; }
  if(!response.ok){
    const message=body?.detail || `Erro ${response.status}`;
    const err=new Error(message); err.status=response.status; throw err;
  }
  return body;
}
