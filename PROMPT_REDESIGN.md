# Prompt — Redesign visual do PWA "Meu Treino"

> Cole o conteúdo abaixo da linha em um agente de código trabalhando na raiz deste repositório.

---

## Material de apoio já gerado

Antes de escrever qualquer CSS, use estes dois artefatos — eles substituem suposição por medição:

- **`screens/`** — o HTML real de 24 telas, extraído carregando o `app.js` verdadeiro num DOM simulado com dados semeados. Inclui os três estados da execução, estados vazios e estados com dados. `screens/_index.json` traz o índice com as classes de cada tela e o conjunto das 102 classes que realmente aparecem renderizadas. Leia o HTML da tela antes de estilizá-la.
- **`check-acceptance.js`** — verificador determinístico dos critérios de aceite: paridade de classes nas duas direções, pureza dos tokens, contagem de `!important` e de breakpoints, foco visível, tema escuro, `prefers-reduced-motion`, zoom do iOS, ausência de recursos externos, versões de cache e assinatura de comportamento contra linha de base. Rode `node check-acceptance.js` a cada iteração. **Hoje o placar é 5/20.** A entrega precisa fechar em 20/20.

Os caminhos exatos desses arquivos são informados junto com a tarefa.

## Papel

Você é designer de produto e desenvolvedor front-end sênior. Sua especialidade é criar sistemas de design enxutos em CSS puro para aplicações mobile-first, e você trata acessibilidade e consistência como requisito, não como enfeite.

## Objetivo

Redesenhar toda a camada visual do PWA **Meu Treino** (aplicativo pessoal de musculação, em português do Brasil) para que fique **padronizada, profissional e moderna**, sem alterar nenhuma regra de negócio, fluxo de navegação ou estrutura de dados.

O resultado deve parecer um produto único e deliberado, não uma sequência de telas construídas em momentos diferentes — que é exatamente o que ele é hoje.

---

## Restrições inegociáveis

Estas condições vêm da arquitetura do projeto. Violá-las quebra a aplicação.

1. **Sem build, sem framework, sem npm.** O app é HTML + CSS + JavaScript puro servido estaticamente no GitHub Pages. Não introduza Tailwind, Sass, PostCSS, bundler ou qualquer dependência que exija compilação.
2. **Sem recursos externos.** É um PWA offline-first. O `sw.js` só faz cache de requisições same-origin, então Google Fonts, CDNs de ícones e folhas de estilo remotas quebram o modo offline e ficam com fallback silencioso. Tudo precisa ser local: fonte de sistema ou `@font-face` com arquivo versionado no repositório.
3. **Toda a estilização vive em `styles.css`.** Não crie arquivos CSS adicionais (o workflow `.github/workflows/deploy-pages.yml` copia uma lista fixa de arquivos; um `.css` novo não seria publicado). Não injete estilo por JavaScript e não use estilos inline novos.
4. **O HTML é gerado por template string dentro de `app.js`.** Cada tela é uma função `renderX()` que monta uma string e atribui a `#app.innerHTML`. Consequência: **renomear uma classe no CSS exige a edição correspondente em `app.js`**. Se renomear, renomeie nos dois lugares e confirme com `grep`.
5. **Não altere comportamento.** Nenhuma mudança em cronômetros, validações, persistência (`localStorage` / IndexedDB), autenticação, integração com o backend de IA ou navegação. Se um ajuste visual exigir mudança estrutural no markup gerado, altere apenas o markup — nunca a lógica ao redor dele.
6. **Handlers inline (`onclick=`, `onchange=`) devem continuar funcionando.** Não converta para `addEventListener`.
7. **Ao terminar, incremente a versão de cache:** `CACHE` em `sw.js` e as query strings `?v=` de `styles.css` e `app.js` em `index.html`. Sem isso, usuários instalados continuam vendo a versão antiga.
8. **Idioma:** toda a interface em pt-BR. Textos com acento e nomes longos de exercício ("Puxador triangular ART", "Crucifixo aberto inclinado") precisam caber sem estourar o layout.

---

## Diagnóstico do estado atual

Auditoria do `styles.css` (479 linhas, mas a linha 2 sozinha tem 8.534 caracteres):

