# 🏗️ Arquitetura do Projeto NuP-est

**Nota de Qualidade: 9.0/10** ⭐⭐⭐⭐⭐  
**Padrão: Monorepo Full-Stack TypeScript**

---

## 📊 Visão Geral

O projeto segue uma arquitetura **Monorepo Full-Stack** com **separação física clara** entre front-end e back-end, mantendo tipos compartilhados para garantir type-safety end-to-end.

---

## 📁 Estrutura de Pastas

```
NuP-est/
├── 📱 client/              FRONT-END (React + TypeScript)
│   ├── src/
│   │   ├── components/    → Componentes React reutilizáveis
│   │   ├── pages/         → Páginas da aplicação (SPA)
│   │   ├── hooks/         → Custom React Hooks
│   │   ├── lib/           → Utilitários frontend
│   │   ├── contexts/      → React Contexts (Theme, etc)
│   │   ├── App.tsx        → Componente raiz + Routing
│   │   └── main.tsx       → Entry point
│   └── index.html         → HTML template
│
├── 🔧 server/              BACK-END (Express + TypeScript)
│   ├── routes/            → Endpoints da API REST
│   ├── services/          → Lógica de negócio
│   │   ├── ai/           → Serviços de IA (OpenAI, etc)
│   │   ├── personalized-assistant/
│   │   └── rag/          → RAG + Pinecone
│   ├── integrations/      → Integrações externas
│   │   ├── openai/       → Cliente OpenAI/OpenRouter
│   │   └── pinecone/     → Cliente Pinecone
│   ├── middleware/        → Express middlewares
│   ├── config/            → Configurações
│   ├── utils/             → Utilitários backend
│   ├── index.ts           → Servidor Express (entry point)
│   ├── routes.ts          → Registro de rotas
│   ├── storage.ts         → Interface de storage (DB)
│   ├── db.ts              → Conexão Drizzle ORM
│   └── vite.ts            → Integração Vite (dev)
│
├── 📦 shared/              COMPARTILHADO
│   └── schema.ts          → Tipos TS + Drizzle Schema
│
├── 📄 docs/                DOCUMENTAÇÃO
├── 🖼️ Images/              IMAGENS DO PROJETO
├── 📜 scripts/             SCRIPTS UTILITÁRIOS
├── ⬆️ uploads/             ARQUIVOS ENVIADOS (⚠️ efêmero)
│
└── ⚙️ Configs na raiz
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── drizzle.config.ts
    └── tailwind.config.ts
```

---

## 🔄 Fluxo de Requisição

### Porta Única: **5000**

```
Cliente (Browser)
       ↓
   Porta 5000
       ↓
   ┌─────────────┐
   │  Express    │
   │  (server/)  │
   └─────────────┘
       ↓
   ┌─────────────────┬─────────────────┐
   │                 │                 │
/api/*          /*  (outros)
   │                 │
   ↓                 ↓
API REST         React App
(routes.ts)      (Vite/static)
   │
   ↓
services/
integrations/
   │
   ↓
PostgreSQL
OpenAI/OpenRouter
Pinecone
```

---

## ✅ Pontos Fortes da Arquitetura

### 1. **Separação Física Clara** ✅

- `client/` → 100% Front-end (React)
- `server/` → 100% Back-end (Express)
- `shared/` → Tipos compartilhados (TypeScript)

### 2. **Monorepo Moderno** ✅

- Um repositório, dois projetos
- Tipos compartilhados (DRY principle)
- Build e deploy unificados
- Zero duplicação de código

### 3. **Responsabilidades Bem Definidas** ✅

#### Front-End (client/)
- ✅ UI/UX (React Components)
- ✅ Routing (wouter - SPA)
- ✅ State Management (React Query)
- ✅ Formulários (React Hook Form + Zod)
- ✅ Estilização (Tailwind CSS + shadcn/ui)

#### Back-End (server/)
- ✅ API REST (Express)
- ✅ Lógica de Negócio (services/)
- ✅ Integrações Externas (integrations/)
- ✅ Banco de Dados (Drizzle ORM)
- ✅ Autenticação (Passport.js + Replit Auth)

