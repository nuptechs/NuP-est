# 🚀 Deployment Fix - Instruções Completas

## ❌ Problema Original

O deployment falhava com o erro:
```
Could not resolve entry module "client/index.html"
```

**Causa raiz**: O projeto está em transição para monorepo, mas o deployment ainda tenta buildar a raiz como se fosse um app standalone. A estrutura real do código está em `apps/nup-study/`.

---

## ✅ Solução Implementada

### 1. **Estrutura Corrigida**

- ✅ **server/index.ts (raiz)**: Agora importa corretamente de `apps/nup-study/server/`
- ✅ **Build Script**: Criado `scripts/build-production.js` que builda `apps/nup-study/` corretamente
- ✅ **Artifacts**: Frontend vai para `dist/public/`, backend para `dist/index.js`

### 2. **Como Funciona**

O script `scripts/build-production.js`:
1. Faz build do frontend em `apps/nup-study/` (resolve @nup/* corretamente)
2. Copia artifacts para `dist/public/`
3. Faz build do backend na raiz

---

## 🔧 Configuração do Deployment

### **Opção 1: Usar Script Customizado (Recomendado)**

Edite o arquivo `.replit` e altere a seção `[deployment]`:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["node", "scripts/build-production.js"]
run = ["npm", "run", "start"]
```

### **Opção 2: Criar Wrapper NPM Script**

Se não puder editar `.replit`, crie um link simbólico:

```bash
ln -sf ../scripts/build-production.js node_modules/.bin/build
```

Depois configure `.replit`:
```toml
build = ["build"]
```

### **Opção 3: Atualizar package.json (Se Permitido)**

Altere o script de build em `package.json`:
```json
{
  "scripts": {
    "build": "node scripts/build-production.js"
  }
}
```

---

## 🧪 Testar Localmente

```bash
# Limpar build anterior
rm -rf dist apps/nup-study/dist

# Executar build
node scripts/build-production.js

# Verificar artifacts
ls -la dist/public/  # Frontend
ls -la dist/index.js # Backend

# Testar produção
NODE_ENV=production node dist/index.js
```

---

## 📁 Estrutura de Arquivos (Depois do Build)

```
/
├── dist/
│   ├── public/           # Frontend (HTML, CSS, JS, assets)
│   │   ├── index.html
│   │   └── assets/
│   └── index.js          # Backend (bundled)
├── apps/nup-study/       # Código fonte
│   ├── client/
│   ├── server/
│   └── shared/
├── server/
│   └── index.ts          # Entry point (importa de apps/nup-study)
└── scripts/
    └── build-production.js  # Build script
```

---

## ⚠️ Arquivos Removidos

Os seguintes arquivos foram **removidos** porque causavam conflitos:

- ❌ `client/` (raiz) - symlink/cópia conflitava com vite.config.ts
- ❌ `shared/` (raiz) - symlink/cópia desnecessária

O código real está em `apps/nup-study/client/` e `apps/nup-study/shared/`.

---

## 🎯 Próximos Passos

1. **Editar .replit**: Usar uma das opções acima
2. **Testar deployment**: Fazer deploy e verificar logs
3. **Verificar variáveis de ambiente**: Garantir que DATABASE_URL, etc. estão configuradas

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@nup/ui'"
**Solução**: Use `scripts/build-production.js` que já resolve @nup/* packages.

### Erro: "index.html not found"
**Solução**: Verifique que `dist/public/index.html` existe após build.

### Erro: "EADDRINUSE port 5000"
**Solução**: Pare workflows rodando com `pkill -f node`.

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do deployment
2. Estrutura do `dist/` após build
3. Variáveis de ambiente configuradas

Build criado com sucesso! 🎉
