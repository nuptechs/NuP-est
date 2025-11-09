# 🚀 Rodando Múltiplas Aplicações Simultaneamente

## 📌 Contexto

O NuP Ecosystem é um monorepo com **múltiplas aplicações independentes**. Todas podem rodar simultaneamente sem conflitos.

---

## ✅ **É Possível Rodar Todas em Paralelo?**

**Sim!** O Replit suporta rodar múltiplos workflows/aplicações ao mesmo tempo.

### **Limitações:**
- ✅ **Workflows simultâneos:** Ilimitado (sem limite explícito na documentação)
- ⚠️ **Recursos compartilhados:** CPU e RAM são compartilhados entre todos os apps
- ⚠️ **Portas:** Cada app precisa de uma porta única

---

## 🎯 Estratégias para Rodar Múltiplos Apps

### **Opção 1: Script Shell (Mais Simples)**

```bash
# Rodar TODOS os apps
./scripts/run-all-apps.sh

# Rodar um app específico
./scripts/run-app.sh nup-study
./scripts/run-app.sh nup-aim 3000
```

**Vantagens:**
- ✅ Simples e direto
- ✅ Logs coloridos por app
- ✅ Para todos os apps com Ctrl+C

**Desvantagens:**
- ❌ Não aparece na UI do Replit (apenas terminal)

---

### **Opção 2: Workflows na UI do Replit (Recomendado)**

#### **Criar Workflow Agregado**

1. Abra **Tools → Workflows**
2. Crie um novo workflow: **"Run All Apps"**
3. Modo: **Parallel**
4. Adicione tasks:
   ```
   Task 1: Run Workflow → NuP Study
   Task 2: Run Workflow → NuP AIM
   Task 3: Run Workflow → [Próximo App]
   ...
   ```

**Vantagens:**
- ✅ Aparece na UI do Replit
- ✅ Gerenciamento visual
- ✅ Logs separados por workflow
- ✅ Pode parar/iniciar individualmente

**Desvantagens:**
- ❌ Precisa configurar manualmente (não pode editar .replit via código)

---

### **Opção 3: Terminal Multiplexado (tmux)**

Para desenvolvedores avançados:

```bash
# Instalar tmux
nix-env -iA nixpkgs.tmux

# Criar sessão com múltiplos panes
tmux new-session -d -s nup-apps
tmux split-window -h
tmux send-keys -t nup-apps:0.0 'cd apps/nup-study && PORT=5000 npm run dev' C-m
tmux send-keys -t nup-apps:0.1 'cd apps/nup-aim && PORT=3000 npm run dev' C-m
tmux attach -t nup-apps
```

---

## 📊 Mapa de Portas (Padrão)

| App | Porta | URL (desenvolvimento) |
|-----|-------|-----------------------|
| **NuP-Study** | 5000 | `http://localhost:5000` |
| **NuP-AIM** | 3000 | `http://localhost:3000` |
| **NuP-Identify** | 5002 | `http://localhost:5002` |
| **NuP-Chunks** | 5003 | `http://localhost:5003` |
| **NuP-Kan** | 5004 | `http://localhost:5004` |
| **NuP-Service** | 5005 | `http://localhost:5005` |

---

## ⚙️ Configuração de Recursos

### **Limites do Replit**

Recursos são compartilhados entre **todos os apps rodando**:

| Plano | RAM | CPU | Apps Simultâneos Recomendados |
|-------|-----|-----|-------------------------------|
| **Free** | 0.5 GB | Compartilhada | 1-2 apps leves |
| **Core** | 2 GB | Dedicada | 3-5 apps |
| **Teams** | 4 GB | Dedicada | 5-10 apps |

**Dica:** Monitore o uso de recursos com:
```bash
htop  # CPU e RAM em tempo real
```

---

## 🔧 Adicionando um Novo App

### **Passo 1: Criar o App**

```bash
./scripts/create-app.sh nup-novo-app 5006
```

### **Passo 2: Atualizar Script de Execução**

Edite `scripts/run-all-apps.sh`:

```bash
npx concurrently \
  -n "NuP-Study,NuP-AIM,Novo-App" \
  -c "cyan,magenta,green" \
  "cd apps/nup-study && PORT=5000 npm run dev" \
  "cd apps/nup-aim && PORT=3000 npm run dev" \
  "cd apps/nup-novo-app && PORT=5006 npm run dev"
```

### **Passo 3: Criar Workflow no Replit**

1. **Tools → Workflows**
2. **New Workflow:** "Novo App"
3. **Command:** `cd apps/nup-novo-app && PORT=5006 npm run dev`
4. **Wait for Port:** 5006

---

## 🐛 Troubleshooting

### **Problema: "EADDRINUSE - Port already in use"**

**Causa:** Outra aplicação já está usando a porta.

**Solução:**
```bash
# Ver processos usando porta 3000
lsof -i :3000

# Matar processo específico
kill -9 <PID>

# Ou matar todos os processos node
pkill -f node
```

---

### **Problema: Alto uso de RAM**

**Sintomas:** Apps ficam lentos ou travam.

**Soluções:**

1. **Rodar menos apps simultaneamente:**
   ```bash
   # Rodar apenas o que você está desenvolvendo
   ./scripts/run-app.sh nup-study
   ```

2. **Otimizar build do Vite:**
   - Desabilitar sourcemaps em desenvolvimento
   - Usar `vite --no-hmr` (desabilita hot reload)

3. **Upgrade do plano:** Core ou Teams oferecem mais RAM

---

### **Problema: Apps não aparecem na UI do Replit**

**Causa:** Workflows não estão configurados corretamente.

**Solução:** Consulte `WORKFLOWS_UI_SETUP.md` para configurar workflows manualmente.

---

## 📈 Escalabilidade

### **Monorepo com 10+ Apps**

Para escalar além de 5-10 apps:

#### **Estratégia 1: Desenvolvimento Seletivo**

Rode apenas os apps que você está desenvolvendo ativamente:

```bash
# Variáveis de ambiente para controlar quais apps rodar
RUN_APPS="nup-study,nup-aim" ./scripts/run-all-apps.sh
```

#### **Estratégia 2: Microserviços em Deploy**

- **Desenvolvimento:** Rode 2-3 apps localmente
- **Produção:** Cada app faz deploy independente

#### **Estratégia 3: Docker Compose (Local)**

Para desenvolvimento local fora do Replit:

```yaml
# docker-compose.yml
version: '3.8'
services:
  nup-study:
    build: ./apps/nup-study
    ports:
      - "5000:5000"
  nup-aim:
    build: ./apps/nup-aim
    ports:
      - "3000:3000"
```

---

## 🎓 Melhores Práticas

### **1. Port Management**

- ✅ Use portas fixas por app (documentadas)
- ✅ Use variáveis de ambiente: `PORT=3000 npm run dev`
- ❌ Evite portas aleatórias

### **2. Logging**

- ✅ Use prefixos nos logs: `[NuP-Study]`, `[NuP-AIM]`
- ✅ Use cores diferentes por app
- ✅ Configure log levels: `DEBUG=nup:*`

### **3. Resource Management**

- ✅ Monitore uso de RAM/CPU
- ✅ Use lazy loading quando possível
- ✅ Otimize bundles do Vite

---

## 📚 Referências

- [Replit Workflows Documentation](https://docs.replit.com/programming-ide/workspace-features/workflows)
- [Replit Resource Limits](https://replit.com/pricing)
- [Concurrently (npm package)](https://www.npmjs.com/package/concurrently)

---

**NuP Ecosystem - Arquitetura Escalável** 🚀
