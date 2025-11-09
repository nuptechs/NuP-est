# 🚀 Guia: Configurar Workflows para NuP-Study e NuP-AIM

## 📌 Problema

Apenas o NuP-Study aparece na UI do Replit (porta 5000). O NuP-AIM não aparece porque não há workflow ativo configurado corretamente.

---

## ✅ Solução: Configurar Workflows pela UI

Siga estes passos **dentro do Replit**:

### **Passo 1: Abrir a Ferramenta de Workflows**

1. No Replit, clique em **"Tools"** (menu lateral esquerdo)
2. Selecione **"Workflows"**
3. Você verá os workflows existentes

---

### **Passo 2: Criar Workflow para NuP-Study**

1. Clique em **"New Workflow"**
2. Preencha:
   - **Nome:** `NuP Study`
   - **Modo de Execução:** `Parallel` (paralelo)
3. Clique em **"Add Task"**
   - **Tipo:** `Execute Shell Command`
   - **Command:** 
     ```bash
     cd apps/nup-study && PORT=5000 npm run dev
     ```
4. Clique em **"Save"**

---

### **Passo 3: Criar Workflow para NuP-AIM**

1. Clique em **"New Workflow"** novamente
2. Preencha:
   - **Nome:** `NuP AIM`
   - **Modo de Execução:** `Parallel` (paralelo)
3. Clique em **"Add Task"**
   - **Tipo:** `Execute Shell Command`
   - **Command:** 
     ```bash
     cd apps/nup-aim && PORT=3000 npm run dev
     ```
4. Clique em **"Save"**

---

### **Passo 4: Criar Workflow Principal (Opcional)**

Se quiser rodar **ambos ao mesmo tempo** com 1 clique:

1. Clique em **"New Workflow"**
2. Preencha:
   - **Nome:** `Run Both Apps`
   - **Modo de Execução:** `Parallel`
3. Adicione **2 tarefas**:
   - **Task 1:** `Run Workflow` → Selecione `NuP Study`
   - **Task 2:** `Run Workflow` → Selecione `NuP AIM`
4. Clique em **"Save"**
5. **Opcional:** Defina este workflow como padrão para o botão "Run"

---

## 🎯 Resultados Esperados

Após configurar, você terá:

| Workflow | Porta | URL (exemplo) | Status |
|----------|-------|---------------|--------|
| **NuP Study** | 5000 | `https://seu-repl.replit.dev` | ✅ Ativo |
| **NuP AIM** | 3000 | `https://seu-repl-3000.replit.dev` | ✅ Ativo |

---

## 🔍 Como Testar

1. **Selecione o workflow** no dropdown do Replit
2. Clique em **▶️ Run**
3. Aguarde o servidor iniciar
4. Clique na **URL gerada** (aparece na aba "Webview")

---

## ⚠️ Troubleshooting

### Erro: "Port already in use"
- **Solução:** Pare o workflow anterior antes de iniciar um novo
- Use `pkill -f node` no Shell se necessário

### Erro: "Cannot find module"
- **Solução:** Execute `npm install` dentro do diretório do app:
  ```bash
  cd apps/nup-aim && npm install
  cd apps/nup-study && npm install
  ```

### NuP-AIM não responde
- **Verifique:** Logs do workflow mostram "serving on port 3000"?
- **Teste:** `curl http://localhost:3000` no Shell

---

## 📁 Estrutura de Portas (Referência)

Portas auto-mapeadas pelo Replit:
- 3000-3003 ✅
- 4200 ✅
- 5000 ✅
- 5173 ✅
- 6000, 6800 ✅
- 8000, 8008, 8080, 8081 ✅

---

## 🎉 Próximos Passos

Depois de configurar os workflows:

1. **Teste ambos os apps** individualmente
2. **Verifique** se aparecem no painel de portas do Replit
3. **Compartilhe** as URLs com usuários para testar

---

**Guia criado automaticamente** | NuP Ecosystem 🚀
