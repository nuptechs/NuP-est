# ⚡ Quick Start: Rodando Múltiplos Apps

## 🎯 TL;DR

```bash
# Rodar TODOS os apps
./scripts/run-all-apps.sh

# Rodar app específico
./scripts/run-app.sh nup-study

# Listar apps disponíveis
node scripts/manage-workflows.js list
```

---

## 🚀 3 Formas de Rodar

### **1. Via Script Shell (Mais Rápido)**

```bash
# Todos os apps
./scripts/run-all-apps.sh

# Um app específico
./scripts/run-app.sh nup-study
./scripts/run-app.sh nup-aim
```

---

### **2. Via Node.js (Mais Controle)**

```bash
# Todos os apps (até 10)
node scripts/manage-workflows.js run

# App específico
node scripts/manage-workflows.js run nup-study

# Com limite customizado
MAX_APPS=5 node scripts/manage-workflows.js run
```

---

### **3. Via Workflows do Replit (Visual)**

1. Abra **Tools → Workflows**
2. Crie workflow para cada app:
   ```
   Nome: NuP Study
   Comando: cd apps/nup-study && PORT=5000 npm run dev
   ```
3. Clique em ▶️ Run

---

## 📊 Status e Monitoramento

```bash
# Ver todos os apps e portas
node scripts/manage-workflows.js list

# Ver informações do sistema
node scripts/manage-workflows.js info
```

---

## 🔧 Adicionar Novo App

```bash
# 1. Criar diretório
mkdir -p apps/meu-novo-app

# 2. Criar package.json com script "dev"
cd apps/meu-novo-app
npm init -y
# (adicione "dev": "tsx server/index.ts" aos scripts)

# 3. Regenerar configuração
node scripts/manage-workflows.js generate

# 4. Pronto! O app aparecerá automaticamente
node scripts/manage-workflows.js list
```

---

## 🐛 Troubleshooting Rápido

### **Porta em uso?**
```bash
pkill -f node
```

### **App não aparece?**
```bash
node scripts/manage-workflows.js generate
```

### **Limite de apps?**
```bash
MAX_APPS=15 ./scripts/run-all-apps.sh
```

---

## 📚 Documentação Completa

- **Arquitetura detalhada:** `docs/SCALABLE_WORKFLOWS.md`
- **Configuração UI:** `docs/WORKFLOWS_UI_SETUP.md`
- **Gestão de recursos:** `docs/RUNNING_MULTIPLE_APPS.md`

---

**NuP Ecosystem** 🚀
