# 📋 Integracões da Aplicação NuP-est

## 🎯 Visão Geral

Este documento descreve todas as integrações externas utilizadas na aplicação NuP-est, suas funções específicas e como elas se conectam para formar o ecossistema completo da plataforma de estudos adaptativos.

---

## 🧠 Integracões de Inteligência Artificial

### 1. OpenRouter
**Arquivo:** `server/services/ai/providers/openrouter.ts`
**Função:** Provedor principal de IA para chat completions e análise de conteúdo

**Modelos Suportados:**
- `deepseek/deepseek-r1` (modelo padrão)
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-turbo`
- `openai/gpt-4o-mini`
- `meta-llama/llama-3.1-405b-instruct`

**Funcionalidades:**
- Geração de questões personalizadas baseadas no perfil do usuário
- Análise de materiais de estudo
- Chat com contexto RAG
- Geração de chunks inteligentes para documentos
- Feedback personalizado pós-quiz

**Variável de Ambiente:** `OPENROUTER_API_KEY`

### 2. Google Generative AI
**Arquivo:** `server/services/embeddings.ts`
**Função:** Geração de embeddings vetoriais para busca semântica

**Modelo Utilizado:** `text-embedding-004`

**Funcionalidades:**
- Conversão de texto em vetores de 768 dimensões
- Processamento em lotes para otimização
- Integração com Pinecone para busca semântica

**Variável de Ambiente:** `GOOGLE_AI_API_KEY`

### 3. DeepSeek R1 Service
**Arquivo:** `server/services/deepseekService.ts`
**Função:** Especializado em geração de chunks inteligentes

**Funcionalidades:**
- Análise de documentos de concursos públicos
- Extração estruturada de informações importantes
- Geração de chunks contextualizados

**Integração:** Via OpenRouter

---

## 🗄️ Integracões de Banco de Dados

### 1. PostgreSQL (Neon Database)
**Arquivo:** `server/db.ts`
**Função:** Banco de dados principal relacional

**Tecnologias:**
- Drizzle ORM para type-safety
- Neon Serverless Driver
- WebSocket support

**Schemas Principais:**
- `users` - Perfis de usuário e preferências de estudo
- `subjects` - Matérias de estudo
- `materials` - Materiais educacionais
- `goals` - Metas de estudo
- `sessions` - Sessões de autenticação

**Variável de Ambiente:** `DATABASE_URL`

### 2. Pinecone Vector Database
**Arquivo:** `server/services/pinecone.ts`
**Função:** Armazenamento e busca de embeddings vetoriais

**Configuração:**
- Índice: `nup-est-knowledge`
- Dimensões: 768 (compatível com Google Gemini)
- Métrica: Cosine similarity
- Cloud: AWS us-east-1

**Funcionalidades:**
- Busca semântica em materiais de estudo
- RAG (Retrieval-Augmented Generation)
- Indexação automática de documentos

**Variável de Ambiente:** `PINECONE_API_KEY`

---

## 🔐 Integracão de Autenticação

### Replit Auth (OpenID Connect)
**Arquivo:** `server/replitAuth.ts`
**Função:** Sistema de autenticação com OAuth

**Tecnologias:**
- OpenID Connect client
- Passport.js strategies
- Express session management
- PostgreSQL session storage

**Funcionalidades:**
- Login único com conta Replit
- Gerenciamento automático de sessões
- Refresh token automático
- Integração com perfil do usuário

**Variáveis de Ambiente:**
- `REPLIT_DOMAINS`
- `ISSUER_URL`
- `REPL_ID`
- `SESSION_SECRET`

---

## 📄 Integracões de Processamento de Arquivos

### 1. Multer
**Arquivo:** `server/config/uploadConfig.ts`
**Função:** Gerenciamento de uploads de arquivos

**Configurações:**
- **Editais:** Até 50MB, múltiplos formatos
- **Materiais:** Documentos padrão
- **Base de Conhecimento:** PDFs até 12MB

### 2. PDF Processing
**Arquivo:** `server/services/pdf.ts`
**Função:** Extração de texto de documentos PDF

**Biblioteca:** `pdf-parse`
**Funcionalidades:**
- Processamento otimizado de memória
- Chunking inteligente
- Validação de tamanho (limite 12MB)

### 3. DOCX Processing
**Arquivo:** `server/services/fileProcessor.ts`
**Função:** Processamento de documentos Word

**Biblioteca:** `mammoth`
**Funcionalidades:**
- Extração de texto preservando formatação
- Metadados do documento

### 4. Excel/CSV Processing
**Arquivo:** `server/services/fileProcessor.ts`
**Função:** Processamento de planilhas e dados tabulares

**Bibliotecas:**
- `xlsx` (SheetJS) para Excel
- `csv-parser` para CSV

---

## 🌐 Integracões de Serviços Externos

### 1. External Processing Service
**Arquivo:** `server/services/externalProcessingService.ts`
**Função:** Processamento avançado de documentos via API externa

**Funcionalidades:**
- OCR avançado
- Processamento de chunks
- Geração de embeddings
- Indexação automática no Pinecone

**Variáveis de Ambiente:**
- `PROCESSING_SERVICE_URL`
- `PROCESSING_SERVICE_API_KEY`

### 2. Web Scraping
**Arquivo:** `server/services/web-scraper.ts`, `server/services/browser-scraper.ts`
**Função:** Coleta de dados da web

**Bibliotecas:**
- `cheerio` para parsing HTML
- `puppeteer` para scraping avançado

---

## 🎨 Integracões Frontend

### 1. TanStack Query (React Query)
**Arquivo:** `client/src/lib/queryClient.ts`
**Função:** Gerenciamento de estado do servidor

**Funcionalidades:**
- Cache inteligente
- Sincronização automática
- Otimistic updates
- Background refetching

### 2. Wouter
**Função:** Roteamento client-side
**Funcionalidades:**
- Roteamento leve e rápido
- Hooks para navegação
- Suporte a parâmetros dinâmicos

### 3. shadcn/ui + Radix UI
**Função:** Biblioteca de componentes UI

**Tecnologias:**
- Radix UI primitives
- Tailwind CSS
- Componentes acessíveis
- Design system consistente

### 4. React Hook Form + Zod
**Função:** Gerenciamento de formulários

**Funcionalidades:**
- Validação type-safe
- Performance otimizada
- Integração com schemas Drizzle

---

## ⚙️ Integracões de Infraestrutura

### 1. BullMQ
**Arquivo:** `server/services/queue.ts`
**Função:** Sistema de filas para processamento assíncrono

**Funcionalidades:**
- Processamento de PDFs em background
- Retry automático
- Monitoramento de jobs

### 2. Express Session
**Função:** Gerenciamento de sessões HTTP

**Configuração:**
- Storage no PostgreSQL
- Cookies HttpOnly e Secure
- TTL de 7 dias

---

## 🎯 Integracão RAG (Retrieval-Augmented Generation)

### RAG Service
**Arquivo:** `server/services/rag.ts`
**Função:** Orquestração de busca e geração contextual

**Fluxo:**
1. Query do usuário → Embedding (Google AI)
2. Busca semântica → Pinecone
3. Contexto + Query → OpenRouter AI
4. Resposta contextualizada

**Funcionalidades:**
- Re-ranking de resultados
- Filtragem por categoria
- Controle de similaridade mínima
- Limitação de contexto

---

## 📊 Diagrama de Arquitetura das Integracões

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  React Query │ Wouter Router │ shadcn/ui │ React Hook Form     │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP API Calls
┌─────────────────▼───────────────────────────────────────────────┐
│                    EXPRESS.JS SERVER                           │
├─────────────────────────────────────────────────────────────────┤
│              Authentication Layer (Replit Auth)                │
│                     Session Management                         │
└─────────────┬─────────────┬─────────────┬─────────────┬─────────┘
              │             │             │             │
    ┌─────────▼──┐   ┌─────▼──┐   ┌─────▼──┐   ┌─────▼──┐
    │    AI      │   │Database│   │ Files  │   │External│
    │ Services   │   │Services│   │Process │   │Services│
    └─────┬──────┘   └─────┬──┘   └─────┬──┘   └─────┬──┘
          │                │            │            │
    ┌─────▼──────┐  ┌─────▼──────┐ ┌───▼─────┐ ┌───▼─────┐
    │ OpenRouter │  │PostgreSQL  │ │ Multer  │ │External │
    │   DeepSeek │  │   (Neon)   │ │pdf-parse│ │Process  │
    │Google Gemini│  │  Pinecone  │ │mammoth  │ │Service  │
    │    RAG     │  │  Sessions  │ │  xlsx   │ │Cheerio  │
    └────────────┘  └────────────┘ └─────────┘ └─────────┘
```

