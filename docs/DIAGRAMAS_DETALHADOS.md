# 🎯 Diagramas Detalhados das Integracões NuP-est

## 📊 Diagrama de Interações Completo

```
                    ┌─────────────────────────────────────────┐
                    │             USUÁRIO FINAL               │
                    └─────────────────┬───────────────────────┘
                                      │ Acesso via Navegador
                    ┌─────────────────▼───────────────────────┐
                    │          CAMADA FRONTEND                │
                    │  ┌─────────────────────────────────────┐ │
                    │  │         React Application           │ │
                    │  │  ┌─────────┐ ┌─────────┐ ┌────────┐ │ │
                    │  │  │ Wouter  │ │shadcn/ui│ │ Forms  │ │ │
                    │  │  │ Router  │ │ + Radix │ │ + Zod  │ │ │
                    │  │  └─────────┘ └─────────┘ └────────┘ │ │
                    │  └─────────────────────────────────────┘ │
                    │  ┌─────────────────────────────────────┐ │
                    │  │       TanStack Query                │ │
                    │  │    (Estado do Servidor)             │ │
                    │  └─────────────────────────────────────┘ │
                    └─────────────────┬───────────────────────┘
                                      │ HTTP API Requests
┌─────────────────────────────────────▼─────────────────────────────────────────┐
│                           CAMADA BACKEND (Express.js)                         │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      MIDDLEWARE DE AUTENTICAÇÃO                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │  │
│  │  │   Passport  │ │   Session   │ │   OIDC      │ │  User Context   │   │  │
│  │  │   Strategy  │ │ Management  │ │  Discovery  │ │   Injection     │   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         CAMADA DE ROTEAMENTO                           │  │
│  │                              (routes.ts)                               │  │
│  └─────────────────┬───────────┬───────────┬───────────┬───────────────────┘  │
│                    │           │           │           │                      │
│  ┌─────────────────▼┐ ┌───────▼─┐ ┌──────▼──┐ ┌──────▼──┐ ┌─────────────────┐ │
│  │   AI SERVICES    │ │DATABASE │ │  FILES  │ │EXTERNAL │ │   QUEUE JOBS    │ │
│  │                  │ │SERVICES │ │PROCESS  │ │SERVICES │ │                 │ │
│  └─────────────────┬┘ └───────┬─┘ └──────┬──┘ └──────┬──┘ └─────────────────┘ │
└────────────────────┼──────────┼─────────┼─────────┼─────────────────────────┘
                     │          │         │         │
        ┌────────────▼─┐  ┌─────▼────┐ ┌──▼─────────┐ ┌─▼──────────────┐
        │              │  │          │ │            │ │                │
        │ AI ECOSYSTEM │  │DATABASES │ │FILE SYSTEM │ │ EXTERNAL APIs  │
        │              │  │          │ │            │ │                │
        └──────────────┘  └──────────┘ └────────────┘ └────────────────┘
```

## 🧠 Ecossistema de IA Detalhado

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI MANAGER CENTRAL                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              MODEL SELECTOR                             │    │
│  │  • Seleção baseada em contexto                         │    │
│  │  • Fallback automático                                 │    │
│  │  • Métricas de performance                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────┬───────────────┬───────────────┬───────────────────┘
              │               │               │
    ┌─────────▼─┐   ┌─────────▼─┐   ┌─────────▼─┐
    │ OpenRouter│   │Google Gen │   │    RAG    │
    │ Provider  │   │AI Provider│   │  Service  │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
    ┌─────▼─────────────────────────────────▼─────┐
    │            MODELOS DISPONÍVEIS              │
    │                                             │
    │  ┌─────────────┐  ┌─────────────────────┐  │
    │  │ DeepSeek R1 │  │  text-embedding-004 │  │
    │  │ (Chunking)  │  │    (Embeddings)     │  │
    │  └─────────────┘  └─────────────────────┘  │
    │                                             │
    │  ┌─────────────┐  ┌─────────────────────┐  │
    │  │Claude 3.5   │  │    Llama 3.1        │  │
    │  │Sonnet       │  │    405B Instruct    │  │
    │  └─────────────┘  └─────────────────────┘  │
    │                                             │
    │  ┌─────────────┐  ┌─────────────────────┐  │
    │  │  GPT-4      │  │     GPT-4o          │  │
    │  │  Turbo      │  │     Mini            │  │
    │  └─────────────┘  └─────────────────────┘  │
    └─────────────────────────────────────────────┘
