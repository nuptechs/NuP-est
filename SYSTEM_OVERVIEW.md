# NuP-est: Sistema de Gestão de Estudos com IA

## Visão Geral

**NuP-est** é uma plataforma adaptativa de gestão de estudos alimentada por inteligência artificial que cria experiências de aprendizado personalizadas através de perfis detalhados de usuários e entrega inteligente de conteúdo. O sistema guia os usuários através de um processo abrangente de configuração e fornece um hub de estudos intuitivo com ferramentas de IA integradas, flashcards, gerenciamento de base de conhecimento e acompanhamento de progresso, tudo adaptado aos perfis individuais de aprendizado.

---

## 🎯 Funcionalidades Principais

### 1. **Onboarding Inteligente**
- **Fluxo em 5 Etapas**: Configuração guiada do perfil de usuário
  - Perfil Básico (idade, perfil de estudos)
  - Dificuldades de Aprendizado (TDAH, dislexia, etc.)
  - Objetivos de Estudo (concurso, vestibular, ENEM)
  - Preferências de Aprendizado (estilo visual, auditivo, cinestésico)
  - Finalização e validação do perfil

- **Personalização Profunda**: Captura de dados específicos como:
  - Horas disponíveis diárias para estudo
  - Período preferido (manhã, tarde, noite)
  - Necessidade de motivação e exemplos práticos
  - Estilo de explicação preferido (simples, detalhado, prático)

### 2. **Dashboard Adaptativo**
- **Hub Central**: Interface principal com navegação intuitiva
- **Visão Geral do Progresso**: Cards com estatísticas em tempo real
- **Ações Rápidas**: Acesso direto às funcionalidades mais usadas
- **Perfil Dinâmico**: Mostra informações do usuário e progresso atual

### 3. **Biblioteca Hierárquica de Conteúdo**
- **Organização Estruturada**: 
  - Áreas de Conhecimento → Matérias → Tópicos → Materiais
- **Upload de Materiais**: Suporte para PDF, DOC, DOCX, TXT, MD
- **Gestão Inteligente**: Categorização automática e organização
- **Navegação Breadcrumb**: Interface intuitiva de navegação

### 4. **Sistema de Metas e Objetivos**
- **Metas Macro**: Objetivos de longo prazo (ex: aprovação em concurso)
- **Targets Micro**: Objetivos específicos e mensuráveis
- **Acompanhamento**: Progresso visual com gráficos e métricas
- **Configuração Flexível**: Prazos, valores-alvo e unidades personalizáveis

### 5. **Métodos de Estudo com IA**
- **Assistente IA**: Geração de questões personalizadas baseadas no perfil
- **Adaptação Contextual**: Questões adaptadas ao nível de conhecimento
- **Análise de Performance**: Identificação de pontos fortes e fracos
- **Feedback Inteligente**: Explicações detalhadas e sugestões de melhoria

### 6. **Sistema de Flashcards com Repetição Espaçada**
- **Algoritmo SuperMemo 2**: Implementação de repetição espaçada científica
- **Geração Automática**: Criação de flashcards a partir de materiais
- **Gestão de Decks**: Organização por matéria e tópico
- **Métricas de Aprendizado**: Acompanhamento de facilidade e intervalo de revisão

### 7. **Base de Conhecimento Semântica**
- **Upload e Processamento**: Análise automática de documentos
- **Busca Semântica**: Encontrar informações por contexto, não apenas palavras-chave
- **Embeddings IA**: Vetorização de conteúdo para busca inteligente
- **Categorização**: Organização automática por categorias

### 8. **Quiz Personalizado**
- **Geração Dinâmica**: Questões criadas com base no perfil e materiais
- **Níveis de Dificuldade**: Fácil, médio, difícil
- **Feedback Imediato**: Explicações detalhadas para cada resposta
- **Histórico de Performance**: Acompanhamento de evolução

