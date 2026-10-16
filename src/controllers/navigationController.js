import { renderAuthScreen } from "./authController.js";
import { renderCalendar } from "./calendarController.js";
import { renderHistory } from "./historyController.js";
import { renderHome } from "./homeController.js";
import { renderTrainings } from "./trainingsController.js";
import { stopIntervals } from "./workoutController.js";
import { getCurrentUser } from "../models/store.js";
import { abandonSession, state } from "../models/workoutSession.js";

// Navegação entre as abas principais. Exige usuário autenticado.
export function go(page){
  if(!getCurrentUser()){
    renderAuthScreen();
    return;
  }
  stopIntervals();
  abandonSession();
  state.page=page; state.training=null;
  if(page==="home")renderHome();
  if(page==="calendar")renderCalendar();
  if(page==="trainings")renderTrainings();
  if(page==="history")renderHistory();
}
