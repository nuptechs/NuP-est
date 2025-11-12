# 📦 Deployment Scripts - NuP Ecosystem

## Overview

Scripts de deploy para arquitetura **Turborepo + Exported Release Bundles**, gerando bundles self-contained prontos para Multi-Repl deployment.

## Available Scripts

### Base Script

**`deploy-app.sh <app-name> [output-dir]`**

Script genérico que cria release bundle para qualquer app.

**Processo (5 etapas):**
1. Build shared packages (`packages/@nup/*`)
2. Build features (`features/@nup/*`)
3. Build app específico
4. Copy arquivos compilados + packages + features
5. Gerar pruned `node_modules` (production only)

**Exemplo:**
```bash
./scripts/deploy-app.sh nup-study
./scripts/deploy-app.sh nup-study ./custom-output
```

### App-Specific Scripts

**`deploy-nup-study.sh [output-dir]`**
Deploy NuP-Study (app principal)

**`deploy-nup-identify.sh [output-dir]`**
Deploy NuP-Identify (auth service)

**`deploy-nup-aim.sh [output-dir]`**
Deploy NuP-AIM (analysis service)

**Exemplo:**
```bash
./scripts/deploy-nup-study.sh
./scripts/deploy-nup-study.sh ./production-deploy
```

## Output Structure

```
deploy-output/
└── <app-name>/
    ├── dist/                    # App compilado
    ├── server/                  # Server source
    ├── client/                  # Client source
    ├── packages/@nup/           # Compiled packages
    │   ├── shared-types/dist/
    │   ├── ui/dist/
    │   ├── api-client/dist/
    │   ├── auth-client/dist/
    │   └── email/dist/
    ├── features/@nup/           # Compiled features
    │   ├── flashcards/dist/
    │   ├── mindmaps/dist/
    │   └── professor-ia/dist/
    ├── node_modules/            # Pruned (production only)
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json
```

## Prerequisites

### App Requirements

Cada app **DEVE** ter:

1. **`package.json` com build script:**
   ```json
   {
     "scripts": {
       "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
     }
   }
   ```

2. **Estrutura de diretórios:**
   ```
   apps/<app-name>/
   ├── server/        # Backend code
   ├── client/        # Frontend code
   ├── package.json
   └── vite.config.ts
   ```

3. **Output esperado após build:**
   ```
   apps/<app-name>/dist/
   └── index.js       # Compiled server entry
   ```

### Workspace Requirements

- Packages buildados em `packages/@nup/*/dist/`
- Features buildadas em `features/@nup/*/dist/`

**Build workspace completo:**
```bash
# Packages primeiro
pnpm -r --filter "./packages/@nup/*" run build

# Features depois
pnpm -r --filter "./features/@nup/*" run build
```

## Usage Workflow

### 1. Development

Desenvolva normalmente no monorepo:
```bash
pnpm dev                 # Run dev server
pnpm -r run build       # Build all packages/features
```

### 2. Create Release Bundle

```bash
./scripts/deploy-nup-study.sh
```

Output:
```
🚀 Starting deployment for nup-study...
📦 Step 1/5: Building shared packages...
🎨 Step 2/5: Building features...
🏗️  Step 3/5: Building app (nup-study)...
📋 Step 4/5: Copying app files...
🌳 Step 5/5: Creating pruned node_modules...
✅ Deployment bundle created!
📊 Bundle size: 250MB
📍 Location: deploy-output/nup-study
```

### 3. Test Bundle Locally

```bash
cd deploy-output/nup-study
node dist/index.js
```

### 4. Deploy to Multi-Repl

**Opção A: Git Push**
```bash
cd deploy-output/nup-study
git init
git add .
git commit -m "Production bundle"
git remote add production <REPL_GIT_URL>
git push production main
```

**Opção B: Direct Upload**
```bash
rsync -avz deploy-output/nup-study/ user@target-repl:/path/
```

### 5. Configure Target Repl

1. Set environment variables (DATABASE_URL, JWT_SECRET, etc.)
2. Run: `node dist/index.js`
3. Configure health checks and monitoring

## Key Features

### 🎯 Automatic Workspace Detection

O sistema **auto-detecta** se uma dependência `@nup/*` é um package ou feature:

```javascript
// Auto-detection via filesystem check
const packagePath = path.join(baseDir, 'packages', '@nup', pkgName);
const featurePath = path.join(baseDir, 'features', '@nup', pkgName);

if (fs.existsSync(featurePath)) {
  basePath = 'features';  // É uma feature!
} else if (fs.existsSync(packagePath)) {
  basePath = 'packages';  // É um package!
}
```

**Benefícios:**
- ✅ Extensível: adicione novos features sem modificar scripts
- ✅ Zero hardcoded lists
- ✅ Funciona para qualquer estrutura `@nup/*`

### 🔧 Workspace Dependency Resolution

Todas as dependências `workspace:*` são resolvidas para `file:` paths relativos:

```json
// ANTES (monorepo):
"@nup/shared-types": "workspace:*"

// DEPOIS (bundle):
"@nup/shared-types": "file:../../../packages/@nup/shared-types"
```

Isso permite `pnpm install --prod` funcionar em bundles standalone.

## Troubleshooting

### Build Fails

**Problema:** App não tem build script
```
Error: npm ERR! Missing script: "build"
```

**Solução:** Adicionar build script ao `apps/<app>/package.json`:
```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

### Missing Packages

**Problema:** Packages não encontrados
```
Error: Could not resolve "@nup/ui"
```

**Solução:** Build packages primeiro:
```bash
pnpm -r --filter "./packages/@nup/*" run build
```

### Large Bundle Size

**Problema:** Bundle muito grande (>500MB)

**Solução:** 
1. Verificar `node_modules` (deve ser apenas production)
2. Remover `attached_assets/` e `uploads/` do bundle
3. Usar `.deployignore` para excluir arquivos desnecessários

## Advanced Configuration

### Custom Deploy Directory

```bash
./scripts/deploy-nup-study.sh /path/to/custom/output
```

### Skip Package Builds (Use Cached)

Editar `deploy-app.sh` e comentar Steps 1-2:
```bash
# echo "📦 Step 1/5: Building shared packages..."
# pnpm -r --filter "./packages/@nup/*" run build
```

**⚠️ Atenção:** Apenas use se packages já estão buildados!

### Production Optimizations

**Criar `.deployignore`:**
```
attached_assets/
uploads/
*.md
*.test.ts
*.spec.ts
.git/
.env.example
```

**Adicionar ao deploy script:**
```bash
rsync -avz --exclude-from='.deployignore' deploy-output/nup-study/ target:/path/
```

## CI/CD Integration (Phase 3)

Os scripts serão integrados ao GitHub Actions:

```yaml
- name: Deploy NuP-Study
  run: ./scripts/deploy-nup-study.sh ./ci-output
  
- name: Upload to Repl
  run: |
    cd ci-output/nup-study
    git push production main
```

## Next Steps

- [ ] Add checksum validation to bundles
- [ ] Implement bundle compression (tar.gz)
- [ ] Add deployment rollback capability
- [ ] Create health check integration
- [ ] Automated testing before deploy
