# Arquitetura da Aplicação NuP-est
*Atualizado em: Setembro 2025*

## 1. Visão Geral do Sistema

A NuP-est é uma plataforma de gestão de estudos com IA que processa editais de concursos públicos usando RAG (Retrieval-Augmented Generation). A arquitetura atual implementa um pipeline limpo de 2 etapas para eliminar alucinações nos resultados de IA.

### Fluxo Principal de Dados:
```
[Frontend React] → [API Express] → [App Externa] → [Pinecone] → [RAG Isolado] → [Resultados]
                          ↓
                    [PostgreSQL]
```

## 2. Arquitetura Backend

### 2.1 Servidor Express (Node.js + TypeScript)

**Entrada:** `server/index.ts`
- **Porta:** 5000 (única porta para frontend e backend)
- **Middleware:** Logging personalizado, tratamento de erro centralizado, parsers
- **Vite integrado:** Frontend servido pelo mesmo processo

**Principais Endpoints:**
- `POST /api/edital/upload` - Upload e processamento síncrono de editais
- `GET /api/edital/:id` - Status e resultados do processamento
- Rotas RAG especializadas para consultas de contexto

### 2.2 Serviços Core

#### NewEditalService
- **Função:** Orquestração completa do pipeline de editais
- **Fluxo:** Validação → Banco → Processamento Externo → Atualização → RAG
- **Localização:** `server/services/newEditalService.ts`

#### EditalRAGService
- **Função:** Consultas especializadas para análise de editais
- **Queries:** Identificação de cargos, extração de conteúdo programático
- **Isolamento:** Usa `documentId` para filtrar apenas o documento específico

#### RAGService
- **Função:** Motor RAG principal com filtragem por documento
- **Features:** Re-ranking opcional, contexto limitado, similaridade mínima
- **Melhoria Recente:** Parâmetro `documentId` para isolamento completo

#### PineconeService
- **Função:** Interface com banco vetorial
- **Configuração:** Índice `nup-est-knowledge`, dimensão 768, similaridade coseno
- **Filtragem:** Metadata por `userId` e `documentId`

### 2.3 Processamento Externo

**ExternalProcessingService:**
- **Responsabilidade:** Chunking, embeddings, indexação no Pinecone
- **Entrada:** Arquivo + metadados (editalId, userId, concursoNome)  
- **Saída:** `job_id` (usado como `externalFileId` no banco)

## 3. Arquitetura Frontend

### 3.1 Stack Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Routing:** Wouter (leve e simples)
- **Estado:** TanStack Query para servidor, React state para UI
- **UI:** shadcn/ui + Tailwind CSS + Radix UI

### 3.2 Componentes Principais

#### EditalUploader
- **Localização:** `client/src/components/EditalUploader.tsx`
- **Função:** Upload de PDFs, validação, polling de status
- **Estados:** Loading, processando, completo, erro

#### KnowledgeBasePage
- **Localização:** `client/src/pages/knowledge-base.tsx`
- **Função:** Gestão de documentos da base de conhecimento
- **Features:** Upload, categorização, reprocessamento de embeddings

### 3.3 Autenticação
- **Provider:** Replit Auth (OpenID Connect)
- **Hook:** `useAuth` para verificação de sessões
- **Proteção:** Rotas protegidas por autenticação

## 4. Schema do Banco de Dados

### 4.1 Tabela Editais (Principal)
```sql
editais {
  id: varchar (UUID)
  user_id: varchar (referência users.id)
  
  -- Arquivo
  file_name: varchar
  original_name: varchar
  file_path: varchar
  file_size: integer
  file_type: enum (pdf, docx, txt, etc.)
  
  -- Metadados do Concurso
  concurso_nome: varchar
  status: enum (uploaded, processing, indexed, completed, failed)
  
  -- Processamento
  external_file_id: varchar  -- NOVO: ID do processamento externo
  raw_content: text
  deepseek_chunks: jsonb
  pinecone_indexed: boolean
  
  -- Análise de Cargos
  has_single_cargo: boolean
  cargo_name: varchar
  cargos: jsonb
  conteudo_programatico: jsonb
  
  -- Auditoria
  processing_logs: text
  error_message: text
  created_at: timestamp
  processed_at: timestamp
  updated_at: timestamp
}
```

### 4.2 Outras Tabelas Importantes
- `users` - Usuários autenticados
- `knowledge_base` - Base de conhecimento geral
- `processing_jobs` - Jobs de processamento em background

## 5. Integrações Externas

