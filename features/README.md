# Features - Bundles de Funcionalidades Frontend

Features são conjuntos completos de UI + lógica que podem ser vendidos como módulos npm independentes.

## 🎯 O Que São Features?

Features são **bundles de funcionalidades de negócio** que combinam componentes React, hooks, serviços e lógica relacionada em um pacote vendível e reutilizável.

### Características Principais

✅ **Frontend-only** - Componentes React + hooks + lógica
✅ **Valor de negócio** - Funcionalidade completa vendível
✅ **Reutilizável** - Pode ser usado em múltiplas apps
✅ **Autocontida** - Tudo relacionado em um só lugar
✅ **Workspace package** - Faz parte do pnpm workspace
✅ **Depende de packages** - Usa `@nup/ui`, `@nup/api-client`, etc

## 🧭 Quando Criar uma Feature?

Use este checklist para decidir se seu código deve ser uma feature:

### ✅ Criar Feature SE:

- [ ] É um conjunto completo de UI + lógica (ex: sistema de Mind Maps)
- [ ] Pode ser reutilizado em múltiplas apps do ecossistema
- [ ] Tem valor comercial independente (vendível como módulo)
- [ ] Combina múltiplos componentes relacionados (não é um componente isolado)
- [ ] É exclusivamente frontend (sem servidor backend próprio)
- [ ] Pode funcionar com apenas `packages/@nup/*` como dependências

### ❌ NÃO Criar Feature SE:

- [ ] É apenas um componente isolado (vai em `packages/@nup/ui`)
- [ ] Precisa de servidor backend próprio (vai em `services/`)
- [ ] Só será usado por uma app (vai dentro da `app/`)
- [ ] Depende de outras features (viola hierarquia)
- [ ] É apenas um utility/helper (vai em `packages/`)

## 📂 Estrutura de uma Feature

```
features/@nup/
└── nome-da-feature/
    ├── src/
    │   ├── components/            # Componentes React
    │   │   ├── FeatureEditor.tsx
    │   │   ├── FeatureList.tsx
    │   │   └── FeatureCard.tsx
    │   ├── hooks/                 # Custom hooks
    │   │   ├── useFeatureData.ts
    │   │   └── useFeatureActions.ts
    │   ├── services/              # Lógica de negócio
    │   │   ├── featureService.ts
    │   │   └── featureTransforms.ts
    │   ├── types/                 # Types específicos da feature
    │   │   └── feature.types.ts
    │   ├── utils/                 # Utilities específicos
    │   │   └── featureHelpers.ts
    │   └── index.ts               # Export público
    ├── tests/                     # Testes da feature
    │   └── FeatureEditor.test.tsx
    ├── package.json               # Dependencies (workspace:*)
    ├── tsconfig.json              # TypeScript config
    └── README.md                  # Documentação da feature
```

## 🚀 Como Criar uma Nova Feature

### Passo 1: Criar estrutura

```bash
mkdir -p features/@nup/minha-feature/src/{components,hooks,services,types,utils}
cd features/@nup/minha-feature
```

### Passo 2: Criar package.json

```json
{
  "name": "@nup/minha-feature",
  "version": "1.0.0",
  "description": "Descrição da funcionalidade",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest"
  },
  "keywords": ["nup", "feature", "vendivel"],
  "author": "NuP Team",
  "license": "MIT",
  "dependencies": {
    "@nup/ui": "workspace:*",
    "@nup/api-client": "workspace:*",
    "@nup/shared-types": "workspace:*",
    "@tanstack/react-query": "^5.62.11",
    "react": "^18.3.1",
    "lucide-react": "^0.462.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "typescript": "^5.6.3",
    "vitest": "^1.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

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

### Passo 4: Criar componente principal

```typescript
// src/components/MinhaFeature.tsx
import { Button } from '@nup/ui';
import { apiRequest } from '@nup/api-client';
import { useQuery } from '@tanstack/react-query';

