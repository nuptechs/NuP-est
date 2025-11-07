# 🚀 Guia de Workflows por App

Este documento explica como gerenciar workflows separados para cada app do monorepo de forma escalável e elegante.

## 🎯 Visão Geral

Cada app no monorepo roda em sua própria porta e tem seu próprio workflow:

| App | Porta | Comando | Workflow |
|-----|-------|---------|----------|
| **nup-aim** | 5000 | `cd apps/nup-aim && PORT=5000 npm run dev` | NuP AIM |
| **nup-study** | 5001 | `cd apps/nup-study && PORT=5001 npm run dev` | NuP Study |
| **novo-app** | 5002 | `cd apps/novo-app && PORT=5002 npm run dev` | Novo App |

---

## 📋 Configurando Workflows no Replit

### **Opção 1: Configuração Manual (Recomendado)**

1. **Abra o painel de Workflows** no Replit
2. **Crie um novo workflow** para cada app:

**Workflow: NuP AIM**
- Nome: `NuP AIM`
- Comando: `cd apps/nup-aim && PORT=5000 npm run dev`

**Workflow: NuP Study**
- Nome: `NuP Study`
- Comando: `cd apps/nup-study && PORT=5001 npm run dev`

3. **Execute o workflow desejado** clicando no botão de play

---

### **Opção 2: Usar Script Helper**

O script `manage-workflows.js` descobre apps automaticamente:

```bash
# Listar todos os apps disponíveis
node scripts/manage-workflows.js list

# Gerar configuração de workflows
node scripts/manage-workflows.js generate

# Ver informações e guia
node scripts/manage-workflows.js info
```

**Saída exemplo:**
```
📦 Apps Disponíveis no Monorepo:

1. impact-analysis-generator
   📁 Caminho: apps/nup-aim
   🔌 Porta sugerida: 5000
   ✅ Script "dev" encontrado

2. nup-study
   📁 Caminho: apps/nup-study
   🔌 Porta sugerida: 5001
   ✅ Script "dev" encontrado
```

---

## ✨ Adicionando um Novo App

Para adicionar um novo app ao sistema de workflows:

### **1. Crie o App**

```bash
# Use o script helper (recomendado)
./scripts/create-app.sh nup-novo-app 5002

# Ou crie manualmente
mkdir -p apps/nup-novo-app
cd apps/nup-novo-app
npm init -y
```

### **2. Configure package.json**

```json
{
  "name": "nup-novo-app",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts"
  }
}
```

### **3. Descubra o Novo App**

```bash
node scripts/manage-workflows.js list
```

**Saída:**
```
3. nup-novo-app
   📁 Caminho: apps/nup-novo-app
   🔌 Porta sugerida: 5002
   ✅ Script "dev" encontrado
```

### **4. Gere a Configuração**

```bash
node scripts/manage-workflows.js generate
```

Isso criará `workflows-config.json` com a configuração atualizada.

### **5. Configure o Workflow no Replit**

- **Nome:** `NuP Novo App`
- **Comando:** `cd apps/nup-novo-app && PORT=5002 npm run dev`

---

## 🔧 Sistema Automático

O sistema funciona automaticamente:

1. **Descoberta Automática**
   - Varre `apps/` procurando diretórios
   - Verifica se tem `package.json`
   - Verifica se tem script `dev`

2. **Atribuição de Portas**
   - Primeira app: porta 5000
   - Segunda app: porta 5001
   - Terceira app: porta 5002
   - E assim por diante...

3. **Geração de Comandos**
   - Comando gerado automaticamente
   - Baseado na estrutura do app
   - Inclui PORT e caminho correto

---

## 📊 Vantagens do Sistema

✅ **Escalável** - Adicione quantos apps quiser
✅ **Automático** - Descobre apps sem configuração manual
✅ **Organizado** - Cada app em sua porta
✅ **Simples** - Um comando para listar/gerar tudo
✅ **Sem conflitos** - Portas atribuídas automaticamente

---

## 🎮 Comandos Rápidos

```bash
# Ver apps disponíveis
node scripts/manage-workflows.js list

# Gerar configuração
node scripts/manage-workflows.js generate

# Ver ajuda
node scripts/manage-workflows.js info
```

---

## 🚦 Status Atual

Apps configurados:
- ✅ **nup-aim** (porta 5000)
- ✅ **nup-study** (porta 5001)

Workflows criados:
- ✅ **NuP AIM** workflow
- ✅ **NuP Study** workflow

---

## 📝 Arquivo de Configuração

O arquivo `workflows-config.json` contém a configuração gerada:

```json
[
  {
    "name": "impact-analysis-generator",
    "command": "cd apps/nup-aim && PORT=5000 npm run dev",
    "port": 5000,
    "path": "apps/nup-aim"
  },
  {
    "name": "nup-study",
    "command": "cd apps/nup-study && PORT=5001 npm run dev",
    "port": 5001,
    "path": "apps/nup-study"
  }
]
```

Este arquivo é gerado automaticamente e serve como referência para configurar workflows.

---

## 💡 Dicas

1. **Rodar múltiplos apps:** Configure workflows separados e execute simultaneamente
2. **Mudar porta:** Edite a variável PORT no comando do workflow
3. **Debugar:** Use os logs do workflow individual
4. **Adicionar app:** Basta criar a pasta e rodar `manage-workflows.js generate`

---

**Sistema criado para escalar de 2 a 20+ apps facilmente!** 🚀