| Métrica | Hoje | Problema |
|---|---|---|
| Variáveis CSS declaradas | 10 | insuficiente para o que o app precisa |
| Cores hexadecimais literais | 56 | valores soltos fora do sistema de tokens |
| Valores distintos de `border-radius` | 17 (10…30, 99, 999) | nenhuma escala |
| Valores distintos de `font-size` | 23 (8px a 48px) | nenhuma escala tipográfica |
| Declarações `padding` distintas | 41 | espaçamento improvisado tela a tela |
| `!important` | 19 | sintoma de especificidade fora de controle |
| Breakpoints | 6 (350, 380, 400, 440, 480, 621px) | ad hoc, definidos por sintoma |
| `:focus-visible` | 1 ocorrência, contra 5 `outline:none` | navegação por teclado praticamente invisível |
| `prefers-color-scheme` | 0 | sem tema escuro |
| `prefers-reduced-motion` | 0 | animações não respeitam a preferência do sistema |
| `color-scheme` | 0 | controles nativos sempre claros |

Dois achados específicos:

- **A fonte Inter é declarada em `font-family` mas nunca é carregada.** Não há `@font-face` nem `<link>`. O app inteiro renderiza em `system-ui` por acidente. Decida conscientemente: ou embarque a fonte como arquivo local, ou adote uma pilha de fontes de sistema e remova a menção a Inter.
- **Existem quatro padrões de card concorrentes** (`.training-card`, `.dashboard-card`, `.settings-card`, `.list-card`) e três tratamentos diferentes de estado vazio (`.empty`, `.empty.big`, `.empty-state`), cada um com raio, sombra e padding próprios.

### Classes renderizadas que NÃO têm nenhuma regra de CSS

Estas 7 classes aparecem no HTML realmente renderizado e não existe uma única regra para elas em `styles.css`. Os elementos correspondentes estão hoje sem estilo algum:

```
edit-back        edit-detail-head   empty-state    monthly-summary
recent-workout   summary-chart      top-add
```

Isso significa que o botão de voltar do editor, o cabeçalho das telas de edição, o estado vazio da tela inicial, a seção de histórico mensal, o card de último treino, o gráfico de barras e o botão `＋` da barra superior estão todos herdando apenas estilo de elemento. Trate cada um como componente novo a projetar, não como ajuste.

### O markup não expõe o estado da execução

Descoberta crítica para a tela mais importante do app. Extraindo o HTML gerado nos três estados da execução, a diferença entre *série em execução* e *descanso* é **exclusivamente o texto do botão**:

```html
<!-- em execução -->
<button class="timer-start" onclick="startExerciseTimer()" disabled>⏱ Série em Execução</button>
<!-- em descanso -->
<button class="timer-start" onclick="startExerciseTimer()" disabled>⏳ Descanso...</button>
```

Mesma classe, mesmo `disabled`, nenhum atributo de estado. **O CSS não tem como diferenciar os três estados hoje** — nenhum seletor consegue alcançá-los.

Portanto, diferenciar visualmente os estados exige adicionar um gancho no markup gerado por `renderWorkout()` — por exemplo `data-state="idle|running|resting"` no `.focus-card` ou num contêiner acima dele. Isso é alteração de markup, permitida pela restrição 5, e é a única forma de cumprir o requisito de leitura de estado em menos de um segundo. Faça essa alteração e estilize a partir do atributo.

### CSS morto (remover)

Estas 49 classes têm regras em `styles.css` e não são citadas em nenhum lugar de `app.js`. São resquícios de telas que não existem mais — cerca de um terço do arquivo:

```
calendar-summary  card-top  compact  complete-exercise  config-label
dashboard-recent  dashboard-section  delete-exercise  division-card
division-grid  division-head  excluded-row  excluded-section
exercise-create-box  exercise-library-card  exercise-picker
exercise-picker-backdrop  exercise-picker-close  exercise-picker-dialog
exercise-picker-head  exercise-picker-subtitle  exercise-picker-title
exercise-start-error  hero  hero-icon  home-add-btn  home-training-head
icon-action  library-empty  library-header  library-item  library-list
library-refresh  library-search  library-subtitle  library-title
manual-set  nav-ex  picker-item  register-box  rest-countdown-alert
restore-exercise  section-title-row  seg  training-tools  workout-config
workout-config-backdrop  workout-config-dialog  workout-config-name
```