### 9. **Analytics e Progresso**
- **Estatísticas Detalhadas**: Horas de estudo, performance por matéria
- **Gráficos Visuais**: Progresso semanal e tendências
- **Identificação de Padrões**: Pontos fortes e áreas de melhoria
- **Relatórios Personalizados**: Baseados no perfil de aprendizado

### 10. **Busca Integrada**
- **Múltiplas Fontes**: Busca simultânea em bases configuradas
- **Integração Cebraspe**: Acesso direto a questões de concursos
- **Configuração Administrativa**: Gestão de sites de busca
- **Resultados Unificados**: Interface única para múltiplas fontes

---

## 🏗️ Arquitetura Técnica

### **Frontend (React + TypeScript)**

#### Tecnologias Principais:
- **React 18** com **TypeScript** para type safety
- **Vite** como build tool e servidor de desenvolvimento
- **Semantic UI React** para componentes de interface principais
- **Wouter** para roteamento client-side leve
- **TanStack Query (React Query)** para gerenciamento de estado servidor
- **React Hook Form + Zod** para validação de formulários

#### Estrutura de Componentes:
```
client/src/
├── pages/              # Páginas principais da aplicação
├── components/ui/      # Componentes auxiliares (StatCard, SectionHeader, etc.)
├── contexts/           # Context providers (Theme, Auth)
├── lib/               # Utilitários e configurações
├── styles/            # Estilos globais e overrides
│   ├── index.css      # Reset e estilos base minimais
│   └── semantic-ui-overrides.css  # Customizações e design tokens
└── hooks/             # Hooks customizados
```

#### Padrões de Design:
- **Migração Híbrida**: Principais páginas (onboarding, dashboard, library) convertidas para Semantic UI React
- **Componentes Auxiliares**: StatCard, SectionHeader, EmptyState, SkeletonCard convertidos para Semantic UI
- **Coexistência**: Algumas páginas ainda utilizam componentes shadcn/ui originais
- **Tema Consistente**: Sistema de cores global com variáveis CSS customizadas
- **Responsividade**: Design adaptativo para mobile e desktop
- **Dark Mode**: Suporte completo a tema escuro via ThemeContext

### **Backend (Express.js + TypeScript)**

#### Tecnologias Principais:
- **Express.js** com **TypeScript** em formato ESM
- **Drizzle ORM** para operações type-safe no banco
- **PostgreSQL** (Neon Database) para persistência
- **Passport.js** para autenticação (Replit Auth)
- **Multer** para upload de arquivos
- **OpenAI API** para funcionalidades de IA

#### Estrutura de Rotas:
```
server/
├── routes/          # Rotas da API organizadas por funcionalidade
├── services/        # Serviços (AI, RAG, PDF processing)
├── config/         # Configurações (upload, database)
├── db/             # Configuração do banco
└── middleware/     # Middlewares de autenticação e logging
```

#### Serviços Especializados:
- **AI Service**: Integração com OpenAI para geração de conteúdo
- **RAG Service**: Retrieval-Augmented Generation para busca semântica
- **PDF Service**: Processamento e extração de texto
- **Embeddings Service**: Geração de vetores para busca semântica

### **Banco de Dados (PostgreSQL + Drizzle ORM)**

#### Modelo de Dados Principal:

```sql
-- Usuários com perfil completo de aprendizado
users: {
  id, email, firstName, lastName,
  age, studyProfile, learningDifficulties,
  studyObjective, studyDeadline, dailyStudyHours,
  learningStyle, preferredExplanationStyle,
  needsMotivation, prefersExamples,
  onboardingCompleted
}

-- Hierarquia de conteúdo
knowledgeAreas → subjects → topics → materials

-- Sistema de metas
goals → targets (com progresso e métricas)

-- Sessões de estudo e performance
studySessions: {
  userId, subjectId, type, duration,
  questionsCorrect, questionsTotal, score
}

-- Sistema de IA
aiQuestions: {
  question, options, correctAnswer, explanation,
  difficulty, studyProfile
}

questionAttempts: {
  userId, questionId, userAnswer, isCorrect, timeSpent
}

-- Flashcards com repetição espaçada
flashcardDecks → flashcards → flashcardReviews {
  easeFactor, interval, repetitions, nextReview
}

-- Base de conhecimento semântica
knowledgeBase → knowledgeChunks {
  content, embedding (vetor OpenAI)
}
```

