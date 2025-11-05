# 📦 Guia de Migração de Imports

## Objetivo

Migrar imports locais para packages compartilhados do monorepo.

## Mapeamento de Imports

### Antes (Local) → Depois (Package)

| Antes | Depois | Status |
|-------|--------|--------|
| `@/lib/utils` | `@nup/ui` | ⏳ Pendente |
| `@/hooks/use-toast` | `@nup/ui` | ⏳ Pendente |
| `@/components/ui/*` | `@nup/ui` | ⏳ Pendente |
| `@shared/schema` types | `@nup/shared-types` | ⏳ Pendente |
| `@/lib/queryClient` | `@nup/api-client` | ⏳ Pendente |

## Arquivos Afetados

### `@/lib/utils` (40+ arquivos)
```typescript
// ANTES
import { cn } from '@/lib/utils';

// DEPOIS
import { cn } from '@nup/ui';
```

### `@/hooks/use-toast` (20+ arquivos)
```typescript
// ANTES
import { useToast } from '@/hooks/use-toast';

// DEPOIS
import { useToast } from '@nup/ui';
```

### `@/lib/queryClient` (15+ arquivos)
```typescript
// ANTES
import { queryClient, apiRequest } from '@/lib/queryClient';

// DEPOIS
import { queryClient, apiRequest } from '@nup/api-client';
```

## Estratégia de Migração

### Fase 1: Popular Packages (Agora)
1. Copiar componentes shadcn/ui para `@nup/ui`
2. Copiar hooks para `@nup/ui`
3. Copiar utils para `@nup/ui`

### Fase 2: Atualizar Imports (Incremental)
1. Migrar imports de utils primeiro (mais simples)
2. Migrar imports de hooks
3. Migrar imports de componentes

### Fase 3: Limpeza
1. Remover arquivos locais duplicados
2. Manter apenas o que é específico do app

## Script de Automação (Futuro)

```bash
# Find/Replace em massa (usar com cuidado!)
find apps/nup-study/client/src -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i "s/@\/lib\/utils/@nup\/ui/g"
```

## Status Atual

- ✅ Estrutura de packages criada
- ✅ Aliases configurados (tsconfig, vite)
- ⏳ Popular packages com código
- ⏳ Migrar imports

## Próxima Ação

Por enquanto, **manter imports locais** e focar em:
1. Popular os packages @nup/* com código real
2. Testar que o monorepo builda corretamente
3. Migrar imports incrementalmente depois