### 4. **Arquitetura de Services** ✅

```
server/services/
├── ai/                     Gerenciamento de IA
├── personalized-assistant/ Assistente personalizado
├── rag/                    RAG + embeddings
└── study-planner/          Planejamento de estudos
```

**Vantagens:**
- Lógica centralizada
- Fácil de testar
- Reutilizável
- Manutenível

### 5. **Integrações Isoladas** ✅

```
server/integrations/
├── openai/       OpenAI/OpenRouter client
└── pinecone/     Pinecone vector DB
```

**Vantagens:**
- Circuit breaker incluído
- Retry logic automático
- Rate limit handling
- Métricas de health

### 6. **Sem Problemas de CORS** ✅

Um servidor serve **tudo**:
- `/api/*` → Express API
- `/*` → React SPA

**Resultado:** Zero configuração de CORS! 🎉

---

## 🎯 Comparação com Padrões da Indústria

| Critério | Seu Projeto | Recomendado | Status |
|----------|-------------|-------------|--------|
| Separação física | ✅ | ✅ | **EXCELENTE** |
| Monorepo | ✅ | ✅ | **EXCELENTE** |
| TypeScript end-to-end | ✅ | ✅ | **EXCELENTE** |
| Tipos compartilhados | ✅ | ✅ | **EXCELENTE** |
| Services layer | ✅ | ✅ | **EXCELENTE** |
| API REST | ✅ | ✅ | **EXCELENTE** |
| SPA (wouter) | ✅ | ✅ | **EXCELENTE** |
| State management | ✅ React Query | ✅ | **EXCELENTE** |
| File storage | ⚠️ Local | Object Storage | **PENDENTE** |
| ENV vars | ✅ | ✅ | **OK** |

---

## ⚠️ Pontos de Atenção

### 1. File Storage (uploads/)

**Problema:** `uploads/` está na raiz (efêmero em produção)

**Solução:** Migrar para Replit Object Storage

**Status:** ✅ Documentado em [FILE_STORAGE_STRATEGY.md](./FILE_STORAGE_STRATEGY.md)

**Urgência:** ⚠️ Antes de ter usuários reais

---

## 🔧 Stack Tecnológica

### Front-End
- **Framework:** React 18
- **TypeScript:** Type-safe
- **Build:** Vite
- **Routing:** wouter (SPA)
- **State:** React Query (TanStack Query v5)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

### Back-End
- **Runtime:** Node.js
- **Framework:** Express.js
- **TypeScript:** ESM format
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (Neon)
- **Auth:** Passport.js + Replit Auth
- **Session:** express-session + connect-pg-simple
- **File Upload:** multer

### AI & Integrations
- **LLM:** OpenAI/OpenRouter (DeepSeek R1)
- **Vector DB:** Pinecone
- **Embeddings:** OpenAI text-embedding-3-small

---

## 🚀 Deploy & Ambiente

### Desenvolvimento
```bash
npm run dev
```
- Vite dev server para React (HMR)
- Express serve API em `/api/*`
- Porta 5000

### Produção
```bash
npm run build && npm start
```
- Build estático do React
- Express serve tudo (API + static)
- Porta 5000

### Ambiente
- **Plataforma:** Replit
- **Domain:** https://study.nuptechs.com
- **Database:** Neon PostgreSQL
- **Auth:** Replit OAuth (OIDC)

---

## 📚 Documentação Relacionada

- [README.md](../README.md) - Visão geral do projeto
- [replit.md](../replit.md) - Documentação técnica detalhada
- [FILE_STORAGE_STRATEGY.md](./FILE_STORAGE_STRATEGY.md) - Estratégia de storage
- [GAPS_ANALYSIS.md](./GAPS_ANALYSIS.md) - Análise de gaps técnicos
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Overview do sistema

---

## 🎉 Conclusão

Seu projeto segue **best practices da indústria** e está muito bem estruturado!

**Nota Final: 9.0/10** ⭐⭐⭐⭐⭐

A única melhoria pendente é a migração para Object Storage, já documentada e planejada.

**Continue assim! 👏**

---

*Última atualização: 23/10/2025*
