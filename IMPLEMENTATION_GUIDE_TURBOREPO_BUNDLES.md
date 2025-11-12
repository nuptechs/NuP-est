# 🏗️ Implementação: Turborepo + Exported Release Bundles

## ✅ Status Atual: FASE 1 - COMPLETA (Nov 12, 2025)

### 🎉 SUCESSO TOTAL: Todos os 8 packages/features buildando ESM+CJS+DTS

### ✅ Implementação Finalizada:

1. **Instalado dependências:**
   - `tsup` - Build tool
   - `rimraf` - Clean utility

2. **Criado tsup.config.ts para 8 packages/features:**
   - ✅ packages/@nup/shared-types (ESM + CJS + DTS)
   - ✅ packages/@nup/ui (27KB ESM, 32KB CJS, 30KB DTS + styles/)
   - ✅ packages/@nup/api-client (1.8KB ESM/CJS + DTS)
   - ✅ packages/@nup/auth-client (1.7KB ESM/CJS + DTS)
   - ✅ packages/@nup/email (21KB ESM/CJS + DTS + templates/)
   - ✅ features/@nup/flashcards (59KB ESM/CJS + 1.89KB DTS)
   - ✅ features/@nup/mindmaps (192-202KB ESM/CJS + 8.73KB DTS)
   - ✅ features/@nup/professor-ia (48-53KB ESM/CJS + 1.05KB DTS)

3. **Configurado asset copying:**
   - @nup/ui: Copia styles/ para dist/
   - @nup/email: Copia templates/ para dist/

4. **Resolvido problemas técnicos:**
   - ✅ 6 circular imports em @nup/ui (Button, Card, etc.)
   - ✅ TypeScript composite conflicts (removido composite de features)
   - ✅ esbuild module resolution (aliases para @nup/* packages)
   - ✅ Import não usado em @nup/email

---

## 🔧 SOLUÇÃO TÉCNICA IMPLEMENTADA

### Build Order Dependency

Features dependem de packages buildados, por isso usamos **build sequencial**:

```bash
# Packages primeiro
pnpm -r --filter "./packages/@nup/*" run build

# Features depois
pnpm -r --filter "./features/@nup/*" run build
```

### esbuild Aliases para Features

Features usam aliases para resolver @nup/* packages durante build:

**features/@nup/*/tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
  // ... outras configs
  esbuildOptions(options) {
    options.alias = {
      '@nup/ui': resolve(__dirname, '../../../packages/@nup/ui/dist/index.js'),
      '@nup/api-client': resolve(__dirname, '../../../packages/@nup/api-client/dist/index.js'),
      '@nup/shared-types': resolve(__dirname, '../../../packages/@nup/shared-types/dist/index.js'),
    };
  },
});
```

Isso permite features **bundlarem código** de packages internos sem esbuild errors.

---

## 📋 PRÓXIMOS PASSOS (FASE 2)

### FASE 2: Deploy Scripts (~4-6h)

#### Objetivo

Criar scripts de deploy que geram **release bundles self-contained** para cada app, prontos para Multi-Repl deployment.

#### Passo 1: Criar script base de deploy

**scripts/deploy-app.sh:**
```json
{
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "dependencies": {
    "@radix-ui/react-toast": "^1.2.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.462.0",
    "tailwind-merge": "^2.5.5"
  }
}
```

**packages/@nup/auth-client/package.json:**
```json
{
  "peerDependencies": {
    "react": "^18.3.1"
  },
  "dependencies": {
    "@nup/shared-types": "workspace:*"
  }
}
```

**packages/@nup/api-client/package.json:**
```json
{
  "peerDependencies": {
    "@tanstack/react-query": "^5.62.11"
  },
  "dependencies": {
    "@nup/shared-types": "workspace:*"
  }
}
```

**features/@nup/mindmaps/package.json:**
```json
{
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@xyflow/react": "^12.3.5"
  },
  "dependencies": {
    "@nup/shared-types": "workspace:*",
    "@nup/ui": "workspace:*"
  }
}
```

**features/@nup/flashcards/package.json:**
```json
{
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "dependencies": {
    "@nup/shared-types": "workspace:*",
    "@nup/ui": "workspace:*"
  }
}
```

**features/@nup/professor-ia/package.json:**
```json
{
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "dependencies": {
    "@nup/shared-types": "workspace:*"
  }
}
```

#### Passo 2: Atualizar exports em package.json

Para CADA package, mudar de:
```json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Para:
```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

**Para @nup/ui especificamente (mantém styles export):**
```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/styles/index.css"
  }
}
```

#### Passo 3: Adicionar build scripts

Para CADA package/feature, adicionar no package.json:
```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "clean": "rimraf dist",
    "type-check": "tsc --noEmit"
  }
}
```

#### Passo 4: Adicionar .gitignore

Em cada package/feature, criar `.gitignore`:
```
dist/
*.tsbuildinfo
```

#### Passo 5: Atualizar turbo.json

Adicionar pipeline de build:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

#### Passo 6: Testar builds

```bash
# Build all packages
pnpm turbo build

# Verify dist folders exist
ls packages/@nup/*/dist
ls features/@nup/*/dist

# Check compiled outputs
cat packages/@nup/shared-types/dist/index.d.ts
```

---

### FASE 2: Deploy Scripts (~1 dia)

#### Passo 1: Criar script de deploy

Criar `scripts/deploy-app.sh`:
```bash
#!/bin/bash
set -e

APP_NAME=$1
if [ -z "$APP_NAME" ]; then
  echo "Usage: ./deploy-app.sh <app-name>"
  exit 1
fi

