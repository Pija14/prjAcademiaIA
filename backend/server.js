/* =========================================================
   SERVIDOR BACKEND - GymIA
   ========================================================= */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ========== MIDDLEWARE ==========

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configurado
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8000',
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_PROD,
    'https://pija14.github.io'
  ],
  credentials: true
}));

// ========== ARMAZENAMENTO TEMPORÁRIO (Em produção usar banco de dados) ==========

// Usuários simulados (substitua por banco de dados)
const users = new Map();

// Usuário de teste
users.set('teste@gmail.com', {
  id: 'user_001',
  email: 'teste@gmail.com',
  name: 'Usuário Teste',
  password: bcrypt.hashSync('123456', 10),
  provider: 'local',
  createdAt: new Date()
});

// ========== FUNÇÕES AUXILIARES ==========

/**
 * Gerar token JWT
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET || 'sua-chave-super-secreta',
    { expiresIn: '7d' }
  );
}

/**
 * Verificar token JWT
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'sua-chave-super-secreta');
  } catch (error) {
    return null;
  }
}

/**
 * Middleware de autenticação
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: 'Token inválido ou expirado' });
  }

  req.user = decoded;
  next();
}

/**
 * Validar email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

/**
 * POST /api/auth/login
 * Login com email e senha
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Procurar usuário
    const user = users.get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Verificar senha
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || null,
        provider: 'local'
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

/**
 * POST /api/auth/register
 * Registrar novo usuário
 */
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validar entrada
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, senha e nome são obrigatórios' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se usuário já existe
    if (users.has(email.toLowerCase())) {
      return res.status(409).json({ message: 'Email já registrado' });
    }

    // Criar novo usuário
    const userId = 'user_' + Date.now();
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      name,
      password: bcrypt.hashSync(password, 10),
      provider: 'local',
      createdAt: new Date()
    };

    users.set(email.toLowerCase(), newUser);

    // Gerar token
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        picture: null,
        provider: 'local'
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

/**
 * POST /api/auth/google
 * Login/Registro com Google OAuth
 */
app.post('/api/auth/google', (req, res) => {
  try {
    const { token, userInfo } = req.body;

    // Validar entrada
    if (!token || !userInfo) {
      return res.status(400).json({ message: 'Token e userInfo são obrigatórios' });
    }

    const { email, name, picture, sub } = userInfo;

    if (!email) {
      return res.status(400).json({ message: 'Email do Google é obrigatório' });
    }

    // Procurar ou criar usuário
    let user = users.get(email.toLowerCase());

    if (!user) {
      // Criar novo usuário do Google
      const userId = 'google_' + sub;
      user = {
        id: userId,
        email: email.toLowerCase(),
        name,
        picture,
        password: null,
        provider: 'google',
        googleId: sub,
        createdAt: new Date()
      };
      users.set(email.toLowerCase(), user);
    } else if (user.provider === 'local') {
      // Vincular conta Google existente
      user.googleId = sub;
      user.provider = 'both';
      user.picture = picture;
    }

    // Gerar token
    const appToken = generateToken(user);

    res.json({
      token: appToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || null,
        provider: user.provider
      }
    });
  } catch (error) {
    console.error('Erro no login com Google:', error);
    res.status(500).json({ message: 'Erro ao fazer login com Google' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (sem operações no servidor, apenas validação)
 */
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // Em produção, você poderia invalidar o token em um banco de dados
  res.json({ message: 'Logout realizado com sucesso' });
});

// ========== ROTAS DE USUÁRIO ==========

/**
 * GET /api/user/profile
 * Obter perfil do usuário autenticado
 */
app.get('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.email);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || null,
        provider: user.provider,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({ message: 'Erro ao obter perfil' });
  }
});

/**
 * PUT /api/user/profile
 * Atualizar perfil do usuário
 */
app.put('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const { name, picture } = req.body;
    const user = users.get(req.user.email);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (name) user.name = name;
    if (picture) user.picture = picture;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || null
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Solicitar reset de senha
 */
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    const user = users.get(email.toLowerCase());
    if (!user) {
      // Por segurança, não informamos se o email existe
      return res.json({ message: 'Se o email existe, você receberá um link de reset' });
    }

    // Em produção, enviar email com token de reset
    console.log(`Reset de senha solicitado para: ${email}`);

    res.json({ message: 'Email de recuperação enviado (verifique spam)' });
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({ message: 'Erro ao processar requisição' });
  }
});

// ========== HEALTH CHECK ==========

/**
 * GET /api/health
 * Verificar status do servidor
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    users: users.size
  });
});

/**
 * GET /
 * Rota raiz
 */
app.get('/', (req, res) => {
  res.json({
    name: 'GymIA Backend API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        loginGoogle: 'POST /api/auth/google',
        logout: 'POST /api/auth/logout',
        forgotPassword: 'POST /api/auth/forgot-password'
      },
      user: {
        profile: 'GET /api/user/profile',
        updateProfile: 'PUT /api/user/profile'
      }
    }
  });
});

// ========== ERRO 404 ==========

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

// ========== INICIAR SERVIDOR ==========

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║        🏋️  GymIA Backend - Servidor Iniciado       ║
╚════════════════════════════════════════════════════╝

  🚀 Servidor rodando em: http://localhost:${PORT}
  📝 Ambiente: ${process.env.NODE_ENV || 'development'}
  👤 Usuários conectados: 0

  🔗 Endpoints disponíveis:
     • POST   /api/auth/login
     • POST   /api/auth/register
     • POST   /api/auth/google
     • POST   /api/auth/logout
     • GET    /api/user/profile
     • PUT    /api/user/profile

  💡 Usuário teste:
     Email: teste@gmail.com
     Senha: 123456

  ⚠️  IMPORTANTE: Mude o JWT_SECRET em produção!

  `);
});

// Exportar para testes
module.exports = app;
