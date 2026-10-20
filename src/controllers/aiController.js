import { renderTrainings } from "./trainingsController.js";
import { AI_SHEET_MAX_IMAGES, addAiSheetImage, aiPlanningIsConfigured, clearAiSheet, getAiDraft, getAiPlannerInput, getAiPlannerMode, getAiSheet, rememberAiPlannerInput, removeAiDraftWorkout, removeAiSheetImage, requestAiPlan, requestAiPlanFromSheet, setAiDraft, setAiPlannerMode, setAiSheetNotes } from "../models/aiModel.js";
import { prepareSheetImage } from "../utils/image.js";
import { addWorkout } from "../models/workoutModel.js";
import { aiMessageView, aiPlanPreviewView, aiPlannerView, aiSheetView } from "../views/aiView.js";
import { confirmDialog } from "../views/components/dialogs.js";
import { setFieldError } from "../views/components/fields.js";
import { showSnackbar } from "../views/components/snackbar.js";
import { layout } from "../views/layoutView.js";

// Controller do planejador de IA: coleta o formulário, valida, chama o model e alterna entre formulário e prévia.

export function renderAiPlanner(){
  if(!aiPlanningIsConfigured()) return renderTrainings();
  if(getAiPlannerMode()==="photo") layout(aiSheetView(getAiSheet(),AI_SHEET_MAX_IMAGES),"trainings");
  else layout(aiPlannerView(getAiPlannerInput()),"trainings");
}

// Alterna entre "Descrever objetivo" e "Foto da ficha" mantendo o que já foi preenchido.
export function setAiPlannerModeUi(mode){
  if(getAiPlannerMode()==="describe" && document.getElementById("aiDuration")) rememberAiPlannerInput(readAiPlannerForm());
  setAiPlannerMode(mode);
  renderAiPlanner();
}

export function rememberSheetNotes(value){ setAiSheetNotes(value); }

export async function pickSheetPhoto(input){
  const files=[...(input.files||[])];
  input.value="";
  if(!files.length) return;
  const free=AI_SHEET_MAX_IMAGES-getAiSheet().images.length;
  if(files.length>free) showSnackbar(`Só cabem mais ${free} ${free===1?"foto":"fotos"}. As demais foram ignoradas.`);
  showAiPlannerMessage("Preparando a foto…");
  try{
    for(const file of files.slice(0,Math.max(0,free))) addAiSheetImage(await prepareSheetImage(file));
    renderAiPlanner();
  }catch(error){
    renderAiPlanner();
    showAiPlannerMessage(error?.message||"Não foi possível usar esta imagem.",true);
  }
}

export function removeSheetPhoto(index){
  removeAiSheetImage(index);
  renderAiPlanner();
}

export async function readSheetWithAi(){
  const sheet=getAiSheet();
  if(!sheet.images.length){ showAiPlannerMessage("Adicione a foto da ficha.",true); return; }
  setAiSheetNotes(aiField("aiSheetNotes",400));
  const button=document.getElementById("aiSheetButton");
  const label=button?.querySelector(".md-button-label");
  if(button){ button.disabled=true; button.classList.add("is-loading"); }
  if(label) label.textContent="Lendo a ficha…";
  showAiPlannerMessage("A IA está lendo a sua ficha. Isso pode levar até um minuto.");
  try{
    setAiDraft(await requestAiPlanFromSheet(sheet));
    renderAiPlanPreview();
  }catch(error){
    showAiPlannerMessage(error?.message||"Não foi possível ler a ficha.",true);
  }finally{
    if(button&&document.body.contains(button)){ button.disabled=false; button.classList.remove("is-loading"); if(label) label.textContent="Ler ficha"; }
  }
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
  const workouts=getAiDraft();
  if(!workouts) return renderAiPlanner();
  layout(aiPlanPreviewView(workouts),"trainings");
}

// Remove um treino da sugestão antes de salvar (ex.: a ficha tinha um treino que você não vai usar).
export function removeAiDraftWorkoutUi(index){
  const name=getAiDraft()?.[index]?.name||"este treino";
  confirmDialog({title:"Remover da sugestão?",text:`${name} não será salvo. Os demais continuam.`,confirmLabel:"Remover",destructive:true,onConfirm:()=>{ removeAiDraftWorkout(index); renderAiPlanPreview(); }});
}

export function saveAiPlanDraft(){
  const workouts=getAiDraft();
  if(!workouts) return;
  workouts.forEach(addWorkout);
  setAiDraft(null);
  clearAiSheet();
  renderTrainings();
  showSnackbar(workouts.length>1?`${workouts.length} treinos salvos em Meus Treinos`:"Treino salvo em Meus Treinos");
}

export function discardAiPlanDraft(){
  confirmDialog({title:"Descartar sugestão?",text:"Os treinos sugeridos pela IA não serão salvos.",confirmLabel:"Descartar",destructive:true,onConfirm:()=>{ setAiDraft(null); renderAiPlanner(); }});
}
