
## v41 — Refinamento da tela inicial e edição

- Unificação da meta semanal no card de Resumo.
- Unificação do indicador Último Treino com o card de treino recente.
- Calendário ajustado para nomes longos sem extrapolar as células.
- Botão de exclusão dos cards de treino destacado no canto superior direito.
- Campos Nome, Descrição e Nível da edição de treino com padrão visual arredondado e confortável para toque.
# Meu Treino — PWA

Versão 2 corrigida do aplicativo pessoal de treinos A/B/C.

## Correção principal
- Iniciar/Pausar do cronômetro individual funciona sem perder o tempo acumulado.
- Iniciar novamente continua de onde parou.
- Troca de exercício salva o tempo anterior.
- Cronômetro geral permanece independente.
- Cronômetro de descanso é separado.


## Correção v3
Corrigida a tela de execução para preservar as séries e repetições prescritas ao iniciar o treino. O texto "[object Object] × repetições" não deve mais aparecer; exercícios com prescrição exibem, por exemplo, "4 × 12/12/8/8", enquanto exercícios sem prescrição exibem "Séries não informadas".


## Versão v4 — exclusão de exercícios
- Cada exercício pode ser excluído individualmente na tela do Treino A, B ou C.
- A exclusão fica salva no aparelho e permanece após fechar o aplicativo.
- Exercícios excluídos não entram no treino nem no contador de exercícios.
- É possível restaurar todos os exercícios excluídos de um treino.


## Versão v5 — personalização da ficha
- Restaurar exercícios individualmente.
- Restaurar todos os exercícios excluídos.
- Adicionar exercícios manualmente a qualquer treino A/B/C.
- Exercícios personalizados ficam salvos no aparelho.
- Ao adicionar, informar nome, grupo muscular, séries e repetições/tempo.
- Exercícios personalizados entram automaticamente na execução do treino.


## Versão v6 — formulário de exercício
- Substituído o prompt do navegador por uma tela nativa do aplicativo.
- Campos para nome, grupo muscular, séries e repetições/tempo.
- Validação do nome.
- Seleção do grupo muscular baseada no treino.
- Cancelamento sem salvar.

## Versão v27 — múltiplos treinos e histórico automático
- Meus Treinos com quantidade ilimitada de treinos.
- Treino Básico migrado e preservado; Treino B e Treino C também são preservados.
- Hierarquia: treino → grupo muscular → exercício → séries.
- Criação, edição, duplicação, ativação/desativação e organização de treinos.
- Grupos musculares e exercícios organizáveis por treino.
- Carga e repetições independentes por série.
- Validação somente da série que será iniciada.
- Cronômetro fixo de 60s + descanso automático de 30s, com som e vibração.
- Próxima série iniciada somente manualmente.
- Conclusão automática de exercício e treino.
- Histórico de treinos concluídos.
- Calendário marcado automaticamente e detalhes por dia.
- Service Worker/cache atualizado para v27.


## v29 - UX/UI Tela de Treinos
- Cards com cores suaves por nível: Básico azul, Intermediário verde, Avançado amarelo e Personalizado avermelhado.
- Botão `+ Treino`.
- Remoção do título duplicado da área de treinos na tela inicial.
- Exclusão lógica protegida por confirmação, sem apagar histórico.
- Ícone de lixeira separado do clique do card via `stopPropagation`.
- Padronização visual de nomes de treinos, grupos e exercícios.
- Cache do Service Worker atualizado para v29.


## v30 - UX/UI Tela de Edição de Treino
- Removido o botão + da barra superior somente da tela de edição.
- Removido o nível ao lado do nome do treino e o texto de migração da interface.
- Adicionado botão de voltar para Treinos.
- Padronizado o campo Nome.
- Renomeado Grupos Musculares e adicionado botão + somente com ícone.
- Removida a ação Duplicar treino da tela de edição.
- Salvar Treino retorna para a tela de Treinos após salvar.
- Ajustados os textos Adicionar Exercício e Salvar Treino.
- Cache do Service Worker atualizado para v30.


## v31 — Ajustes na tela de execução
- Botão de série centralizado.
- Check de série concluída centralizado e não interativo.
- Textos corrigidos para "Série em Execução", "Iniciar Próxima Série" e "Iniciar Série".
- Removido o texto "30s entre séries" da interface, mantendo o descanso automático de 30 segundos.

## v32 — UX/UI Tela Inicial
- Removido o banner superior com o raio da tela inicial.
- Indicadores reposicionados imediatamente após o cabeçalho.
- `Ver todos` substituído por botão `+` na seção Treinos disponíveis.
- `+` abre uma tela nativa de cadastro de novo treino.
- Cards com `×` vermelho no canto superior direito para exclusão.
- `▶` Iniciar posicionado no canto inferior esquerdo.
- `✎` Editar posicionado no canto inferior direito.
- Mantida a confirmação de exclusão e o histórico dos treinos.
- Layout responsivo para telas pequenas.
- Cache do Service Worker atualizado para v32.

## v34 — Cards sem indicador de nível
- Cards da tela inicial e da tela Treinos alinhados ao design visual de referência.
- Ícone de musculação em bloco azul claro.
- Título e quantidade de exercícios com hierarquia visual maior.
- Nível apresentado como pill quando disponível.
- Marca d'água decorativa construída em SVG/CSS, sem uso da imagem de referência.
- Exclusão com `×` vermelho no canto superior direito.
- `Iniciar` como CTA principal no canto inferior esquerdo.
- `Editar` como ação secundária no canto inferior direito.
- Renderização dos cards centralizada em `f2WorkoutCard()` para evitar duplicação.
- Responsividade refinada para 320px, 350px, 480px e telas maiores.
- Cache do Service Worker atualizado para v33.


