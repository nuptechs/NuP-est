# 🎓 easy-nup - AI-Powered Educational Apps Monorepo

> **Monorepo moderno contendo múltiplas aplicações educacionais com IA**

## 📦 Apps Disponíveis

### 🔐 **NuP-Identify** (CORE/Principal)
Sistema centralizado de autenticação e autorização - **Porta de entrada para todo o ecossistema**
- ✅ Single Sign-On (SSO) para todos os apps NuP
- 👥 Gestão de usuários, organizações e permissões
- 🔑 Controle de acesso granular por app
- 🎯 Gateway de autenticação unificado

### 🎓 **NuP-Study** (App Educacional Principal)
Plataforma adaptativa de gestão de estudos com IA personalizada
- 🧠 **Professor IA** - Tutor com voz ultra-baixa latência (<500ms)
- 🗺️ **Mapas Mentais** - Visualização inteligente de conceitos
- 🎴 **Flashcards** - Sistema de memorização espaçada
- 📚 **Biblioteca** - Gestão de materiais de estudo
- 📊 **Analytics** - Acompanhamento de progresso

### 📊 **NuP-AIM**
Análise de Impacto de Mudanças
- Extração e análise de editais e documentos

### 🌐 **Gateway**
Proxy reverso para arquitetura Multi-Repl
- Roteamento inteligente entre apps
- Health checks e logging centralizado

---

## 🏗️ Arquitetura

```
easy-nup/
├── apps/                    # Aplicações deployáveis
│   ├── nup-identify/       → CORE: Auth & SSO (porta de entrada)
│   ├── nup-study/          → App educacional principal
│   ├── nup-aim/            → Análise de impacto
│   └── gateway/            → Proxy reverso
│
├── packages/@nup/          # Pacotes compartilhados
│   ├── ui/                 → Design System (shadcn)
│   ├── shared-types/       → TypeScript types
│   ├── api-client/         → TanStack Query client
│   └── auth-client/        → Cliente de autenticação
│
└── features/@nup/          # Features reutilizáveis
    ├── flashcards/         → Sistema de flashcards
    ├── mindmaps/           → Mapas mentais
    └── professor-ia/       → Tutor IA com voz
```

---

## 🚀 Quick Start

### Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Rodar app principal (NuP-Study)
pnpm dev

# Rodar todos os apps
node scripts/run-all-apps.sh
```

### Build & Deploy

```bash
# Build de um app específico
cd apps/nup-study && pnpm run build

# Criar deployment bundle
./scripts/deploy-nup-study.sh

# Deploy para produção
# Ver: docs/DEPLOYMENT_GUIDE.md
```

---

## 📚 Documentação

- **[Arquitetura](docs/ARQUITETURA.md)** - Visão completa do sistema
- **[Monorepo Guide](MONOREPO.md)** - Estrutura e governança
- **[CI/CD Guide](docs/CI-CD-GUIDE.md)** - Pipeline de deployment
- **[Multi-Repl Architecture](MULTI_REPL_MIGRATION.md)** - Deployment distribuído

---

## 🛠️ Stack Tecnológica

**Frontend:**
- React 18 + TypeScript
- Vite + Wouter (routing)
- TanStack Query (state)
- shadcn/ui + Tailwind CSS

**Backend:**
- Express.js + TypeScript (ESM)
- Drizzle ORM + PostgreSQL (Neon)
- Passport.js (auth)

**AI/ML:**
- OpenAI API (GPT-4o, Whisper, TTS)
- Pinecone (vector DB)
- Deepgram (STT/TTS premium)

**Infra:**
- Turborepo + pnpm workspaces
- GitHub Actions (CI/CD)
- Replit (hosting)

---

## 🔑 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# AI Services
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
DEEPGRAM_API_KEY=...

# Auth
JWT_SECRET=...
```

---

## 📖 Guias Rápidos

### Adicionar Nova Feature

```bash
# 1. Criar em features/@nup/
mkdir -p features/@nup/minha-feature

# 2. Adicionar build config (tsup)
# 3. Usar em apps com workspace:*
```

### Adicionar Novo App

```bash
# 1. Criar em apps/
mkdir -p apps/meu-app

# 2. Configurar package.json
# 3. Registrar no turbo.json
```

Ver: [MONOREPO.md](MONOREPO.md) para detalhes completos.

---

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova feature'`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

## 🎯 Roadmap

- [x] NuP-Study v1.0 - App principal
- [x] Professor IA - Tutor com voz
- [x] Mapas Mentais - Visualização
- [x] NuP-Identify - Auth centralizado
- [ ] NuP-Chunks - Processamento de documentos
- [ ] NuP-Kan - Kanban para estudos
- [ ] Mobile apps (React Native)

---

**Made with ❤️ for students**
