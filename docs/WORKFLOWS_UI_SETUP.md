# 🖥️ Configuração de Workflows via UI do Replit

## 📖 Visão Geral

Este guia mostra como configurar workflows manualmente através da **interface do Replit**, sem precisar editar arquivos `.replit`.

---

## 🎯 Objetivo

Rodar **2 aplicações simultaneamente**:
- **NuP-Study** (porta 5000)
- **NuP-AIM** (porta 3000)

---

## 📋 Passo a Passo Detalhado

### **1️⃣ Acessar Workflows**

```
1. Clique em "Tools" no menu lateral
2. Selecione "Workflows"
3. Você verá a lista de workflows existentes
```

---

### **2️⃣ Criar Workflow: NuP Study**

**Configuração:**
```
Nome: NuP Study
Modo: Parallel
```

**Tarefa:**
```
Tipo: Execute Shell Command
Comando: cd apps/nup-study && PORT=5000 npm run dev
Wait for Port: 5000
```

**Resultado:** Servidor rodando em `https://seu-repl.replit.dev`

---

### **3️⃣ Criar Workflow: NuP AIM**

**Configuração:**
```
Nome: NuP AIM
Modo: Parallel
```

**Tarefa:**
```
Tipo: Execute Shell Command
Comando: cd apps/nup-aim && PORT=3000 npm run dev
Wait for Port: 3000
```

**Resultado:** Servidor rodando em `https://seu-repl-3000.replit.dev`

---

### **4️⃣ (Opcional) Criar Workflow Agregado**

Para rodar **ambos ao mesmo tempo**:

**Configuração:**
```
Nome: Run Both Apps
Modo: Parallel
```

**Tarefas:**
```
Task 1: Run Workflow → NuP Study
Task 2: Run Workflow → NuP AIM
```

---

## 🔧 Configuração Avançada

### **Definir Workflow Padrão para o Botão Run**

1. Abra **Workflows**
2. Clique nos **3 pontos** ao lado do workflow desejado
3. Selecione **"Set as default"**
4. O botão ▶️ Run agora executará esse workflow

---

### **Executar Workflows Individualmente**

1. Selecione o workflow no **dropdown** (próximo ao botão Run)
2. Clique em **▶️ Run**
3. O workflow será executado

---

## 📊 Monitoramento

### **Ver Logs do Workflow**

1. Clique na aba **"Console"** (parte inferior)
2. Os logs aparecem em tempo real
3. Verifique mensagens como:
   ```
   [express] serving on port 5000
   [express] serving on port 3000
   ```

---

### **Ver Portas Ativas**

1. Clique em **"Tools" → "Networking"**
2. Você verá:
   ```
   Local Port → External Port
   5000       → 80
   3000       → 3000
   ```

---

## 🐛 Troubleshooting

### **Problema: Workflow não inicia**

**Sintomas:**
- Workflow fica em "Starting..."
- Nenhum log aparece

**Soluções:**
1. Verifique se o comando está correto
2. Teste manualmente no Shell:
   ```bash
   cd apps/nup-aim && PORT=3000 npm run dev
   ```
3. Verifique se as dependências estão instaladas

---

### **Problema: "Port already in use"**

**Sintomas:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Soluções:**
1. Pare o workflow anterior
2. Execute no Shell:
   ```bash
   pkill -f "PORT=3000"
   ```

---

### **Problema: "Cannot find module"**

**Sintomas:**
```
Error: Cannot find module 'express'
```

**Soluções:**
1. Instale dependências:
   ```bash
   cd apps/nup-aim && npm install
   ```
2. Reinicie o workflow

---

## 📸 Checklist Visual

Use este checklist para verificar se tudo está configurado:

- [ ] Workflow "NuP Study" criado e funcional (porta 5000)
- [ ] Workflow "NuP AIM" criado e funcional (porta 3000)
- [ ] Ambos os workflows aparecem no dropdown
- [ ] Logs mostram servidores rodando sem erros
- [ ] URLs funcionam e mostram as aplicações
- [ ] (Opcional) Workflow agregado "Run Both Apps" criado

---

## 🎓 Dicas de Produtividade

### **Atalhos**

- **Trocar workflow:** Dropdown ao lado do botão Run
- **Ver logs:** Console (Ctrl + `)
- **Parar workflow:** Botão ⏹️ Stop

---

### **Boas Práticas**

1. **Nomes descritivos:** Use nomes claros para workflows
2. **Modo Parallel:** Sempre use para servidores web
3. **Wait for Port:** Configure para garantir que o servidor iniciou
4. **Logs organizados:** Monitore ambos os workflows separadamente

---

## 📚 Referências

- [Documentação Oficial do Replit: Workflows](https://docs.replit.com/programming-ide/workspace-features/workflows)
- [Networking e Port Forwarding](https://docs.replit.com/hosting/deploying-http-servers)

---

**Guia criado para o NuP Ecosystem** 🚀
