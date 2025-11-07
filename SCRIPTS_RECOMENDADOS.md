# Scripts Recomendados para package.json

Adicione estes scripts ao `package.json` raiz do monorepo para habilitar validação arquitetural:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "lint:arch": "node scripts/check-architecture.js",
    "check:deps": "node scripts/validate-dependencies.js",
    "validate": "pnpm check && pnpm lint && pnpm lint:arch && pnpm check:deps",
    "validate:quick": "pnpm lint:arch && pnpm check:deps"
  }
}
```

## Descrição dos Comandos

### `pnpm lint`
Executa ESLint em todo o monorepo, incluindo validação arquitetural via plugin customizado.

**Uso:**
```bash
pnpm lint
```

**O que valida:**
- Regras ESLint padrão
- Regras arquiteturais (features não importam features, etc)
- Problemas de código TypeScript/JavaScript

### `pnpm lint:fix`
Mesma coisa que `pnpm lint`, mas tenta corrigir problemas automaticamente.

**Uso:**
```bash
pnpm lint:fix
```

### `pnpm lint:arch`
Valida a arquitetura do monorepo usando Dependency Cruiser.

**Uso:**
```bash
pnpm lint:arch
```

**O que valida:**
- Dependências circulares
- Features importando features
- Packages importando features
- Services importando workspace

### `pnpm check:deps`
Valida dependências em package.json de cada workspace.

**Uso:**
```bash
pnpm check:deps
```

**O que valida:**
- Features não dependem de outras features
- Packages não dependem de features
- Services não dependem de workspace packages

### `pnpm validate`
Executa todas as validações (type-check, lint, arquitetura, dependências).

**Uso:**
```bash
pnpm validate
```

**Útil para:**
- Antes de fazer commit
- Em CI/CD pipeline
- Validação completa local

### `pnpm validate:quick`
Executa apenas validações arquiteturais (mais rápido).

**Uso:**
```bash
pnpm validate:quick
```

**Útil para:**
- Validação rápida durante desenvolvimento
- CI checks específicos de arquitetura

## Integração com CI/CD

### GitHub Actions

```yaml
name: Validate Architecture

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm validate
```

### Husky (Pre-commit Hook)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm validate:quick
```

## Performance

| Comando | Tempo Estimado | Uso |
|---------|----------------|-----|
| `pnpm lint` | ~10-15s | Local + CI |
| `pnpm lint:arch` | ~3-5s | Local + CI |
| `pnpm check:deps` | ~1-2s | Local + CI |
| `pnpm validate` | ~15-20s | CI |
| `pnpm validate:quick` | ~4-7s | Local |

## Adicionar ao package.json

**Você NÃO pode editar package.json via Replit Agent.** 

Para adicionar estes scripts manualmente:

1. Abra `package.json` no editor
2. Adicione os scripts acima na seção `"scripts"`
3. Salve o arquivo
4. Execute `pnpm install` se necessário
