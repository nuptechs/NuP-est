# 📘 Exemplo Prático: Migrando uma App para o Monorepo

Este documento mostra um exemplo real de como migrar uma aplicação Replit para o monorepo NuP.

## 🎯 Cenário

Vamos migrar uma app chamada **NuP-Chunks** que tem:
- Frontend React com componentes de UI
- Backend Express com API REST
- Sistema de autenticação próprio
- Integração com OpenAI

## 🚀 Passo a Passo

### 1. Criar Estrutura com Script Automatizado

```bash
# Na raiz do monorepo
./scripts/create-app.sh nup-chunks 5002
```

**Output esperado:**
```
🚀 Criando estrutura para: nup-chunks
📁 Criando diretórios...
📦 Criando package.json...
⚙️  Criando tsconfig.json...
⚡ Criando vite.config.ts...
🔧 Criando servidor Express...
⚛️  Criando App.tsx...
📄 Criando README...
✅ Estrutura criada com sucesso!
```

### 2. Copiar Código da App Original

```bash
# Opção 1: Se a app está em outro Repl
# Abra a app original e copie manualmente os arquivos

# Opção 2: Se está em Git
cd /tmp
git clone https://github.com/seu-usuario/nup-chunks-original.git
cd nup-chunks-original

# Copiar frontend
cp -r src/components/* ../seu-monorepo/apps/nup-chunks/client/src/components/
cp -r src/pages/* ../seu-monorepo/apps/nup-chunks/client/src/pages/
cp -r src/hooks/* ../seu-monorepo/apps/nup-chunks/client/src/hooks/

# Copiar backend
cp -r server/routes/* ../seu-monorepo/apps/nup-chunks/server/routes/
cp -r server/services/* ../seu-monorepo/apps/nup-chunks/server/services/

# Copiar schemas
cp shared/schema.ts ../seu-monorepo/apps/nup-chunks/shared/
```

### 3. Atualizar Imports

#### Antes (código original):

```typescript
// ❌ OLD - nup-chunks-original/src/components/ChunkCard.tsx
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

export function ChunkCard({ chunk }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // ... resto do código
}
```

#### Depois (no monorepo):

```typescript
// ✅ NEW - apps/nup-chunks/client/src/components/ChunkCard.tsx
import { Button, Card, useToast } from '@nup/ui';
import { queryClient } from '@nup/api-client';
import { useAuth } from '@nup/auth-client';

export function ChunkCard({ chunk }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // ... mesmo código
}
```

### 4. Atualizar Dependências Específicas

No `apps/nup-chunks/package.json`, adicione as dependências que a app usa:

```json
{
  "dependencies": {
    // Packages compartilhados (já incluídos pelo script)
    "@nup/ui": "workspace:*",
    "@nup/auth-client": "workspace:*",
    "@nup/api-client": "workspace:*",
    "@nup/shared-types": "workspace:*",
    
    // Dependências específicas da app
    "openai": "^4.20.0",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0"
  }
}
```

### 5. Configurar Servidor

Atualize `apps/nup-chunks/server/index.ts`:

```typescript
import express from 'express';
import ViteExpress from 'vite-express';
import { db } from './db';
import chunksRouter from './routes/chunks';

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

// Middleware de autenticação (já configurado no monorepo)
import { isAuthenticated } from '../../nup-study/server/middleware/auth';
app.use('/api', isAuthenticated);

// Rotas
app.use('/api/chunks', chunksRouter);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'nup-chunks',
    version: '1.0.0' 
  });
});

// Iniciar servidor
if (process.env.NODE_ENV === 'development') {
  ViteExpress.listen(app, PORT, () => {
    console.log(`✅ NuP-Chunks running on http://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`✅ NuP-Chunks running on port ${PORT}`);
  });
}
```

### 6. Adicionar Scripts no package.json Raiz

No `package.json` da raiz do monorepo:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:study": "pnpm --filter nup-study dev",
    "dev:chunks": "pnpm --filter nup-chunks dev",  // ← NOVO
    "build": "turbo run build",
    "build:chunks": "pnpm --filter nup-chunks build"  // ← NOVO
  }
}
```

