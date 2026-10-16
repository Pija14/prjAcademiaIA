import { renderTrainings } from "./trainingsController.js";
import { aiPlanningIsConfigured, getAiDraft, getAiPlannerInput, rememberAiPlannerInput, requestAiPlan, setAiDraft } from "../models/aiModel.js";
import { addWorkout } from "../models/workoutModel.js";
import { aiMessageView, aiPlanPreviewView, aiPlannerView } from "../views/aiView.js";
import { confirmDialog } from "../views/components/dialogs.js";
import { setFieldError } from "../views/components/fields.js";
import { showSnackbar } from "../views/components/snackbar.js";
import { layout } from "../views/layoutView.js";

// Controller do planejador de IA: coleta o formulário, valida, chama o model e alterna entre formulário e prévia.

export function renderAiPlanner(){
  if(!aiPlanningIsConfigured()) return renderTrainings();
  layout(aiPlannerView(getAiPlannerInput()),"trainings");
}

function aiField(id,maxLength=600){ return String(document.getElementById(id)?.value||"").trim().slice(0,maxLength); }

function showAiPlannerMessage(message,isError=false){
  const el=document.getElementById("aiPlannerMessage");
  if(el) el.innerHTML=aiMessageView(message,isError);
}

function readAiPlannerForm(){
  return {objective:aiField("aiObjective",80),level:aiField("aiLevel",40),daysPerWeek:Number.parseInt(aiField("aiDays",2),10),durationMinutes:Number.parseInt(aiField("aiDuration",3),10),equipment:aiField("aiEquipment",400),limitations:aiField("aiLimitations",600),splitPreference:aiField("aiSplit",300)};
}

export async function generateAiPlan(){
  if(!aiPlanningIsConfigured()){ showAiPlannerMessage("Configure a URL segura do backend para usar a IA.",true); return; }
  const input=readAiPlannerForm();
  if(!Number.isInteger(input.durationMinutes)||input.durationMinutes<20||input.durationMinutes>180){ setFieldError("aiDuration","Informe uma duração entre 20 e 180 minutos."); document.getElementById("aiDuration")?.focus(); return; }
  if(!Number.isInteger(input.daysPerWeek)||input.daysPerWeek<1||input.daysPerWeek>7){ showAiPlannerMessage("Confira os dias informados.",true); return; }
  rememberAiPlannerInput(input);
  const button=document.getElementById("aiGenerateButton");
  const label=button?.querySelector(".md-button-label");
  if(button){ button.disabled=true; button.classList.add("is-loading"); }
  if(label) label.textContent="Gerando…";
  showAiPlannerMessage("Gerando sugestão. Isso pode levar alguns segundos.");
  try{
    setAiDraft(await requestAiPlan(input));
    renderAiPlanPreview();
  }catch(error){
    showAiPlannerMessage(error?.message||"Erro ao gerar a sugestão.",true);
  }finally{
    if(button&&document.body.contains(button)){ button.disabled=false; button.classList.remove("is-loading"); if(label) label.textContent="Gerar sugestão"; }
  }
}

function renderAiPlanPreview(){
  const plan=getAiDraft();
  if(!plan) return renderAiPlanner();
  layout(aiPlanPreviewView(plan),"trainings");
}

export function saveAiPlanDraft(){
  const plan=getAiDraft();
  if(!plan) return;
  addWorkout(plan);
  setAiDraft(null);
  renderTrainings();
  showSnackbar("Treino salvo em Meus Treinos");
}

export function discardAiPlanDraft(){
  confirmDialog({title:"Descartar sugestão?",text:"A ficha sugerida pela IA não será salva.",confirmLabel:"Descartar",destructive:true,onConfirm:()=>{ setAiDraft(null); renderAiPlanner(); }});
}
