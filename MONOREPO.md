# NuP Ecosystem - Monorepo Architecture

## 📦 Estrutura do Monorepo

```
nup-ecosystem/
├── apps/                         # Aplicações deployáveis
│   ├── nup-study/                # App principal (atual)
│   ├── nup-identify/             # Central de autenticação
│   ├── nup-chunks/               # (A migrar)
│   ├── nup-aim/                  # (A migrar)
│   ├── nup-kan/                  # (A migrar)
│   └── nup-service/              # (A migrar)
│
├── packages/                     # Código compartilhado
│   └── @nup/
│       ├── ui/                   # Design System (shadcn/ui compartilhado)
│       ├── auth-client/          # SDK de autenticação (NuP-Identify)
│       ├── api-client/           # HTTP client configurável
│       └── shared-types/         # TypeScript types compartilhados
│
├── features/                     # Features reutilizáveis (vendíveis)
│   └── @nup/
│       ├── mindmaps/             # Sistema de Mind Maps
│       ├── professor-ia/         # Professor IA (voz)
│       └── flashcards/           # Sistema de Flashcards
│
├── config/                       # Configurações compartilhadas
├── pnpm-workspace.yaml          # pnpm workspaces config
├── turbo.json                   # Turborepo pipeline
└── tsconfig.base.json           # TypeScript base config
```

## 🚀 Como Usar

### Desenvolvimento

```bash
# Rodar tudo
pnpm dev

# Rodar apenas NuP-Study
pnpm dev:study

# Rodar apenas um package
cd packages/@nup/ui && pnpm dev
```

### Build

```bash
# Build de tudo
pnpm build

# Build apenas NuP-Study
pnpm build:study
```

### Adicionar Dependência

```bash
# Para workspace root
pnpm add -w <package>

# Para app específica
pnpm add <package> --filter nup-study

# Para package específico
pnpm add <package> --filter @nup/ui
```

## 📚 Packages

### @nup/ui
Design system compartilhado (shadcn/ui customizado)

**Uso:**
```typescript
import { Button, Dialog, useToast } from '@nup/ui';
```

### @nup/auth-client
SDK de autenticação que conecta com NuP-Identify

**Uso:**
```typescript
import { AuthProvider, useAuth, usePermissions } from '@nup/auth-client';

<AuthProvider config={{ appId: 'nup-study' }}>
  <App />
</AuthProvider>
```

### @nup/api-client
HTTP client configurável com TanStack Query

**Uso:**
```typescript
import { apiRequest, queryClient } from '@nup/api-client';

const response = await apiRequest('POST', '/api/endpoint', data);
```

### @nup/shared-types
Types TypeScript compartilhados

**Uso:**
```typescript
import type { User, MindMap, Subject } from '@nup/shared-types';
```

## 🔄 Migração de Apps

### Status
- ✅ Estrutura base criada
- ⏳ NuP-Study (em migração)
- ⏳ Outros apps (pendentes)

### Próximos Passos
1. Migrar NuP-Study para apps/nup-study/
2. Extrair Mind Maps para features/@nup/mindmaps/
3. Migrar outras apps incrementalmente

## 🛡️ Backup & Segurança

**Branch de backup:** `backup/pre-monorepo-migration`
**Tag de versão:** `v1.0-pre-monorepo`

Para restaurar:
```bash
git checkout backup/pre-monorepo-migration
```

## 📖 Vantagens

- ✅ **Código compartilhado:** Sem duplicação
- ✅ **Type safety:** TypeScript em tudo
- ✅ **Deploy independente:** Cada app separada
- ✅ **Vendível:** Features como packages npm
- ✅ **Consistência:** Design system único
- ✅ **Manutenibilidade:** Estrutura clara
- ✅ **DX:** Um repo, uma instalação

## 🔗 Links Úteis

- [Turborepo Docs](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
