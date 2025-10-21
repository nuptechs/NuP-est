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

### ✅ OpenAI/OpenRouter (MIGRADO)
- **Status**: ✅ Completamente implementado e em produção
- **Arquivo**: `openai/client.ts`
- **Responsável**: Comunicação com APIs de IA
- **Services Usando**:
  - ✅ OpenRouterProvider (via AIManager)
  - ✅ DeepSeekService
  - ✅ SmartSummaryService
  - ✅ AIService (via funções de conveniência)
- **Benefícios**:
  - ✅ Retry automático com exponential backoff (1s→2s→4s)
  - ✅ Timeout configurável (45s)
  - ✅ Logging detalhado
  - ✅ Zero dependências diretas em services
- **Gaps Conhecidos**:
  - [ ] Timeout pode exceder 45s em requests muito complexos
  - [ ] Retry exponencial pode ser insuficiente para rate limits intensos
  - [ ] Falta circuit breaker para múltiplas falhas consecutivas

### 🚧 Google Document AI
- **Status**: Estrutura criada, aguardando migração
- **Arquivo**: `document-ai/client.ts`
- **Responsável**: Processamento de PDFs/DOCs
- **Gaps Conhecidos**:
  - [ ] Falta cache para evitar reprocessamento
  - [ ] Erro em PDFs específicos
  - [ ] Timeout em documentos >10MB

### 🚧 Pinecone
- **Status**: Estrutura criada, aguardando migração
- **Arquivo**: `pinecone/client.ts`
- **Responsável**: Armazenamento de vetores
- **Gaps Conhecidos**:
  - [ ] Falta batch upsert otimizado
  - [ ] Sem retry em rate limit
  - [ ] Namespace hardcoded

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
