# 🚀 Sistema de Workflows Escalável - NuP Ecosystem

## ✨ Visão Geral

Sistema **totalmente automático e escalável** para gerenciar e executar **10+ aplicações** simultaneamente no monorepo. Baseado em:

- **Registro centralizado** (`workflows-config.json`)
- **Descoberta automática** de apps
- **Portas pré-configuradas** sem conflitos
- **Limite de recursos** configurável

---

## 🎯 Funcionalidades

### ✅ **Suporte para 10+ Apps Simultaneamente**
- Sem hard-coding de apps
- Portas gerenciadas automaticamente
- Configuração centralizada

### ✅ **Descoberta Automática**
- Escaneia `apps/` automaticamente
- Detecta `package.json` e script `dev`
- Gera configuração on-demand

### ✅ **Controle de Recursos**
- Limite configurável (padrão: 10 apps)
- Flag `enabled` para desabilitar apps
- Logs organizados por app

---

## 📋 Uso Rápido

### **1. Listar Apps Disponíveis**

```bash
node scripts/manage-workflows.js list
```

**Saída:**
```
📦 Apps Disponíveis no Monorepo:

1. impact-analysis-generator ✅
   📁 ID: nup-aim
   🔌 Porta: 3000
   ✅ Script dev encontrado
   💻 Comando: cd apps/nup-aim && PORT=3000 npm run dev

2. nup-study ✅
   📁 ID: nup-study
   🔌 Porta: 5000
   ...

✨ Total: 2 app(s) | Habilitados: 2
⚙️  Limite paralelo: 10 apps
```

---

### **2. Gerar Configuração**

```bash
node scripts/manage-workflows.js generate
```

Cria/atualiza `workflows-config.json` com **todos os apps descobertos**.

---

### **3. Rodar Todos os Apps**

```bash
# Opção 1: Script shell
./scripts/run-all-apps.sh

# Opção 2: Diretamente
node scripts/manage-workflows.js run

# Opção 3: Com limite personalizado
MAX_APPS=5 node scripts/manage-workflows.js run
```

---

### **4. Rodar App Específico**

```bash
# Opção 1: Script shell
./scripts/run-app.sh nup-study

# Opção 2: Diretamente
node scripts/manage-workflows.js run nup-study
```

---

## 🗂️ Estrutura do Sistema

### **Arquivo Central: `workflows-config.json`**

```json
[
  {
    "id": "nup-aim",
    "name": "impact-analysis-generator",
    "path": "apps/nup-aim",
    "port": 3000,
    "command": "cd apps/nup-aim && PORT=3000 npm run dev",
    "hasDevScript": true,
    "enabled": true
  },
  {
    "id": "nup-study",
    "name": "nup-study",
    "path": "apps/nup-study",
    "port": 5000,
    "command": "cd apps/nup-study && PORT=5000 npm run dev",
    "hasDevScript": true,
    "enabled": true
  }
]
```

**Campos:**
- `id`: Identificador único (nome do diretório)
- `name`: Nome do package.json
- `path`: Caminho relativo do app
- `port`: Porta atribuída automaticamente
- `command`: Comando completo para executar
- `hasDevScript`: Detecta se tem `npm run dev`
- `enabled`: Flag para habilitar/desabilitar

---

## 🔌 Mapa de Portas

### **Portas Pré-Configuradas**

| App | Porta | Status |
|-----|-------|--------|
| **nup-study** | 5000 | ✅ Configurada |
| **nup-aim** | 3000 | ✅ Configurada |
| **nup-identify** | 5002 | 🔮 Reservada |
| **nup-chunks** | 5003 | 🔮 Reservada |
| **nup-kan** | 5004 | 🔮 Reservada |
| **nup-service** | 5005 | 🔮 Reservada |

### **Portas Dinâmicas**

Apps não mapeados recebem portas a partir de **5006**, evitando conflitos.

**Algoritmo:**
```
1. Se app tem porta conhecida → usa a porta
2. Senão → usa próxima porta disponível (5006, 5007, ...)
3. Garante: nenhum conflito entre apps
```

---

## ⚙️ Configuração Avançada

### **Desabilitar App**

Edite `workflows-config.json`:

```json
{
  "id": "nup-aim",
  "enabled": false
}
```

O app será ignorado ao rodar `run`.

---

### **Alterar Limite de Apps Simultâneos**

```bash
# Permitir até 15 apps
MAX_APPS=15 node scripts/manage-workflows.js run

# Ou definir permanentemente
export MAX_APPS=15
```

---

### **Adicionar Novo App**

```bash
# 1. Criar app
mkdir -p apps/nup-novo-app
cd apps/nup-novo-app
npm init -y

# 2. Adicionar script dev
# (edite package.json para incluir "dev": "tsx server/index.ts")

# 3. Regenerar configuração
node scripts/manage-workflows.js generate

# 4. O novo app aparecerá automaticamente!
node scripts/manage-workflows.js list
```

**Resultado:**
```
3. nup-novo-app ✅
   📁 ID: nup-novo-app
   🔌 Porta: 5006 (auto-atribuída)
   ✅ Script dev encontrado
```

---

## 🎯 Integração com Workflows do Replit

### **Passo 1: Gerar Configuração**

```bash
node scripts/manage-workflows.js generate
```

### **Passo 2: Configurar Workflows na UI**

