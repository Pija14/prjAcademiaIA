# Meu Treino â€” PWA

VersÃ£o 2 corrigida do aplicativo pessoal de treinos A/B/C.

## CorreÃ§Ã£o principal
- Iniciar/Pausar do cronÃ´metro individual funciona sem perder o tempo acumulado.
- Iniciar novamente continua de onde parou.
- Troca de exercÃ­cio salva o tempo anterior.
- CronÃ´metro geral permanece independente.
- CronÃ´metro de descanso Ã© separado.


## CorreÃ§Ã£o v3
Corrigida a tela de execuÃ§Ã£o para preservar as sÃ©ries e repetiÃ§Ãµes prescritas ao iniciar o treino. O texto "[object Object] Ã— repetiÃ§Ãµes" nÃ£o deve mais aparecer; exercÃ­cios com prescriÃ§Ã£o exibem, por exemplo, "4 Ã— 12/12/8/8", enquanto exercÃ­cios sem prescriÃ§Ã£o exibem "SÃ©ries nÃ£o informadas".


## VersÃ£o v4 â€” exclusÃ£o de exercÃ­cios
- Cada exercÃ­cio pode ser excluÃ­do individualmente na tela do Treino A, B ou C.
- A exclusÃ£o fica salva no aparelho e permanece apÃ³s fechar o aplicativo.
- ExercÃ­cios excluÃ­dos nÃ£o entram no treino nem no contador de exercÃ­cios.
- Ã‰ possÃ­vel restaurar todos os exercÃ­cios excluÃ­dos de um treino.


## VersÃ£o v5 â€” personalizaÃ§Ã£o da ficha
- Restaurar exercÃ­cios individualmente.
- Restaurar todos os exercÃ­cios excluÃ­dos.
- Adicionar exercÃ­cios manualmente a qualquer treino A/B/C.
- ExercÃ­cios personalizados ficam salvos no aparelho.
- Ao adicionar, informar nome, grupo muscular, sÃ©ries e repetiÃ§Ãµes/tempo.
- ExercÃ­cios personalizados entram automaticamente na execuÃ§Ã£o do treino.


## VersÃ£o v6 â€” formulÃ¡rio de exercÃ­cio
- SubstituÃ­do o prompt do navegador por uma tela nativa do aplicativo.
- Campos para nome, grupo muscular, sÃ©ries e repetiÃ§Ãµes/tempo.
- ValidaÃ§Ã£o do nome.
- SeleÃ§Ã£o do grupo muscular baseada no treino.
- Cancelamento sem salvar.

## VersÃ£o v27 â€” mÃºltiplos treinos e histÃ³rico automÃ¡tico
- Meus Treinos com quantidade ilimitada de treinos.
- Treino BÃ¡sico migrado e preservado; Treino B e Treino C tambÃ©m sÃ£o preservados.
- Hierarquia: treino â†’ grupo muscular â†’ exercÃ­cio â†’ sÃ©ries.
- CriaÃ§Ã£o, ediÃ§Ã£o, duplicaÃ§Ã£o, ativaÃ§Ã£o/desativaÃ§Ã£o e organizaÃ§Ã£o de treinos.
- Grupos musculares e exercÃ­cios organizÃ¡veis por treino.
- Carga e repetiÃ§Ãµes independentes por sÃ©rie.
- ValidaÃ§Ã£o somente da sÃ©rie que serÃ¡ iniciada.
- CronÃ´metro fixo de 60s + descanso automÃ¡tico de 30s, com som e vibraÃ§Ã£o.
- PrÃ³xima sÃ©rie iniciada somente manualmente.
- ConclusÃ£o automÃ¡tica de exercÃ­cio e treino.
- HistÃ³rico de treinos concluÃ­dos.
- CalendÃ¡rio marcado automaticamente e detalhes por dia.
- Service Worker/cache atualizado para v27.


## v29 - UX/UI Tela de Treinos
- Cards com cores suaves por nÃ­vel: BÃ¡sico azul, IntermediÃ¡rio verde, AvanÃ§ado amarelo e Personalizado avermelhado.
- BotÃ£o `+ Treino`.
- RemoÃ§Ã£o do tÃ­tulo duplicado da Ã¡rea de treinos na tela inicial.
- ExclusÃ£o lÃ³gica protegida por confirmaÃ§Ã£o, sem apagar histÃ³rico.
- Ãcone de lixeira separado do clique do card via `stopPropagation`.
- PadronizaÃ§Ã£o visual de nomes de treinos, grupos e exercÃ­cios.
- Cache do Service Worker atualizado para v29.


## v30 - UX/UI Tela de EdiÃ§Ã£o de Treino
- Removido o botÃ£o + da barra superior somente da tela de ediÃ§Ã£o.
- Removido o nÃ­vel ao lado do nome do treino e o texto de migraÃ§Ã£o da interface.
- Adicionado botÃ£o de voltar para Treinos.
- Padronizado o campo Nome.
- Renomeado Grupos Musculares e adicionado botÃ£o + somente com Ã­cone.
- Removida a aÃ§Ã£o Duplicar treino da tela de ediÃ§Ã£o.
- Salvar Treino retorna para a tela de Treinos apÃ³s salvar.
- Ajustados os textos Adicionar ExercÃ­cio e Salvar Treino.
- Cache do Service Worker atualizado para v30.


