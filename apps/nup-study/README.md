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