#### Relacionamentos Complexos:
- **Rastreamento de Conhecimento**: `subjectKnowledge` por usuário
- **Histórico de Aprendizado**: `learningHistory` para eventos e progresso
- **Avaliações**: `assessmentResults` para avaliações iniciais/periódicas

### **Integração de IA (OpenAI)**

#### Funcionalidades IA:
1. **Geração de Questões**: Baseada em materiais e perfil do usuário
2. **Análise de Performance**: Identificação de padrões de aprendizado
3. **Recomendações Personalizadas**: Sugestões de estudo adaptadas
4. **Busca Semântica**: Embeddings para encontrar conteúdo relevante
5. **Processamento de Conteúdo**: Extração e análise de documentos

#### Configuração de IA:
- **Modelo Principal**: DeepSeek R1 via OpenRouter para custo-efetividade
- **Profile-Aware**: Todas as interações consideram o perfil do usuário
- **Context-Aware**: Questões baseadas em materiais específicos
- **Adaptive Difficulty**: Dificuldade adapta ao histórico de performance

---

## 🔐 Autenticação e Segurança

### **Sistema de Autenticação**
- **Replit Auth**: OAuth com OpenID Connect
- **Sessões Seguras**: Gerenciamento com express-session + PostgreSQL
- **Middleware de Proteção**: Verificação automática em rotas protegidas
- **Context Injection**: Usuário automaticamente injetado em requests autenticados

### **Segurança de Dados**
- **Cookies HttpOnly**: Prevenção de XSS
- **Validação Robusta**: Zod schemas em frontend e backend
- **Sanitização**: Limpeza automática de inputs
- **Isolamento de Dados**: Queries sempre filtradas por userId

---

## 🚀 Performance e Escalabilidade

### **Otimizações Frontend**
- **Code Splitting**: Carregamento lazy de páginas
- **Caching Inteligente**: React Query com invalidação automática
- **Bundling Otimizado**: Vite com tree-shaking
- **Assets Otimizados**: Compressão automática de imagens

### **Otimizações Backend**
- **Connection Pooling**: Pool de conexões PostgreSQL
- **Caching de Embeddings**: Vetores armazenados para reuso
- **Processamento Assíncrono**: Jobs em background para uploads
- **Rate Limiting**: Proteção contra spam de requests

### **Banco de Dados**
- **Índices Estratégicos**: Otimização de queries frequentes
- **Relacionamentos Eficientes**: Foreign keys bem estruturadas
- **Particionamento**: Preparado para crescimento de dados
- **Backup Automático**: Neon Database com snapshots

---

## 🎨 Design System

### **Semantic UI React**
- **Componentes Consistentes**: Card, Form, Button, Header, etc.
- **Tema Personalizado**: Variáveis CSS para cores e espaçamentos
- **Responsividade**: Grid system adaptativo
- **Acessibilidade**: ARIA attributes e navegação por teclado

### **Design Tokens e Sistema de Cores**

#### Tokens Principais (`client/src/styles/semantic-ui-overrides.css`):
```css
:root {
  /* Cores Primárias */
  --nup-primary: #0078d4;           /* Azul principal */
  --nup-primary-hover: #106ebe;     /* Hover state */
  --nup-primary-light: #deecf9;     /* Background claro */
  
  /* Paleta Neutra (8-step scale) */
  --nup-gray-50: #F8F9FA;   /* Backgrounds principais */
  --nup-gray-100: #F1F3F4;  /* Backgrounds secundários */
  --nup-gray-200: #E8EAED;  /* Borders padrão */
  --nup-gray-300: #DADCE0;  /* Borders hover */
  --nup-gray-500: #9AA0A6;  /* Texto secundário */
  --nup-gray-800: #3C4043;  /* Texto principal */
  
  /* Espaçamento (8pt grid) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* Dark Mode Overrides */
.dark {
  --nup-bg: #202124;          /* Fundo dark */
  --nup-surface: #2A2D31;     /* Cards dark */
  --nup-text-primary: #E8EAED; /* Texto claro */
}
```

