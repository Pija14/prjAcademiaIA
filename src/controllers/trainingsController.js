import { aiPlanningIsConfigured } from "../models/aiModel.js";
import { activeWorkouts, archiveWorkout, getMyWorkout, lastWorkoutDate, workoutExerciseCount, workoutSetTotal } from "../models/workoutModel.js";
import { esc, f2DisplayName, relativeDayLabel } from "../utils/format.js";
import { confirmDialog } from "../views/components/dialogs.js";
import { showSnackbar } from "../views/components/snackbar.js";
import { layout } from "../views/layoutView.js";
import { trainingsView } from "../views/trainingsView.js";

// Controller da lista de treinos.

function workoutCardModel(w){
  const lastDate=lastWorkoutDate(w.id);
  return {
    id:w.id,
    name:f2DisplayName(w.name),
    exercises:workoutExerciseCount(w),
    sets:workoutSetTotal(w),
    groups:[...new Set(w.groups.map(g=>f2DisplayName(g.name)).filter(Boolean))],
    lastLabel:lastDate?`Último: ${relativeDayLabel(lastDate).replace(/^./,c=>c.toLocaleLowerCase("pt-BR"))}`:"Ainda não realizado"
  };
}

export function renderTrainings(){
  layout(trainingsView({cards:activeWorkouts().map(workoutCardModel),aiReady:aiPlanningIsConfigured()}),"trainings");
}

export function deleteMyWorkout(id){
  const w=getMyWorkout(id);
  if(!w) return;
  confirmDialog({title:"Excluir treino?",text:`O treino <b>${esc(f2DisplayName(w.name))}</b> será removido de Meus Treinos. Os registros no histórico serão mantidos.`,confirmLabel:"Excluir",destructive:true,onConfirm:()=>{
    archiveWorkout(w);
    renderTrainings();
    showSnackbar("Treino excluído");
  }});
}