echo "🚀 Deploying $APP_NAME..."

# Build all dependencies first
pnpm turbo build --filter="$APP_NAME^..."

# Build the app itself
pnpm turbo build --filter="$APP_NAME"

# Create deploy directory
DEPLOY_DIR="dist-deploy/$APP_NAME"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy app files
cp -r "apps/$APP_NAME/"* "$DEPLOY_DIR/"

# Prune and copy node_modules
cd "$DEPLOY_DIR"
pnpm install --prod --frozen-lockfile

# Copy built packages into node_modules
mkdir -p node_modules/@nup
for pkg in shared-types ui api-client auth-client email; do
  if [ -d "../../packages/@nup/$pkg/dist" ]; then
    cp -r "../../packages/@nup/$pkg/dist" "node_modules/@nup/$pkg"
    cp "../../packages/@nup/$pkg/package.json" "node_modules/@nup/$pkg/"
  fi
done

# Copy built features
for feat in mindmaps flashcards professor-ia; do
  if [ -d "../../features/@nup/$feat/dist" ]; then
    cp -r "../../features/@nup/$feat/dist" "node_modules/@nup/$feat"
    cp "../../features/@nup/$feat/package.json" "node_modules/@nup/$feat/"
  fi
done

echo "✅ Deploy bundle ready at: $DEPLOY_DIR"
echo "📦 Bundle size:"
du -sh "$DEPLOY_DIR"
```

Tornar executável:
```bash
chmod +x scripts/deploy-app.sh
```

#### Passo 2: Testar deploy script

```bash
./scripts/deploy-app.sh nup-study

# Verificar bundle
ls -la dist-deploy/nup-study/
ls -la dist-deploy/nup-study/node_modules/@nup/
```

#### Passo 3: Criar package.json scripts

No root `package.json`:
```json
{
  "scripts": {
    "deploy:study": "./scripts/deploy-app.sh nup-study",
    "deploy:identify": "./scripts/deploy-app.sh nup-identify",
    "deploy:aim": "./scripts/deploy-app.sh nup-aim",
    "deploy:gateway": "./scripts/deploy-app.sh gateway"
  }
}
```

---

### FASE 3: CI/CD GitHub Actions (~1 dia)

#### Criar .github/workflows/deploy.yml:

```yaml
name: Deploy Apps

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      apps: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            nup-study:
              - 'apps/nup-study/**'
              - 'packages/**'
              - 'features/**'
            nup-identify:
              - 'apps/nup-identify/**'
              - 'packages/**'
            nup-aim:
              - 'apps/nup-aim/**'
              - 'packages/**'
            gateway:
              - 'apps/gateway/**'

  build-and-deploy:
    needs: detect-changes
    if: ${{ needs.detect-changes.outputs.apps != '[]' }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: ${{ fromJSON(needs.detect-changes.outputs.apps) }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build packages
        run: pnpm turbo build --filter="${{ matrix.app }}^..."
      
      - name: Build app
        run: pnpm turbo build --filter="${{ matrix.app }}"
      
      - name: Create deploy bundle
        run: ./scripts/deploy-app.sh ${{ matrix.app }}
      
      - name: Deploy to Repl
        env:
          REPLIT_TOKEN: ${{ secrets.REPLIT_TOKEN }}
        run: |
          # TODO: Implement Replit Deploy API call
          echo "Deploying ${{ matrix.app }} to Repl..."
```

---

## 🧪 VALIDAÇÃO

### Checklist de Validação:

- [ ] Todos os packages buildam sem erros
- [ ] Types são gerados corretamente (.d.ts)
- [ ] Assets (CSS, templates) são copiados
- [ ] Apps conseguem importar packages compilados
- [ ] Deploy script gera bundle self-contained
- [ ] Bundle funciona em Repl limpo
- [ ] CI/CD detecta affected apps
- [ ] CI/CD builda e deploya automaticamente

### Testes:

```bash
# 1. Build all
pnpm turbo build

# 2. Check outputs
find packages -name "dist" -type d
find features -name "dist" -type d

# 3. Test deploy bundle
./scripts/deploy-app.sh nup-study
cd dist-deploy/nup-study
npm start  # Should work without monorepo context

# 4. Test types
cd apps/nup-study
npx tsc --noEmit  # Should resolve @nup/* types from dist
```

---

## 📊 ESTIMATIVA DE TEMPO TOTAL

| Fase | Tempo | Status |
|------|-------|--------|
| Fase 1: Build System | 2-3h | ⏳ Em andamento (50% completo) |
| Fase 2: Deploy Scripts | 1 dia | ⏸️ Pendente |
| Fase 3: CI/CD | 1 dia | ⏸️ Pendente |
| **TOTAL** | **2-3 dias** | |

---

## ⚠️ IMPORTANTE

1. **Não deletar src/** - Continua sendo source of truth para desenvolvimento
2. **dist/ é gerado** - Nunca editar manualmente
3. **Build antes de deploy** - Sempre rodar `pnpm turbo build`
4. **Cache do Turbo** - Acelera builds subsequentes significativamente

---

## 🆘 TROUBLESHOOTING

### Erro: "Cannot find module '@nup/ui'"

**Causa:** Package não foi buildado

**Solução:**
```bash
cd packages/@nup/ui
pnpm build
```

### Erro: "No exported member 'X'"

**Causa:** Types desatualizados

**Solução:**
```bash
pnpm turbo build --force
```

### Bundle muito grande

**Causa:** node_modules não pruned

**Solução:** Verificar script de deploy, usar `pnpm install --prod`

---

**Próximo: Continuar Fase 1 completando os package.json updates**
