import { getAccessToken } from "./session.js";
import { normalizeWorkout } from "./store.js";
import { uid } from "../utils/format.js";

let aiPlanDraft=null;

function aiPlanningApiUrl(){
  const raw=window.MEU_TREINO_CONFIG?.AI_API_URL;
  return typeof raw==="string" ? raw.trim().replace(/\/$/,"") : "";
}

export function aiPlanningIsConfigured(){ return /^https:\/\//i.test(aiPlanningApiUrl()) || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(aiPlanningApiUrl()); }

let aiPlannerLast=null;

const ALLOWED_LEVELS=["Iniciante","Intermediário","Avançado","Personalizado"];
const notesOf=list=>Array.isArray(list)?list.map(n=>String(n).trim().slice(0,220)).filter(Boolean):[];

function normalizeAiWorkout(plan,sharedNotes){
  if(!plan||typeof plan!=="object") return null;
  const groups=Array.isArray(plan.groups)?plan.groups.slice(0,12).map((group,gi)=>{
    const name=String(group?.name||"").trim().slice(0,80);
    const exercises=Array.isArray(group?.exercises)?group.exercises.slice(0,16).map((exercise,ei)=>{
      const exerciseName=String(exercise?.name||"").trim().slice(0,100);
      const providedCount=Number.parseInt(exercise?.seriesCount,10) || (Array.isArray(exercise?.sets)?exercise.sets.length:0);
      const requestedCount=Math.min(12,Math.max(1,providedCount));
      const count=Math.min(12,Math.max(1,Number.isFinite(requestedCount)?requestedCount:3));
      const sourceSets=Array.isArray(exercise?.sets)?exercise.sets:[];
      if(!exerciseName) return null;
      return {id:uid("ex-"),name:exerciseName,equipment:String(exercise?.equipment||"").slice(0,120),order:ei,seriesCount:count,sets:Array.from({length:count},(_,si)=>({number:si+1,reps:String(sourceSets[si]?.reps??sourceSets[0]?.reps??"").slice(0,30),weight:String(sourceSets[si]?.weight??sourceSets[0]?.weight??"").slice(0,20),done:false,completedAt:null}))};
    }).filter(Boolean):[];
    return name&&exercises.length?{id:uid("grupo-"),name,order:gi,exercises}:null;
  }).filter(Boolean):[];
  if(!groups.length) return null;
  const aiNotes=[...new Set([...notesOf(plan.notes),...sharedNotes])].slice(0,6);
  return normalizeWorkout({id:uid("treino-"),name:String(plan.name||"Treino sugerido pela IA").trim().slice(0,80),description:String(plan.description||"Plano sugerido pela IA. Revise antes de executar.").trim().slice(0,300),level:ALLOWED_LEVELS.includes(plan.level)?plan.level:"Personalizado",groups,aiGenerated:true,aiNotes});
}

// A IA devolve { workouts: [...], notes } — um treino por dia da divisão (ex.: Treino A, B e C).
// Também aceita o formato antigo, de um treino só.
function normalizeAiPlans(raw){
  const data=raw?.plan||raw;
  if(!data||typeof data!=="object") throw new Error("A IA retornou um plano inválido.");
  const shared=notesOf(data.notes);
  const list=Array.isArray(data.workouts)&&data.workouts.length?data.workouts.slice(0,7):[data];
  const workouts=list.map(w=>normalizeAiWorkout(w,shared)).filter(Boolean);
  if(!workouts.length) throw new Error("A sugestão não contém treinos e exercícios utilizáveis.");
  return workouts;
}

const AI_PLANNER_DEFAULTS={objective:"hipertrofia",level:"Iniciante",daysPerWeek:3,durationMinutes:60,equipment:"",limitations:"",splitPreference:""};
// Rascunho: lista de treinos sugeridos/lidos, ainda não salvos.
export function getAiDraft(){ return aiPlanDraft; }
export function setAiDraft(workouts){ aiPlanDraft=workouts&&workouts.length?workouts:null; }
export function removeAiDraftWorkout(index){ if(aiPlanDraft) setAiDraft(aiPlanDraft.filter((_,i)=>i!==index)); }
export function getAiPlannerInput(){ return aiPlannerLast||AI_PLANNER_DEFAULTS; }
export function rememberAiPlannerInput(input){ aiPlannerLast=input; }
// Modo do planejador: "describe" (objetivo e rotina) ou "photo" (foto da ficha da academia).
let aiPlannerMode="describe";
let aiSheet={images:[],notes:""};
export const AI_SHEET_MAX_IMAGES=3;
export function getAiPlannerMode(){ return aiPlannerMode; }
export function setAiPlannerMode(mode){ aiPlannerMode=mode==="photo"?"photo":"describe"; }
export function getAiSheet(){ return aiSheet; }
export function addAiSheetImage(image){ if(aiSheet.images.length<AI_SHEET_MAX_IMAGES) aiSheet.images=[...aiSheet.images,image]; }
export function removeAiSheetImage(index){ aiSheet.images=aiSheet.images.filter((_,i)=>i!==index); }
export function setAiSheetNotes(notes){ aiSheet.notes=String(notes||"").slice(0,400); }
export function clearAiSheet(){ aiSheet={images:[],notes:""}; }

async function postAi(path,body,timeoutMs){
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const headers={"Content-Type":"application/json"};
    const token=getAccessToken();
    if(token) headers.Authorization=`Bearer ${token}`;
    const response=await fetch(`${aiPlanningApiUrl()}${path}`,{method:"POST",headers,body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      const detail=Array.isArray(data?.detail)?"Confira as fotos e tente novamente.":data?.detail;
      throw new Error(detail||"Não foi possível gerar o planejamento agora.");
    }
    return normalizeAiPlans(data);
  }catch(error){
    if(error?.name==="AbortError") throw new Error("A solicitação demorou demais. Tente novamente.");
    if(error instanceof TypeError) throw new Error("Sem conexão com o servidor. Verifique sua internet.");
    throw error;
  }finally{ clearTimeout(timeout); }
}

// Lê a foto da ficha e devolve o treino transcrito (mesmo formato do plano sugerido).
// 150 s: inclui o tempo de o servidor gratuito "acordar" e a troca de modelo quando um está sem cota.
export function requestAiPlanFromSheet({images,notes},{timeoutMs=150000}={}){
  return postAi("/ai/plan-from-image",{images:images.map(({mimeType,data})=>({mimeType,data})),notes:String(notes||"").trim()},timeoutMs);
}

// Solicita um plano ao backend. Lança erro com mensagem amigável em caso de falha.
export async function requestAiPlan(input,{timeoutMs=90000}={}){
  return postAi("/ai/plan",input,timeoutMs);
}
