# 🚀 Como Rodar Múltiplos Apps (Forma Realmente Automática)

## ❌ **Problema: UI do Replit Não É Automática**

A UI de Workflows do Replit exige configuração manual para cada app. Isso **não é escalável**.

---

## ✅ **Solução: Use o Terminal Integrado do Replit**

### **Opção 1: Terminal Replit (Mais Fácil)**

1. Abra o **Shell** (ícone de terminal no Replit)
2. Execute:

```bash
./scripts/run-all-apps.sh
```

**Pronto!** Todos os apps rodam automaticamente:
- NuP-Study na porta 5000
- NuP-AIM na porta 3000

---

### **Opção 2: Criar Workflow Master (Uma Vez Só)**

Se quiser usar o botão Run do Replit:

1. **Tools → Workflows**
2. **+ New Workflow**
3. **Nome:** `Run All Apps`
4. **Comando:**
   ```bash
   ./scripts/run-all-apps.sh
   ```
5. **Save**

Depois, selecione "Run All Apps" no dropdown e clique Run.

**Vantagem:** Configuração manual apenas **1 vez**, não N vezes.

---

## 🎯 **Por Que Esta É a Forma Automática?**

### **Scripts Automáticos:**
```bash
# Descobre apps automaticamente
node scripts/manage-workflows.js generate

# Roda TODOS os apps descobertos
./scripts/run-all-apps.sh
```

### **UI Manual:**
- Criar workflow para NuP-Study ❌
- Criar workflow para NuP-AIM ❌
- Criar workflow para NuP-Identify ❌
- Criar workflow para... (10+ vezes) ❌

---

## 📊 **Ver Portas Rodando**

Depois de rodar `./scripts/run-all-apps.sh`:

1. Clique no ícone **⚙️** ao lado de "Listening on port:"
2. Veja todas as portas:
   ```
   :5000 → NuP-Study
   :3000 → NuP-AIM
   ```
3. Clique na porta desejada para abrir o app

---

## 🔄 **Parar Todos os Apps**

```bash
pkill -f "npm run dev"
```

Ou use **Ctrl+C** no terminal onde rodou `run-all-apps.sh`.

---

## ✨ **Resumo**

**Forma Manual (UI):** 10 clicks por app  
**Forma Automática (Scripts):** 1 comando para todos os apps

```bash
./scripts/run-all-apps.sh
```

**É isso.** 🚀
