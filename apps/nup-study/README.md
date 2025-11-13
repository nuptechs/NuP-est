# NuP-Study

Plataforma de estudos adaptativa com IA.

## Features

- 🧠 Mind Maps com IA
- 🎤 Professor IA (voz interativa)
- 📚 Base de conhecimento
- 📊 Rastreamento de progresso
- 🎯 Flashcards adaptativos

## Development

```bash
# Instalar dependências (na raiz do monorepo)
cd ../.. && pnpm install

# Rodar dev
pnpm dev:study

# Build
pnpm build:study
```

## Packages Usados

- `@nup/ui` - Design system compartilhado
- `@nup/auth-client` - SDK de autenticação
- `@nup/api-client` - HTTP client
- `@nup/shared-types` - Types compartilhados

## BASE_PREFIX Configuration

**Importante:** NuP-Study **NÃO usa BASE_PREFIX** porque funciona como a aplicação raiz (`/`) no gateway.

### Arquitetura do Gateway

```
Gateway (porta 5000)
├─ /                 → NuP-Study (porta 5001) ← SEM PREFIXO
├─ /nup-identify/*   → NuP-Identify (porta 5002) ← COM PREFIXO
└─ /nup-aim/*        → NuP-AIM (porta 5003) ← COM PREFIXO
```

**Por que NuP-Study não precisa de BASE_PREFIX?**

1. **Rota Raiz**: NuP-Study é a aplicação principal que responde à rota raiz `/`
2. **Vite Default**: O Vite já usa `base: '/'` por padrão
3. **Assets Diretos**: Assets são servidos diretamente em `/assets/*`
4. **Simplicidade**: Mantém URLs limpas e configuração simplificada

**Se você fizer deployment standalone** (fora do gateway), ainda pode usar a configuração padrão sem BASE_PREFIX.

## Database Schema

Usa schema isolado no PostgreSQL: `nup_study`

```typescript
const studySchema = pgSchema("nup_study");
```

Isso permite compartilhar o mesmo banco de dados com NuP-Identify e NuP-AIM sem conflitos de tabelas.