Antes de apagar cada uma, confirme com `grep -n "nome-da-classe" app.js`. Atenção a dois casos: `.hero` e `.hero-icon` são o banner escuro da tela inicial, removido na v32 — só mantenha se decidir reaproveitar o tratamento visual; `.seg`, `.register-box` e `.nav-ex` pertenciam a telas que não existem mais.

> Observação: `renderDashboard()` em `app.js` é uma tela completa que nunca é chamada por nada. Não invista esforço de design nela. Reporte a existência dela ao final e deixe a decisão de remover para o dono do projeto.

---

## Direção de design

### Personalidade

Um caderno de treino digital: **preciso, silencioso e legível sob esforço físico**. A referência não é um app social de fitness cheio de gamificação — é um instrumento. Pense em cronômetro de competição, não em rede social.

Três princípios, nesta ordem de prioridade:

1. **Legibilidade em movimento vence densidade.** A tela de execução é usada com o celular apoiado no banco, a um braço de distância, entre séries, com a visão cansada. Números grandes, contraste alto, alvos generosos.
2. **Hierarquia por peso e espaço, não por cor.** Cor é reservada para significado (progresso, alerta, conclusão). Diferenciação visual vem de tamanho, peso tipográfico e espaço em branco.
3. **Consistência acima de invenção.** Um botão secundário tem exatamente a mesma aparência nas nove telas. Uma lista tem um formato só.

### Hierarquia das telas

Nem toda tela merece o mesmo esforço. Ordene assim:

1. **Execução do treino** (`renderWorkout`) — o momento central do produto. Precisa ser a tela mais bem resolvida do app.
2. **Meus Treinos** (`renderTrainings`) — a vitrine; é o que o usuário vê ao decidir treinar.
3. **Início** (`renderHome`) — painel de acompanhamento.
4. **Edição de treino** (`editMyWorkout`) — trabalho denso, muitos controles pequenos.
5. Calendário, Histórico, Detalhes, Configurações, Login, Planejador de IA.

---

## Sistema de design a construir

Defina tudo em `:root` no topo de `styles.css`, antes de qualquer regra. **Nenhum valor literal de cor, raio, sombra ou espaçamento deve aparecer fora dessa declaração.**

### Cor

Construa uma escala real, não cores avulsas. Mínimo necessário:

- **Neutros:** 8 a 10 degraus, de fundo de página até tinta primária. Hoje existem `--bg #f5f7fa`, `--ink #17212b`, `--muted #71808c`, `--line #e3e8ed`, `--card #fff` — trate-os como âncoras e preencha os degraus intermediários.
- **Acento (progresso/sucesso):** o verde atual (`--accent #22c55e`, `--accent2 #16a34a`, `--soft #eaf7ef`) é a identidade do app. Mantenha a matiz e derive uma escala completa com degraus para fundo, borda, texto e estado ativo.
- **Semânticos:** perigo (`--danger #dc2626` existe), atenção e informação. Cada um precisa do trio fundo/borda/texto para poder ser usado em avisos sem improviso.
- **Superfícies:** separe `--surface` (card), `--surface-raised` e `--surface-sunken`. Hoje tudo é `#fff` ou um cinza aleatório.

Todo par texto/fundo precisa atingir **4.5:1** (WCAG AA); texto grande e elementos de interface, **3:1**. Verifique explicitamente os casos que hoje são frágeis: `--muted` sobre `--card`, e o verde sobre `--soft`.

### Tema escuro

Implemente via tokens. Defina a paleta clara em `:root` e sobrescreva **apenas as variáveis** dentro de `@media (prefers-color-scheme: dark)`. Adicione `color-scheme: light dark` para que inputs, selects e scrollbars nativos acompanhem. Nenhuma cor pode existir somente dentro do bloco escuro. Atualize `<meta name="theme-color">` em `index.html` e `theme_color`/`background_color` em `manifest.json` de forma coerente.

### Espaçamento

Escala única de base 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Todo padding, margin e gap sai daí. Isso substitui as 41 declarações de padding atuais.

### Tipografia

Escala fechada de no máximo 7 tamanhos. Sugestão de ponto de partida, ajuste com critério:

| Token | Uso |
|---|---|
| `--text-2xs` 11px | eyebrow, metadados |
| `--text-xs` 12px | legendas, `small` |
| `--text-sm` 13px | texto de apoio |
| `--text-base` 15px | corpo, inputs |
| `--text-lg` 18px | título de card |
| `--text-xl` 24px | título de tela |
| `--text-display` 48px+ | cronômetro |