## 🔄 Fluxo de Processamento de Documentos

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │───▶│  Validation │───▶│   Storage   │
│   (Multer)  │    │(Size/Type)  │    │(File System)│
└─────────────┘    └─────────────┘    └─────┬───────┘
                                            │
┌─────────────┐    ┌─────────────┐    ┌─────▼───────┐
│  AI Queue   │◀───│Text Extract │◀───│File Process │
│  (BullMQ)   │    │(pdf-parse)  │    │(Detect Type)│
└─────┬───────┘    └─────────────┘    └─────────────┘
      │
┌─────▼───────┐    ┌─────────────┐    ┌─────────────┐
│   DeepSeek  │───▶│ Embeddings  │───▶│  Pinecone   │
│(Chunking AI)│    │(Google AI)  │    │ (Indexing)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🎯 Fluxo RAG para Questões Inteligentes

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│User Profile │    │User Question│    │  Embedding  │
│(Study Type) │    │   Input     │    │(Google AI)  │
└─────┬───────┘    └─────┬───────┘    └─────┬───────┘
      │                  │                  │
      └─────────┬────────┴──────────────────┘
                │
┌───────────────▼───────────────┐
│        RAG Service            │
│   Context + Profile Aware     │
└───────────┬───────────────────┘
            │
┌───────────▼───────────────┐    ┌─────────────┐
│     Pinecone Search       │───▶│   Content   │
│ (Semantic Similarity)     │    │ Re-ranking  │
└───────────────────────────┘    └─────┬───────┘
                                       │