```

## 💾 Arquitetura de Dados Detalhada

```
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA DE PERSISTÊNCIA                       │
│                                                                 │
│  ┌─────────────────────┐           ┌─────────────────────────┐  │
│  │   PostgreSQL        │           │      Pinecone          │  │
│  │   (Neon Serverless) │           │   (Vector Database)    │  │
│  │                     │           │                        │  │
│  │ ┌─────────────────┐ │           │ ┌───────────────────┐  │  │
│  │ │     TABLES      │ │           │ │     VECTORS       │  │  │
│  │ │                 │ │           │ │                   │  │  │
│  │ │ ├─ users        │ │           │ │ ├─ embeddings    │  │  │
│  │ │ ├─ subjects     │ │◀─────────▶│ │ ├─ metadata      │  │  │
│  │ │ ├─ materials    │ │           │ │ ├─ chunks        │  │  │
│  │ │ ├─ goals        │ │           │ │ └─ similarity    │  │  │
│  │ │ ├─ sessions     │ │           │ │                   │  │  │
│  │ │ ├─ study_logs   │ │           │ └───────────────────┘  │  │
│  │ │ └─ ai_questions │ │           │                        │  │
│  │ └─────────────────┘ │           │ Dimensões: 768        │  │
│  │                     │           │ Métrica: Cosine       │  │
│  │ Drizzle ORM         │           │ Índice: nup-est       │  │
│  │ Type-Safe Queries   │           │ Cloud: AWS us-east-1  │  │
│  └─────────────────────┘           └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                   ┌─────────────▼─────────────┐
                   │     SESSION STORAGE       │
                   │  ┌─────────────────────┐  │
                   │  │  Express Sessions   │  │
                   │  │                     │  │
                   │  │ ├─ User Context     │  │
                   │  │ ├─ Auth Tokens      │  │
                   │  │ ├─ Preferences      │  │
                   │  │ └─ Cache Data       │  │
                   │  └─────────────────────┘  │
                   │                           │
                   │  TTL: 7 dias              │
                   │  Storage: PostgreSQL      │
                   └───────────────────────────┘
```

## 📄 Pipeline de Processamento de Arquivos

```
┌─────────────┐
│   UPLOAD    │
│   REQUEST   │
└─────┬───────┘
      │
