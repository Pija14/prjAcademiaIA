import { TRAININGS } from "../config/exerciseCatalog.js";
import { db, ensurePhase2Data, normalizeWorkout, save } from "./store.js";
import { cloneJSON, uid } from "../utils/format.js";

// Model de treinos ("Meus Treinos"): consultas e operações sobre treinos, grupos musculares e exercícios.
// Nenhuma função aqui toca no DOM; todas persistem por saveMyWorkouts().

function allExerciseLibrary(){
  const base=[];
  Object.entries(TRAININGS).forEach(([code,t])=>t.sections.forEach(s=>s.exercises.forEach((e,i)=>base.push({
    id:`${code}-${s.name}-${i}`, name:e[0], section:s.name, sets:e[1]||"", reps:e[2]||"", source:`Treino ${code}`
  }))));
  Object.entries(db.customExercises||{}).forEach(([code,list])=>list.forEach(e=>base.push({
    id:e.id, name:e.name, section:e.section||"Outros", sets:e.sets||"", reps:e.reps||"", source:`Meus exercícios • ${code}` , custom:true
  })));
  return base;
}

// Biblioteca sem nomes repetidos, usada pela busca de exercícios do editor.
export function uniqueExerciseLibrary(){
  return allExerciseLibrary().filter((e,i,a)=>a.findIndex(x=>x.name.toLowerCase()===e.name.toLowerCase())===i);
}

// Busca na biblioteca priorizando exercícios do grupo muscular informado.
export function searchExerciseLibrary(library,query,groupName="",limit=8){
  const needle=String(query||"").trim().toLowerCase();
  const group=String(groupName||"").toLowerCase();
  return library
    .filter(e=>!needle||e.name.toLowerCase().includes(needle))
    .sort((a,b)=>((b.section||"").toLowerCase()===group)-((a.section||"").toLowerCase()===group)||a.name.localeCompare(b.name,"pt-BR"))
    .slice(0,limit);
}

function parseSetNumber(v){ const m=String(v??"").match(/\d+/); return m?Math.max(1,parseInt(m[0],10)):0; }

function repsForSet(reps,i){ const parts=String(reps||"").split("/").map(x=>x.trim()).filter(Boolean); return parts[i] || parts[parts.length-1] || ""; }

export function getMyWorkout(id){ ensurePhase2Data(); return db.myWorkouts.find(w=>w.id===id); }

export function activeWorkouts(){ ensurePhase2Data(); return db.myWorkouts.filter(w=>w.active!==false); }

export function workoutExerciseCount(w){ return w.groups.reduce((n,g)=>n+g.exercises.length,0); }

export function workoutSetTotal(w){ return w.groups.reduce((n,g)=>n+g.exercises.reduce((m,e)=>m+(e.seriesCount||e.sets.length||0),0),0); }

export function sortedGroups(w){ return w.groups.slice().sort((a,b)=>a.order-b.order); }

export function sortedExercises(g){ return g.exercises.slice().sort((a,b)=>a.order-b.order); }

function saveMyWorkouts(){ db.myWorkouts=db.myWorkouts.map(normalizeWorkout); save(); }

function touch(w){ w.updatedAt=new Date().toISOString(); }

// Data (ISO) da execução mais recente de um treino, ou undefined.
export function lastWorkoutDate(workoutId){ return (db.workouts||[]).filter(x=>x.workoutId===workoutId).map(x=>x.date).sort().pop(); }

// Rotação: sugere o treino ativo feito há mais tempo (ou nunca feito).
export function homeSuggestedWorkout(){
  const active=db.myWorkouts.filter(w=>w.active!==false && workoutExerciseCount(w)>0);
  if(!active.length) return null;
  const last={};
  db.workouts.forEach(x=>{ if(x.workoutId && (!last[x.workoutId] || x.date>last[x.workoutId])) last[x.workoutId]=x.date; });
  return active.slice().sort((a,b)=>(last[a.id]||"").localeCompare(last[b.id]||""))[0];
}

