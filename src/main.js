import { discardAiPlanDraft, generateAiPlan, pickSheetPhoto, readSheetWithAi, rememberSheetNotes, removeSheetPhoto, renderAiPlanner, saveAiPlanDraft, setAiPlannerModeUi } from "./controllers/aiController.js";
import { authCapsHint, bootApp, handleForgotPassword, handleGoogleUnavailable, handleLoginSubmit, handleRegisterSubmit, handleSessionExpired, logoutUser, toggleAuthMode, togglePassword } from "./controllers/authController.js";
import { calendarDay, calendarToday, changeMonth } from "./controllers/calendarController.js";
import { addExerciseToMyGroup, addMyGroup, chooseExercisePicker, configureMyExercise, createMyWorkoutFromForm, editMyWorkout, filterExercisePicker, openExerciseMenu, openGroupMenu, renderNewWorkout, saveMyWorkoutHeader } from "./controllers/editorController.js";
import { showWorkoutDetails } from "./controllers/historyController.js";
import { go } from "./controllers/navigationController.js";
import { openSettings, saveTrainingSettings } from "./controllers/settingsController.js";
import { deleteMyWorkout, renderTrainings } from "./controllers/trainingsController.js";
import { confirmExitWorkout, startExerciseTimer, startWorkoutById } from "./controllers/workoutController.js";
import { exerciseDBGetAll, exerciseDBSave, exerciseDBSeedFromCurrentData, exerciseLibrarySearch, salvarNovoExercicio } from "./models/exerciseLibraryStore.js";
import { startSync } from "./models/sync.js";
import { setValue, state } from "./models/workoutSession.js";
import { on } from "./utils/events.js";
import { closeDialog, fillDialogField, mdDialogSubmit, mdSheetAction } from "./views/components/dialogs.js";
import { clearFieldError, selectChip, stepNumber } from "./views/components/fields.js";

// Ponto de entrada do PWA (carregado como <script type="module">).
// Responsabilidades: ligar as camadas por eventos, expor as ações usadas pelos handlers inline
// das views e iniciar o app. Nenhuma regra de negócio vive aqui.

// Ações chamadas pelos atributos onclick/onsubmit/oninput das views.
// Esta lista é a API pública da interface: uma função nova usada em um handler precisa entrar aqui.
const UI_ACTIONS={
  // navegação e telas
  go, openSettings, renderTrainings, renderNewWorkout, renderAiPlanner,
  // autenticação
  handleLoginSubmit, handleRegisterSubmit, handleForgotPassword, handleGoogleUnavailable,
  toggleAuthMode, togglePassword, authCapsHint, logoutUser,
  // treinos e editor
  startWorkoutById, editMyWorkout, deleteMyWorkout, createMyWorkoutFromForm, saveMyWorkoutHeader,
  addMyGroup, openGroupMenu, openExerciseMenu, configureMyExercise, addExerciseToMyGroup,
  filterExercisePicker, chooseExercisePicker,
  // execução
  startExerciseTimer, confirmExitWorkout, setValue,
  // histórico e calendário
  showWorkoutDetails, calendarDay, calendarToday, changeMonth,
  // planejador de IA
  generateAiPlan, saveAiPlanDraft, discardAiPlanDraft,
  setAiPlannerModeUi, pickSheetPhoto, removeSheetPhoto, readSheetWithAi, rememberSheetNotes,
  // configurações
  saveTrainingSettings,
  // componentes (campos, chips, diálogos)
  clearFieldError, selectChip, stepNumber, closeDialog, mdDialogSubmit, mdSheetAction, fillDialogField
};
Object.assign(window, UI_ACTIONS);

// API pública da biblioteca de exercícios (IndexedDB), mantida para uso externo/console.
window.ExerciseLibrary = {
  list: exerciseDBGetAll,
  search: exerciseLibrarySearch,
  save: exerciseDBSave,
  create: salvarNovoExercicio,
  seed: exerciseDBSeedFromCurrentData
};

// Model -> controller por eventos (ver docs/adr/0001).
startSync();
on("session:expired", handleSessionExpired);

if("serviceWorker" in navigator){
  // Quando uma versão nova do app assume, recarrega para usar os arquivos novos —
  // exceto durante um treino em andamento (a atualização entra na próxima abertura).
  const hadController=!!navigator.serviceWorker.controller;
  let reloading=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!hadController||reloading||state.workout) return;
    reloading=true;
    location.reload();
  });
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
}

// Módulos são executados após o parse do HTML; o DOM já está pronto aqui.
exerciseDBSeedFromCurrentData().catch(err => console.warn("Biblioteca de exercícios:", err));
bootApp();
