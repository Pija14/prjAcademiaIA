# 🔐 Configuração de Autenticação - GymIA

Guia completo para configurar autenticação com email/senha e Google OAuth no GymIA.

## 📋 Índice
1. [Login com Email/Senha](#login-com-emailsenha)
2. [Login com Google](#login-com-google)
3. [Configuração no Backend](#configuração-no-backend)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Login com Email/Senha

### Funcionamento
1. Usuário preenche email e senha na tela de login (`login.html`)
2. Formulário é validado no cliente
3. Requisição POST é feita para `/api/auth/login`
4. Backend valida credenciais e retorna token JWT
5. Token é salvo no `localStorage`
6. Usuário é redirecionado para a aplicação principal

### Endpoints do Backend

#### POST `/api/auth/login`
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Response (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "usuario@email.com",
    "name": "João Silva",
    "picture": null
  }
}
```

#### POST `/api/auth/register`
```json
{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "João Silva"
}
```

#### POST `/api/auth/logout`
**Headers**: `Authorization: Bearer {token}`

**Response (200)**:
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## Login com Google

### Configurar Google Cloud Console

#### 1. Criar Projeto
- Acesse [Google Cloud Console](https://console.cloud.google.com/)
- Clique em "Selecionar um projeto" → "Novo projeto"
- Nome: `GymIA` (ou seu nome de projeto)
- Clique em "Criar"

#### 2. Habilitar OAuth 2.0
- No painel, procure por "APIs e Serviços"
- Clique em "Habilitar APIs e Serviços"
- Procure por "Google+ API"
- Clique para habilitar

#### 3. Criar Credenciais OAuth
- Vá para "Credenciais"
- Clique em "Criar Credenciais" → "ID do cliente OAuth"
- Tipo de aplicação: "Aplicativo da Web"
- Adicionar URIs autorizados:
  - **Origens JavaScript autorizadas**:
    - `http://localhost:3000`
    - `http://localhost:8000`
    - `https://seu-dominio.com`
  - **URIs de redirecionamento autorizados**:
    - `http://localhost:3000/auth-callback.html`
    - `http://localhost:3000/index.html`
    - `https://seu-dominio.com/auth-callback.html`
    - `https://seu-dominio.com/index.html`
- Clique em "Criar"
- Copie o **Client ID**

#### 4. Atualizar Configuração
- Abra `auth/google-config.js`
- Substitua `YOUR_GOOGLE_CLIENT_ID` pelo seu Client ID:
```javascript
const GOOGLE_CONFIG = {
  CLIENT_ID: "seu-client-id-aqui.apps.googleusercontent.com",
  // ... resto da configuração
};
```

### Fluxo de Login com Google

#### Opção 1: Google Sign-In (Recomendado)
```javascript
// No arquivo login.js, ao cliclar em "Fazer login com o Google"
// A biblioteca do Google é carregada automaticamente
// Um prompt de login aparece
// Após autenticação, credential JWT é retornado
// Enviamos para o backend validar
```

#### Opção 2: Auth Code Flow
- Redirect para `https://accounts.google.com/o/oauth2/v2/auth`
- Callback em `/auth-callback.html`
- Exchange code por token no backend

### Endpoints do Backend

#### POST `/api/auth/google`
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "userInfo": {
    "email": "usuario@gmail.com",
    "name": "João Silva",
    "picture": "https://...",
    "sub": "118205722906..."
  }
}
```

**Response (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "google_118205722906...",
    "email": "usuario@gmail.com",
    "name": "João Silva",
    "picture": "https://...",
    "provider": "google"
  }
}
```

#### POST `/api/auth/google/callback`
```json
{
  "code": "4/0AX4XfWh...",
  "state": "state123"
}
```

**Response**: Mesmo que `/api/auth/google`

---

## Configuração no Backend

### Dependências Necessárias
```bash
npm install jsonwebtoken
npm install google-auth-library
npm install dotenv
```

### Exemplo de Implementação (Node.js/Express)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validar credenciais no banco de dados
    const user = await User.findOne({ email });
    if (!user || !user.verifyPassword(password)) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }
    
    // Gerar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/google
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token, userInfo } = req.body;
    
    // Verificar token JWT do Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    // Criar ou atualizar usuário
    let user = await User.findOne({ 'social.google': payload.sub });
    
    if (!user) {
      user = await User.create({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        social: { google: payload.sub }
      });
    } else {
      // Atualizar informações
      user.picture = payload.picture;
      await user.save();
    }
    
    // Gerar JWT da aplicação
    const appToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token: appToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: 'google'
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Falha na autenticação com Google' });
  }
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Exemplo de rota protegida
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
});
```

---

## Variáveis de Ambiente

### .env (Backend)
```bash
# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-secret-aqui

