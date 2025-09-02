# Sistema de Tratamento de Erros Centralizado

## 📋 O que foi implementado

✅ **ErrorHandler** (`server/utils/ErrorHandler.ts`)
- Classe `AppError` personalizada para erros da aplicação
- Mensagens de erro centralizadas e amigáveis ao usuário
- Logging interno vs. mensagem para o usuário separados

✅ **Middleware de Erro** (`server/middleware/errorMiddleware.ts`)
- Captura automática de todos os erros
- Logs detalhados para debugging (sem expor ao usuário)
- Respostas consistentes com timestamps
- Tratamento específico para diferentes tipos de erro

✅ **Integração Completa**
- Middleware integrado no sistema principal
- Substitui o sistema de erro básico anterior

## 🚀 Como usar no código

### Em controladores/rotas:
```typescript
import { AppError, errorMessages } from "../utils/ErrorHandler";
import { asyncHandler } from "../middleware/errorMiddleware";

app.get('/api/example', asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new AppError(400, errorMessages.INVALID_INPUT, "ID parameter required");
  }
  
  const data = await findData(req.params.id);
  if (!data) {
    throw new AppError(404, errorMessages.NOT_FOUND, `Data with ID ${req.params.id} not found`);
  }
  
  res.json(data);
}));
```

### Em serviços:
```typescript
export class AIService {
  async process(input: string) {
    if (!input?.trim()) {
      throw new AppError(400, errorMessages.INVALID_INPUT, "Input cannot be empty");
    }
    
    try {
      return await externalAPICall(input);
    } catch (error) {
      throw new AppError(503, errorMessages.AI_SERVICE_ERROR, "External API failed");
    }
  }
}
```

## 📊 Benefícios

- **Usuários**: Sempre recebem mensagens claras e úteis
- **Desenvolvedores**: Logs detalhados para debugging
- **Consistência**: Todas as respostas de erro seguem o mesmo padrão
- **Manutenibilidade**: Mensagens centralizadas em um local
- **Segurança**: Detalhes internos nunca expostos aos usuários

## 🔧 Mensagens disponíveis

- `GENERIC` - Erro genérico
- `INVALID_INPUT` - Dados inválidos
- `NOT_FOUND` - Recurso não encontrado
- `UNAUTHORIZED` - Sem permissão
- `AI_SERVICE_ERROR` - Problemas com IA
- `DATABASE_ERROR` - Problemas de banco
- `FILE_UPLOAD_ERROR` - Problemas de upload
- `VALIDATION_ERROR` - Erro de validação
- `AUTH_REQUIRED` - Login necessário
- `KNOWLEDGE_BASE_ERROR` - Problemas na base de conhecimento
- `RAG_SERVICE_ERROR` - Problemas no sistema de busca

## 📝 Exemplo de resposta de erro

```json
{
  "error": "Os dados fornecidos são inválidos.",
  "timestamp": "2025-01-02T19:03:57.123Z"
}
```

O sistema está totalmente integrado e funcionando! 🎉