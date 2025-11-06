# 🚀 Guia de Migração de Apps para o Monorepo NuP

Este guia explica como trazer outras aplicações Replit para a estrutura de monorepo do NuP Ecosystem.

## 📋 Pré-requisitos

Antes de começar, certifique-se de:
- ✅ Ter a estrutura do monorepo NuP funcionando
- ✅ Ter acesso à aplicação que deseja migrar
- ✅ Backup da aplicação original (crie um branch ou fork)

## 🔄 Processo de Migração

### Passo 1: Preparar a Nova App no Monorepo

```bash
# 1. Criar diretório para a nova app
mkdir -p apps/nome-da-app

# 2. Copiar estrutura básica (use nup-study como template)
cd apps/nome-da-app
```

### Passo 2: Estrutura de Diretórios

Organize sua app seguindo este padrão:

```
apps/nome-da-app/
├── client/                 # Frontend
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes React
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitários
│   │   └── App.tsx        # App principal
│   └── index.html
├── server/                # Backend
│   ├── routes/            # Rotas da API
│   ├── services/          # Lógica de negócio
│   ├── middleware/        # Middlewares Express
│   ├── db.ts             # Conexão com banco
│   ├── storage.ts        # Interface de storage
│   └── index.ts          # Entry point
├── shared/               # Código compartilhado
│   └── schema.ts         # Schemas Drizzle
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Passo 3: Migrar Código

#### 3.1. Copiar Arquivos da App Original

```bash
# No Replit, você pode:
# 1. Abrir a app original em outra aba
# 2. Copiar os arquivos para apps/nome-da-app/

# Ou usar Git (se a app estiver em outro repo):
cd /tmp
git clone <url-da-app-original>
cp -r <app-original>/client apps/nome-da-app/
cp -r <app-original>/server apps/nome-da-app/
```

#### 3.2. Atualizar package.json

Crie `apps/nome-da-app/package.json`:

```json
{
  "name": "nome-da-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@nup/ui": "workspace:*",
    "@nup/auth-client": "workspace:*",
    "@nup/api-client": "workspace:*",
    "@nup/shared-types": "workspace:*",
    "express": "^4.18.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
    // ... outras dependências específicas da app
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

#### 3.3. Configurar TypeScript

Crie `apps/nome-da-app/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"],
      "@nup/ui": ["../../packages/@nup/ui/src"],
      "@nup/auth-client": ["../../packages/@nup/auth-client/src"],
      "@nup/api-client": ["../../packages/@nup/api-client/src"],
      "@nup/shared-types": ["../../packages/@nup/shared-types/src"]
    }
  },
  "include": ["client", "server", "shared"],
  "exclude": ["node_modules", "dist"]
}
```

#### 3.4. Configurar Vite

Crie `apps/nome-da-app/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@nup/ui': path.resolve(__dirname, '../../packages/@nup/ui/src'),
      '@nup/auth-client': path.resolve(__dirname, '../../packages/@nup/auth-client/src'),
      '@nup/api-client': path.resolve(__dirname, '../../packages/@nup/api-client/src'),
      '@nup/shared-types': path.resolve(__dirname, '../../packages/@nup/shared-types/src'),
    },
  },
  server: {
    port: 5001, // Porta diferente de nup-study (5000)
    strictPort: true,
  },
});
```

### Passo 4: Usar Packages Compartilhados

#### 4.1. Migrar para @nup/ui

**Antes:**
```typescript
// Importações diretas do shadcn
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
```

**Depois:**
```typescript
// Importações do package compartilhado
import { Button, useToast } from '@nup/ui';
```

#### 4.2. Migrar para @nup/auth-client

**Antes:**
```typescript
// Lógica de auth local
import { useAuth } from '@/hooks/useAuth';
```

**Depois:**
```typescript
// SDK compartilhado
import { useAuth } from '@nup/auth-client';
```

#### 4.3. Migrar para @nup/api-client

**Antes:**
```typescript
// queryClient local
import { queryClient } from '@/lib/queryClient';
```

**Depois:**
```typescript
// Cliente compartilhado
import { queryClient, apiRequest } from '@nup/api-client';
```

### Passo 5: Configurar Database (se usar PostgreSQL)

Se sua app usa banco de dados:

```typescript
// apps/nome-da-app/server/db.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### Passo 6: Atualizar Turborepo

Adicione sua app ao `turbo.json` na raiz:

```json
{
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  },
  "globalDependencies": ["tsconfig.base.json"]
}
```

### Passo 7: Adicionar Scripts no package.json Raiz

No `package.json` da raiz, adicione:

```json
{
  "scripts": {
    "dev:nome-app": "pnpm --filter nome-da-app dev",
    "build:nome-app": "pnpm --filter nome-da-app build"
  }
}
```

### Passo 8: Instalar Dependências

```bash
# Na raiz do monorepo
pnpm install
```

### Passo 9: Testar a App

```bash
# Rodar apenas sua nova app
pnpm dev:nome-app

# Ou rodar todas as apps
pnpm dev
```

## 📦 Migração de Features Compartilháveis

Se sua app tem features que podem ser reutilizadas:

### 1. Extrair Feature para Package

```bash
mkdir -p features/@nup/nome-feature
```

### 2. Estrutura da Feature

```
features/@nup/nome-feature/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── index.ts         # Export público
├── package.json
└── tsconfig.json
```

### 3. package.json da Feature

```json
{
  "name": "@nup/nome-feature",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@nup/ui": "workspace:*",
    "@nup/shared-types": "workspace:*"
  }
}
```

### 4. Usar Feature em Outras Apps

```typescript
// Em qualquer app
import { FeatureComponent } from '@nup/nome-feature';
```

## 🔍 Checklist de Migração

- [ ] App copiada para `apps/nome-da-app/`
- [ ] `package.json` configurado
- [ ] `tsconfig.json` configurado
- [ ] `vite.config.ts` configurado
- [ ] Imports atualizados para usar packages compartilhados
- [ ] Database configurado (se necessário)
- [ ] Scripts adicionados ao `package.json` raiz
- [ ] Dependências instaladas (`pnpm install`)
- [ ] App testada (`pnpm dev:nome-app`)
- [ ] Features extraídas (opcional)

## 🚨 Problemas Comuns

### Erro: "Module not found"
**Solução:** Verifique os paths no `tsconfig.json` e `vite.config.ts`

### Erro: "Port already in use"
**Solução:** Use porta diferente no `vite.config.ts` (ex: 5001, 5002)

### Erro: "Workspace package not found"
**Solução:** Execute `pnpm install` na raiz do monorepo

### Imports quebrados
**Solução:** Atualize todos os imports para usar `@nup/*` packages

## 📚 Recursos

- [Documentação Turborepo](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)

## 💡 Dicas

1. **Migre incrementalmente:** Comece com uma app simples
2. **Use nup-study como referência:** É a app mais completa
3. **Compartilhe código:** Extraia features reutilizáveis
4. **Mantenha consistência:** Use os mesmos padrões em todas as apps
5. **Documente mudanças:** Atualize README.md da app

## 🎯 Próximos Passos

Após migrar sua app:

1. Extrair features compartilháveis para `features/@nup/`
2. Configurar CI/CD para deploy independente
3. Documentar APIs e integrações
4. Adicionar testes
5. Configurar monitoramento

---

**Precisa de ajuda?** Consulte o `MONOREPO.md` ou peça suporte ao time NuP.