┌─────▼───────┐    ┌─────────────┐    ┌─────────────┐
│   MULTER    │───▶│ VALIDATION  │───▶│  STORAGE    │
│ Middleware  │    │             │    │             │
│             │    │ ┌─────────┐ │    │ ┌─────────┐ │
│ • Size      │    │ │ Size    │ │    │ │ Disk    │ │
│ • Type      │    │ │ MIME    │ │    │ │ System  │ │
│ • Security  │    │ │ Format  │ │    │ │ Path    │ │
└─────────────┘    │ └─────────┘ │    │ └─────────┘ │
                   └─────────────┘    └─────┬───────┘
                                            │
                   ┌─────────────────────────▼─────────────────────────┐
                   │            FILE TYPE DETECTION                    │
                   └─┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─┘
                     │     │     │     │     │     │     │     │     │
              ┌──────▼┐ ┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼─┐┌──▼─┐┌──▼─┐
              │  PDF  ││DOCX ││ DOC ││XLSX ││ XLS ││CSV ││JSON││TXT │
              └──┬────┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└─┬──┘└─┬──┘└─┬──┘
                 │        │      │      │      │     │     │     │
              ┌──▼────┐┌──▼───┐┌─▼───┐┌─▼───┐┌─▼───┐┌▼───┐┌▼───┐┌▼───┐
              │pdf-   ││mam-  ││mam- ││xlsx ││xlsx ││csv ││JSON││fs  │
              │parse  ││moth  ││moth ││lib  ││lib  ││parser│.parse│read │
              └──┬────┘└──┬───┘└─┬───┘└─┬───┘└─┬───┘└┬───┘└┬───┘└┬───┘
                 │        │      │      │      │     │     │     │
                 └────────┼──────┼──────┼──────┼─────┼─────┼─────┘
                          │      │      │      │     │     │
                          └──────┼──────┼──────┼─────┼─────┘
                                 │      │      │     │
                                 └──────┼──────┼─────┘
                                        │      │
                                        └──────┘
                                               │
                          ┌────────────────────▼───────────────────┐
                          │           TEXT EXTRACTION              │
                          │                                        │
                          │  ┌─────────────────────────────────┐   │
                          │  │        CONTENT OBJECT           │   │
                          │  │                                 │   │
                          │  │ • text: string                  │   │
                          │  │ • metadata: object              │   │
                          │  │ • pageCount?: number            │   │
                          │  │ • sheetNames?: string[]         │   │
                          │  │ • rowCount?: number             │   │
                          │  └─────────────────────────────────┘   │
                          └────────────────────┬───────────────────┘
                                               │
                          ┌────────────────────▼───────────────────┐
                          │         INTELLIGENT PROCESSING         │
                          │                                        │
                          │  ┌─────────────┐  ┌─────────────────┐  │
                          │  │  DeepSeek   │  │   BullMQ Queue  │  │
                          │  │  Chunking   │  │   Processing    │  │
                          │  └─────┬───────┘  └─────────┬───────┘  │
                          │        │                    │          │
                          │        ▼                    ▼          │
                          │  ┌─────────────┐  ┌─────────────────┐  │
                          │  │Smart Chunks │  │Background Jobs  │  │
                          │  │Generation   │  │Management       │  │
                          │  └─────┬───────┘  └─────────┬───────┘  │
                          └────────┼────────────────────┼──────────┘
                                   │                    │
                                   └────────┬───────────┘
                                            │
                          ┌─────────────────▼─────────────────┐
                          │       VECTOR INDEXING             │
                          │                                   │
                          │  ┌─────────────────────────────┐  │
                          │  │    Google Generative AI     │  │
                          │  │   text-embedding-004        │  │
                          │  └─────────────┬───────────────┘  │
                          │                │                  │
                          │  ┌─────────────▼───────────────┐  │
                          │  │      Pinecone Upload        │  │
                          │  │   Vector + Metadata         │  │
                          │  └─────────────────────────────┘  │
                          └───────────────────────────────────┘
