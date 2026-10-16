import { F2_GROUPS, WORKOUT_LEVELS } from "../config/constants.js";
import { go } from "./navigationController.js";
import { addExerciseFromLibrary, addGroup, configureExerciseSets, createWorkout, getMyWorkout, moveExercise, moveGroup, removeExercise, removeGroup, renameGroup, searchExerciseLibrary, sortedExercises, sortedGroups, uniqueExerciseLibrary, updateWorkoutHeader } from "../models/workoutModel.js";
import { esc, f2DisplayName } from "../utils/format.js";
import { plural } from "../views/components/common.js";
import { actionSheet, closeDialog, confirmDialog, openDialog, promptDialog } from "../views/components/dialogs.js";
import { setFieldError } from "../views/components/fields.js";
import { showSnackbar } from "../views/components/snackbar.js";
import { exercisePickerResultsView, exercisePickerView, exerciseSetsDialogView, newWorkoutView, workoutEditorView } from "../views/editorView.js";
import { layout } from "../views/layoutView.js";

// Controller do editor de treinos: formulários, diálogos de grupo/exercício e menus de ações.

const LEGACY_DESCRIPTION="Treino migrado da versão anterior";
// Rascunho dos campos do cabeçalho: preserva o que foi digitado quando a tela é redesenhada por uma ação.
const workoutEditDrafts={};
let exercisePicker=null;

function findGroup(wid,gid){ const w=getMyWorkout(wid); const g=w?.groups.find(x=>x.id===gid); return {w,g}; }

// ---- Novo treino
export function renderNewWorkout(){
  layout(newWorkoutView(WORKOUT_LEVELS),'training-new');
  setTimeout(()=>document.getElementById("newWorkoutName")?.focus(),50);
}

export function createMyWorkoutFromForm(){
  const name=document.getElementById("newWorkoutName")?.value.trim();
  if(!name){ setFieldError("newWorkoutName","Informe o nome do treino."); document.getElementById("newWorkoutName")?.focus(); return; }
  const w=createWorkout({
    name,
    level:document.getElementById("newWorkoutLevel")?.value||"Personalizado",
    description:document.getElementById("newWorkoutDescription")?.value.trim()||""
  });
  editMyWorkout(w.id);
  showSnackbar("Treino criado. Agora adicione os grupos musculares.");
}

// ---- Edição
function rerenderWorkoutEditor(id){
  const name=document.getElementById("f2Name");
  if(name) workoutEditDrafts[id]={name:name.value,description:document.getElementById("f2Desc")?.value||"",level:document.getElementById("f2Level")?.value||""};
  editMyWorkout(id,true);
}

export function editMyWorkout(id,keepDraft=false){
  const w=getMyWorkout(id); if(!w) return;
  if(!keepDraft) delete workoutEditDrafts[id];
  const draft=workoutEditDrafts[id];
  const groups=sortedGroups(w).map(g=>{
    const exercises=sortedExercises(g).map(e=>({id:e.id,name:f2DisplayName(e.name),count:e.seriesCount||e.sets.length||0,reps:e.sets.map(s=>s.reps).filter(Boolean).join("/"),equipment:e.equipment}));
    return {id:g.id,name:f2DisplayName(g.name),exercises,sets:exercises.reduce((n,e)=>n+e.count,0)};
  });
  layout(workoutEditorView({
    id,
    title:f2DisplayName(draft?.name||w.name),
    name:draft?draft.name:w.name,
    description:draft?draft.description:(String(w.description||"").trim()===LEGACY_DESCRIPTION?"":String(w.description||"")),
    level:draft?.level||(WORKOUT_LEVELS.includes(w.level)?w.level:"Personalizado"),
    levels:WORKOUT_LEVELS,
    groups
  }),"training-edit");
}

export function saveMyWorkoutHeader(id){
  const w=getMyWorkout(id); if(!w) return;
  const name=document.getElementById("f2Name")?.value.trim();
  if(!name){ setFieldError("f2Name","Informe o nome do treino."); document.getElementById("f2Name")?.focus(); return; }
  updateWorkoutHeader(w,{name,description:document.getElementById("f2Desc")?.value.trim()||"",level:document.getElementById("f2Level")?.value});
  delete workoutEditDrafts[id];
  go("trainings");
  showSnackbar("Treino salvo");
}

// ---- Menus de ações (bottom sheet)
export function openGroupMenu(wid,gid,index){
  const {w,g}=findGroup(wid,gid); if(!g) return;
  actionSheet({title:esc(f2DisplayName(g.name)),actions:[
    {icon:"edit",label:"Renomear grupo",onSelect:()=>renameMyGroup(wid,gid)},
    {icon:"add",label:"Adicionar exercício",onSelect:()=>addExerciseToMyGroup(wid,gid)},
    {icon:"arrowUpward",label:"Mover para cima",disabled:index===0,onSelect:()=>moveMyGroup(wid,index,-1)},
    {icon:"arrowDownward",label:"Mover para baixo",disabled:index>=w.groups.length-1,onSelect:()=>moveMyGroup(wid,index,1)},
    {icon:"delete",label:"Remover grupo",destructive:true,onSelect:()=>removeMyGroup(wid,gid)}
  ]});
}

