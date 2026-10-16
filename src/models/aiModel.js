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

function normalizeAiPlan(raw){
  const plan=raw?.plan||raw;
  if(!plan||typeof plan!=="object") throw new Error("A IA retornou um plano inválido.");
  const allowedLevels=["Iniciante","Intermediário","Avançado","Personalizado"];
  const groups=Array.isArray(plan.groups)?plan.groups.slice(0,12).map((group,gi)=>{
    const name=String(group?.name||"").trim().slice(0,80);
    const exercises=Array.isArray(group?.exercises)?group.exercises.slice(0,16).map((exercise,ei)=>{
      const exerciseName=String(exercise?.name||"").trim().slice(0,100);
      const providedCount=Number.parseInt(exercise?.seriesCount,10) || (Array.isArray(exercise?.sets)?exercise.sets.length:0);
      const requestedCount=Math.min(12,Math.max(1,providedCount));
      const count=Math.min(12,Math.max(1,Number.isFinite(requestedCount)?requestedCount:3));
      const sourceSets=Array.isArray(exercise?.sets)?exercise.sets:[];
      if(!exerciseName) return null;
      return {id:uid("ex-"),name:exerciseName,equipment:String(exercise?.equipment||"").slice(0,120),order:ei,seriesCount:count,sets:Array.from({length:count},(_,si)=>({number:si+1,reps:String(sourceSets[si]?.reps??sourceSets[0]?.reps??"").slice(0,30),weight:"",done:false,completedAt:null}))};
    }).filter(Boolean):[];
    return name&&exercises.length?{id:uid("grupo-"),name,order:gi,exercises}:null;
  }).filter(Boolean):[];
  if(!groups.length) throw new Error("A sugestão não contém grupos e exercícios utilizáveis.");
  return normalizeWorkout({id:uid("treino-"),name:String(plan.name||"Treino sugerido pela IA").trim().slice(0,80),description:String(plan.description||"Plano sugerido pela IA. Revise antes de executar.").trim().slice(0,300),level:allowedLevels.includes(plan.level)?plan.level:"Personalizado",groups,aiGenerated:true,aiNotes:Array.isArray(plan.notes)?plan.notes.map(n=>String(n).slice(0,220)).slice(0,5):[]});
}

const AI_PLANNER_DEFAULTS={objective:"hipertrofia",level:"Iniciante",daysPerWeek:3,durationMinutes:60,equipment:"",limitations:"",splitPreference:""};
export function getAiDraft(){ return aiPlanDraft; }
export function setAiDraft(plan){ aiPlanDraft=plan; }
export function getAiPlannerInput(){ return aiPlannerLast||AI_PLANNER_DEFAULTS; }
export function rememberAiPlannerInput(input){ aiPlannerLast=input; }
// Solicita um plano ao backend. Lança erro com mensagem amigável em caso de falha.
export async function requestAiPlan(input,{timeoutMs=30000}={}){
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const headers={"Content-Type":"application/json"};
    const token=getAccessToken();
    if(token) headers.Authorization=`Bearer ${token}`;
    const response=await fetch(`${aiPlanningApiUrl()}/ai/plan`,{method:"POST",headers,body:JSON.stringify(input),signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new Error(data?.detail||"Não foi possível gerar o planejamento agora.");
    return normalizeAiPlan(data);
  }catch(error){
    if(error?.name==="AbortError") throw new Error("A solicitação demorou demais. Tente novamente.");
    throw error;
  }finally{ clearTimeout(timeout); }
}
