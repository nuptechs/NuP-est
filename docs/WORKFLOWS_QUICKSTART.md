# 🚀 Quickstart: Workflows por App

Guia rápido para criar workflows separados para cada app do monorepo.

---

## ⚡ Setup Rápido (5 minutos)

### **1️⃣ Descubra os Apps Disponíveis**

```bash
node scripts/manage-workflows.js list
```

**Saída esperada:**
```
📦 Apps Disponíveis no Monorepo:

1. impact-analysis-generator (nup-aim)
   📁 Caminho: apps/nup-aim
   🔌 Porta sugerida: 5000

2. nup-study
   📁 Caminho: apps/nup-study
   🔌 Porta sugerida: 5001
```

---

### **2️⃣ Gere a Configuração**

```bash
node scripts/manage-workflows.js generate
```

Isso cria `workflows-config.json` com os comandos prontos.

---

### **3️⃣ Configure Workflows no Replit**

#### **Acesse o Painel de Workflows:**
1. Pressione `Cmd/Ctrl + K` e digite "Workflows"
2. Ou vá em "Tools" > "Workflows"

#### **Crie Workflow para NuP AIM:**
1. Clique "+ New Workflow"
2. **Nome:** `NuP AIM`
3. **Tarefa:** Execute Shell Command
4. **Comando:** `cd apps/nup-aim && PORT=5000 npm run dev`
5. Salve

#### **Crie Workflow para NuP Study:**
1. Clique "+ New Workflow"
2. **Nome:** `NuP Study`
3. **Tarefa:** Execute Shell Command
4. **Comando:** `cd apps/nup-study && PORT=5001 npm run dev`
5. Salve

---

### **4️⃣ Execute os Workflows**

No painel de Workflows:
- Selecione o workflow desejado
- Clique em "Run"
- ✅ Você pode rodar múltiplos workflows simultaneamente!

---

## 📋 Resumo de Comandos

| Workflow | Comando | Porta |
|----------|---------|-------|
| **NuP AIM** | `cd apps/nup-aim && PORT=5000 npm run dev` | 5000 |
| **NuP Study** | `cd apps/nup-study && PORT=5001 npm run dev` | 5001 |

---

## ✨ Adicionar Novo App (30 segundos)

```bash
# 1. Crie o app
./scripts/create-app.sh nup-novo-app 5002

# 2. Descubra automaticamente
node scripts/manage-workflows.js list

# 3. Veja o comando gerado
node scripts/manage-workflows.js generate

# 4. Crie workflow no Replit com o comando exibido
```

**Pronto!** O sistema descobriu seu novo app automaticamente. 🎉

---

## 🎯 Exemplos Práticos

### **Rodar Frontend e Backend Separados**
```bash
# Workflow 1: Frontend
cd apps/nup-study/client && npm run dev

# Workflow 2: Backend
cd apps/nup-study/server && npm run dev
```

### **Rodar Dois Apps Simultaneamente**
1. Execute workflow "NuP AIM" (porta 5000)
2. Execute workflow "NuP Study" (porta 5001)
3. Acesse ambos em abas diferentes

---

## 🛠️ Troubleshooting

### **Porta em uso?**
```bash
# Mude a porta no comando do workflow
cd apps/nup-aim && PORT=5555 npm run dev
```

### **App não aparece na lista?**
Verifique se tem `package.json` com script `dev`:
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts"
  }
}
```

### **Ver logs do workflow**
Os logs aparecem automaticamente no painel de Console ao rodar o workflow.

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- [docs/WORKFLOWS.md](WORKFLOWS.md) - Guia completo
- [MONOREPO.md](../MONOREPO.md) - Arquitetura do monorepo

---

**Sistema pronto para escalar de 2 a 20+ apps!** 🚀