# JWT
JWT_SECRET=sua-chave-secreta-super-segura-aqui

# Aplicação
NODE_ENV=production
PORT=3000
API_URL=https://seu-dominio.com

# Banco de dados
DATABASE_URL=mongodb://...

# CORS
CORS_ORIGIN=https://seu-dominio.com
```

### config.js (Frontend)
```javascript
window.MEU_TREINO_CONFIG = {
  AI_API_URL: "https://api.seu-dominio.com"
};
```

---

## Segurança

### Boas Práticas

✅ **Faça**:
- Use HTTPS em produção
- Armazene `JWT_SECRET` seguramente
- Valide tokens no backend
- Use httpOnly cookies para tokens (opcional)
- Implemente rate limiting
- Adicione CSRF protection

❌ **Não Faça**:
- Exponha seu Google Client Secret no frontend
- Armazene senhas em texto plano
- Confie apenas em validação do cliente
- Use tokens de curta duração para sessões persistentes
- Ignore o atributo `sub` do Google (identificador único)

### Implementar Refresh Token

```javascript
// No backend, gerar tanto access quanto refresh token
const accessToken = jwt.sign({ id: user.id }, secret, { expiresIn: '1h' });
const refreshToken = jwt.sign({ id: user.id }, refreshSecret, { expiresIn: '7d' });

// Armazenar refreshToken no banco de dados ou cookie httpOnly
// Cliente usa accessToken para requisições normais
// Quando expira, usa refreshToken para obter novo accessToken
```

---

## Teste da Aplicação

### Localmente
```bash
# 1. Inicie o backend
npm start

# 2. Abra em seu navegador
http://localhost:3000/login.html

# 3. Teste login com email/senha
Email: teste@example.com
Senha: senha123

# 4. Teste login com Google
Clique em "Fazer login com o Google"
```

### Em Produção
- Deploy da aplicação
- Configurar domínios no Google Cloud Console
- Testar ambos os fluxos de login

---

## Troubleshooting

### "Google SDK não carregado"
- Verifique conexão de internet
- Verifique se há bloqueador de anúncios ativo
- Verifique console do navegador para erros

### "Erro 401 - Falha na autenticação"
- Verifique se o Client ID está correto em `google-config.js`
- Verifique se as origens estão autorizadas no Console
- Verifique se o JWT é válido

### Token expirado
- Implemente refresh token flow
- Redirecione para login quando token expirar

### CORS Error
- Configure CORS no backend
- Adicione seu domínio em `CORS_ORIGIN`

---

## Arquivos da Implementação

```
prjAcademiaIA/
├── login.html                 # Página de login
├── auth-callback.html         # Callback do Google
├── styles/
│   └── login.css              # Estilos de login
├── auth/
│   ├── google-config.js       # Configuração do Google OAuth
│   ├── auth-manager.js        # Gerenciador de autenticação
│   └── login.js               # Lógica da página de login
├── config.js                  # Configuração da aplicação
└── AUTH_SETUP.md             # Este arquivo
```

---

## Próximos Passos

1. ✅ Configurar Google Cloud Console
2. ✅ Obter Client ID
3. ✅ Atualizar `auth/google-config.js`
4. ✅ Implementar endpoints no backend
5. ✅ Testar fluxos de login
6. ✅ Implementar refresh token
7. ✅ Deploy em produção

---

## Contato & Suporte

Para dúvidas ou problemas, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

**Última atualização**: 2026-09-21