export function MinhaFeature() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/minha-feature'],
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="p-4">
      <h2>Minha Feature</h2>
      <Button>Ação Principal</Button>
    </div>
  );
}
```

### Passo 5: Exportar publicamente

```typescript
// src/index.ts
export { MinhaFeature } from './components/MinhaFeature';
export { useFeatureData } from './hooks/useFeatureData';
export type { FeatureData, FeatureConfig } from './types/feature.types';
```

### Passo 6: Documentar no README

Crie um `README.md` documentando:
- O que a feature faz
- Como instalar/usar
- Props e APIs públicas
- Exemplos de uso

## 🔌 Como Apps Usam Features

Apps importam features diretamente:

```typescript
// apps/nup-study/src/pages/FeaturePage.tsx
import { MinhaFeature } from '@nup/minha-feature';

export function FeaturePage() {
  return (
    <div>
      <h1>Usando a Feature</h1>
      <MinhaFeature />
    </div>
  );
}
```

## 🎯 Features Atuais

### @nup/mindmaps
Sistema completo de mapas mentais com AI e RAG
- Geração AI, SimpleMind features, export
- Status: ✅ Produção

### @nup/professor-ia
Tutor com voz AI usando OpenAI Realtime API
- Voz ultra-baixa latência, multi-sessão
- Status: ✅ Produção

### @nup/flashcards
Sistema de flashcards com spaced repetition
- Criação AI, algoritmo SM-2
- Status: ✅ Produção

## ⚖️ Regras de Dependência

### ✅ PERMITIDO:

```typescript
// Features podem importar packages
import { Button } from '@nup/ui';
import { apiRequest } from '@nup/api-client';
import { useAuth } from '@nup/auth-client';
import type { User } from '@nup/shared-types';

// Features podem importar deps externas
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
```

### ❌ PROIBIDO:

```typescript
// ❌ Features NÃO podem importar outras features
import { FlashcardDeck } from '@nup/flashcards'; // ERRO!

// ❌ Features NÃO podem importar apps
import { Dashboard } from 'nup-study'; // ERRO!

// ❌ Features NÃO podem importar services
import { customFieldsDb } from '@nup/custom-fields-service'; // ERRO!
```

**Por quê?** Features devem ser independentes e vendíveis separadamente. Se uma feature depende de outra, o código compartilhado deve ir para `packages/`.

## 🎨 Boas Práticas

### 1. Mantenha a API Pública Pequena

Apenas exporte o necessário:

```typescript
// ✅ BOM
export { MinhaFeature } from './components/MinhaFeature';

// ❌ RUIM - Expõe muito
export * from './components';
export * from './hooks';
export * from './services';
```

### 2. Use Barrel Exports

Centralize exports em `index.ts`:

```typescript
// src/index.ts
export { MinhaFeature } from './components/MinhaFeature';
export { useFeatureData } from './hooks/useFeatureData';
export type { FeatureConfig } from './types';
```

### 3. Documente Props com JSDoc

```typescript
/**
 * Editor completo de Mind Maps com suporte a AI
 * 
 * @example
 * ```tsx
 * <MindMapEditor
 *   mapId="123"
 *   onSave={(data) => console.log(data)}
 * />
 * ```
 */
export function MindMapEditor({ mapId, onSave }: Props) {
  // ...
}
```

### 4. Forneça Tipos TypeScript

```typescript
// Sempre exporte tipos úteis
export type MinhaFeatureProps = {
  id: string;
  onComplete?: (result: FeatureResult) => void;
};
```

### 5. Teste Isoladamente

```typescript
// tests/MinhaFeature.test.tsx
import { render, screen } from '@testing-library/react';
import { MinhaFeature } from '../src';

test('renderiza corretamente', () => {
  render(<MinhaFeature />);
  expect(screen.getByText('Minha Feature')).toBeInTheDocument();
});
```

## 📦 Publicação como Package npm

Features podem ser publicadas no npm para venda:

```bash
# Build da feature
cd features/@nup/minha-feature
pnpm build

# Publicar (após configurar npmjs.com)
npm publish --access public
```

Clientes instalam assim:

```bash
npm install @nup/minha-feature
```

## 🚨 Validação Automática

O monorepo valida automaticamente que:

- Features não importam outras features ✅
- Features só dependem de packages ✅
- Features exportam APIs públicas limpas ✅

Comandos:

```bash
# Validar arquitetura
pnpm lint:arch

# Validar dependências
pnpm check:deps
```

## 📚 Recursos

- [React Component Patterns](https://www.patterns.dev/react/)
- [Publishing npm Packages](https://docs.npmjs.com/packages-and-modules)
- [Monorepo Best Practices](https://monorepo.tools/)
