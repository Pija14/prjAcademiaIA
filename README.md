# 💪 GymIA - Seu Assistente de Treino com IA

**GymIA** é uma aplicação web progressiva (PWA) que oferece um assistente de treino inteligente, nutrição e análise de desempenho alimentados por IA.

## 🌟 Features

- ✅ **Autenticação Segura** - Email/senha e Google OAuth
- ✅ **Gerenciamento de Treinos** - Crie, edite e acompanhe seus treinos
- ✅ **Biblioteca de Exercícios** - Acesso a centenas de exercícios catalogados
- ✅ **Assistente IA** - Recomendações personalizadas de treino
- ✅ **PWA Offline-First** - Funciona offline com sincronização automática
- ✅ **Análise de Dados** - Gráficos e estatísticas de progresso
- ✅ **Responsivo** - Funciona em desktop, tablet e mobile

## 📱 Branches

### `master`
- Versão estável e em produção
- Integrado e testado

### `feature/auth-login` ⭐ (Atual)
- **Novo**: Sistema de autenticação completo
- Login com email/senha
- Google OAuth 2.0 integration
- Gerenciamento de sessão
- Documentação completa

## 🚀 Quick Start

### Pré-requisitos
- Node.js 14+
- npm ou yarn
- Google Cloud Console account (para OAuth)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/pija14/prjAcademiaIA.git
cd prjAcademiaIA

# Checkout da branch de autenticação
git checkout feature/auth-login

# Instale as dependências do backend
npm install
```

### Configuração

1. **Google OAuth Setup**
   - Veja [AUTH_SETUP.md](./AUTH_SETUP.md) para instruções completas
   - Obtenha seu Client ID do Google Cloud Console
   - Atualize `auth/google-config.js`

2. **Variáveis de Ambiente**
   ```bash
   cp .env.example .env
   # Edite .env com suas configurações
   ```

3. **Iniciar Aplicação**
   ```bash
   # Backend
   npm start

   # Frontend acessível em
   http://localhost:3000
   ```

## 📁 Estrutura do Projeto

```
prjAcademiaIA/
├── 📄 index.html              # App principal
├── 📄 login.html              # Página de login
├── 📄 auth-callback.html      # Callback OAuth
├── 📂 styles/
│   ├── styles.css             # Estilos gerais
│   └── login.css              # Estilos de login
├── 📂 auth/
│   ├── google-config.js       # Config Google OAuth
│   ├── auth-manager.js        # Gerenciador de auth
│   └── login.js               # Lógica de login
├── 📂 icons/
│   └── icon.svg               # Logo do app
├── app.js                      # Lógica principal
├── config.js                   # Configurações
├── sw.js                       # Service Worker
├── manifest.json               # PWA manifest
├── AUTH_SETUP.md              # 🆕 Guia de autenticação
└── README.md                   # Este arquivo
```

## 🔐 Autenticação

### Fluxo de Login Local
```
Usuario Entra Credenciais → Valida Cliente → Envia para Backend → 
Verifica BD → Gera JWT → Retorna Token → Salva LocalStorage → 
Redireciona para App
```

### Fluxo Google OAuth
```
Click "Login com Google" → Carrega SDK Google → Abre Prompt → 
Autentica com Google → Retorna JWT → Envia para Backend → 
Cria/Atualiza Usuario → Retorna Token App → Salva LocalStorage → 
Redireciona para App
```

**Para mais detalhes**: Veja [AUTH_SETUP.md](./AUTH_SETUP.md)

## 🛠️ Tecnologias

### Frontend
- **HTML5** - Estrutura
- **CSS3** - Estilo (com animações e modo escuro)
- **Vanilla JavaScript** - Interatividade
- **PWA API** - Service Workers, Manifest, IndexedDB
- **Google Sign-In** - OAuth 2.0

### Backend (Exemplo Node.js)
- **Express.js** - Framework web
- **JWT** - Autenticação
- **MongoDB/PostgreSQL** - Banco de dados
- **Google Auth Library** - Validação de tokens

## 📚 Documentação

- [Guia de Autenticação](./AUTH_SETUP.md) - Setup completo de OAuth e login
- [API Reference](#api-reference) - Endpoints disponíveis
- [Troubleshooting](#troubleshooting) - Soluções para problemas comuns

## 🔗 API Reference

### Autenticação

#### POST `/api/auth/login`
Login com email e senha
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

#### POST `/api/auth/google`
Login com Google OAuth
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "userInfo": { "email": "...", "name": "...", ... }
}
```

#### POST `/api/auth/register`
Criar nova conta
```json
{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "João Silva"
}
```

Veja `AUTH_SETUP.md` para mais endpoints e exemplos de resposta.

## ⚙️ Configuração de Produção

### Deploy na Vercel/Netlify (Frontend)
```bash
# Conecte seu repositório
# Variáveis de ambiente:
REACT_APP_API_URL=https://api.seu-dominio.com
REACT_APP_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

### Deploy no Render/Heroku (Backend)
```bash
# Crie uma nova aplicação
# Configure variáveis:
JWT_SECRET=sua-chave-secreta
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-secret
DATABASE_URL=seu-banco-dados
```

## 🔒 Segurança

- ✅ Tokens JWT com expiração
- ✅ Validação de email no backend
- ✅ Hash de senhas (bcrypt)
- ✅ HTTPS obrigatório em produção
- ✅ CORS configurado
- ✅ Proteção contra XSS e CSRF

**Boas práticas**: Veja seção "Segurança" em [AUTH_SETUP.md](./AUTH_SETUP.md)

## 🐛 Troubleshooting

### "Google SDK não carregado"
```
→ Verifique conexão de internet
→ Desabilite bloqueador de anúncios
→ Verifique console do navegador (F12)
```

### "Token expirado"
```
→ Implemente refresh token flow
→ Redirecione para login quando expirar
```

### Erro CORS
```
→ Verifique CORS_ORIGIN no backend
→ Adicione seu domínio aos headers
```

Mais soluções em [AUTH_SETUP.md](./AUTH_SETUP.md#troubleshooting)

## 🤝 Contribuindo

1. Crie uma nova branch (`git checkout -b feature/sua-feature`)
2. Commit suas mudanças (`git commit -am 'Add nova feature'`)
3. Push para a branch (`git push origin feature/sua-feature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 👥 Autores

- **Seu Nome** - Developer/Maintainer
- GitHub: [@pija14](https://github.com/pija14)

## 📞 Suporte

- 📧 Email: suporte@gymia.com
- 🐛 Issues: [GitHub Issues](https://github.com/pija14/prjAcademiaIA/issues)
- 💬 Discussões: [GitHub Discussions](https://github.com/pija14/prjAcademiaIA/discussions)

## 🗺️ Roadmap

### Q4 2024
- [x] Sistema de autenticação
- [ ] Interface de treinos
- [ ] Biblioteca de exercícios

### Q1 2025
- [ ] Integração com IA (recomendações)
- [ ] Análise de dados e gráficos
- [ ] Modo offline melhorado

### Q2 2025
- [ ] App nativo iOS/Android
- [ ] Integração com wearables
- [ ] Comunidade e compartilhamento

---

**Última atualização**: 2026-09-21

⭐ Se gostou, deixe uma star! ⭐
