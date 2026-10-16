import { db } from "./store.js";
import { flattenMyWorkout } from "./workoutModel.js";
import { todayISO, uid } from "../utils/format.js";

// Estado da execução de treino em andamento e regras sobre séries.
// Os cronômetros (setInterval) pertencem ao controller; aqui ficam só os dados e as transições.
export const state = { page:"home", training:null, exerciseIndex:0, exerciseTimer:0, exerciseOneMinuteAlerted:false, exerciseRunning:false, exerciseStartedAt:null, currentSetIndex:0, restTimer:0, restRunning:false, timerInterval:null, restInterval:null };

export function currentExercise(){ return state.workout?.exercises?.[state.exerciseIndex]; }

export function exerciseSetCount(e){ const n=parseInt(e?.prescribedSets,10); return Number.isFinite(n) && n>0 ? n : 0; }

// Garante que o exercício tenha um objeto por série prescrita.
export function ensureSets(e,count=exerciseSetCount(e)){
  while(e.sets.length<count) e.sets.push({number:e.sets.length+1,reps:"",weight:"",done:false,completedAt:null});
  return e.sets.slice(0,count);
}

export function allSetsDone(e){ const count=exerciseSetCount(e); if(!count) return false; return ensureSets(e,count).every(s=>s.done); }

export function exerciseReadyForStart(exercise){
  const count=exerciseSetCount(exercise);
  if(!count) return {ok:false,message:"Configure a quantidade de séries para este exercício."};
  const ex=state.workout?.exercises?.[state.exerciseIndex];
  if(!ex) return {ok:false,message:"Exercício inválido."};
  const idx=Math.min(Math.max(state.currentSetIndex,0),count-1), set=ex.sets?.[idx]||{reps:"",weight:""};
  if(!String(set.weight??"").trim()) return {ok:false,message:`Informe a carga da série ${idx+1} antes de iniciar.`};
  if(!String(set.reps??"").trim()) return {ok:false,message:`Informe as repetições da série ${idx+1} antes de iniciar.`};
  return {ok:true,index:idx};
}

export function setValue(i,k,v){ const e=currentExercise(); if(e?.sets?.[i]){ e.sets[i][k]=v; } }

export function resetTimersState(){ state.exerciseRunning=false; state.restRunning=false; }

// Prepara uma nova sessão a partir de um treino de "Meus Treinos". Retorna false se não houver exercícios.
export function beginSession(workout){
  const exercises=flattenMyWorkout(workout);
  if(!exercises.length) return false;
  state.page="workout"; state.training=workout.id; state.workoutDefinitionId=workout.id;
  state.exerciseIndex=0; state.exerciseTimer=0; state.exerciseRunning=false; state.exerciseStartedAt=null;
  state.currentSetIndex=0; state.restTimer=0; state.restRunning=false;
  state.workout={
    id:uid("exec-"), workoutId:workout.id, type:workout.name, date:todayISO(),
    startedAt:new Date().toISOString(), totalTime:0,
    exercises:exercises.map(e=>({...e,duration:0,sets:e.sets.length?e.sets.map(s=>({...s,done:false,completedAt:null})):[]}))
  };
  state.workoutTimerStart=Date.now();
  return true;
}

export function abandonSession(){ state.workout=null; }

export function startSet(index){ state.currentSetIndex=index; state.exerciseTimer=0; state.exerciseRunning=true; state.exerciseStartedAt=Date.now(); }

// Fim do descanso: marca a série atual como concluída e avança.
// Retorna "next-set", "next-exercise" ou "finished".
export function completeCurrentSet(){
  state.restRunning=false; state.restTimer=0;
  const e=currentExercise(), count=exerciseSetCount(e), idx=Math.min(state.currentSetIndex,count-1);
  if(e.sets[idx]){ e.sets[idx].done=true; e.sets[idx].completedAt=new Date().toISOString(); }
  state.exerciseTimer=0; state.exerciseStartedAt=null; state.exerciseOneMinuteAlerted=false;
  e.completed=allSetsDone(e);
  if(!e.completed){ state.currentSetIndex=idx+1; return "next-set"; }
  e.duration=(e.duration||0);
  if(state.exerciseIndex<state.workout.exercises.length-1){
    state.exerciseIndex++; state.currentSetIndex=0; state.exerciseTimer=0; state.exerciseRunning=false;
    return "next-exercise";
  }
  return "finished";
}

// Encerra a sessão e devolve o registro da execução com totais calculados.
export function closeSession(){
  const done=state.workout;
  if(!done) return null;
  done.userId=db.currentUserId||null;
  done.totalTime=Math.round((Date.now()-state.workoutTimerStart)/1000);
  done.endTime=new Date().toISOString();
  done.completedExercises=done.exercises.filter(e=>e.completed).length;
  done.totalSets=done.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);
  state.workout=null;
  return done;
}
