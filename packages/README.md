# Packages - Código Fundacional Compartilhado

Packages são bibliotecas técnicas fundamentais sem lógica de negócio específica.

## 🎯 O Que São Packages?

Packages são **blocos de código reutilizáveis** que fornecem funcionalidades técnicas/fundacionais usadas por apps e features. São a base da pirâmide arquitetural.

### Características Principais

✅ **Escopo técnico** - Utilities, componentes básicos, SDKs
✅ **Zero lógica de negócio** - Sem conhecimento de domínio específico
✅ **Máxima reutilização** - Usado por apps E features
✅ **Deps externas apenas** - Não depende de features ou apps
✅ **Workspace package** - Faz parte do pnpm workspace
✅ **Base da pirâmide** - Todos dependem deles

## 🧭 Quando Criar um Package?

Use este checklist para decidir se seu código deve ser um package:

### ✅ Criar Package SE:

- [ ] É código técnico/fundacional sem lógica de negócio
- [ ] Será usado por MÚLTIPLAS apps e/ou features
- [ ] Tem escopo técnico (não funcional): UI, HTTP, Auth, Types
- [ ] Não depende de features ou apps
- [ ] É um building block básico (componente, utility, SDK)
- [ ] Pode funcionar com APENAS dependências externas (npm)

### ❌ NÃO Criar Package SE:

- [ ] Tem lógica de negócio específica (vai em `features/`)
- [ ] É uma funcionalidade completa (vai em `features/`)
- [ ] Precisa de servidor backend (vai em `services/`)
- [ ] Só será usado por uma app (vai dentro da `app/`)
- [ ] Depende de outras features

## 📂 Estrutura de um Package

```
packages/@nup/
└── nome-do-package/
    ├── src/
    │   ├── components/            # Componentes básicos (se for UI)
    │   │   ├── Button.tsx
    │   │   └── Dialog.tsx
    │   ├── hooks/                 # Hooks genéricos
    │   │   ├── useToast.ts
    │   │   └── useLocalStorage.ts
    │   ├── utils/                 # Utilities
    │   │   ├── cn.ts
    │   │   └── formatters.ts
    │   ├── types/                 # Types compartilhados
    │   │   └── common.types.ts
    │   └── index.ts               # Export público
    ├── tests/                     # Testes do package
    │   └── Button.test.tsx
    ├── package.json               # Dependencies externas apenas
    ├── tsconfig.json              # TypeScript config
    └── README.md                  # Documentação do package
```

## 🚀 Como Criar um Novo Package

### Passo 1: Criar estrutura

```bash
mkdir -p packages/@nup/meu-package/src
cd packages/@nup/meu-package
```

### Passo 2: Criar package.json

```json
{
  "name": "@nup/meu-package",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "typescript": "^5.6.3",
    "vitest": "^1.0.0"
  }
}
```

**IMPORTANTE:** Apenas dependências externas (npm). Nunca `@nup/mindmaps` ou outras features!

### Passo 3: Criar tsconfig.json

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Passo 4: Criar código do package

```typescript
// src/utils/formatters.ts
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date);
}
```

### Passo 5: Exportar publicamente

```typescript
// src/index.ts
export { formatCurrency, formatDate } from './utils/formatters';
export { cn } from './utils/cn';
export type { CommonProps } from './types/common.types';
```

### Passo 6: Documentar no README

Crie um `README.md` documentando:
- O que o package faz
- Como usar
- API pública
- Exemplos

## 🔌 Como Apps e Features Usam Packages

Todos importam packages via `workspace:*`:

```typescript
// apps/nup-study/src/pages/Dashboard.tsx
import { Button } from '@nup/ui';
import { apiRequest } from '@nup/api-client';
import { formatCurrency } from '@nup/shared-utils';

// features/@nup/mindmaps/src/components/Editor.tsx
import { useToast } from '@nup/ui';
import type { User } from '@nup/shared-types';
```

## 🎯 Packages Atuais

### @nup/ui
Design system com componentes shadcn/ui customizados
- Button, Dialog, Toast, etc
- Status: ✅ Produção

### @nup/api-client
HTTP client configurável com TanStack Query
- `apiRequest`, `queryClient`
- Status: ✅ Produção

### @nup/auth-client
SDK de autenticação conectado ao NuP-Identify
- `AuthProvider`, `useAuth`, `usePermissions`
- Status: 🚧 Em desenvolvimento

### @nup/shared-types
Types TypeScript compartilhados
- `User`, `MindMap`, `Subject`, etc
- Status: ✅ Produção

