# Marca — Meu Treino

![Logo do Meu Treino](../icons/icon-192.png)

## Conceito

Um **coração** atravessado por uma linha de **batimento** cujo traçado central forma a letra **"M"** de *Meu Treino*.

- **Coração** → saúde e bem-estar.
- **Batimento** → atividade, treino, energia.
- **"M" no pulso** → identidade própria do app (não é um coração genérico de app de saúde).
- **Verde** → vitalidade, alinhado à paleta Material Design 3 do app (cor-semente `#22c55e`).

## Cores

| Elemento | Cor | Origem |
|---|---|---|
| Fundo (gradiente 135°) | `#1f6b3a` → `#34a853` | verde profundo → verde Google |
| Coração | `#b6f1bb` | `--md-sys-color-primary-container` (tema claro) |
| Linha de batimento | `#ffffff` | — |

## Arquivos

| Arquivo | Uso |
|---|---|
| `icons/logo.svg` | Arquivo mestre (cantos arredondados). Favicon moderno e fonte de todos os PNGs. |
| `icons/logo-maskable.svg` | Versão sangrada até a borda, símbolo dentro da zona segura de 80% (Android recorta em círculo/squircle). |
| `icons/icon-192.png`, `icons/icon-512.png` | Ícones do PWA (`purpose: any`). |
| `icons/maskable-512.png` | Ícone adaptativo do Android (`purpose: maskable`). |
| `icons/apple-touch-icon.png` | Tela de início do iPhone (180 px; o iOS aplica a própria máscara). |
| `icons/favicon-32.png` | Favicon para navegadores sem suporte a SVG. |
| `src/views/components/brand.js` | `brandMarkView()` — a marca inline nas telas (barra superior, login, abertura). |

Ao alterar o desenho, edite `icons/logo.svg`, `icons/logo-maskable.svg` **e** `brand.js` (mesmos caminhos), regenere os PNGs e incremente `CACHE` no `sw.js`.

## Uso

- **Tamanho mínimo:** 16 px (favicon). Abaixo de 24 px o batimento vira um traço — o coração continua reconhecível.
- **Respiro:** mantenha ao redor da marca um espaço livre de pelo menos 25% da sua largura.
- **Fundo:** a marca tem fundo próprio; funciona sobre superfícies claras e escuras sem variação.
- **Não faça:** trocar as cores, girar, esticar, aplicar contorno ou sombra forte, separar o coração do batimento, ou usar o halter (ícone de *Treinos*) como logotipo.
- **Nome:** "Meu Treino", em fonte do sistema (Roboto no Android), peso regular na barra superior e médio no login.
- **Assinatura:** "Seu treino. Sua evolução."