```

## 🔄 Fluxo RAG Completo com Contexto do Usuário

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA DO USUÁRIO                          │
└─────────────┬───────────────┬───────────────┬───────────────────┘
              │               │               │
    ┌─────────▼─┐   ┌─────────▼─┐   ┌─────────▼─┐
    │User Query │   │User Profile│   │ Context  │
    │           │   │            │   │          │
    │• Question │   │• Study     │   │• Subject │
    │• Intent   │   │  Profile   │   │• Topic   │
    │• Context  │   │• Difficul- │   │• Session │
    │           │   │  ties      │   │  Data    │
    └─────┬─────┘   │• Learning  │   │          │
          │         │  Style     │   │          │
          │         └─────┬─────┘   └─────┬─────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │          QUERY PREPROCESSING              │
    │                                           │
    │ • Intent analysis                         │
    │ • Query enhancement                       │
    │ • Context injection                       │
    │ • Profile considerations                  │
    └─────────────────────┬─────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │         EMBEDDING GENERATION              │
    │                                           │
    │  ┌─────────────────────────────────────┐  │
    │  │      Google Generative AI           │  │
    │  │     text-embedding-004              │  │
    │  │                                     │  │
    │  │ Input: Enhanced Query               │  │
    │  │ Output: 768-dim Vector              │  │
    │  └─────────────────────────────────────┘  │
    └─────────────────────┬─────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │        PINECONE SEMANTIC SEARCH           │
    │                                           │
    │  ┌─────────────────────────────────────┐  │
    │  │        Search Parameters            │  │
    │  │                                     │  │
    │  │ • Vector: query_embedding           │  │
    │  │ • TopK: 20 (initial)               │  │
    │  │ • Filter: userId, category          │  │
    │  │ • MinSimilarity: 0.7                │  │
    │  │ • IncludeMetadata: true             │  │
    │  └─────────────────────────────────────┘  │
    │                                           │
    │  ┌─────────────────────────────────────┐  │
    │  │          Results                    │  │
    │  │                                     │  │
    │  │ • Similarity scores                 │  │
    │  │ • Content chunks                    │  │
    │  │ • Metadata (title, category)       │  │
    │  │ • Source information                │  │
    │  └─────────────────────────────────────┘  │
    └─────────────────────┬─────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │          CONTENT RE-RANKING               │
    │                                           │
    │ • Relevance scoring                       │
    │ • Diversity filtering                     │
    │ • User profile matching                   │
    │ • Recency weighting                       │
    │ • Context prioritization                  │
    │                                           │
    │ Final TopK: 5-8 chunks                   │
    └─────────────────────┬─────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │        CONTEXT PREPARATION                │
    │                                           │
    │  ┌─────────────────────────────────────┐  │
    │  │       Context Assembly              │  │
    │  │                                     │  │
    │  │ • User profile integration          │  │
    │  │ • Content summarization             │  │
    │  │ • Source attribution               │  │
    │  │ • Difficulty adjustment             │  │
    │  │ • Length optimization               │  │
    │  └─────────────────────────────────────┘  │
    └─────────────────────┬─────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │         AI GENERATION                     │
    │                                           │
    │  ┌─────────────────────────────────────┐  │
    │  │        OpenRouter Request           │  │
    │  │                                     │  │
    │  │ Model: deepseek/deepseek-r1         │  │
    │  │ Temperature: 0.7                    │  │
    │  │ MaxTokens: 1500                     │  │
    │  │                                     │  │
    │  │ System: Profile-aware assistant     │  │
    │  │ User: Query + Context + Profile     │  │
    │  └─────────────────────────────────────┘  │
    │                                           │
    │  ┌─────────────────────────────────────┐  │
    │  │       Fallback Models               │  │
    │  │                                     │  │
    │  │ 1. Claude 3.5 Sonnet               │  │
    │  │ 2. GPT-4 Turbo                     │  │
    │  │ 3. GPT-4o Mini                     │  │
    │  │ 4. Llama 3.1 405B                  │  │
    │  └─────────────────────────────────────┘  │
    └─────────────────────┬─────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │          RESPONSE PROCESSING              │
    │                                           │
    │ • Answer validation                       │
    │ • Source citation                         │
    │ • Confidence scoring                      │
    │ • Follow-up suggestions                   │
    │ • Difficulty level tagging               │
    └─────────────────────┬─────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │          FINAL RESPONSE                   │
    │                                           │
    │  ┌─────────────────────────────────────┐  │
    │  │        Response Object              │  │
    │  │                                     │  │
    │  │ • answer: string                    │  │
    │  │ • sources: array                    │  │
    │  │ • confidence: number                │  │
    │  │ • suggestions: array                │  │
    │  │ • metadata: object                  │  │
    │  └─────────────────────────────────────┘  │
    └───────────────────────────────────────────┘
```

## 🔗 Mapa de Dependências Externas

```
External APIs & Services
├── AI/ML Services
│   ├── OpenRouter (https://openrouter.ai/api/v1)
│   │   ├── DeepSeek R1
│   │   ├── Claude 3.5 Sonnet
│   │   ├── GPT-4 Turbo
│   │   ├── GPT-4o Mini
│   │   └── Llama 3.1 405B
│   └── Google Generative AI
│       └── text-embedding-004
│
├── Databases
│   ├── Neon PostgreSQL (Serverless)
│   │   ├── Connection Pool
│   │   ├── WebSocket Support
│   │   └── SSL Encryption
│   └── Pinecone Vector DB
│       ├── AWS us-east-1
│       ├── Cosine Similarity
│       └── 768 Dimensions
│
├── Authentication
│   ├── Replit OpenID Connect
│   │   ├── OAuth 2.0 Flow
│   │   ├── Token Management
│   │   └── Profile Integration
│   └── Session Storage
│       ├── PostgreSQL Backend
│       ├── Cookie Management
│       └── TTL Control
│
├── File Processing Libraries
│   ├── pdf-parse (PDF extraction)
│   ├── mammoth (DOCX processing)
│   ├── xlsx (Excel/Sheets)
│   ├── csv-parser (CSV files)
│   └── multer (File uploads)
│
├── External Processing Service
│   ├── OCR Service
│   ├── Advanced Chunking
│   ├── Batch Processing
│   └── Status Monitoring
│
└── Infrastructure
    ├── BullMQ (Redis Queue)
    ├── Express.js Framework
    ├── Node.js Runtime
    └── TypeScript Compiler
```

---

*Diagramas criados em: 18 de Setembro de 2025*
*Versão: 1.0*