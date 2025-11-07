# eslint-plugin-nup-monorepo

Plugin ESLint personalizado para validar regras arquiteturais do monorepo NuP.

## ⚙️ Configuração

### Descoberta Automática de Packages e Features

O plugin **descobre automaticamente** packages e features do workspace lendo os diretórios:

- `packages/@nup/*` → Detectados como packages
- `features/@nup/*` → Detectados como features

**Não é necessário configuração manual!** O plugin se adapta automaticamente quando você adiciona novos packages ou features.

### Fallback

Se a descoberta automática falhar (ex: estrutura de pastas diferente), o plugin usa uma lista de fallback com os packages/features mais comuns.

## Regras

### `no-feature-to-feature-imports`

Proíbe features de importar outras features.

**❌ Incorreto:**

```typescript
// features/@nup/mindmaps/src/components/Editor.tsx
import { FlashcardDeck } from '@nup/flashcards'; // ERRO!
```

**✅ Correto:**

```typescript
// features/@nup/mindmaps/src/components/Editor.tsx
import { Button } from '@nup/ui'; // OK - package
import { apiRequest } from '@nup/api-client'; // OK - package
```

### `no-package-to-feature-imports`

Proíbe packages de importar features.

**❌ Incorreto:**

```typescript
// packages/@nup/ui/src/components/Button.tsx
import { MindMapEditor } from '@nup/mindmaps'; // ERRO!
```

**✅ Correto:**

```typescript
// packages/@nup/ui/src/components/Button.tsx
import { clsx } from 'clsx'; // OK - dependência externa
```

### `no-service-workspace-imports`

Proíbe services de importar código do workspace.

**❌ Incorreto:**

```javascript
// services/custom-fields/src/server.js
import { Button } from '@nup/ui'; // ERRO!
```

**✅ Correto:**

```javascript
// services/custom-fields/src/server.js
import express from 'express'; // OK - dependência externa
```

## Uso

As regras são aplicadas automaticamente via configuração no `.eslintrc.js` raiz do monorepo.

## Performance

- **Overhead no dev:** ~30-50ms por arquivo editado
- **Overhead no CI:** ~5-10s no pipeline total
- **Mitigação:** Cache habilitado, otimizações aplicadas

## Arquitetura

O plugin valida a hierarquia arquitetural:

```
apps/
  ↓ pode importar
features/@nup/
  ↓ pode importar
packages/@nup/
  ↓ pode importar
deps externas (npm)

services/ ← isolados (HTTP apenas)
```