#### Componentes UI Convertidos:
- **StatCard** (`client/src/components/ui/stat-card.tsx`): Cards estatísticos usando Semantic UI Card
- **SectionHeader** (`client/src/components/ui/section-header.tsx`): Cabeçalhos com Header component
- **EmptyState** (`client/src/components/ui/empty-state.tsx`): Estados vazios com Card + Button
- **SkeletonCard** (`client/src/components/ui/skeleton-row.tsx`): Loading com animação CSS customizada

#### Padrões de Layout:
- **Grid System**: Semantic UI Grid para layouts responsivos
- **Container**: Semantic UI Container para largura máxima
- **Formulários**: Form, Input, Dropdown, Checkbox components
- **Navegação**: Step.Group para wizards, Breadcrumb para navegação

---

## 📱 Experiência do Usuário

### **Fluxo de Onboarding**
1. **Boas-vindas**: Introdução ao sistema
2. **Perfil Básico**: Coleta de informações essenciais
3. **Personalização**: Dificuldades e preferências
4. **Objetivos**: Definição de metas de estudo
5. **Configuração Final**: Validação e ativação

### **Dashboard Intuitivo**
- **Quick Actions**: Acesso rápido às funcionalidades principais
- **Progress Overview**: Visão geral do progresso em cards visuais
- **Navigation Sidebar**: Menu lateral com todas as funcionalidades
- **User Profile**: Informações do usuário sempre visíveis

### **Padrões de Interação**
- **Progressive Disclosure**: Informações reveladas gradualmente
- **Contextual Help**: Ajuda específica para cada funcionalidade
- **Feedback Imediato**: Confirmações visuais para todas as ações
- **Error Recovery**: Mensagens claras e opções de recuperação

---

## 🔌 Integrações Externas

### **APIs de IA**
- **OpenAI**: GPT para geração de conteúdo e análise
- **OpenRouter**: DeepSeek R1 para otimização de custos
- **Embeddings**: text-embedding-ada-002 para busca semântica

### **Serviços de Dados**
- **Cebraspe**: API para questões de concursos públicos
- **Neon Database**: PostgreSQL serverless para produção
- **Replit Services**: Autenticação e hospedagem integrada

### **Processamento de Arquivos**
- **PDF Parser**: Extração de texto de PDFs
- **Document Parser**: Suporte a DOC, DOCX, TXT, MD
- **File Upload**: Multer com validação e sanitização

---

## 📊 Métricas e Analytics

### **Métricas de Usuário**
- **Tempo de Estudo**: Tracking automático de sessões
- **Performance**: Acertos/erros por matéria e tópico
- **Evolução**: Progresso ao longo do tempo
- **Padrões**: Identificação de horários e métodos mais eficazes

### **Métricas de Sistema**
- **Usage Analytics**: Funcionalidades mais utilizadas
- **Performance Monitoring**: Tempos de resposta da API
- **Error Tracking**: Logs centralizados de erros
- **User Journey**: Funis de conversão e retenção

---

## 🛠️ Ambiente de Desenvolvimento

### **Configuração Local**
```bash
# Instalação das dependências
npm install

# Configuração do banco
npm run db:push

# Execução em desenvolvimento
npm run dev
```

### **Tecnologias de Desenvolvimento**
- **TypeScript**: Type safety completa frontend/backend
- **ESLint + Prettier**: Padronização de código
- **Vite HMR**: Hot reload para desenvolvimento rápido
- **Drizzle Studio**: Interface visual para o banco de dados

### **Deployment**
- **Replit Platform**: Hospedagem integrada com CI/CD automático
- **Environment Variables**: Configuração via secrets Replit
- **Automatic Scaling**: Escalonamento automático baseado na demanda

---

## 📊 Modelo de Dados e API

### **Entidades Principais**

