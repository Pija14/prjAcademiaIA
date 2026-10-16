import { db, save } from "./store.js";
import { cloneJSON, f2DisplayName, isoDate, pad, todayISO, uid } from "../utils/format.js";

// Model de histórico: consultas e agregações sobre treinos concluídos.
// db.workoutHistory = registros de conclusão (Histórico/Calendário); db.workouts = execuções completas (Início, último registro de carga).

function historyEntries(){ return db.workoutHistory||[]; }

export function executions(){ return db.workouts||[]; }

export function findHistoryEntry(id){ return historyEntries().find(x=>x.id===id)||executions().find(x=>x.id===id)||null; }

// Mais recentes primeiro (data, horário de conclusão e ordem de inserção como desempate).
export function sortedHistory(){
  return historyEntries().map((w,i)=>({w,i}))
    .sort((a,b)=>(b.w.date||"").localeCompare(a.w.date||"")||String(b.w.completedAt||"").localeCompare(String(a.w.completedAt||""))||b.i-a.i)
    .map(x=>x.w);
}

export function groupHistoryByMonth(list){
  const groups=[];
  list.forEach(w=>{
    const key=(w.date||"").slice(0,7);
    let g=groups.find(x=>x.key===key);
    if(!g){ g={key,items:[]}; groups.push(g); }
    g.items.push(w);
  });
  return groups;
}

export function totalTime(list){ return list.reduce((s,w)=>s+(w.totalTime||0),0); }

export function historyForDate(iso){ return historyEntries().filter(w=>w.date===iso); }

export function historyForMonth(prefix){ return historyEntries().filter(w=>(w.date||"").startsWith(prefix)); }

// Séries concluídas de um registro: usa o total gravado ou recalcula a partir do snapshot.
export function completedSetsOf(entry){
  const exercises=(entry.workoutSnapshot||entry).exercises||[];
  return entry.totalSets??exercises.reduce((n,e)=>n+(e.sets||[]).filter(s=>s.done).length,0);
}

// ---- Indicadores do Início (baseados nas execuções)
export function weekStartDate(now=new Date()){
  const d=new Date(now); d.setDate(d.getDate()-((d.getDay()+6)%7)); d.setHours(0,0,0,0);
  return d;
}

export function weeklyProgress(goal){
  const today=todayISO();
  const startISO=isoDate(weekStartDate());
  const list=executions().filter(w=>w.date>=startISO && w.date<=today);
  return {count:list.length,goal,trainedDates:new Set(list.map(w=>w.date)),reached:list.length>=goal,remaining:Math.max(0,goal-list.length)};
}

export function monthExecutionCount(prefix){ return executions().filter(w=>w.date.startsWith(prefix)).length; }

export function favoriteWorkout(){
  return db.myWorkouts
    .map(w=>({name:f2DisplayName(w.name),total:executions().filter(x=>x.workoutId===w.id).length}))
    .sort((a,b)=>b.total-a.total).find(x=>x.total>0)||null;
}

export function lastExecution(){ const list=executions(); return list[list.length-1]; }

// Último registro de cargas de um exercício, pelo nome.
export function lastExerciseRecord(name){ return executions().flatMap(w=>w.exercises||[]).slice().reverse().find(x=>x.name===name)||null; }

// Exercícios concluídos por dia do mês: [{day, iso, value}].
export function monthActivity(year,month){
  const daysInMonth=new Date(year,month+1,0).getDate();
  const prefix=`${year}-${pad(month+1)}-`;
  return Array.from({length:daysInMonth},(_,i)=>{
    const iso=`${prefix}${pad(i+1)}`;
    return {day:i+1,iso,value:executions().filter(w=>w.date===iso).reduce((s,w)=>s+(w.completedExercises||0),0)};
  });
}

// Registra uma execução finalizada no histórico, evitando duplicatas (mesmo treino, dia e horário próximo).
export function recordCompletedWorkout(done){
  const duplicate=db.workoutHistory.some(h=>h.workoutId===done.workoutId&&h.executionDate===done.date&&Math.abs(new Date(h.completedAt)-new Date(done.endTime))<60000);
  if(duplicate) return false;
  db.workoutHistory.push({id:uid('hist-'),userId:db.currentUserId||null,workoutId:done.workoutId,name:done.type,date:done.date,executionDate:done.date,startedAt:done.startedAt,completedAt:done.endTime,totalTime:done.totalTime,completedExercises:done.completedExercises,totalSets:done.totalSets,workoutSnapshot:cloneJSON(done)});
  db.workouts.push(done);
  save();
  return true;
}