### 7. Instalar Dependências

```bash
# Na raiz do monorepo
pnpm install
```

### 8. Testar a App

```bash
# Rodar apenas nup-chunks
pnpm dev:chunks

# Ou rodar todas as apps juntas
pnpm dev
```

**Acesse:** http://localhost:5002

## 🔧 Problemas Comuns e Soluções

### Erro: "Cannot find module '@nup/ui'"

**Causa:** Packages compartilhados não foram instalados

**Solução:**
```bash
pnpm install
```

### Erro: "Port 5002 is already in use"

**Causa:** Outra app usando a mesma porta

**Solução:** Mude a porta no `vite.config.ts`:
```typescript
server: {
  port: 5003, // Nova porta
  strictPort: true,
}
```

### Imports Quebrados

**Causa:** Paths não configurados corretamente

**Solução:** Verifique `tsconfig.json` e `vite.config.ts`:
```json
{
  "compilerOptions": {
    "paths": {
      "@nup/ui": ["../../packages/@nup/ui/src"],
      // ... outros paths
    }
  }
}
```

### Database Connection Error

**Causa:** DATABASE_URL não configurado

**Solução:** Compartilhe o mesmo banco ou configure um novo:
```typescript
// apps/nup-chunks/server/db.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export const db = drizzle(pool, { schema });
```

## ✅ Checklist de Migração Completa

- [x] Estrutura criada com `create-app.sh`
- [x] Código copiado para diretórios apropriados
- [x] Imports atualizados para `@nup/*` packages
- [x] Dependências específicas adicionadas
- [x] Servidor configurado
- [x] Scripts adicionados ao package.json raiz
- [x] `pnpm install` executado
- [x] App testada e funcionando

## 📊 Comparação Antes/Depois

### Antes (App Isolada)
```
nup-chunks-repl/
├── src/
│   ├── components/
│   │   └── ui/           ← 50+ componentes duplicados
│   ├── hooks/
│   │   └── useAuth.ts    ← Auth implementado do zero
│   └── lib/
│       └── queryClient.ts ← Config duplicada
├── server/
└── package.json          ← 100+ dependências
```

### Depois (no Monorepo)
```
apps/nup-chunks/
├── client/src/
│   ├── components/       ← Apenas componentes específicos
│   ├── pages/
│   └── hooks/
├── server/
└── package.json          ← Apenas deps específicas
                          ← UI vem de @nup/ui
                          ← Auth vem de @nup/auth-client
```

## 🎯 Próximos Passos

1. **Extrair Features Reutilizáveis**
   ```bash
   mkdir -p features/@nup/chunk-processor
   # Mover lógica de processamento para feature compartilhável
   ```

2. **Configurar CI/CD**
   - Configurar deploy independente
   - Testes automatizados

3. **Documentar APIs**
   - Criar documentação OpenAPI/Swagger
   - Adicionar exemplos de uso

4. **Otimizar Performance**
   - Code splitting
   - Lazy loading
   - Cache strategies

## 💡 Dicas Avançadas

### Compartilhar Middlewares

```typescript
// packages/@nup/middlewares/src/auth.ts
export { isAuthenticated } from './auth';
export { rateLimiter } from './rateLimiter';

// Usar em qualquer app
import { isAuthenticated } from '@nup/middlewares';
```

### Compartilhar Utilities

```typescript
// packages/@nup/utils/src/index.ts
export * from './formatters';
export * from './validators';

// Usar em apps
import { formatDate, validateEmail } from '@nup/utils';
```

### Feature Flags

```typescript
// packages/@nup/feature-flags/src/index.ts
export function useFeatureFlag(flag: string) {
  // Lógica de feature flags compartilhada
}

// Usar em apps
import { useFeatureFlag } from '@nup/feature-flags';

const showNewUI = useFeatureFlag('new-chunk-ui');
```

---

**Tempo estimado de migração:** 2-4 horas para app simples, 1-2 dias para app complexa

**Benefícios imediatos:**
- ✅ UI consistente via @nup/ui
- ✅ Auth unificado via @nup/auth-client
- ✅ Type safety com @nup/shared-types
- ✅ Zero duplicação de código
