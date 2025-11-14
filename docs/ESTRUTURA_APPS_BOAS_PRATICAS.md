# 📁 Estrutura de Apps - Boas Práticas

## 🎯 Guia de Organização Profissional

Este documento define as boas práticas para manter a estrutura dos apps limpa e profissional.

---

## 🚫 O Que NÃO Deve Estar nos Apps

### ❌ Arquivos Temporários
```
apps/{app-name}/
├── uploads/           # ❌ Arquivos de usuários
├── attached_assets/   # ❌ Screenshots temporários
├── output/            # ❌ Arquivos gerados
├── temp/              # ❌ Qualquer pasta temporária
└── *.log              # ❌ Logs locais
```

**Solução:** Já configurado no `.gitignore` global:
```gitignore
**/uploads/
**/attached_assets/
**/output/
```

### ❌ Build Artifacts
```
apps/{app-name}/
├── dist/              # ❌ Build output
├── build/             # ❌ Build output
├── .next/             # ❌ Next.js build
└── node_modules/      # ❌ Dependencies (óbvio!)
```

**Solução:** Turborepo já gerencia via `turbo.json`.

### ❌ Código de Teste em Produção
```
services/
├── test-*.ts          # ❌ Testes isolados
├── *-example.ts       # ❌ Código de exemplo
├── *-fix.ts           # ❌ Código temporário de correção
└── *.backup.ts        # ❌ Backups manuais
```

**Solução:** Use pasta `tests/` ou `__tests__/` para testes.

### ❌ Código Duplicado
```
services/
├── file-processor.ts  # ❌ Wrapper
└── fileProcessor.ts   # ✅ Implementação real
```

**Solução:** Mantenha apenas a implementação canônica.

---

## ✅ Estrutura Recomendada por App

```
apps/{app-name}/
├── client/                 # Frontend
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas (se usar wouter/router)
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Root component
│   ├── public/            # Assets estáticos
│   └── index.html         # Entry HTML
│
├── server/                # Backend
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Express middlewares
│   ├── config/            # Configurações
│   ├── db.ts              # Database connection
│   ├── schema.ts          # Drizzle schema
│   └── index.ts           # Server entry
│
├── shared/                # Código compartilhado (opcional)
│   └── types.ts           # Types usados em client + server
│
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
└── tailwind.config.ts     # Tailwind config
```

---

## 📝 Convenções de Nomenclatura

### Arquivos TypeScript
```
✅ kebab-case.ts          # file-processor.ts
✅ PascalCase.tsx         # UserProfile.tsx (componentes)
❌ camelCase.ts           # fileProcessor.ts (evitar)
❌ snake_case.ts          # file_processor.ts (evitar)
```

### Pastas
```
✅ kebab-case/            # large-document-processing/
✅ camelCase/             # mindmaps/ (features)
❌ PascalCase/            # Components/ (evitar)
```

### Componentes React
```
✅ PascalCase.tsx         # UserCard.tsx
✅ index.tsx              # index.tsx (barrel exports)
❌ user-card.tsx          # (evitar para componentes)
```

---

## 🔧 Configurações

### Quando Duplicar Configs?

| Config | Duplicar? | Motivo |
|--------|-----------|---------|
| **tsconfig.json** | ⚠️ Depende | Se usar configs compartilhados, extend do base |
| **tailwind.config** | ⚠️ Depende | Considere base compartilhado |
| **vite.config** | ✅ Sim | Cada app tem necessidades únicas |
| **package.json** | ✅ Sim | Cada app tem suas dependencies |
| **.env.example** | ✅ Sim | Cada app tem suas variáveis |

### Quando Compartilhar?

Use `packages/@nup/` quando:
- ✅ Configuração é **95%+ idêntica** entre apps
- ✅ Mudanças devem **propagar** para todos
- ✅ Manutenção **centralizada** traz benefício

Mantenha separado quando:
- ❌ Apps têm **necessidades únicas**
- ❌ Mudanças precisam ser **isoladas**
- ❌ Flexibilidade > Consistência

---

## 🎨 Padrões de Código

### Imports Organizados
```typescript
// ✅ BOM - Agrupados e ordenados
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/UserCard';

import { apiRequest } from '@/lib/api';
import type { User } from '@/types';

// ❌ RUIM - Misturado
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { User } from '@/types';
import { apiRequest } from '@/lib/api';
```

### Barrel Exports
```typescript
// ✅ components/index.ts
export { UserCard } from './UserCard';
export { UserList } from './UserList';
export { UserProfile } from './UserProfile';

// Uso limpo
import { UserCard, UserList } from '@/components';
```

### Evitar Default Exports
```typescript
// ✅ Preferred - Named exports
export function UserCard() { ... }

// ⚠️ Use apenas para páginas/routes
export default function HomePage() { ... }
```

---

## 🗄️ Gerenciamento de Dados

### Uploads de Usuários

```typescript
// ✅ CORRETO - Salvar no database
await db.insert(materials).values({
  userId,
  filename,
  content,  // Texto extraído
  // Não salvar o arquivo físico!
});

// ❌ ERRADO - Arquivos físicos versionados
fs.writeFileSync('uploads/file.pdf', buffer);
// E depois fazer commit!
```

**Regra:** Uploads físicos são **runtime-only**, não versionados.

### Dados Temporários

```typescript
// ✅ CORRETO - Usar /tmp ou memory
const tempPath = path.join('/tmp', `temp_${Date.now()}.pdf`);

// ✅ CORRETO - Limpar após uso
try {
  processFile(tempPath);
} finally {
  fs.unlinkSync(tempPath);
}
```

---

## 🧪 Testes

### Estrutura de Testes
```
apps/{app-name}/
├── src/
│   └── services/
│       └── fileProcessor.ts
└── tests/                         # ✅ Pasta separada
    └── services/
        └── fileProcessor.test.ts
```

**Nunca:**
```
services/
├── fileProcessor.ts
└── fileProcessor.test.ts  # ❌ Misturado com código
```

---

## 📦 Dependencies

### package.json Limpo

```json
{
  "dependencies": {
    // ✅ Apenas o que o app REALMENTE usa
    "express": "^4.18.0",
    "react": "^18.0.0"
  },
  "devDependencies": {
    // ✅ Dev-only
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Remova:**
- ❌ Dependencies não utilizadas
- ❌ Versões conflitantes
- ❌ Packages duplicados (já em workspace)

**Comando útil:**
```bash
pnpm why <package>  # Ver por que está instalado
npx depcheck        # Encontrar unused dependencies
```

---

## 🚀 Checklist de Limpeza Periódica

### Mensal
- [ ] Revisar e remover dependencies não utilizadas
- [ ] Limpar pastas temporárias (`uploads/`, `output/`)
- [ ] Verificar código duplicado
- [ ] Atualizar documentação

### Trimestral
- [ ] Revisar configs duplicadas
- [ ] Consolidar padrões entre apps
- [ ] Refatorar código legado
- [ ] Audit de segurança (`pnpm audit`)

### Semestral
- [ ] Migração de breaking changes
- [ ] Reorganização de estrutura (se necessário)
- [ ] Revisão arquitetural completa

---

## 📚 Recursos

- [Turborepo Best Practices](https://turbo.build/repo/docs/handbook)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

*Mantenha este documento atualizado conforme o projeto evolui!*
