# nup-aim

## 🚀 Desenvolvimento

```bash
# Rodar apenas esta app
pnpm dev:aim

# Ou, a partir da raiz:
pnpm --filter nup-aim dev
```

## 📦 Build

```bash
pnpm --filter nup-aim build
```

## 🔧 Estrutura

- `client/` - Frontend React + Vite
- `server/` - Backend Express
- `shared/` - Código compartilhado (schemas, types)

## 📚 Packages Usados

- `@nup/ui` - Design system
- `@nup/auth-client` - Autenticação
- `@nup/api-client` - HTTP client
- `@nup/shared-types` - TypeScript types
