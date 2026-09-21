# 🚀 Guia de Push para GitHub

Este guia mostra como fazer push da branch `feature/auth-login` para o GitHub.

## 📋 Pré-requisitos

1. Conta no GitHub
2. Git instalado e configurado
3. Repositório criado no GitHub

## 🔗 Conectar Repositório Local ao GitHub

### Opção A: Se o repositório ainda não existe no GitHub

1. **Criar novo repositório no GitHub**
   - Vá para https://github.com/new
   - Nome: `prjAcademiaIA`
   - Descrição: `GymIA - Seu Assistente de Treino com IA`
   - Selecione "Private" ou "Public"
   - **Não** inicialize com README (já temos um)
   - Clique em "Create repository"

2. **Adicionar remote no git local**
   ```bash
   cd /c/vibe_coding/prjAcademiaIA
   git remote add origin https://github.com/SEU_USUARIO/prjAcademiaIA.git
   # ou se usar SSH:
   git remote add origin git@github.com:SEU_USUARIO/prjAcademiaIA.git
   ```

3. **Verificar remote**
   ```bash
   git remote -v
   # Deve mostrar:
   # origin  https://github.com/SEU_USUARIO/prjAcademiaIA.git (fetch)
   # origin  https://github.com/SEU_USUARIO/prjAcademiaIA.git (push)
   ```

### Opção B: Se o repositório já existe no GitHub

```bash
cd /c/vibe_coding/prjAcademiaIA
git remote add origin https://github.com/SEU_USUARIO/prjAcademiaIA.git
```

## 🔑 Autenticar com GitHub

### Opção 1: Token de Acesso Pessoal (HTTPS)

1. **Gerar token no GitHub**
   - Vá para Settings → Developer settings → Personal access tokens
   - Clique em "Generate new token"
   - Nome: `GymIA CLI`
   - Selecione escopos: `repo`, `read:user`
   - Clique em "Generate token"
   - **Copie o token** (não será mostrado novamente!)

2. **Configurar git**
   ```bash
   git config --global credential.helper store
   # Ou no Windows:
   git config --global credential.helper wincred
   ```

3. **Fazer push (solicitará credenciais)**
   ```bash
   git push origin feature/auth-login
   # Username: SEU_USUARIO
   # Password: SEU_TOKEN (colar o token gerado)
   ```

### Opção 2: Chave SSH (Recomendado)

1. **Gerar chave SSH** (se não tiver)
   ```bash
   ssh-keygen -t ed25519 -C "seu-email@example.com"
   # Pressione Enter para aceitar local padrão
   # Crie uma passphrase (ou deixe em branco)
   ```

2. **Adicionar chave no GitHub**
   ```bash
   # Copiar chave pública
   cat ~/.ssh/id_ed25519.pub
   # Ou no Windows:
   Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
   ```
   - Vá para GitHub Settings → SSH and GPG keys
   - Clique em "New SSH key"
   - Cole a chave
   - Clique em "Add SSH key"

3. **Fazer push com SSH**
   ```bash
   git remote set-url origin git@github.com:SEU_USUARIO/prjAcademiaIA.git
   git push origin feature/auth-login
   ```

## 📤 Fazer Push da Branch

### 1. Verificar Status
```bash
cd /c/vibe_coding/prjAcademiaIA
git status
# Deve estar limpo (no changes)
```

### 2. Fazer Push
```bash
git push origin feature/auth-login
```

**Esperado**:
```
Enumerating objects: 23, done.
Counting objects: 100% (23/23), done.
Delta compression using up to 8 threads
Compressing objects: 100% (20/20), done.
Writing objects: 100% (20/20), 15.3 KiB | 1.5 MiB/s, done.
Total 20 (delta 3), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (3/3), done.
remote: 
remote: Create a pull request for 'feature/auth-login' on GitHub by visiting:
remote:      https://github.com/SEU_USUARIO/prjAcademiaIA/pull/new/feature/auth-login
remote:
To github.com:SEU_USUARIO/prjAcademiaIA.git
 * [new branch]      feature/auth-login -> feature/auth-login
```

### 3. Push da Branch Master (Opcional)
```bash
git push origin master
```

## 🔀 Criar Pull Request

1. Vá para https://github.com/SEU_USUARIO/prjAcademiaIA
2. Você verá um banner sugerindo criar PR da branch `feature/auth-login`
3. Clique em "Compare & pull request"
4. Preencha o formulário:
   - **Title**: `feat: Add authentication system with Google OAuth`
   - **Description**: Copie do commit message
   - **Reviewers**: (opcional)
   - **Assignees**: Você mesmo
5. Clique em "Create pull request"

## ✅ Verificação

### Verificar push bem-sucedido
```bash
# Branch remota
git branch -r
# Deve mostrar: origin/feature/auth-login

# Comparar com remoto
git log --oneline origin/feature/auth-login
```

### Ver no GitHub
- Vá para https://github.com/SEU_USUARIO/prjAcademiaIA
- Clique em "Branches"
- Você deve ver `feature/auth-login` listada

## 🔄 Sincronizar com Remote

### Atualizar local com remote
```bash
git fetch origin
git pull origin feature/auth-login
```

### Se houver conflitos
```bash
git status
# Resolve conflitos nos arquivos
git add .
git commit -m "Resolve merge conflicts"
git push origin feature/auth-login
```

## 📋 Comandos Úteis

```bash
# Ver remotes
git remote -v

# Adicionar remote
git remote add origin URL

# Remover remote
git remote remove origin

# Mudar URL do remote
git remote set-url origin NOVA_URL

# Ver branches locais
git branch

# Ver branches remotas
git branch -r

# Ver todas as branches
git branch -a

# Deletar branch local
git branch -d feature/auth-login

# Deletar branch remota
git push origin --delete feature/auth-login
```

## 🚨 Troubleshooting

### "fatal: 'origin' does not appear to be a 'git' repository"
```bash
# O remote não está configurado
git remote add origin https://github.com/SEU_USUARIO/prjAcademiaIA.git
```

### "Permission denied (publickey)"
```bash
# Problema com SSH
# Tente HTTPS:
git remote set-url origin https://github.com/SEU_USUARIO/prjAcademiaIA.git

# Ou gere nova chave SSH
ssh-keygen -t ed25519 -C "seu-email@example.com"
```

### "nothing to commit, working tree clean"
```bash
# Tudo já foi commitado
# Você pode fazer push com segurança
git push origin feature/auth-login
```

### "Updates were rejected because the remote contains work"
```bash
# Branch remota tem commits que local não tem
git pull origin feature/auth-login
# Ou pull com rebase:
git pull --rebase origin feature/auth-login
```

## 📚 Próximas Etapas

1. ✅ Fazer push da branch `feature/auth-login`
2. ✅ Criar Pull Request
3. ✅ Pedir revisão (code review)
4. ✅ Fazer merge para `master` (ou `main`)
5. ✅ Deploy em produção

## 🎉 Pronto!

Seu código está no GitHub! Você pode agora:
- Compartilhar o link do repositório
- Colaborar com outros desenvolvedores
- Usar GitHub Actions para CI/CD
- Gerenciar issues e discussões

---

**Última atualização**: 2026-09-21

Se tiver dúvidas, consulte a [documentação oficial do GitHub](https://docs.github.com/pt).
