# 🚀 Como Rodar Múltiplos Apps no Monorepo NuP

## 🎯 **Situação Atual**

Você tem 2 apps no monorepo:
- **NuP-Study** (porta 5000) → Roda via workflow "Start application" ✅
- **NuP-AIM** (porta 3000) → Precisa ser rodado manualmente

---

## ✅ **Solução 1: Via Workflows do Replit (Recomendado)**

### **Configuração (Apenas 1 Vez):**

1. **Tools → Workflows → + New Workflow**
2. Preencha:
   - **Nome:** `NuP-AIM`
   - **Mode:** `Parallel`
   - **Command:** `cd apps/nup-aim && PORT=3000 npm run dev`
3. **Save**

### **Uso Diário:**

**Para rodar NuP-Study:**
- Dropdown → "Start application" → Run ▶️

**Para rodar NuP-AIM:**
- Dropdown → "NuP-AIM" → Run ▶️

**Ver as 2 portas:**
- Clique no ícone ⚙️ ao lado de "Listening on port:"
- Escolha `:5000` (NuP-Study) ou `:3000` (NuP-AIM)

---

## ✅ **Solução 2: Via Scripts CLI (Terminal)**

### **Rodar App Específico:**

```bash
# NuP-AIM
./scripts/run-app.sh nup-aim

# NuP-Study
./scripts/run-app.sh nup-study
```

### **Rodar TODOS os Apps:**

```bash
./scripts/run-all-apps.sh
```

### **⚠️ Importante:**
- Scripts CLI rodam em **segundo plano** no Shell
- Para parar, pressione **Ctrl+C** ou execute: `pkill node`
- **Não** deixe o Shell aberto rodando + workflows simultaneamente (conflito de portas)

---

## 🆕 **Adicionar Novo App (Futuro)**

### **1. Criar o App:**
```bash
mkdir -p apps/meu-novo-app
cd apps/meu-novo-app
npm init -y
# Adicionar script "dev" no package.json
```

### **2. Atualizar Configuração:**
```bash
node scripts/manage-workflows.js generate
```

Isso adiciona o novo app ao `workflows-config.json` automaticamente.

### **3. Criar Workflow no Replit:**
- **Tools → Workflows → + New Workflow**
- **Nome:** Nome do app
- **Command:** Copiar de `workflows-config.json`
- **Save**

---

## 🔌 **Mapa de Portas**

| App | Porta | Workflow |
|-----|-------|----------|
| NuP-Study | 5000 | "Start application" ✅ |
| NuP-AIM | 3000 | "NuP-AIM" (criar manualmente) |
| NuP-Identify | 5002 | (futuro) |
| NuP-Chunks | 5003 | (futuro) |
| NuP-Kan | 5004 | (futuro) |
| Novos apps | 5006+ | Auto-atribuído |

---

## 🐛 **Troubleshooting**

### **Erro: "Port already in use"**

```bash
# Matar TODOS os processos node
pkill node

# Aguardar 2 segundos
sleep 2

# Reiniciar workflow via UI
```

### **Script CLI não para**

Pressione **Ctrl+C** no Shell ou:

```bash
pkill node
```

### **Workflow não aparece no dropdown**

1. Recarregar a página (Ctrl+R)
2. Verificar se foi salvo em Tools → Workflows

---

## 📊 **Comparação: Workflows vs Scripts CLI**

| Recurso | Workflows (UI) | Scripts CLI |
|---------|----------------|-------------|
| **Setup** | Manual (1x por app) | Zero config |
| **Controle** | Botões Run/Stop | Terminal (Ctrl+C) |
| **Logs** | Integrado no Replit | No Shell |
| **Ver Portas** | Ícone ⚙️ | Manual |
| **Escalabilidade** | Manual para cada app | Automático |
| **Recomendado para** | Uso diário | Desenvolvimento local |

---

## 🎯 **Recomendação Final**

### **Para Desenvolvimento no Replit:**
Use **Workflows** (Solução 1):
- Mais integrado com a UI
- Fácil de controlar (Run/Stop)
- Ver múltiplas portas facilmente

### **Para Desenvolvimento Local (Git Clone):**
Use **Scripts CLI** (Solução 2):
- Totalmente automático
- Zero configuração manual
- Escalável para 10+ apps

```bash
git clone seu-repo
./scripts/run-all-apps.sh
```

---

## 🔄 **Workflow Típico de Desenvolvimento**

### **Cenário 1: Trabalhando apenas no NuP-Study**
1. Selecione "Start application" no dropdown
2. Clique Run ▶️
3. Acesse porta `:5000`

### **Cenário 2: Trabalhando em ambos os apps**
1. Workflow "Start application" → Run (NuP-Study)
2. Workflow "NuP-AIM" → Run (NuP-AIM)
3. Ícone ⚙️ → Escolher porta `:5000` ou `:3000`

### **Cenário 3: Teste rápido de todos os apps (CLI)**
1. Abra Shell
2. `./scripts/run-all-apps.sh`
3. Ver logs no terminal

---

## ✨ **Resumo**

**Configuração única necessária:**
- Criar workflow "NuP-AIM" uma vez (2 minutos)

**Uso diário:**
- Dropdown → Selecionar workflow → Run ▶️

**Para adicionar novos apps:**
- `node scripts/manage-workflows.js generate` (automático)
- Criar workflow na UI (manual, 1 vez)

---

**NuP Ecosystem - Rodando Múltiplos Apps** 🚀

*Última atualização: Novembro 2025*