### v34
- Removido apenas da apresentação dos cards o indicador visual de nível/dificuldade.
- Mantidos os dados `level` dos treinos e todas as demais funcionalidades.
- Ações ancoradas: Iniciar inferior esquerdo, Editar inferior direito e X superior direito.


## v36 — Campo Nome padronizado
- Campo Nome da tela de edição/novo treino padronizado visualmente com os demais campos do formulário.
- Mantidos dados, navegação e demais funcionalidades.

## v38 — Restauração do módulo "Meus Treinos"

Ao adicionar a tela de login, o bloco da Fase 2 foi perdido do `app.js`: cerca de 44 funções eram chamadas mas não existiam mais, o que derrubava a navegação inferior.

- Restaurado o módulo completo de múltiplos treinos (grupos, exercícios, reordenação, duplicação, exclusão lógica e migração automática de A/B/C).
- Restaurados os helpers de execução (`currentExercise`, `exerciseSetCount`, `stopIntervals`, `updateTimers`, `beep`, `confirmExitWorkout`) e o calendário (`calDate`, `changeMonth`).
- `Treinos` e `Calendário` voltaram a abrir; `Histórico` deixou de quebrar quando há treinos registrados.
- Tela de Configurações reescrita, agora com dados da conta e sair.
- `renderWorkout` não referencia mais a variável inexistente `last`, e o rótulo do treino mostra o nome em vez do id.
- `finishWorkout` compara a chave certa ao detectar execução duplicada.
- `DEFAULTS` passa a declarar `myWorkouts` e `workoutHistory`.
- Removido o listener `DOMContentLoaded` duplicado e a definição duplicada de `exerciseReadyForStart`.
- `clearData` limpa apenas histórico e execuções, sem descartar os treinos cadastrados.
- Definido `setPlanEnabled` e adicionado o campo Nome que a tela legada A/B/C esperava.
- Estilos adicionados para `.f2-actions`, `.groups-title-row`, `.group-add-btn` e `.new-workout-form`.
- Cache do Service Worker atualizado para v38.

## Planejamento com IA e GitHub Pages

O recurso opcional **Planejar com IA** cria uma sugestão de ficha e só a salva após confirmação. A ficha resultante usa a mesma estrutura dos treinos manuais e funciona offline; somente a geração exige internet.

### Publicação

1. Publique esta pasta como a raiz de um repositório GitHub e envie para `main`.
2. Em **Settings → Pages**, escolha **GitHub Actions**. O workflow `.github/workflows/deploy-pages.yml` publica somente os arquivos estáticos da PWA.
3. O arquivo `config.js` contém somente a URL pública do backend e pode ser publicado no GitHub Pages. Nunca inclua chaves de API nele.
4. Como alternativa, a variável de repositório `AI_API_URL` em **Settings → Secrets and variables → Actions → Variables** substitui a URL durante o workflow.
5. Para desenvolvimento local, ajuste `config.js` ou use `config.example.js` com outro backend HTTPS:

```js
window.MEU_TREINO_CONFIG = {
  AI_API_URL: "https://seu-backend.exemplo.com"
};
```

Sem `config.js`, todos os treinos continuam funcionando e apenas a função de IA fica desativada. O arquivo nunca deve conter uma chave de API.

### Backend de IA

GitHub Pages não executa Python ou Node. Hospede `ai-backend` separadamente em um provedor compatível com FastAPI (como Render ou Google Cloud Run).

1. Configure as variáveis de `ai-backend/.env.example` no provedor: `AI_PROVIDER=gemini` ou `openai` e somente a chave correspondente.
2. Em `ALLOWED_ORIGINS`, informe a origem real do GitHub Pages, como `https://usuario.github.io`. Não use `*` em produção.
3. Para executar localmente: em `ai-backend`, crie um ambiente virtual, instale `pip install -r requirements.txt` e execute `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

Nunca envie `.env`, `config.js` ou chaves para o GitHub. O backend inclui validação, timeout e um limite simples de requisições; use também o rate limiting do provedor para produção.

## v40 — Ajustes de navegação e cards

- Ícones SVG do menu inferior centralizados vertical e horizontalmente, com áreas de toque uniformes.
- Botão de exclusão dos cards de treino fixado no canto superior direito, com alvo de toque mínimo de 44px e sem interferir na ação do card.
- Cache do Service Worker e versões dos arquivos `styles.css`/`app.js` atualizados para v40.

## v39 — Redesign visual e sistema de design
- Reescrita completa do `styles.css` em camadas: tokens, reset, tipografia, layout, componentes, telas e responsividade.
- Consolidada a identidade visual em tokens de cor, espaçamento, tipografia, raio e elevação.
- Padronizados cards, listas, formulários, botões, pills, badges, estados vazios e controles do editor.
- Melhorada a leitura da tela de execução com estados visuais `idle`, `running` e `resting` no card principal.
- Botão de série em execução/descanso passou a ter estados visuais distintos sem alterar a lógica dos cronômetros.
- Ícones de navegação e ações substituídos por SVG inline local, mantendo handlers existentes.
- Adicionado foco visível, alvos de toque mínimos, campos de formulário com 16px e suporte a `prefers-reduced-motion`.
- Adicionado tema escuro por tokens via `prefers-color-scheme: dark` e `color-scheme: light dark`.
- Removidos estilos CSS legados sem uso das versões anteriores.
- Mantida a fonte de sistema; nenhuma fonte, CDN ou recurso externo foi adicionado.
- Cache do Service Worker e versões dos arquivos `styles.css`/`app.js` atualizados para v39.

### Observação técnica
- `renderDashboard()` continua presente no `app.js`, mas não é chamado pela navegação atual. Ele foi preservado e não recebeu investimento de redesign, conforme a tarefa.

