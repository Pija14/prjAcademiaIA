# 0001 — Frontend em MVC com módulos ES nativos

Status: aceito
Data: 2026-10-16

## Contexto

O PWA inteiro vivia em um único `app.js` com ~2.300 linhas, 220 declarações de topo e estado global compartilhado (`db`, `state`, `authMode`, `calDate`…). Telas misturavam três responsabilidades na mesma função: ler/alterar dados, montar HTML e tratar eventos. Consequências observadas:

- Qualquer mudança exigia navegar o arquivo todo; não havia fronteira entre dados e interface.
- ~30 funções estavam inalcançáveis (sistema antigo de treinos A/B/C, exportação sem botão, stubs vazios como `stopRest(){return;}`) e continuavam sendo carregadas e mantidas.
- A camada de dados chamava a interface diretamente (ex.: a sincronização chamava `renderAuthScreen()` ao receber 401).

Forças e restrições (ver skill `arquiteto-software`):

1. Sem build obrigatório: o app é publicado como arquivos estáticos no GitHub Pages.
2. Offline-first: todo arquivo novo precisa entrar no cache do `sw.js`.
3. Handlers inline (`onclick="go('home')"`) são o padrão das views e precisam continuar funcionando.
4. O contrato de dados com o backend (`/state`, campos legados `excludedExercises`, `workoutPlans`…) não pode mudar.

## Opções consideradas

**A. Vários `<script>` clássicos por pasta, compartilhando o escopo global.** Menor risco, mas não é modularização de fato: continua tudo global, sem dependências explícitas, e a ordem dos scripts vira uma dependência implícita.

**B. Módulos ES nativos (`<script type="module">`) organizados em MVC.** Dependências explícitas via `import`/`export`, estado encapsulado no módulo dono, zero build. Exige um registro explícito das funções usadas pelos handlers inline e a inclusão dos arquivos no cache do service worker e no deploy.

**C. Framework ou bundler (React, Vite).** Resolveria a organização, mas viola a restrição de "sem build", exige reescrever todas as telas e muda o deploy. Custo desproporcional.

## Decisão

Opção **B**. Estrutura:

```
src/
  main.js              Composição: inicializa, liga eventos entre camadas e expõe as ações da UI
  config/              Constantes e catálogo de exercícios (sem lógica)
  utils/               Funções puras de formatação e o barramento de eventos
  models/              Dados e regras de negócio — nunca tocam no DOM
  views/               Templates (funções que retornam HTML) e componentes de UI
    components/        Ícones, campos, diálogos, snackbar
  controllers/         Orquestram: leem models, chamam views, tratam ações do usuário
```

Regras de dependência (verificadas por script durante a refatoração):

- `models` → só `config`, `utils` e outros `models`.
- `views` → `config`, `utils`, `views/components`; recebem dados prontos e não alteram models.
- `controllers` → `models`, `views`, `utils`, outros `controllers`.
- Comunicação model → controller apenas por eventos (`utils/events.js`), ex.: `session:expired`, `store:changed`.
- Handlers inline chamam somente funções registradas em `main.js` (lista explícita = API pública da UI).

## Consequências

Positivas:
- Cada tela tem um controller e uma view; cada domínio tem um model. Dá para entender e testar partes isoladas.
- Estado mutável fica privado ao módulo dono e é exposto por funções (`getCalendarState()`, `setAiDraft()`…).
- Código morto removido (o histórico do Git preserva tudo).

Negativas / riscos e mitigação:
- Mais arquivos para o service worker baixar: a lista `ASSETS` do `sw.js` passa a incluir todos os módulos, e a instalação usa `cache: "reload"` para não reaproveitar versões antigas do cache HTTP.
- O deploy copiava uma lista fixa de arquivos: o workflow agora copia a pasta `src/`.
- Navegadores sem suporte a módulos ES (anteriores a 2018) deixam de funcionar — aceitável para um PWA atual.
- Ciclos de import são permitidos entre controllers (funções são içadas), mas nenhum módulo executa código de outro durante a própria inicialização; só `main.js` dispara o boot.

## Plano de migração

1. Inventário automático (declarações, grafo de chamadas, handlers, reatribuições) e remoção do código morto.
2. Extração mecânica para módulos com imports gerados por análise de escopo; validação com os testes de ponta a ponta existentes.
3. Separação view/controller tela a tela e desacoplamento model → controller por eventos; testes após cada passo.
4. Atualização do `index.html`, `sw.js` e do workflow de deploy; versão de cache incrementada.

Critério de pronto: todos os testes de ponta a ponta (login, Início, Treinos, Execução, Histórico, Calendário, Editor, IA, Configurações) passando sem erros de console, e o app funcionando offline após a primeira carga.