export function flattenMyWorkout(w){
  const out=[];
  sortedGroups(w).forEach(g=>sortedExercises(g).forEach(e=>out.push({
    id:e.id, section:g.name, name:e.name,
    prescribedSets:String(e.seriesCount||e.sets.length||""),
    prescribedReps:e.sets.map(s=>s.reps).filter(Boolean).join("/")||"",
    sets:cloneJSON(e.sets||[]), groupId:g.id
  })));
  return out;
}

// ---- Treinos
export function createWorkout({name,description="",level="Personalizado"}){
  ensurePhase2Data();
  const w=normalizeWorkout({id:uid("treino-"),name,level,description,groups:[]});
  db.myWorkouts.push(w);
  saveMyWorkouts();
  return w;
}

export function addWorkout(plan){ ensurePhase2Data(); db.myWorkouts.push(normalizeWorkout(plan)); saveMyWorkouts(); }

export function updateWorkoutHeader(w,{name,description,level}){
  w.name=name; w.description=description; w.level=level||w.level; touch(w); saveMyWorkouts();
}

// Exclusão lógica: o histórico de execuções continua referenciando o treino.
export function archiveWorkout(w){ w.active=false; touch(w); saveMyWorkouts(); }

// ---- Grupos musculares
export function addGroup(w,name){ w.groups.push({id:uid("grupo-"),name,order:w.groups.length,exercises:[]}); saveMyWorkouts(); }

export function renameGroup(w,g,name){ g.name=name; touch(w); saveMyWorkouts(); }

export function removeGroup(w,gid){ w.groups=w.groups.filter(x=>x.id!==gid); w.groups.forEach((x,i)=>x.order=i); saveMyWorkouts(); }

export function moveGroup(w,index,delta){
  const a=w.groups.sort((x,y)=>x.order-y.order),j=index+delta;
  if(j<0||j>=a.length) return;
  [a[index],a[j]]=[a[j],a[index]]; a.forEach((g,i)=>g.order=i); saveMyWorkouts();
}

// ---- Exercícios
// Adiciona um exercício a partir de um item da biblioteca (ou personalizado). Retorna o exercício criado.
export function addExerciseFromLibrary(w,g,entry){
  const n=parseSetNumber(entry.sets),sets=[];
  for(let i=0;i<n;i++) sets.push({number:i+1,reps:repsForSet(entry.reps,i),weight:"",done:false,completedAt:null});
  const exercise={id:uid("ex-"),name:entry.name,equipment:entry.equipment||"",order:g.exercises.length,seriesCount:n,sets};
  g.exercises.push(exercise); touch(w); saveMyWorkouts();
  return exercise;
}

export function removeExercise(g,eid){ g.exercises=g.exercises.filter(x=>x.id!==eid); g.exercises.forEach((x,i)=>x.order=i); saveMyWorkouts(); }

export function moveExercise(g,eid,delta){
  const a=g.exercises.sort((x,y)=>x.order-y.order),i=a.findIndex(e=>e.id===eid),j=i+delta;
  if(i<0||j<0||j>=a.length) return;
  [a[i],a[j]]=[a[j],a[i]]; a.forEach((e,k)=>e.order=k); saveMyWorkouts();
}

// Define a quantidade de séries e as repetições. Se as repetições mudaram, valem para todas as séries
// ("12/10/8" distribui por série); se não mudaram, só preenchem as séries vazias.
export function configureExerciseSets(e,count,reps,previousReps){
  e.seriesCount=count;
  e.sets=Array.from({length:count},(_,i)=>e.sets[i]||{number:i+1,reps:"",weight:"",done:false,completedAt:null});
  for(let i=0;i<count;i++) e.sets[i].number=i+1;
  if(reps){
    const parts=reps.split("/").map(x=>x.trim()).filter(Boolean);
    if(reps!==previousReps) e.sets.forEach((s,i)=>{ s.reps=parts.length>1?(parts[i]||parts[parts.length-1]):reps; });
    else e.sets.forEach(s=>{ if(!s.reps) s.reps=reps; });
  }
  saveMyWorkouts();
}
