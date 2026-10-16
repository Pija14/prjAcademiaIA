import { DEFAULT_EXERCISE_SECONDS, DEFAULT_REST_SECONDS } from "../config/constants.js";
import { db, save } from "./store.js";

// Model de configurações do usuário: leitura com valores padrão e atualização validada.

export function getExerciseDuration(){const n=Number(db.settings?.exerciseDuration);return Number.isFinite(n)&&n>0?n:DEFAULT_EXERCISE_SECONDS;}

export function getRestDuration(){const n=Number(db.settings?.restDuration ?? db.settings?.rest);return Number.isFinite(n)&&n>0?n:DEFAULT_REST_SECONDS;}

export function getWeeklyGoal(){ return Number(db.settings.weeklyGoal)||4; }

// Valida e grava. Retorna { ok, errors } com mensagens por campo.
export function updateTrainingSettings({exerciseDuration,restDuration,weeklyGoal}){
  const errors={};
  if(!Number.isFinite(exerciseDuration)||exerciseDuration<5||exerciseDuration>600) errors.exerciseDuration="Use um valor entre 5 e 600 segundos.";
  if(!Number.isFinite(restDuration)||restDuration<5||restDuration>600) errors.restDuration="Use um valor entre 5 e 600 segundos.";
  if(!Number.isInteger(weeklyGoal)||weeklyGoal<1||weeklyGoal>7) errors.weeklyGoal="Escolha de 1 a 7 dias.";
  if(Object.keys(errors).length) return {ok:false,errors};
  db.settings.exerciseDuration=exerciseDuration;
  db.settings.restDuration=restDuration;
  db.settings.rest=restDuration;
  db.settings.weeklyGoal=weeklyGoal;
  save();
  return {ok:true,errors};
}
