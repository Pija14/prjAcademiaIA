import { completedSetsOf, findHistoryEntry, groupHistoryByMonth, sortedHistory, totalTime } from "../models/historyModel.js";
import { capitalize, f2DisplayName, f2EscapeAttr, monthLabel } from "../utils/format.js";
import { historyView, workoutDetailsView, workoutSummaryText } from "../views/historyView.js";
import { layout } from "../views/layoutView.js";

// Controller do Histórico e dos Detalhes.

const WEEKDAY_SHORT=new Intl.DateTimeFormat("pt-BR",{weekday:"short"});
const FULL_DATE=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

export function renderHistory(){
  const list=sortedHistory();
  const groups=groupHistoryByMonth(list).map(g=>{
    const [y,m]=g.key.split("-").map(Number);
    return {
      label:y?capitalize(monthLabel(y,m-1)):"Sem data",
      items:g.items.map(w=>{
        const [yy,mm,dd]=(w.date||"").split("-").map(Number);
        return {id:w.id,day:dd,weekday:yy?WEEKDAY_SHORT.format(new Date(yy,mm-1,dd)).replace(".",""):"",name:f2DisplayName(w.name),summary:workoutSummaryText(w)};
      })
    };
  });
  layout(historyView({count:list.length,total:totalTime(list),groups}),"history");
}

// "from" define para onde o botão de voltar leva: histórico, início ou o dia no calendário.
export function showWorkoutDetails(id,from="calendar"){
  const h=findHistoryEntry(id);
  if(!h) return;
  const snapshot=h.workoutSnapshot||h;
  const exercises=snapshot.exercises||[];
  const back=from==="history"?"go('history')":from==="home"?"go('home')":`calendarDay('${f2EscapeAttr(h.date)}')`;
  layout(workoutDetailsView({
    back,
    fullDate:h.date?capitalize(FULL_DATE.format(new Date(`${h.date}T12:00:00`))):"",
    name:f2DisplayName(h.name||snapshot.type),
    exercisesCount:h.completedExercises??exercises.length,
    totalTime:h.totalTime,
    totalSets:completedSetsOf(h),
    exercises
  }),from==="history"?"history":from==="home"?"home":"calendar");
}