Regras firmes:
- **Todo número que muda no tempo ou representa medida usa `font-variant-numeric: tabular-nums`**: cronômetros, cargas, contagem de séries, tempo total. Sem isso o cronômetro "treme" a cada segundo. Hoje só `.big-timer` e alguns pontos têm isso — deve ser universal.
- Máximo de 3 pesos (por exemplo 400 / 600 / 800). Hoje há uso indiscriminado de 700, 800 e 900.
- Altura de linha: 1.2 para títulos, 1.5 para texto corrido.
- Nomes longos de exercício precisam de estratégia definida de overflow — quebra em duas linhas com `line-clamp` ou reticências. Escolha uma e aplique em todas as listas.

### Raio e elevação

Substitua os 17 raios por no máximo 4 tokens (ex.: `--r-sm` 8px, `--r-md` 12px, `--r-lg` 20px, `--r-full` 999px), e defina uma escala de 3 sombras. Card, botão e input precisam ter relação de raio coerente — hoje um card de raio 20 contém um input de raio 10 e um botão de raio 14, sem intenção.

### Movimento

Transições curtas (120–200ms) e apenas em `transform`, `opacity`, `background-color` e `border-color`. Nunca anime largura, altura ou posição de layout. Envolva tudo em:

```css
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important } }
```

---

## Componentes a padronizar

Para cada item: defina **uma** aparência e aplique em todas as ocorrências.

**Botões** — `.primary`, `.secondary`, `.danger`, `.timer-start`, `.iconbtn`, `.back`, `.full`. Padronize altura mínima (44px, 52px para o CTA da tela de execução), raio, peso tipográfico e os estados `:hover`, `:active`, `:focus-visible` e `:disabled`. Hoje `disabled` mal se distingue do estado normal — é grave, porque o botão de iniciar série fica desabilitado durante o descanso e o usuário precisa entender o porquê.

**Cards** — unifique `.training-card`, `.dashboard-card`, `.settings-card` e `.list-card` sob um mesmo padrão de superfície (mesma borda, raio, sombra e padding), com modificadores para as variações que realmente precisam diferir.

**Campos de formulário** — `input`, `select`, `textarea` dentro de `.settings-card`, `.new-workout-form`, `.exercise-form`, `.auth-field` e `.set-row`. Mesma altura, mesmo raio, mesmo tratamento de foco, mesmo rótulo. Hoje cada tela resolveu do seu jeito.

**Estados vazios** — um único componente. Hoje são três (`.empty`, `.empty.big`, `.empty-state`). Ícone ou glifo discreto, frase curta e, quando houver, uma ação.

**Listas e linhas** — `.exercise-row`, `.list-card`, `.set-row` seguem o mesmo ritmo vertical e o mesmo separador.

**Navegação inferior** — `.bottomnav`. Mantenha `position:fixed`, a largura `min(620px,100%)`, o `padding-bottom: env(safe-area-inset-bottom)` e o comportamento de `.active`. Os glifos atuais são caracteres de texto (`⌂ ▦ 💪 ◷`), visualmente inconsistentes entre si e entre sistemas operacionais: substitua por SVG inline com traço uniforme, definidos uma vez e reaproveitados. O mesmo vale para os ícones de ação `↑ ↓ ✎ × ＋ ▶ ⚙`.

**Pills e badges** — `.pill`, `.badge`, `.dashboard-chip`, `.exercise-count` viram uma família só.

---

## Tela a tela

**Execução do treino (`renderWorkout`)** — a mais importante. O cronômetro é o elemento dominante da tela. O estado precisa ser lido em menos de um segundo à distância de um braço: *em execução*, *em descanso* ou *aguardando início*. Diferencie esses três estados por algo mais forte que o texto do botão — cor de superfície, borda ou progresso visual. A barra `.workout-progress` e o contador "Exercício N de M" formam a orientação de percurso. A tabela de séries (`.set-row`: número, reps, carga, check) precisa de campos confortáveis para digitar com o polegar e um check de conclusão inequívoco.

