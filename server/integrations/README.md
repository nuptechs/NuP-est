# Integrações Externas

Este diretório contém **todas** as integrações com sistemas externos. Cada integração é isolada em sua própria pasta.

## 📁 Estrutura

```
integrations/
├── openai/           # OpenAI, OpenRouter, DeepSeek
├── document-ai/      # Google Document AI
├── pinecone/         # Vector database
└── index.ts          # Export central
```

## 🎯 Filosofia

1. **Isolamento**: Cada integração em sua pasta
2. **Clareza**: Código de comunicação separado de lógica de negócio
3. **Testabilidade**: Fácil criar mocks
4. **Documentação**: Gaps conhecidos em cada client

## 📊 Status das Integrações

### ✅ OpenAI/OpenRouter (MIGRADO + MELHORADO)
- **Status**: ✅ Completamente implementado e em produção
- **Arquivo**: `openai/client.ts`
- **Responsável**: Comunicação com APIs de IA
- **Services Usando**:
  - ✅ OpenRouterProvider (via AIManager)
  - ✅ DeepSeekService
  - ✅ SmartSummaryService
  - ✅ AIService (via funções de conveniência)
- **Melhorias Implementadas (October 2025)**:
  - ✅ **Circuit Breaker**: Previne cascata de falhas (5 falhas consecutivas → OPEN por 60s)
  - ✅ **Rate Limit Handling**: Detecta 429 e usa Retry-After header
  - ✅ **Backoff Adaptativo**: Rate limits aguardam 5s→10s→20s, erros de rede 1s→2s→4s
  - ✅ **Métricas de Saúde**: getHealthMetrics() retorna success rate, circuit state, etc.
  - ✅ **Auto-recuperação**: Circuit testa recuperação após 60s (HALF_OPEN state)
- **Benefícios**:
  - ✅ Retry automático com exponential backoff
  - ✅ Timeout configurável (45s)
  - ✅ Logging detalhado
  - ✅ Zero dependências diretas em services
  - ✅ Proteção contra APIs indisponíveis
- **Gaps Remanescentes**:
  - [ ] Timeout pode exceder 45s em requests muito complexos
  - [ ] Métricas não persistidas (reset em restart)

### 🚧 Google Document AI
- **Status**: Estrutura criada, aguardando migração
- **Arquivo**: `document-ai/client.ts`
- **Responsável**: Processamento de PDFs/DOCs
- **Gaps Conhecidos**:
  - [ ] Falta cache para evitar reprocessamento
  - [ ] Erro em PDFs específicos
  - [ ] Timeout em documentos >10MB

### ✅ Pinecone (MIGRADO + MELHORADO)
- **Status**: ✅ Completamente implementado e em produção
- **Arquivo**: `pinecone/client.ts`
- **Responsável**: Armazenamento de vetores para busca semântica
- **Melhorias Implementadas (October 2025)**:
  - ✅ **Batch Upsert Otimizado**: Processa 100 vetores por batch automaticamente
  - ✅ **Retry com Backoff**: Rate limits 1s→2s→4s, erros de rede com exponential backoff
  - ✅ **Detecção de Rate Limits**: Trata status 429 com retry apropriado
  - ✅ **Namespace Flexível**: Suporta múltiplos namespaces via parâmetro
  - ✅ **Health Check Real**: Verifica conexão via describeIndexStats()
  - ✅ **Operações Completas**: upsert, query, delete, deleteAll, getStats
- **Benefícios**:
  - ✅ Upsert em lote automático (sem preocupação com limite de 100)
  - ✅ Retry automático em falhas temporárias
  - ✅ Logging detalhado de todas as operações
  - ✅ Type-safe com TypeScript completo
- **Gaps Remanescentes**:
  - [ ] Cache local para vetores frequentemente consultados
  - [ ] Métrica de latência não persistida

## 🔑 Variáveis de Ambiente

### OpenAI/OpenRouter
```env
OPENAI_API_KEY=sk-...
```

### Google Document AI
```env
GOOGLE_DOC_AI_PROJECT_ID=...
GOOGLE_DOC_AI_PRIVATE_KEY=...
GOOGLE_DOC_AI_CLIENT_EMAIL=...
```

### Pinecone
```env
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=nup-est-knowledge
```

## 📝 Como Usar

```typescript
// Em um service
import { createAIClient } from '@/integrations';

const aiClient = createAIClient({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  models: {
    default: 'gpt-4',
  }
});

const response = await aiClient.sendRequest({
  messages: [{ role: 'user', content: 'Hello' }]
});
```

## 🐛 Reportando Gaps

Ao encontrar um problema:
1. Documente no client correspondente (seção `GAPS CONHECIDOS`)
2. Adicione checkbox [ ] no README
3. Crie issue se necessário

## 🔄 Próximas Migrações

- [ ] Migrar código existente de `services/ai/` para `integrations/openai/`
- [ ] Migrar código de `services/fileProcessor/` para `integrations/document-ai/`
- [ ] Migrar código de `services/embeddings/` para `integrations/pinecone/`
