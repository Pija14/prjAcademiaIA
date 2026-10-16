export const APP_VERSION = "v60";

export const DEFAULT_EXERCISE_SECONDS = 60;

export const DEFAULT_REST_SECONDS = 30;

export const KEY = "meuTreinoDataV1";

export const AUTH_TOKEN_KEY = "meuTreinoAccessTokenV1";

export const DEFAULTS = {
  workouts: [],
  users: [],
  currentUserId: null,
  ownerId: null,
  settings: {rest:30, exerciseDuration:60, restDuration:30, weeklyGoal:4, sound:true, vibration:true, theme:"light"},
  excludedExercises: {A:[],B:[],C:[]},
  customExercises: {A:[],B:[],C:[]},
  workoutPlans: {A:null,B:null,C:null},
  workoutNames: {A:"Treino A",B:"Treino B",C:"Treino C"},
  myWorkouts: [],
  workoutHistory: []
};

export const AUTH_TIMEOUT_MS=90000;

export const AUTH_SLOW_HINT_MS=6000;

// Ao abrir o app com sessão salva: tempo máximo esperando o servidor antes de seguir com os dados do aparelho.
export const SESSION_CHECK_TIMEOUT_MS=20000;

export const GOOGLE_GSI_SRC="https://accounts.google.com/gsi/client";

export const F2_GROUPS = ["Peito","Costas","Bíceps","Tríceps","Ombros","Trapézio","Quadríceps","Posterior de coxa","Glúteos","Panturrilhas","Abdômen","Lombar","Antebraços","Adutores","Abdutores"];

export const WORKOUT_LEVELS=["Básico","Intermediário","Avançado","Personalizado"];
