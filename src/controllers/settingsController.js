import { APP_VERSION } from "../config/constants.js";
import { getExerciseDuration, getRestDuration, getWeeklyGoal, updateTrainingSettings } from "../models/settingsModel.js";
import { getCurrentUser } from "../models/store.js";
import { setFieldError } from "../views/components/fields.js";
import { showSnackbar } from "../views/components/snackbar.js";
import { layout } from "../views/layoutView.js";
import { settingsView } from "../views/settingsView.js";

// Controller de Configurações.

export function openSettings(){
  const user=getCurrentUser();
  layout(settingsView({
    user,
    initial:(String(user?.name||user?.email||"?").trim()[0]||"?").toLocaleUpperCase("pt-BR"),
    weeklyGoal:getWeeklyGoal(),
    exerciseDuration:getExerciseDuration(),
    restDuration:getRestDuration(),
    version:APP_VERSION
  }));
}

export function saveTrainingSettings(){
  const read=id=>Number.parseInt(document.getElementById(id)?.value,10);
  const result=updateTrainingSettings({exerciseDuration:read("settingExerciseDuration"),restDuration:read("settingRestDuration"),weeklyGoal:read("settingWeeklyGoal")});
  if(!result.ok){
    if(result.errors.exerciseDuration) setFieldError("settingExerciseDuration",result.errors.exerciseDuration);
    if(result.errors.restDuration) setFieldError("settingRestDuration",result.errors.restDuration);
    document.querySelector(".md-field.is-error input")?.focus();
    return;
  }
  openSettings();
  showSnackbar("Configurações salvas");
}