## ⚖️ Regras de Dependência

### ✅ PERMITIDO:

```typescript
// Packages podem importar deps externas
import { useState } from 'react';
import { clsx } from 'clsx';
import { z } from 'zod';

// Packages podem importar outros packages
import { cn } from '@nup/ui';
import type { User } from '@nup/shared-types';
```

### ❌ PROIBIDO:

```typescript
// ❌ Packages NÃO podem importar features
import { MindMapEditor } from '@nup/mindmaps'; // ERRO!

// ❌ Packages NÃO podem importar apps
import { Dashboard } from 'nup-study'; // ERRO!

// ❌ Packages NÃO podem importar services
import { customFieldsDb } from '@nup/custom-fields-service'; // ERRO!
```

**Por quê?** Packages são a base. Se dependessem de features/apps, criariam dependências circulares.

## 🎨 Boas Práticas

### 1. Mantenha Genérico

```typescript
// ✅ BOM - Genérico, reutilizável
export function formatDate(date: Date, locale = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale).format(date);
}

// ❌ RUIM - Específico de domínio
export function formatMindMapDate(mindMap: MindMap): string {
  return mindMap.createdAt.toLocaleDateString();
}
```

### 2. Exponha API Mínima

```typescript
// src/index.ts
// ✅ BOM - Apenas o essencial
export { Button, Dialog, Toast } from './components';
export { useToast } from './hooks';
export { cn } from './utils';

// ❌ RUIM - Expõe internals
export * from './components';
export * from './hooks';
export * from './utils';
export * from './internal'; // Nunca exporte internals!
```

### 3. Use Tree-Shaking

```typescript
// ✅ BOM - Exports nomeados (tree-shakeable)
export { formatDate } from './formatters';
export { cn } from './cn';

// ❌ RUIM - Default export (dificulta tree-shaking)
export default {
  formatDate,
  cn
};
```

### 4. Documente com JSDoc

```typescript
/**
 * Combina classes CSS com suporte a Tailwind
 * 
 * @param inputs - Classes CSS para combinar
 * @returns String de classes combinadas
 * 
 * @example
 * ```ts
 * cn('bg-red-500', 'text-white', { 'font-bold': true })
 * // => 'bg-red-500 text-white font-bold'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### 5. Forneça Tipos Completos

```typescript
// types/common.types.ts
export type User = {
  id: string;
  name: string;
  email: string;
};

export type ApiResponse<T = unknown> = {
  data: T;
  error?: string;
  status: number;
};

// Sempre exporte tipos úteis
export type { User, ApiResponse };
```

## 📦 Exemplo Completo: Package de Utilities

```
packages/@nup/utils/
├── src/
│   ├── formatters/
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   └── index.ts
│   ├── validators/
│   │   ├── email.ts
│   │   ├── cpf.ts
│   │   └── index.ts
│   ├── types/
│   │   └── common.ts
│   └── index.ts
├── tests/
│   ├── formatters.test.ts
│   └── validators.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

```typescript
// src/index.ts
export * from './formatters';
export * from './validators';
export type * from './types/common';
```

```json
// package.json
{
  "name": "@nup/utils",
  "version": "0.1.0",
  "dependencies": {
    "date-fns": "^3.0.0",
    "validator": "^13.11.0"
  }
}
```

## 🚨 Validação Automática

O monorepo valida automaticamente que:

- Packages não importam features ✅
- Packages não importam apps ✅
- Packages mantêm API pública limpa ✅

Comandos:

```bash
# Validar arquitetura
pnpm lint:arch

# Validar dependências
pnpm check:deps
```

## 🔍 Quando Package vs Feature?

| Critério | Package | Feature |
|----------|---------|---------|
| **Escopo** | Técnico | Negócio |
| **Lógica** | Genérica | Específica |
| **Exemplo** | `Button`, `formatDate` | `MindMapEditor`, `FlashcardDeck` |
| **Deps** | Externas apenas | Packages + externas |
| **Usado por** | Apps + Features | Apps apenas |
| **Vendível** | Como lib técnica | Como produto funcional |

**Regra de ouro:** Se tem lógica de negócio, é feature. Se é técnico/genérico, é package.

## 📚 Recursos

- [Package Design Guidelines](https://github.com/gold-standard/writing-a-nodejs-package)
- [TypeScript Library Best Practices](https://github.com/sindresorhus/awesome-nodejs#packages)
- [Monorepo Package Management](https://monorepo.tools/)