1. Abra **Tools → Workflows** no Replit
2. Para cada app em `workflows-config.json`:

   **Exemplo: NuP-Study**
   ```
   Nome: NuP Study
   Modo: Parallel
   Comando: cd apps/nup-study && PORT=5000 npm run dev
   Wait for Port: 5000
   ```

   **Exemplo: NuP-AIM**
   ```
   Nome: NuP AIM
   Modo: Parallel
   Comando: cd apps/nup-aim && PORT=3000 npm run dev
   Wait for Port: 3000
   ```

3. **Criar Workflow Agregado** (opcional):
   ```
   Nome: Run All Apps
   Modo: Parallel
   Tasks:
     - Run Workflow → NuP Study
     - Run Workflow → NuP AIM
     - (adicione mais conforme necessário)
   ```

---

## 📊 Monitoramento e Logs

### **Ver Status em Tempo Real**

```bash
node scripts/manage-workflows.js info
```

**Saída:**
```
📊 Informações do Sistema de Workflows

───────────────────────────────────────────
📁 Diretório de apps: /workspace/apps
📄 Arquivo de config: /workspace/workflows-config.json
🎯 Total de apps: 2
✅ Apps habilitados: 2
⚙️  Limite paralelo: 10
───────────────────────────────────────────

🔌 Mapa de Portas:

  ✅ impact-analysis-generator    → porta 3000
  ✅ nup-study                     → porta 5000
```

---

### **Logs de Execução**

Ao usar `concurrently`, os logs são prefixados:

```
[nup-study] 🚀 Server running on port 5000
[nup-aim]   ✅ Express server listening on port 3000
```

---

## 🐛 Troubleshooting

### **Problema: "Port already in use"**

**Causa:** Outro processo usa a porta.

**Solução:**
```bash
# Ver quem usa a porta
lsof -i :3000

# Matar processo
kill -9 <PID>

# Ou matar todos os node
pkill -f node
```

---

### **Problema: "concurrently not found"**

**Solução:**
```bash
npm install concurrently
# Ou
npx concurrently --version
```

O sistema usa `npx` que instala automaticamente.

---

### **Problema: App não aparece na lista**

**Verificar:**
1. App tem `package.json`?
2. `package.json` tem script `"dev"`?
3. Regenerar config: `node scripts/manage-workflows.js generate`

---

### **Problema: Limite de apps atingido**

**Sintoma:**
```
⚠️  Tentando rodar 12 apps, mas o limite é 10
```

**Solução:**
```bash
MAX_APPS=15 node scripts/manage-workflows.js run
```

---

## 📈 Escalabilidade

### **Performance por Plano**

| Plano Replit | RAM | Apps Recomendados |
|--------------|-----|-------------------|
| Free | 0.5 GB | 1-2 apps leves |
| Core | 2 GB | 3-5 apps |
| Teams | 4 GB | 5-10 apps |

**Dica:** Rode apenas os apps que você está desenvolvendo ativamente.

---

### **Estratégia para 10+ Apps**

#### **Desenvolvimento Local**
```bash
# Rodar apenas 3 apps que você está trabalhando
node scripts/manage-workflows.js run nup-study
node scripts/manage-workflows.js run nup-aim
node scripts/manage-workflows.js run nup-novo-feature
```

#### **CI/CD**
Cada app faz deploy independente (Autoscale, Static, etc.).

---

## 🎓 Melhores Práticas

### ✅ **DO**
- Regenerar config após adicionar apps
- Usar portas conhecidas para apps principais
- Monitorar uso de recursos com `htop`
- Rodar apenas apps necessários

### ❌ **DON'T**
- Editar `workflows-config.json` manualmente (use `generate`)
- Usar mesma porta para múltiplos apps
- Rodar todos os apps se RAM é limitada

---

## 🔄 Comparação: Antes vs Depois

### **❌ Antes (Hard-coded)**

```bash
# run-all-apps.sh
concurrently \
  "cd apps/nup-study && PORT=5000 npm run dev" \
  "cd apps/nup-aim && PORT=5173 npm run dev"  # porta errada!
```

**Problemas:**
- Hard-coded para 2 apps apenas
- Portas conflitantes
- Precisa editar script para cada novo app

---

### **✅ Depois (Dinâmico)**

```bash
# run-all-apps.sh
node scripts/manage-workflows.js run
```

**Vantagens:**
- ✅ Descobre apps automaticamente
- ✅ Portas gerenciadas centralmente
- ✅ Escala para 10+ apps sem editar código
- ✅ Fonte única de verdade (`workflows-config.json`)

---

## 📚 Arquitetura

### **Fluxo de Execução**

```
┌─────────────────────────────────────────┐
│  1. Descoberta de Apps (apps/)          │
│     - Escaneia diretórios               │
│     - Lê package.json                   │
│     - Detecta script "dev"              │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  2. Atribuição de Portas                │
│     - Usa portas conhecidas             │
│     - Ou incrementa dinamicamente       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  3. Geração de Configuração             │
│     - Salva em workflows-config.json    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  4. Execução                            │
│     - Lê config                         │
│     - Filtra apps habilitados           │
│     - Aplica limite (MAX_APPS)          │
│     - Usa concurrently ou spawn         │
└─────────────────────────────────────────┘
```

---

## 🎉 Conclusão

O sistema de workflows escalável oferece:

- ✅ **Automação completa**: Zero configuração manual
- ✅ **Escalabilidade**: 10+ apps sem esforço
- ✅ **Governança**: Portas e recursos centralizados
- ✅ **Flexibilidade**: CLI + scripts shell + Workflows UI
- ✅ **Manutenção**: Adicione apps sem tocar em código

---

**NuP Ecosystem - Workflows Escaláveis** 🚀

*Última atualização: Novembro 2025*