### 5.1 Pinecone (Banco Vetorial)
- **Índice:** `nup-est-knowledge`
- **Dimensão:** 768 (compatível com text-embedding-004)
- **Metadados:** userId, documentId, category, title, sourceUrl

### 5.2 OpenRouter (LLMs)
- **Modelos:** Claude 3.5 Sonnet, DeepSeek R1
- **Uso:** RAG contextual, análise de documentos
- **Localização:** `server/services/ai/providers/openrouter.ts`

### 5.3 Aplicação Externa de Processamento
- **Função:** OCR, chunking, embeddings, indexação
- **Entrada:** Multipart file + metadata JSON
- **Retorno:** Success/error + job_id

## 6. Pipeline de Processamento de Editais

### 6.1 Etapa 1: Upload e Processamento Externo
```
1. Usuário faz upload via EditalUploader
2. Validação (tipo PDF, tamanho < 10MB)
3. Criação de registro no banco (status=processing)
4. Envio para aplicação externa
5. Aplicação externa:
   - Extrai texto (OCR se necessário)
   - Cria chunks semânticos
   - Gera embeddings
   - Indexa no Pinecone com documentId
6. Retorna job_id
7. Atualiza banco (status=indexed, external_file_id=job_id)
```

### 6.2 Etapa 2: Análise RAG Isolada
```
8. Pós-processamento automático após 5 segundos
9. Query 1: "Qual é o cargo deste edital?"
   - Busca RAG filtrada por documentId
   - Apenas resultados do documento específico
10. Query 2: "Liste conteúdo programático organizado"
    - Mesma filtragem por documentId
11. Processamento e estruturação dos resultados
12. Atualização banco (status=completed + dados extraídos)
```

## 7. Melhorias Recentes (Anti-Alucinação)

### 7.1 Problema Resolvido
- **Antes:** RAG retornava informações de documentos antigos
- **Causa:** Falta de isolamento por documento no Pinecone
- **Impacto:** Alucinações e respostas incorretas

### 7.2 Solução Implementada
1. **Campo `external_file_id`** adicionado ao schema
2. **Filtro `documentId`** em todas as consultas RAG
3. **Isolamento completo** por documento no Pinecone
4. **Queries específicas** sem fallbacks genéricos

### 7.3 Fluxo Atual Garantido
```
Upload → Indexação com ID único → RAG filtrado por ID → Zero alucinação
```

## 8. Arquitetura de Segurança

### 8.1 Autenticação
- **Replit OAuth** via OpenID Connect
- **Sessões** armazenadas no PostgreSQL
- **Middleware** de autenticação em rotas protegidas

### 8.2 Upload e Validação
- **Tipos permitidos:** PDF exclusivamente para editais
- **Tamanho máximo:** 10MB
- **Sanitização:** Validação de tipo MIME e extensão
- **Limpeza:** Arquivos temporários removidos após processamento

## 9. Monitoramento e Logs

### 9.1 Logging Estruturado
- **Requests/Responses** logados com truncamento de dados sensíveis
- **Performance** com timestamps de início/fim
- **Erros** centralizados com stack traces

### 9.2 Estados de Processamento
- `uploaded` - Arquivo recebido
- `processing` - Em processamento externo
- `indexed` - Indexado no Pinecone
- `completed` - Análise RAG concluída
- `failed` - Erro em qualquer etapa

## 10. Performance e Escalabilidade

### 10.1 Otimizações Atuais
- **Re-ranking opcional** para melhor precisão
- **Contexto limitado** (6000 chars) para eficiência
- **Polling inteligente** (3 segundos) para status
- **Cache React Query** para dados do servidor

### 10.2 Considerações Futuras
- **Background jobs** para pós-processamento
- **Cache de consultas** RAG frequentes
- **Métricas** de performance e uso
- **Health checks** para serviços externos

## 11. Dependências Principais

### Backend
- **Express.js** - Servidor web
- **Drizzle ORM** - ORM type-safe para PostgreSQL
- **Multer** - Upload de arquivos
- **OpenAI SDK** - Integrações de IA

### Frontend
- **React 18** - UI framework
- **TanStack Query** - Estado do servidor
- **Wouter** - Routing
- **shadcn/ui** - Componentes de UI

### Externos
- **PostgreSQL** - Banco relacional (Neon)
- **Pinecone** - Banco vetorial
- **OpenRouter** - Gateway para LLMs

---

*Esta documentação reflete o estado atual da aplicação após as correções de alucinação RAG implementadas em setembro de 2025.*