Baseado no schema definido em `shared/schema.ts`:

#### **Usuários e Perfis**
```typescript
// users: Perfil completo de aprendizado
{
  id: varchar (UUID),
  email: varchar (único),
  firstName, lastName: varchar,
  
  // Perfil de Estudos
  age: integer,
  studyProfile: "disciplined" | "undisciplined" | "average",
  learningDifficulties: learning_difficulty[] (ADHD, dislexia, etc.),
  
  // Objetivos e Contexto
  studyObjective: text (concurso, vestibular, ENEM),
  studyDeadline: timestamp,
  dailyStudyHours: decimal,
  preferredStudyTime: varchar,
  
  // Preferências de Aprendizado
  learningStyle: "visual" | "auditory" | "kinesthetic" | "mixed",
  preferredExplanationStyle: "simple" | "detailed" | "practical",
  needsMotivation: boolean,
  prefersExamples: boolean,
  
  onboardingCompleted: boolean
}
```

#### **Hierarquia de Conteúdo**
```typescript
// knowledgeAreas → subjects → topics → materials
knowledgeAreas: { id, userId, name, description, priority }
subjects: { id, userId, areaId, name, category, priority }
topics: { id, subjectId, name, description }
materials: { id, userId, subjectId, topicId, title, type, filePath, content }
```

#### **Sistema de Metas**
```typescript
goals: { id, userId, title, description, targetDate, completed }
targets: { id, userId, goalId, title, targetValue, currentValue, unit, deadline }
```

#### **Sessões e Performance**
```typescript
studySessions: {
  id, userId, subjectId, topicId,
  type: "theory" | "practice" | "ai_questions" | "review",
  duration, questionsCorrect, questionsTotal, score
}

aiQuestions: {
  id, userId, subjectId, question, options, correctAnswer,
  explanation, difficulty, studyProfile
}

questionAttempts: {
  id, userId, questionId, sessionId,
  userAnswer, isCorrect, timeSpent
}
```

#### **Flashcards com Repetição Espaçada**
```typescript
flashcardDecks: { id, userId, subjectId, title, totalCards, studiedCards }
flashcards: {
  id, deckId, userId, front, back, order,
  easeFactor: decimal, interval: integer, repetitions: integer,
  nextReview: timestamp
}
flashcardReviews: {
  id, flashcardId, userId, quality: 0-5,
  previousEaseFactor, newEaseFactor, timeSpent
}
```

#### **Base de Conhecimento Semântica**
```typescript
knowledgeBase: {
  id, userId, category, title, filename, content,
  chunks: jsonb, tags: jsonb
}
knowledgeChunks: {
  id, knowledgeBaseId, chunkIndex, content,
  embedding: jsonb (vetor OpenAI)
}
```

### **Endpoints da API**

#### **Autenticação**
- `GET /api/auth/user` - Obter perfil do usuário logado
- `POST /api/auth/user` - Atualizar perfil (usado no onboarding)

#### **Hierarquia de Conteúdo**
```http
# Áreas de Conhecimento
GET    /api/areas
POST   /api/areas
PATCH  /api/areas/:id
DELETE /api/areas/:id

# Matérias
GET    /api/subjects?areaId=:areaId
POST   /api/subjects
PATCH  /api/subjects/:id
DELETE /api/subjects/:id

# Tópicos
GET    /api/subjects/:subjectId/topics
POST   /api/topics

# Materiais
GET    /api/materials?subjectId=:subjectId
POST   /api/materials (multipart/form-data)
DELETE /api/materials/:id
```

#### **Metas e Objetivos**
```http
# Metas
GET    /api/goals
POST   /api/goals
PATCH  /api/goals/:id
DELETE /api/goals/:id

# Targets
GET    /api/targets?goalId=:goalId
POST   /api/targets
PATCH  /api/targets/:id
DELETE /api/targets/:id
```

