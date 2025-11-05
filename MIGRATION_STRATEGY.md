# 🚀 Estratégia de Migração para Monorepo

## Situação Atual

Temos uma **estrutura híbrida** durante a transição:

```
nup-ecosystem/
├── package.json (raiz - npm, legado)
├── client/ (código legado - ainda em uso)
├── server/ (código legado - ainda em uso)
├── shared/ (código legado - ainda em uso)
│
└── apps/
    └── nup-study/ (código migrado)
        ├── package.json (pnpm workspace)
        ├── client/
        ├── server/
        └── shared/
```

## Fase Atual: Dual-Run (Transição)

### ✅ O que já funciona:
- Estrutura de monorepo criada
- Packages base configurados (@nup/ui, @nup/auth-client, @nup/api-client, @nup/shared-types)
- Código copiado para apps/nup-study/
- TypeScript e Vite configurados para usar packages

### 🔄 O que estamos rodando agora:
- **Produção/Dev:** Código da raiz (client/, server/, shared/)
- **Teste/Migração:** Código em apps/nup-study/

## Próximos Passos

### Fase 1: Validação (Agora)
1. ✅ Criar estrutura de packages
2. ✅ Copiar código para apps/nup-study/
3. ⏳ Atualizar imports no apps/nup-study/ para usar @nup/* packages
4. ⏳ Testar build do apps/nup-study/
5. ⏳ Rodar lado a lado (raiz + apps/nup-study)

### Fase 2: Feature Extraction
1. Extrair Mind Maps para features/@nup/mindmaps/
2. Extrair Professor IA para features/@nup/professor-ia/
3. Extrair Flashcards para features/@nup/flashcards/

### Fase 3: Cutover (Próxima sessão)
1. Validar que apps/nup-study funciona 100%
2. Mover package.json raiz para package.json.old
3. Criar novo package.json raiz para monorepo
4. Deletar código legado (client/, server/, shared/)
5. Atualizar workflows

### Fase 4: Scaling
1. Criar apps/nup-identify/
2. Criar apps/nup-chunks/
3. Criar apps/nup-aim/
4. Etc.

## Como Testar Agora

### Rodar Legado (Atual)
```bash
npm run dev  # Roda da raiz
```

### Rodar Migrado (Novo)
```bash
cd apps/nup-study
npm run dev  # Roda da pasta migrada
```

## Rollback Plan

Se algo der errado:
```bash
git checkout backup/pre-monorepo-migration
```

## Vantagens da Abordagem Dual-Run

✅ **Zero downtime** - App continua funcionando
✅ **Testável** - Podemos validar antes de cortar
✅ **Seguro** - Backup disponível
✅ **Iterativo** - Migramos feature por feature
✅ **Reversível** - Fácil voltar atrás

## Estado dos Packages

| Package | Status | Descrição |
|---------|--------|-----------|
| @nup/ui | ⚠️ Skeleton | Design system (a popular com shadcn/ui) |
| @nup/auth-client | ⚠️ Skeleton | SDK de auth (a integrar com NuP-Identify) |
| @nup/api-client | ⚠️ Skeleton | HTTP client configurável |
| @nup/shared-types | ⚠️ Skeleton | Types base (a expandir) |

## Próxima Ação

**Atualizar imports** no apps/nup-study/ para começar a usar os packages @nup/* onde apropriado, começando pelos casos mais simples (utils, types).
