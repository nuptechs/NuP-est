# easy-nup - Monorepo Architecture

> 🚀 **Sistema de Workflows Automático:** Use `node scripts/manage-workflows.js` para gerenciar workflows! Ver [docs/WORKFLOWS.md](docs/WORKFLOWS.md)

## 📦 Estrutura do Monorepo

```
easy-nup/
├── apps/                         # Aplicações deployáveis
│   ├── nup-identify/             # CORE: Central de autenticação (SSO Gateway)
│   ├── nup-study/                # App educacional principal
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
├── services/                     # Microserviços backend standalone
│   └── custom-fields/            # Serviço de campos personalizados
│
├── config/                       # Configurações compartilhadas
├── pnpm-workspace.yaml          # pnpm workspaces config
├── turbo.json                   # Turborepo pipeline
└── tsconfig.base.json           # TypeScript base config
```

## 🛡️ Governança Arquitetural

### 🧭 Quando Criar Services vs Features vs Packages

Use este fluxograma de decisão para determinar onde colocar novo código:

```
┌─────────────────────────────────────────────────────────┐
│ 1️⃣ Precisa de servidor backend próprio + banco de dados? │
└────────────────────┬────────────────────────────────────┘
                     │
        SIM ─────────┴─────────> services/
                     │
        NÃO          │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2️⃣ É funcionalidade completa de negócio (vendível)?     │
│    Com UI + lógica + múltiplos componentes relacionados │
└────────────────────┬────────────────────────────────────┘
                     │
        SIM ─────────┴─────────> features/@nup/
                     │
        NÃO          │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3️⃣ É código técnico/fundacional reutilizável?           │
│    Sem lógica de negócio específica                     │
└────────────────────┬────────────────────────────────────┘
                     │
        SIM ─────────┴─────────> packages/@nup/
                     │
        NÃO          │
                     ▼
              ┌──────────────┐
              │ Pertence a   │
              │ uma app/     │
              │ específica   │
              └──────────────┘
```

### 📋 Características de Cada Camada

#### **services/** - Microserviços Backend Standalone

✅ **Características:**
- Servidor próprio (Express, Fastify, etc)
- Porta dedicada (3001, 3002, etc)
- Banco de dados próprio ou conexão isolada
- Deploy totalmente separado das apps
- NÃO faz parte do pnpm workspace

✅ **Quando usar:**
- Lógica backend complexa que serve múltiplas apps
- Precisa escalar independentemente
- Tem requisitos de deploy diferentes
- Necessita de estado/persistência própria

❌ **Não usar se:**
- É apenas um helper/utility
- Não precisa de servidor próprio
- Só será usado por uma app

**Exemplos:**
- `services/custom-fields/` - API de campos personalizados
- `services/auth-service/` (futuro) - Autenticação centralizada
- `services/ai-gateway/` (futuro) - Proxy para LLMs

#### **features/@nup/** - Bundles de Funcionalidades Frontend

✅ **Características:**
- Componentes React + hooks + lógica relacionados
- Depende APENAS de `packages/@nup/*`
- Vendível como módulo npm independente
- Tem valor de negócio próprio
- Faz parte do pnpm workspace

✅ **Quando usar:**
- Conjunto completo de UI + lógica (ex: sistema de Mind Maps)
- Pode ser reutilizado em múltiplas apps
- Tem valor comercial independente
- É frontend-only

❌ **Não usar se:**
- É apenas um componente isolado (vai em packages/@nup/ui)
- Tem lógica backend (precisa virar service)
- Depende de outras features

**Exemplos:**
- `features/@nup/mindmaps/` - Sistema completo de mapas mentais
- `features/@nup/professor-ia/` - Tutor com voz AI
- `features/@nup/flashcards/` - Sistema de flashcards

#### **packages/@nup/** - Código Fundacional Compartilhado

✅ **Características:**
- Bibliotecas técnicas sem lógica de negócio específica
- Usado por apps E features
- Escopo técnico (não funcional)
- Apenas dependências externas (npm)
- Faz parte do pnpm workspace

✅ **Quando usar:**
- Componentes UI básicos (Button, Dialog)
- Utilities genéricos (formatters, validators)
- SDKs/clients técnicos (HTTP, Auth)
- TypeScript types compartilhados

❌ **Não usar se:**
- Tem lógica de negócio específica
- É uma feature completa
- Só será usado por uma app

**Exemplos:**
- `packages/@nup/ui/` - Design system (componentes básicos)
- `packages/@nup/api-client/` - HTTP client + TanStack Query
- `packages/@nup/auth-client/` - SDK de autenticação
- `packages/@nup/shared-types/` - Types compartilhados

### ⚖️ Regras de Dependência

```
┌─────────────────────────────────────────────────────────┐
│                      HIERARQUIA                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  apps/              ← Aplicações deployáveis            │
│    ↓ pode importar                                       │
│  features/@nup/     ← Bundles de funcionalidades        │
│    ↓ pode importar                                       │
│  packages/@nup/     ← Código fundacional                │
│    ↓ pode importar                                       │
│  deps externas (npm)                                     │
│                                                          │
│  services/          ← Isolados (HTTP apenas)            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### ✅ PERMITIDO:

```typescript
// apps/ podem importar features e packages
import { MindMapEditor } from '@nup/mindmaps';
import { Button } from '@nup/ui';

// features/ podem importar packages
import { apiRequest } from '@nup/api-client';
import { useToast } from '@nup/ui';

// packages/ podem importar deps externas
import { useState } from 'react';
import { clsx } from 'clsx';
```

#### ❌ PROIBIDO:

```typescript
// ❌ features NÃO podem importar outras features
import { FlashcardDeck } from '@nup/flashcards'; // ERRO!

// ❌ packages NÃO podem importar features
import { MindMapEditor } from '@nup/mindmaps'; // ERRO!

// ❌ packages NÃO podem importar apps
import { Dashboard } from 'nup-study'; // ERRO!

// ❌ services NÃO importam nada do workspace
import { Button } from '@nup/ui'; // ERRO! Use HTTP/API
```

### 🔍 Validação Automática

O monorepo possui 3 camadas de validação arquitetural:

#### 1. **ESLint (Desenvolvimento)**
- Feedback em tempo real no editor
- Linha vermelha se violar regras
- Impacto: +30-50ms ao editar

#### 2. **Dependency Cruiser (CI)**
- Valida no pipeline de CI/CD
- Bloqueia PRs que violam arquitetura
- Impacto: +3-5s no build

#### 3. **Documentação**
- READMEs em cada pasta raiz
- Guias de decisão claros
- Exemplos práticos

#### Comandos de validação:

```bash
# Validar arquitetura localmente
pnpm lint:arch

# Validar todas as dependências
pnpm check:deps

# Rodar tudo (lint + type-check + arch)
pnpm validate
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