#### **IA e Estudos**
```http
# Sessões de Estudo
GET    /api/study-sessions
POST   /api/study-sessions
PATCH  /api/study-sessions/:id/complete

# IA
POST   /api/ai/generate-questions
POST   /api/ai/recommendation
POST   /api/ai/chat
POST   /api/ai/generate-flashcards-from-file
POST   /api/ai/generate-flashcards-from-material

# Tentativas de Questões
POST   /api/question-attempts
```

#### **Flashcards**
```http
# Decks
GET    /api/flashcard-decks
POST   /api/flashcard-decks
GET    /api/flashcard-decks/:id
PATCH  /api/flashcard-decks/:id
DELETE /api/flashcard-decks/:id

# Flashcards
GET    /api/flashcard-decks/:deckId/flashcards
POST   /api/flashcard-decks/:deckId/flashcards
PATCH  /api/flashcards/:id
DELETE /api/flashcards/:id

# Revisões (Spaced Repetition)
GET    /api/flashcards/review?deckId=:deckId
POST   /api/flashcards/:id/review
```

#### **Analytics**
```http
GET    /api/analytics/stats        # Estatísticas gerais
GET    /api/analytics/subjects     # Performance por matéria
GET    /api/analytics/weekly       # Progresso semanal
```

#### **Base de Conhecimento**
```http
GET    /api/knowledge-base?category=:category
POST   /api/knowledge-base (multipart/form-data)
DELETE /api/knowledge-base/:id
GET    /api/knowledge-base/:id/chunks
POST   /api/rag/query             # Busca semântica RAG
```

#### **Editais e Busca Externa**
```http
# Editais
POST   /api/edital/upload
GET    /api/edital/:id
POST   /api/edital-rag/buscar-cargos

# Administração
GET    /api/admin/search-sites
POST   /api/admin/search-sites
```

### **Validação e Segurança**
- **Middleware**: `isAuthenticated` em todas as rotas protegidas
- **Validação**: Esquemas Zod para validação de entrada (ex: `insertGoalSchema.parse()`)
- **Isolamento**: Todas as queries filtradas por `userId` automaticamente
- **Sanitização**: Remoção de campos protegidos (`userId`, `createdAt`, etc.) em updates

---

## 🤖 IA e Busca Semântica - Detalhes Técnicos

### **Provedores e Modelos**

#### **OpenRouter Integration**
- **Modelo Principal**: DeepSeek R1 para custo-efetividade
- **Backup**: GPT-4 para tarefas complexas
- **Configuração**: Via variáveis de ambiente `OPENAI_API_KEY` e `OPENAI_BASE_URL`
- **Rate Limits**: Controle automático de quota e throttling

#### **OpenAI Direct**
- **Embeddings**: `text-embedding-ada-002` para busca semântica
- **Text Processing**: GPT models para análise de conteúdo
- **Content Generation**: Geração de questões e flashcards

### **Pipeline RAG (Retrieval-Augmented Generation)**

#### **1. Ingestão de Documentos**
```typescript
// server/services/pdf.ts
1. Upload → Multer storage
2. Extração → PDF/DOC/TXT parsing
3. Preprocessamento → Limpeza e normalização
4. Chunking → Divisão em segmentos semânticos
```

#### **2. Geração de Embeddings**
```typescript
// server/services/embeddings.ts
1. Preparação → embeddingsService.prepareTextForEmbedding()
2. Vetorização → OpenAI text-embedding-ada-002
3. Armazenamento → PostgreSQL jsonb (knowledgeChunks.embedding)
4. Indexação → Preparado para busca por similaridade
```

#### **3. Busca e Retrieval**
```typescript
// server/services/rag.ts
1. Query Embedding → Vetorização da pergunta
2. Similarity Search → Busca por cosine similarity
3. Context Ranking → Ordenação por relevância
4. Context Window → Top-K chunks mais relevantes
```

#### **4. Geração de Respostas**
```typescript
// server/services/ai/index.ts
1. Context Assembly → Montagem do contexto com chunks
2. Prompt Engineering → Template baseado no perfil do usuário
3. LLM Generation → Geração via OpenRouter/OpenAI
4. Post-processing → Formatação e validação da resposta
```