**Meus Treinos (`renderTrainings`)** — cards `.f2-card`, com marca d'água SVG, botão `×` de exclusão no topo direito e ações Iniciar/Editar na base. A marca d'água atual compete com o conteúdo; resolva o contraste. Garanta que o `×` tenha alvo de toque adequado sem colidir com o clique do card.

**Início (`renderHome`)** — painel com `.dashboard-main` (card escuro em gradiente), grade de 4 indicadores e o gráfico de barras `#monthlyChart`, que é construído em `.chart-bar` com altura inline. Dê ao gráfico eixo, escala legível e um estado vazio decente.

**Edição de treino (`editMyWorkout`)** — a tela mais densa: grupos musculares, exercícios e quatro botões de ação por linha (`↑ ↓ ✎ ×`). Priorize hierarquia clara entre grupo e exercício, e alvos de toque que não se atropelem em telas de 320px.

**Calendário (`renderCalendar`)** — grade de 7 colunas, células `.cal-day` com marcação de treino concluído. Em 320px cada célula tem menos de 40px: resolva a densidade sem perder a informação de duração.

**Login (`renderAuthScreen`)** — primeira impressão do produto. Hoje é a tela mais bem resolvida; use-a como referência de qualidade para as demais.

**Conclusão (`renderCompletion`)** — momento de recompensa. É o único lugar onde um pouco de celebração visual se justifica.

---

## Acessibilidade

Requisitos, não sugestões:

- **Foco visível em todo elemento interativo.** Remova os cinco `outline:none` ou compense cada um com um anel de foco `:focus-visible` de contraste mínimo 3:1. Hoje quem navega por teclado fica perdido.
- **Alvo de toque mínimo de 44×44px** para tudo que é clicável, incluindo os ícones pequenos do editor e o `×` dos cards.
- Os atributos `aria-label`, `role`, `tabindex` e `aria-live` já presentes no markup gerado **devem ser preservados** em qualquer reescrita.
- Nenhuma informação transmitida apenas por cor. O check de série concluída precisa de forma além de cor.
- Respeite `prefers-reduced-motion`.
- Campos de formulário precisam de `font-size` de no mínimo 16px: abaixo disso o Safari no iOS aplica zoom automático ao focar o input e desalinha o layout.

---

## Como executar

1. **Leia antes de escrever.** Percorra `app.js` inteiro e liste as classes efetivamente usadas em cada tela antes de tocar no CSS.
2. **Reescreva `styles.css` do zero, em camadas comentadas e legíveis:** tokens → reset → tipografia → layout (shell, topbar, nav) → componentes → telas → utilitários → media queries. Uma regra por linha. A linha de 8.534 caracteres não pode sobreviver.
3. **Consolide para no máximo 3 breakpoints.** Sugestão: ~360px (telas pequenas), ~480px (limite do celular) e 621px+ (a partir da largura do shell). Escreva mobile-first, com `min-width`.
4. **Trabalhe tela por tela, na ordem de prioridade acima.** Não faça uma varredura global de find-and-replace.
5. Se precisar alterar markup em `app.js`, altere **apenas** atributos de classe e estrutura de elementos — nunca lógica, nunca texto visível ao usuário, nunca handlers.
6. Incremente `CACHE` em `sw.js` e as query strings `?v=` em `index.html`.
7. Documente o que mudou em `README.md`, seguindo o formato das entradas de versão existentes.

## Critérios de aceite

Verificáveis um a um. Entregue confirmando cada item:

- [ ] `node --check app.js` passa.
- [ ] Nenhuma classe referenciada em `app.js` ficou sem definição no CSS, e nenhuma classe do CSS ficou sem uso. Comprove com `grep`.
- [ ] Nenhum valor literal de cor, raio, sombra ou espaçamento fora do bloco `:root`.
- [ ] Zero `!important` (ou uma lista curta de exceções, cada uma justificada).
- [ ] No máximo 3 breakpoints.
- [ ] Todo elemento interativo tem `:focus-visible` visível e alvo de ≥44px.
- [ ] Tema escuro funcional, definido só por sobrescrita de variáveis.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Sem regressão de layout em 320, 360, 414 e 768px de largura.
- [ ] Sem nenhuma requisição de rede nova; o app continua funcional offline.
- [ ] Cache do Service Worker e query strings incrementados.
- [ ] Nenhuma mudança de comportamento: cronômetros, validações, persistência, autenticação e navegação idênticos.
