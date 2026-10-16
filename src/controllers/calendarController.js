import { historyForDate, historyForMonth, totalTime } from "../models/historyModel.js";
import { capitalize, f2DisplayName, fmtDuration, monthLabel, pad, todayISO } from "../utils/format.js";
import { calendarView } from "../views/calendarView.js";
import { plural } from "../views/components/common.js";
import { workoutSummaryText } from "../views/historyView.js";
import { layout } from "../views/layoutView.js";

// Controller do Calendário. Mantém o estado de navegação (mês visível e dia selecionado).

let calDate=new Date();
let calSelected=null;
const CAL_DAY_LABEL=new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"long"});
const CAL_SELECTED_LABEL=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long"});

export function renderCalendar(){
  const y=calDate.getFullYear(),m=calDate.getMonth();
  const offset=(new Date(y,m,1).getDay()+6)%7, days=new Date(y,m+1,0).getDate();
  const today=todayISO();
  const prefix=`${y}-${pad(m+1)}-`;
  // Ao trocar de mês, seleciona hoje (se estiver no mês) ou nada.
  if(!calSelected||!calSelected.startsWith(prefix)) calSelected=today.startsWith(prefix)?today:null;
  const monthItems=historyForMonth(prefix);
  const activeDays=new Set(monthItems.map(w=>w.date)).size;
  const cells=Array.from({length:offset},()=>({blank:true}));
  for(let d=1;d<=days;d++){
    const iso=`${prefix}${pad(d)}`;
    cells.push({day:d,iso,count:historyForDate(iso).length,isToday:iso===today,selected:iso===calSelected,future:iso>today,label:CAL_DAY_LABEL.format(new Date(y,m,d))});
  }
  const day=calSelected?{
    label:capitalize(CAL_SELECTED_LABEL.format(new Date(`${calSelected}T12:00:00`))),
    future:calSelected>today,
    items:historyForDate(calSelected).map(w=>({id:w.id,name:f2DisplayName(w.name),summary:workoutSummaryText(w)}))
  }:null;
  layout(calendarView({
    title:capitalize(monthLabel(y,m)),
    summary:monthItems.length?`${plural(monthItems.length,"treino","treinos")} em ${plural(activeDays,"dia","dias")} · ${fmtDuration(totalTime(monthItems))}`:"Nenhum treino neste mês",
    isCurrentMonth:today.startsWith(prefix),
    cells,
    day
  }),"calendar");
}

export function changeMonth(delta){ calDate=new Date(calDate.getFullYear(),calDate.getMonth()+delta,1); renderCalendar(); }

export function calendarToday(){ calDate=new Date(); calSelected=todayISO(); renderCalendar(); }

export function calendarDay(iso){
  const [y,m]=String(iso).split("-").map(Number);
  if(y&&m) calDate=new Date(y,m-1,1);
  calSelected=iso;
  renderCalendar();
}