## v31 â€” Ajustes na tela de execuÃ§Ã£o
- BotÃ£o de sÃ©rie centralizado.
- Check de sÃ©rie concluÃ­da centralizado e nÃ£o interativo.
- Textos corrigidos para "SÃ©rie em ExecuÃ§Ã£o", "Iniciar PrÃ³xima SÃ©rie" e "Iniciar SÃ©rie".
- Removido o texto "30s entre sÃ©ries" da interface, mantendo o descanso automÃ¡tico de 30 segundos.

## v32 â€” UX/UI Tela Inicial
- Removido o banner superior com o raio da tela inicial.
- Indicadores reposicionados imediatamente apÃ³s o cabeÃ§alho.
- `Ver todos` substituÃ­do por botÃ£o `+` na seÃ§Ã£o Treinos disponÃ­veis.
- `+` abre uma tela nativa de cadastro de novo treino.
- Cards com `Ã—` vermelho no canto superior direito para exclusÃ£o.
- `â–¶` Iniciar posicionado no canto inferior esquerdo.
- `âœŽ` Editar posicionado no canto inferior direito.
- Mantida a confirmaÃ§Ã£o de exclusÃ£o e o histÃ³rico dos treinos.
- Layout responsivo para telas pequenas.
- Cache do Service Worker atualizado para v32.

## v34 â€” Cards sem indicador de nÃ­vel
- Cards da tela inicial e da tela Treinos alinhados ao design visual de referÃªncia.
- Ãcone de musculaÃ§Ã£o em bloco azul claro.
- TÃ­tulo e quantidade de exercÃ­cios com hierarquia visual maior.
- NÃ­vel apresentado como pill quando disponÃ­vel.
- Marca d'Ã¡gua decorativa construÃ­da em SVG/CSS, sem uso da imagem de referÃªncia.
- ExclusÃ£o com `Ã—` vermelho no canto superior direito.
- `Iniciar` como CTA principal no canto inferior esquerdo.
- `Editar` como aÃ§Ã£o secundÃ¡ria no canto inferior direito.
- RenderizaÃ§Ã£o dos cards centralizada em `f2WorkoutCard()` para evitar duplicaÃ§Ã£o.
- Responsividade refinada para 320px, 350px, 480px e telas maiores.
- Cache do Service Worker atualizado para v33.


### v34
- Removido apenas da apresentaÃ§Ã£o dos cards o indicador visual de nÃ­vel/dificuldade.
- Mantidos os dados `level` dos treinos e todas as demais funcionalidades.
- AÃ§Ãµes ancoradas: Iniciar inferior esquerdo, Editar inferior direito e X superior direito.


## v36 â€” Campo Nome padronizado
- Campo Nome da tela de ediÃ§Ã£o/novo treino padronizado visualmente com os demais campos do formulÃ¡rio.
- Mantidos dados, navegaÃ§Ã£o e demais funcionalidades.

## Planejamento com IA e GitHub Pages

O recurso opcional **Planejar com IA** cria uma sugestÃ£o de ficha e sÃ³ a salva apÃ³s confirmaÃ§Ã£o. A ficha resultante usa a mesma estrutura dos treinos manuais e funciona offline; somente a geraÃ§Ã£o exige internet.

### PublicaÃ§Ã£o

1. Publique esta pasta como a raiz de um repositÃ³rio GitHub e envie para `main`.
2. Em **Settings â†’ Pages**, escolha **GitHub Actions**. O workflow `.github/workflows/deploy-pages.yml` publica somente os arquivos estÃ¡ticos da PWA.
3. Para o GitHub Pages, crie a variÃ¡vel de repositÃ³rio `AI_API_URL` em **Settings â†’ Secrets and variables â†’ Actions â†’ Variables** com a URL HTTPS do backend. O workflow gera `config.js` durante a publicaÃ§Ã£o, sem versionÃ¡-lo.
4. Para desenvolvimento local, copie `config.example.js` para `config.js` e indique o backend HTTPS:

```js
window.MEU_TREINO_CONFIG = {
  AI_API_URL: "https://seu-backend.exemplo.com"
};
```

Sem `config.js`, todos os treinos continuam funcionando e apenas a funÃ§Ã£o de IA fica desativada. `config.js` estÃ¡ no `.gitignore` e nunca deve conter uma chave de API.

### Backend de IA

GitHub Pages nÃ£o executa Python ou Node. Hospede `ai-backend` separadamente em um provedor compatÃ­vel com FastAPI (como Render ou Google Cloud Run).

1. Configure as variÃ¡veis de `ai-backend/.env.example` no provedor: `AI_PROVIDER=gemini` ou `openai` e somente a chave correspondente.
2. Em `ALLOWED_ORIGINS`, informe a origem real do GitHub Pages, como `https://usuario.github.io`. NÃ£o use `*` em produÃ§Ã£o.
3. Para executar localmente: em `ai-backend`, crie um ambiente virtual, instale `pip install -r requirements.txt` e execute `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

Nunca envie `.env`, `config.js` ou chaves para o GitHub. O backend inclui validaÃ§Ã£o, timeout e um limite simples de requisiÃ§Ãµes; use tambÃ©m o rate limiting do provedor para produÃ§Ã£o.

