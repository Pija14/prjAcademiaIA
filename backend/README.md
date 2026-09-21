# 🏋️ GymIA Backend API

Backend Node.js/Express para autenticação e gerenciamento de usuários do GymIA.

## 📋 Requisitos

- Node.js 14+
- npm ou yarn

## 🚀 Instalação

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
```

Variáveis importantes:
```
PORT=3001                                    # Porta do servidor
JWT_SECRET=sua-chave-super-secreta-aqui     # Chave para assinar JWTs
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
FRONTEND_URL=http://localhost:3000          # URL do frontend em desenvolvimento
```

### 3. Iniciar o Servidor

#### Desenvolvimento (com auto-reload):
```bash
npm run dev
```

#### Produção:
```bash
npm start
```

O servidor estará disponível em: **http://localhost:3001**

---

## 📡 Endpoints da API

### 🔐 Autenticação

#### Login com Email/Senha
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "senha123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_001",
    "email": "usuario@email.com",
    "name": "João Silva",
    "picture": null,
    "provider": "local"
  }
}
```

#### Registrar Novo Usuário
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "Maria Silva"
}

Response (201):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

#### Login com Google
```http
POST /api/auth/google
Content-Type: application/json

{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "userInfo": {
    "email": "usuario@gmail.com",
    "name": "João Silva",
    "picture": "https://...",
    "sub": "118205722906..."
  }
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Response (200):
{
  "message": "Logout realizado com sucesso"
}
```

#### Solicitar Reset de Senha
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "usuario@email.com"
}

Response (200):
{
  "message": "Email de recuperação enviado (verifique spam)"
}
```

### 👤 Usuário

#### Obter Perfil
```http
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Response (200):
{
  "user": {
    "id": "user_001",
    "email": "usuario@email.com",
    "name": "João Silva",
    "picture": null,
    "provider": "local",
    "createdAt": "2026-09-21T10:30:00.000Z"
  }
}
```

#### Atualizar Perfil
```http
PUT /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "João da Silva",
  "picture": "https://..."
}

Response (200):
{
  "user": { ... }
}
```

### ⚡ Utilitários

#### Health Check
```http
GET /api/health

Response (200):
{
  "status": "ok",
  "timestamp": "2026-09-21T10:30:00.000Z",
  "uptime": 125.5,
  "users": 2
}
```

---

## 🧪 Testar com cURL

### Login (Usuário Teste)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@gmail.com","password":"123456"}'
```

### Registrar Novo Usuário
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"novo@email.com","password":"senha123","name":"João"}'
```

### Obter Perfil (com token)
```bash
curl -X GET http://localhost:3001/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔑 Segurança

### Em Desenvolvimento
- ✅ JWT simples
- ✅ Senhas com bcrypt
- ✅ CORS configurado

### Para Produção (TODO)
- [ ] HTTPS obrigatório
- [ ] Rate limiting
- [ ] Validação mais rigorosa
- [ ] Banco de dados (MongoDB/PostgreSQL)
- [ ] Email verificação
- [ ] Refresh tokens
- [ ] 2FA (Two-Factor Authentication)

---

## 📦 Estrutura

```
backend/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── .env.example       # Variáveis de exemplo
└── README.md          # Este arquivo
```

---

## 🗄️ Dados

Atualmente, os dados são armazenados em **memória** (Map). Isso significa:
- Os dados são perdidos quando o servidor reinicia
- Não é adequado para produção

### Para Produção, Use:
- **MongoDB** - NoSQL
- **PostgreSQL** - SQL
- **MySQL** - SQL
- **Firebase** - BaaS

---

## 🐛 Troubleshooting

### Erro: "Port 3001 already in use"
```bash
# Usar porta diferente
PORT=3002 npm start

# Ou matar processo na porta 3001
# Windows: netstat -ano | findstr :3001
# Mac/Linux: lsof -i :3001
```

### Erro: "JWT_SECRET não definido"
```bash
# Editar .env e adicionar
JWT_SECRET=sua-chave-super-secreta
```

### CORS Error
Adicione sua URL frontend em `server.js`:
```javascript
app.use(cors({
  origin: ['http://seu-dominio.com'],
  credentials: true
}));
```

---

## 🚀 Deploy

### Render
1. Conectar repositório GitHub
2. Adicionar variáveis de ambiente
3. Comando de start: `npm start`
4. Porta: `3001`

### Heroku
```bash
heroku login
heroku create seu-app-name
git push heroku main
```

### Railway
1. Conectar GitHub
2. Adicionar `.env` via dashboard
3. Auto deploy na cada push

---

## 📝 Notas

- Usuário teste: `teste@gmail.com` / `123456`
- Token expira em 7 dias
- Todas as senhas são hasheadas com bcrypt
- Email é case-insensitive

---

## 📞 Suporte

Para problemas:
1. Verifique o console do servidor
2. Confirme variáveis `.env`
3. Teste endpoints com cURL
4. Verifique CORS configuration

---

## ✨ GitHub Actions - Deploy Automático

Este projeto usa **GitHub Actions** para deploy automático no Render!

Cada push para `main` dispara automaticamente:
1. ✅ Detecta mudanças
2. ✅ Faz deploy no Render
3. ✅ Notifica resultado

Para configurar, veja [.github/DEPLOY_SETUP.md](../.github/DEPLOY_SETUP.md)

---

**Última atualização**: 2026-09-21

> **Test push**: GitHub Actions ativado! Deploy automático em produção.
> Esta linha foi adicionada para testar o workflow de CI/CD.