### **Configuração de Ambiente**

#### **Variáveis Necessárias**
```env
# IA e Embeddings
OPENAI_API_KEY=sk-...                    # Chave OpenAI
OPENAI_BASE_URL=https://openrouter.ai/v1 # Para OpenRouter

# Busca Semântica (Futuro)
PINECONE_API_KEY=...                     # Para Pinecone (preparado)
PINECONE_ENVIRONMENT=...                 # Ambiente Pinecone
PINECONE_INDEX_NAME=nup-est-knowledge    # Nome do índice

# Processamento
UPLOAD_DIR=./uploads                     # Diretório de uploads
MAX_FILE_SIZE=10485760                   # 10MB limit
```

#### **Limites e Configurações**
```typescript
// Configurações de IA
const AI_CONFIG = {
  maxTokens: 4000,
  temperature: 0.7,
  maxRetries: 3,
  timeoutMs: 30000,
  
  // Embeddings
  chunkSize: 1000,
  chunkOverlap: 200,
  maxChunksPerDoc: 50,
  
  // RAG
  topK: 10,
  similarityThreshold: 0.7,
  maxContextLength: 8000
}
```

### **Endpoints RAG e IA**

#### **RAG Service**
```http
# Migração para RAG
POST /api/rag/migrate/:documentId

# Busca semântica
POST /api/rag/query
Body: { query: string, topK?: number }

# Busca em editais
POST /api/edital-rag/buscar-cargos
Body: { query: string, topK?: number }
```

#### **AI Service**
```http
# Geração de questões
POST /api/ai/generate-questions
Body: { subjectId, difficulty, count, studyProfile }

# Chat com IA
POST /api/ai/chat
Body: { question, selectedGoal?, selectedKnowledgeCategory? }

# Recomendações
POST /api/ai/recommendation
Body: { type: "study" | "review" | "practice" }
```

### **Personalização por Perfil**

#### **Adaptação de Conteúdo**
```typescript
// Perfis de estudo influenciam:
1. Estilo de questões (disciplined → mais técnicas)
2. Explicações (undisciplined → mais exemplos)
3. Dificuldade inicial (average → balanceada)
4. Formato de feedback (detalhado vs. conciso)
```

#### **Context Injection**
```typescript
// Prompt templates incluem:
- Perfil do usuário (studyProfile, learningStyle)
- Objetivos atuais (studyObjective, deadline)
- Histórico de performance (strongTopics, weakTopics)
- Preferências (needsMotivation, prefersExamples)
```

---

## 🔮 Roadmap Futuro

### **Funcionalidades Planejadas**
- **Mobile App**: Aplicativo nativo iOS/Android
- **Collaborative Study**: Grupos de estudo colaborativos
- **Advanced Analytics**: BI e relatórios avançados
- **Third-party Integrations**: YouTube, Khan Academy, etc.
- **Gamification**: Sistema de pontos e conquistas

### **Melhorias Técnicas**
- **Microservices**: Migração para arquitetura distribuída
- **Real-time**: WebSockets para colaboração em tempo real
- **Edge Computing**: CDN para assets globais
- **Advanced AI**: Modelos customizados para educação

---

## 📖 Conclusão

O **NuP-est** representa uma evolução significativa no campo da educação digital, combinando inteligência artificial avançada com design centrado no usuário para criar uma experiência de aprendizado verdadeiramente personalizada. Com sua arquitetura robusta, interface intuitiva e capacidades adaptativas, o sistema está posicionado para revolucionar a forma como os estudantes se preparam para objetivos acadêmicos e profissionais.

A conversão completa para Semantic UI React garante consistência visual e uma experiência de usuário polida, enquanto a integração profunda com IA permite personalização em um nível sem precedentes. O sistema não apenas gerencia conteúdo de estudo, mas adapta-se ativamente ao estilo de aprendizado individual de cada usuário, criando um caminho otimizado para o sucesso educacional.

---

*Documento gerado em: Setembro 2025*  
*Versão do Sistema: 2.0 - Semantic UI Modernization*