import { aiPlanningIsConfigured } from "../models/aiModel.js";
import { executions, favoriteWorkout, lastExecution, monthActivity, monthExecutionCount, totalTime, weekStartDate, weeklyProgress } from "../models/historyModel.js";
import { db, ensurePhase2Data, getCurrentUser } from "../models/store.js";
import { activeWorkouts, homeSuggestedWorkout, workoutExerciseCount } from "../models/workoutModel.js";
import { capitalize, f2DisplayName, isoDate, relativeDayLabel, todayISO } from "../utils/format.js";
import { plural } from "../views/components/common.js";
import { homeView } from "../views/homeView.js";
import { layout } from "../views/layoutView.js";

// Controller da tela Início: monta o view-model a partir dos models e renderiza.

const WEEK_LABELS=["S","T","Q","Q","S","S","D"];
const WEEK_NAMES=["segunda","terça","quarta","quinta","sexta","sábado","domingo"];
const MONTH_NAME=new Intl.DateTimeFormat("pt-BR",{month:"long"});
const HOME_DATE=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long"});

function homeGreeting(){ const h=new Date().getHours(); return h<5?"Boa noite":h<12?"Bom dia":h<18?"Boa tarde":"Boa noite"; }

function homeHeroText(week){
  if(week.reached){
    const extra=week.count-week.goal;
    return extra>0?`Meta batida com ${plural(extra,"treino extra","treinos extras")}. Excelente semana!`:"Meta da semana batida. Excelente trabalho!";
  }
  if(week.count===0) return `Sua meta é de ${plural(week.goal,"treino","treinos")}. Que tal começar hoje?`;
  return `${week.remaining===1?"Falta 1 treino":`Faltam ${week.remaining} treinos`} para bater sua meta.`;
}

function homeViewModel(){
  ensurePhase2Data();
  const now=new Date(), today=todayISO();
  const user=getCurrentUser();
  const progress=weeklyProgress(Number(db.settings.weeklyGoal)||4);
  const start=weekStartDate(now);
  const days=WEEK_LABELS.map((label,i)=>{
    const d=new Date(start); d.setDate(d.getDate()+i);
    const iso=isoDate(d);
    return {label,name:WEEK_NAMES[i],day:d.getDate(),iso,done:progress.trainedDates.has(iso),isToday:iso===today,future:iso>today};
  });
  const week={...progress,days};
  const suggested=homeSuggestedWorkout();
  const recent=lastExecution();
  const favorite=favoriteWorkout();
  return {
    dateLine:capitalize(HOME_DATE.format(now)),
    greeting:homeGreeting(),
    firstName:String(user?.name||"").trim().split(/\s+/)[0]||"",
    monthName:MONTH_NAME.format(now),
    week,
    heroText:homeHeroText(week),
    suggested:suggested?{id:suggested.id,name:f2DisplayName(suggested.name)}:null,
    aiReady:aiPlanningIsConfigured(),
    stats:{monthCount:monthExecutionCount(today.slice(0,7)),totalTime:totalTime(executions()),favorite:favorite?.name||""},
    recent:recent?{id:recent.id,name:f2DisplayName(recent.type),totalTime:recent.totalTime,exercises:recent.completedExercises||0,dateLabel:relativeDayLabel(recent.date)}:null,
    quick:activeWorkouts().map(w=>({id:w.id,name:f2DisplayName(w.name),exercises:workoutExerciseCount(w)})),
    activity:{days:monthActivity(now.getFullYear(),now.getMonth()),month:now.getMonth(),monthName:MONTH_NAME.format(now),today}
  };
}

export function renderHome(){ layout(homeView(homeViewModel()),"home"); }