export function openExerciseMenu(wid,gid,eid){
  const {g}=findGroup(wid,gid); const sorted=g?sortedExercises(g):[];
  const index=sorted.findIndex(e=>e.id===eid), e=sorted[index]; if(!e) return;
  actionSheet({title:esc(f2DisplayName(e.name)),actions:[
    {icon:"edit",label:"Editar séries e repetições",onSelect:()=>configureMyExercise(wid,gid,eid)},
    {icon:"arrowUpward",label:"Mover para cima",disabled:index===0,onSelect:()=>moveMyExercise(wid,gid,eid,-1)},
    {icon:"arrowDownward",label:"Mover para baixo",disabled:index>=sorted.length-1,onSelect:()=>moveMyExercise(wid,gid,eid,1)},
    {icon:"delete",label:"Remover exercício",destructive:true,onSelect:()=>removeMyExercise(wid,gid,eid)}
  ]});
}

// ---- Grupos
export function addMyGroup(id){
  const w=getMyWorkout(id); if(!w) return;
  const used=new Set(w.groups.map(g=>g.name.toLocaleLowerCase("pt-BR")));
  promptDialog({title:"Novo grupo muscular",label:"Nome do grupo",confirmLabel:"Adicionar",hint:"Escolha uma sugestão ou digite outro nome.",
    suggestions:F2_GROUPS.filter(g=>!used.has(g.toLocaleLowerCase("pt-BR"))),
    onConfirm:name=>{ addGroup(w,name); rerenderWorkoutEditor(id); }});
}

function renameMyGroup(wid,gid){
  const {w,g}=findGroup(wid,gid); if(!g) return;
  promptDialog({title:"Renomear grupo",label:"Nome do grupo",value:g.name,onConfirm:name=>{ renameGroup(w,g,name); rerenderWorkoutEditor(wid); }});
}

function removeMyGroup(wid,gid){
  const {w,g}=findGroup(wid,gid); if(!g) return;
  confirmDialog({title:"Remover grupo?",text:`O grupo <b>${esc(f2DisplayName(g.name))}</b> e seus ${plural(g.exercises.length,"exercício","exercícios")} serão removidos deste treino.`,confirmLabel:"Remover",destructive:true,
    onConfirm:()=>{ removeGroup(w,gid); rerenderWorkoutEditor(wid); }});
}

function moveMyGroup(wid,index,delta){ const w=getMyWorkout(wid); if(!w) return; moveGroup(w,index,delta); rerenderWorkoutEditor(wid); }

// ---- Exercícios
export function addExerciseToMyGroup(wid,gid){
  const {g}=findGroup(wid,gid); if(!g) return;
  exercisePicker={wid,gid,all:uniqueExerciseLibrary(),matches:[],query:""};
  openDialog({title:`Adicionar exercício em ${esc(f2DisplayName(g.name))}`,showConfirm:false,cancelLabel:"Fechar",content:exercisePickerView()});
  filterExercisePicker("");
}

export function filterExercisePicker(value){
  if(!exercisePicker) return;
  const q=String(value||"").trim();
  const {g}=findGroup(exercisePicker.wid,exercisePicker.gid);
  exercisePicker.query=q;
  exercisePicker.matches=searchExerciseLibrary(exercisePicker.all,q,g?.name);
  const exact=exercisePicker.matches.some(e=>e.name.toLowerCase()===q.toLowerCase());
  const box=document.getElementById("exercise-picker-results");
  if(box) box.innerHTML=exercisePickerResultsView(exercisePicker.matches,q,!!q&&!exact);
}

export function chooseExercisePicker(index){
  if(!exercisePicker) return;
  const {wid,gid,matches,query}=exercisePicker;
  const {w,g}=findGroup(wid,gid); if(!g) return;
  const chosen=index>=0?matches[index]:(query?{name:query,section:g.name,sets:"",reps:"",custom:true}:null);
  if(!chosen){ if(query) return chooseExercisePicker(-1); setFieldError("exercise-picker-search","Informe o nome do exercício."); return; }
  const exercise=addExerciseFromLibrary(w,g,chosen);
  exercisePicker=null;
  closeDialog();
  rerenderWorkoutEditor(wid);
  // Exercício sem séries definidas (personalizado ou da biblioteca sem prescrição): pede a configuração.
  if(!exercise.seriesCount) configureMyExercise(wid,gid,exercise.id);
  else showSnackbar(`${f2DisplayName(chosen.name)} adicionado`);
}

function removeMyExercise(wid,gid,eid){
  const {g}=findGroup(wid,gid); const e=g?.exercises.find(x=>x.id===eid); if(!e) return;
  confirmDialog({title:"Remover exercício?",text:`<b>${esc(f2DisplayName(e.name))}</b> será removido deste treino.`,confirmLabel:"Remover",destructive:true,
    onConfirm:()=>{ removeExercise(g,eid); rerenderWorkoutEditor(wid); }});
}

function moveMyExercise(wid,gid,eid,delta){ const {g}=findGroup(wid,gid); if(!g) return; moveExercise(g,eid,delta); rerenderWorkoutEditor(wid); }

export function configureMyExercise(wid,gid,eid){
  const {g}=findGroup(wid,gid); const e=g?.exercises.find(x=>x.id===eid); if(!e) return;
  const currentReps=e.sets[0]?.reps||"";
  openDialog({title:esc(f2DisplayName(e.name)),confirmLabel:"Salvar",content:exerciseSetsDialogView(e.seriesCount||e.sets.length||3,currentReps),
    onConfirm:()=>{
      const count=Number.parseInt(document.getElementById("exercise-sets").value,10);
      if(!Number.isInteger(count)||count<1||count>20){ setFieldError("exercise-sets","Use um valor entre 1 e 20."); return false; }
      configureExerciseSets(e,count,document.getElementById("exercise-reps").value.trim(),currentReps);
      rerenderWorkoutEditor(wid);
    }});
}
