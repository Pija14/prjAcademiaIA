import { esc } from "../utils/format.js";
import { subheaderView } from "./components/common.js";
import { chipGroup, numberStepperView } from "./components/fields.js";
import { mdIcon } from "./components/icons.js";

// View de Configurações.

export function settingsView({user,initial,weeklyGoal,exerciseDuration,restDuration,version}){
  return `
    <div class="m3-page settings">
      ${subheaderView({onBack:"go('home')",title:"Configurações"})}

      <section class="settings-account" aria-label="Conta">
        <span class="settings-avatar" aria-hidden="true">${esc(initial)}</span>
        <span class="settings-account-text">
          <b>${esc(user?.name||"—")}</b>
          ${user?.email?`<span>${esc(user.email)}</span>`:""}
        </span>
      </section>

      <section class="m3-card" aria-labelledby="settings-goal-title">
        <h2 id="settings-goal-title" class="m3-card-title">${mdIcon("trophy")}Meta semanal</h2>
        <p class="m3-card-support">Quantos dias por semana você pretende treinar.</p>
        ${chipGroup("settingWeeklyGoal","Dias por semana",[1,2,3,4,5,6,7].map(n=>({value:String(n),label:String(n)})),String(weeklyGoal))}
      </section>

      <section class="m3-card" aria-labelledby="settings-time-title">
        <h2 id="settings-time-title" class="m3-card-title">${mdIcon("timer")}Tempos do treino</h2>
        <p class="m3-card-support">Duração de cada série e do descanso automático entre elas.</p>
        ${numberStepperView({id:"settingExerciseDuration",label:"Série",value:exerciseDuration,hint:"Entre 5 e 600 segundos.",step:5,min:5,max:600,suffix:"s",unitLabel:"segundos"})}
        ${numberStepperView({id:"settingRestDuration",label:"Descanso",value:restDuration,hint:"Entre 5 e 600 segundos.",step:5,min:5,max:600,suffix:"s",unitLabel:"segundos"})}
      </section>

      <button class="md-filled-button" onclick="saveTrainingSettings()">${mdIcon("check")}<span>Salvar configurações</span></button>

      <section class="m3-list-section" aria-label="Sessão">
        <div class="m3-list">
          <button class="m3-list-item settings-logout" onclick="logoutUser()">
            <span class="settings-row-icon">${mdIcon("logout")}</span>
            <span class="m3-list-text"><span class="m3-list-title">Sair da conta</span><span class="m3-list-support">Você poderá entrar novamente a qualquer momento.</span></span>
          </button>
        </div>
      </section>
      <p class="settings-version">Meu Treino · ${version}</p>
    </div>`;
}