┌─────────────┐    ┌─────────────┐    ┌─────▼───────┐
│  OpenRouter │◀───│AI Generation│◀───│   Context   │
│(DeepSeek R1)│    │(Contextual) │    │ Preparation │
└─────┬───────┘    └─────────────┘    └─────────────┘
      │
┌─────▼───────┐
│ Personalized│
│  Question   │
└─────────────┘
```

## 🔧 Variáveis de Ambiente Necessárias

```bash
# Database
DATABASE_URL=postgresql://...

# AI Services
OPENROUTER_API_KEY=sk-or-...
GOOGLE_AI_API_KEY=...
PINECONE_API_KEY=...

# Authentication
REPLIT_DOMAINS=...
ISSUER_URL=https://replit.com/oidc
REPL_ID=...
SESSION_SECRET=...

# External Processing (Optional)
PROCESSING_SERVICE_URL=https://...
PROCESSING_SERVICE_API_KEY=...
```

## 📈 Métricas e Monitoramento

### AI Provider Metrics
- Tokens utilizados por modelo
- Tempo de resposta
- Taxa de sucesso/falha
- Custo por requisição

### Database Performance
- Queries por segundo
- Tempo de resposta
- Conexões ativas
- Cache hit rate

### File Processing
- Throughput de documentos
- Tempo médio de processamento
- Taxa de erro por tipo de arquivo
- Uso de memória durante processamento

---

## 🚀 Próximas Integracões Planejadas

1. **Stripe** - Processamento de pagamentos
2. **Twilio** - Notificações SMS
3. **SendGrid** - Email marketing
4. **Google Analytics** - Métricas de uso
5. **Sentry** - Monitoramento de erros

---

*Documentação atualizada em: 18 de Setembro de 2025*
*Versão: 1.0*