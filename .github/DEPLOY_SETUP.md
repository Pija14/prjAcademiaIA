# 🚀 GitHub Actions - Deploy Automático no Render

Este documento explica como configurar o deploy automático do backend no Render usando GitHub Actions.

## 📋 O que é?

Um **workflow automático** que:
- ✅ Detecta mudanças no código (`backend/`, `config.js`)
- ✅ Faz deploy automático no Render
- ✅ Notifica se foi bem-sucedido ou falhou
- ✅ Não precisa fazer nada manualmente!

## 🔐 Passo 1: Obter Render API Key

1. Acesse: https://dashboard.render.com/account/api-tokens
2. Clique em **"Create API Token"**
3. Copie o token (aparece apenas uma vez!)
4. **Guarde em um lugar seguro**

Exemplo:
```
rnd_abc123def456ghi789jkl
```

## 🆔 Passo 2: Obter Render Service ID

1. Acesse seu serviço: https://dashboard.render.com
2. Clique em **prjAcademiaIA**
3. A URL vai ficar assim:
   ```
   https://dashboard.render.com/services/srv_abc123def456
   ```
4. Copie o ID: `srv_abc123def456`

## 🔑 Passo 3: Adicionar Secrets no GitHub

1. Vá para seu repositório: https://github.com/Pija14/prjAcademiaIA
2. Clique em **Settings** (engrenagem)
3. No menu esquerdo, procure **"Secrets and variables"** → **"Actions"**
4. Clique em **"New repository secret"**

### Secret 1: RENDER_API_KEY
- **Name**: `RENDER_API_KEY`
- **Value**: Cole seu token do Render (ex: `rnd_abc123...`)
- Clique em **"Add secret"**

### Secret 2: RENDER_SERVICE_ID
- **Name**: `RENDER_SERVICE_ID`
- **Value**: Cole seu Service ID (ex: `srv_abc123...`)
- Clique em **"Add secret"**

## ✅ Pronto!

Agora, sempre que você fizer:

```bash
git push origin main
```

Automaticamente vai:
1. 🔍 Detectar mudanças
2. 🚀 Fazer deploy no Render
3. ✅ Notificar o resultado

## 📊 Acompanhar o Deploy

1. Vá para seu repositório no GitHub
2. Clique em **"Actions"** (menu superior)
3. Veja o workflow em tempo real
4. Clique no workflow para ver logs detalhados

## 🔍 Verificar Logs

Na aba **"Actions"**, você verá:

```
✅ Deploy Backend to Render
  ✓ Checkout code
  ✓ Deploy to Render
  ✓ Wait for deployment
  ✓ Check deployment status
  ✓ Notify deployment
```

**Verde** = Sucesso!
**Vermelho** = Erro

## 🧪 Testar o Workflow

1. Faça uma pequena mudança no `backend/server.js`
2. Commit e push:
   ```bash
   git add .
   git commit -m "test: Test GitHub Actions deployment"
   git push origin main
   ```
3. Vá para **Actions** e acompanhe

## ❌ Troubleshooting

### "Secret not found"
```
→ Verificar se SECRET está exatamente como no código
→ Ir para Settings → Secrets e verificar nomes
```

### "Deployment failed"
```
→ Verifique no dashboard do Render
→ Verifique variáveis de ambiente
→ Clique em "Redeploy" manualmente no Render
```

### "Service not found"
```
→ Verifique se RENDER_SERVICE_ID está correto
→ Copie novamente do URL do Render
```

## 📝 Arquivo de Configuração

O workflow está em:
```
.github/workflows/deploy.yml
```

Você pode editar se precisar mudar:
- Branches (por padrão: `main`)
- Caminhos que ativam deploy (por padrão: `backend/`, `config.js`)
- Comandos de verificação

## 🎯 Próximos Passos

1. ✅ Obter RENDER_API_KEY
2. ✅ Obter RENDER_SERVICE_ID
3. ✅ Adicionar secrets no GitHub
4. ✅ Fazer um test push
5. ✅ Acompanhar em Actions

## 🚀 Fluxo de Trabalho

```
Você faz push → GitHub detecta → Actions dispara
         ↓
   Workflow roda → Envia comando ao Render
         ↓
   Render faz deploy → Backend atualizado
         ↓
   ✅ Pronto! Sem fazer nada manual!
```

## 💡 Dicas

- Não compartilhe seus secrets com ninguém
- Cada push dispara um deploy (pode custar créditos)
- Se quiser desabilitar, edite `.github/workflows/deploy.yml`
- Para testes, use branch diferente de `main`

## 📞 Ajuda

Se o workflow falhar:
1. Clique no workflow em "Actions"
2. Veja os logs vermelhos
3. Verifique se secrets estão corretos
4. Tente fazer "Redeploy" manual no Render

---

**Configuração concluída! Agora é tudo automático! 🚀**
