import { go } from "./navigationController.js";
import { lastExerciseRecord, recordCompletedWorkout } from "../models/historyModel.js";
import { getExerciseDuration, getRestDuration } from "../models/settingsModel.js";
import { db } from "../models/store.js";
import { flattenMyWorkout, getMyWorkout } from "../models/workoutModel.js";
import { abandonSession, allSetsDone, beginSession, closeSession, completeCurrentSet, currentExercise, ensureSets, exerciseReadyForStart, exerciseSetCount, resetTimersState, startSet, state } from "../models/workoutSession.js";
import { esc, f2DisplayName, fmt, fmtShort } from "../utils/format.js";
import { confirmDialog } from "../views/components/dialogs.js";
import { showSnackbar } from "../views/components/snackbar.js";
import { layout } from "../views/layoutView.js";
import { workoutCompletionView, workoutView } from "../views/workoutView.js";

// Controller da execução de treino: cronômetros, feedback (som/vibração) e transições de tela.

const PHASES={
  idle:{icon:"play"},
  running:{icon:"timer"},
  resting:{icon:"hourglass"},
  done:{icon:"checkCircle"}
};

export function stopIntervals(){
  if(state.timerInterval) clearInterval(state.timerInterval);
  if(state.restInterval) clearInterval(state.restInterval);
  state.timerInterval=null; state.restInterval=null;
  resetTimersState();
}

function beep(){
  if(!db.settings.sound) return;
  try{
    const c=new(window.AudioContext||window.webkitAudioContext)();
    const o=c.createOscillator(), g=c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.value=880; g.gain.value=.05;
    o.start(); o.stop(c.currentTime+.18);
  }catch(e){}
}

function signalPhaseChange(){
  if(navigator.vibrate&&db.settings.vibration) navigator.vibrate([250,120,250]);
  beep();
}

function updateTimers(){
  const a=document.getElementById("exerciseTimer"); if(a)a.textContent=fmt(state.exerciseTimer);
  const b=document.getElementById("restTimer"); if(b)b.textContent=fmtShort(state.restRunning?state.restTimer:getRestDuration());
  const c=document.getElementById("workoutTimer"); if(c&&state.workoutTimerStart)c.textContent=fmt((Date.now()-state.workoutTimerStart)/1000);
}

export function confirmExitWorkout(){
  confirmDialog({title:"Sair do treino?",text:"O treino em andamento não será salvo.",confirmLabel:"Sair",destructive:true,onConfirm:()=>{ stopIntervals(); abandonSession(); go("home"); }});
}

export function startWorkoutById(id){
  const w=getMyWorkout(id); if(!w) return;
  if(!flattenMyWorkout(w).length) return showSnackbar("Adicione pelo menos um exercício a este treino antes de iniciar.");
  stopIntervals();
  beginSession(w);
  renderWorkout();
}

export function startExerciseTimer(){
  if(state.restRunning||state.exerciseRunning) return;
  const e=currentExercise();
  if(allSetsDone(e)) return;
  const ready=exerciseReadyForStart(e);
  if(!ready.ok){ showSnackbar(ready.message); return; }
  startSet(ready.index);
  startMainTick();
  renderWorkout();
}

// Tique de 100 ms da série em execução; ao atingir a duração configurada, inicia o descanso.
function startMainTick(){
  if(state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval=setInterval(()=>{
    if(state.exerciseRunning&&state.exerciseStartedAt){
      state.exerciseTimer=(Date.now()-state.exerciseStartedAt)/1000;
      if(state.exerciseTimer>=getExerciseDuration()){
        state.exerciseTimer=getExerciseDuration(); state.exerciseRunning=false; state.exerciseStartedAt=null;
        clearInterval(state.timerInterval); state.timerInterval=null;
        signalPhaseChange();
        startRest();
        return;
      }
    }
    updateTimers();
  },100);
}

function startRest(){
  if(state.restRunning) return;
  const e=currentExercise(), count=exerciseSetCount(e);
  if(!count) return;
  ensureSets(e,count);
  state.restRunning=true; state.restTimer=getRestDuration();
  if(state.restInterval) clearInterval(state.restInterval);
  state.restInterval=setInterval(()=>{ state.restTimer-=1; updateTimers(); if(state.restTimer<=0) finishRestAndEnableNextSeries(); },1000);
  renderWorkout();
}

function finishRestAndEnableNextSeries(){
  if(!state.restRunning) return;
  if(state.restInterval) clearInterval(state.restInterval);
  state.restInterval=null;
  const outcome=completeCurrentSet();
  signalPhaseChange();
  if(outcome==="finished") finishWorkout(); else renderWorkout();
}

function workoutViewModel(){
  const e=currentExercise(), all=state.workout.exercises;
  const count=exerciseSetCount(e);
  const sets=count?ensureSets(e,count):[];
  const doneSets=sets.filter(s=>s.done).length;
  const complete=allSetsDone(e);
  const setNo=Math.min(state.currentSetIndex+1,count||1);
  const phase=state.restRunning?"resting":state.exerciseRunning?"running":complete?"done":"idle";
  const phaseLabel={idle:count?`Pronto para a série ${setNo}`:"Séries não configuradas",running:`Série ${setNo} em execução`,resting:"Descansando",done:"Exercício concluído"}[phase];
  const last=lastExerciseRecord(e.name);
  const next=all[state.exerciseIndex+1];
  return {
    workoutName:f2DisplayName(state.workout.type),
    elapsed:(Date.now()-state.workoutTimerStart)/1000,
    exerciseNumber:state.exerciseIndex+1, exerciseTotal:all.length,
    progress:Math.round(((state.exerciseIndex+(count?doneSets/count:0))/all.length)*100),
    phase, phaseIcon:PHASES[phase].icon, phaseLabel,
    section:f2DisplayName(e.section), exerciseName:f2DisplayName(e.name), reps:e.prescribedReps,
    count, setNo, doneSets, exerciseTimer:state.exerciseTimer,
    series:sets.map((s,i)=>s.done?"is-done":i===state.currentSetIndex?`is-current${state.exerciseRunning?" is-running":""}`:""),
    buttonDisabled:complete||state.restRunning||state.exerciseRunning,
    buttonIcon:state.restRunning?"hourglass":state.exerciseRunning?"timer":complete?"check":"play",
    buttonLabel:state.restRunning?"Descansando…":state.exerciseRunning?"Série em execução":complete?"Exercício concluído":state.currentSetIndex>0?`Iniciar série ${setNo}`:"Iniciar série",
    resting:state.restRunning, restSeconds:state.restRunning?state.restTimer:getRestDuration(),
    lastLoads:last&&last.sets?.length?last.sets.map(s=>(s.weight?esc(s.weight)+" kg":"sem carga")).join(" · "):"",
    setsView:{sets,count,current:Math.min(state.currentSetIndex,count-1)},
    nextName:next?f2DisplayName(next.name):""
  };
}

function renderWorkout(){
  layout(workoutView(workoutViewModel()),"home");
  if(state.exerciseRunning) startMainTick();
  updateTimers();
}

function finishWorkout(){
  if(!state.workout) return;
  stopIntervals();
  const done=closeSession();
  recordCompletedWorkout(done);
  renderCompletion(done);
}

function renderCompletion(done){ layout(workoutCompletionView(done)); }
