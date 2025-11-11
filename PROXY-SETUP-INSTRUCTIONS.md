# 🔄 Configuração do Proxy Reverso - Ecossistema NuP

## ✅ Passo 1: Substitua a configuração do .replit

Abra o arquivo `.replit` e substitua a seção `[workflows]` completa por:

```toml
[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "NuP-Identify (Proxy)"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "NuP-Aim (Proxy)"

[[workflows.workflow]]
name = "Start application"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

[[workflows.workflow]]
name = "NuP-Identify (Proxy)"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "./start-nup-identify-proxy.sh"
waitForPort = 5002

[[workflows.workflow]]
name = "NuP-Aim (Proxy)"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "./start-nup-aim-proxy.sh"
waitForPort = 34735
```

## ✅ Passo 2: Reinicie o Workspace

Execute no terminal do Replit:

```bash
kill 1
```

Aguarde 10-15 segundos para o workspace reiniciar.

## ✅ Passo 3: Teste as URLs

Após reiniciar, acesse:

- **NuP-Study:** `https://seu-dominio.replit.dev/`
- **NuP-Identify:** `https://seu-dominio.replit.dev/nup-identify`
- **NuP-AIM:** `https://seu-dominio.replit.dev/nup-aim`

## 🎯 Como funciona

### Arquitetura do Proxy

```
┌─────────────────────────────────────┐
│   https://seu-dominio.replit.dev    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │    NuP-Study (porta 5000)    │  │
│  │  Proxy Reverso Configurado   │  │
│  └───────────────────────────────┘  │
│             │                       │
│             ├──────────────┬────────┤
│             ▼              ▼        │
│  /nup-identify    /nup-aim          │
│       │                │            │
│       ▼                ▼            │
│  Porta 5002      Porta 34735       │
└─────────────────────────────────────┘
```

### Fluxo de Requisições

1. **Requisição:** `GET /nup-identify`
2. **Proxy intercepta** e encaminha para `localhost:5002`
3. **NuP-Identify** (com `BASE_PREFIX="/nup-identify"`) serve assets corretamente
4. **Assets Vite** (`/nup-identify/src/main.tsx`) são resolvidos pelo proxy
5. **HMR WebSocket** (`/nup-identify/__vite_hmr`) funciona corretamente

## 🔍 Verificação

Para verificar se está funcionando:

```bash
# Teste 1: Proxy funcionando
curl -I http://localhost:5000/nup-identify

# Teste 2: Ver logs do proxy
# Os logs devem mostrar: [Proxy] NuP-Identify: GET /nup-identify
```

## 🐛 Troubleshooting

**Problema:** Ainda vejo o NuP-Study ao acessar `/nup-identify`

**Solução:**
1. Verifique se os scripts têm permissão de execução:
   ```bash
   chmod +x start-nup-identify-proxy.sh start-nup-aim-proxy.sh
   ```

2. Verifique se BASE_PREFIX está configurado nos logs:
   - Deve aparecer: `🔧 [Proxy Mode] Starting NuP-Identify with BASE_PREFIX=/nup-identify`

**Problema:** Erro de porta em uso

**Solução:**
```bash
# Libere as portas
pkill -f "PORT=5002"
pkill -f "PORT=34735"
# Reinicie o workspace
kill 1
```

## 📋 Benefícios do Proxy Reverso

✅ **Domínio único** - Todas as aplicações em `https://seu-dominio.replit.dev`  
✅ **URLs limpas** - `/nup-identify` em vez de `:5002`  
✅ **HMR funcional** - Hot Module Replacement preservado  
✅ **CORS simplificado** - Gerenciado centralmente  
✅ **Fácil expansão** - Adicione novos apps facilmente  

## 🎓 Próximos Apps

Para adicionar novos apps ao proxy (ex: `/nup-kan`):

1. Crie script `start-nup-kan-proxy.sh`
2. Configure `BASE_PREFIX="/nup-kan"`
3. Adicione proxy no `apps/nup-study/server/index.ts`
4. Adicione workflow no `.replit`

---

**Documentado em:** 11/11/2025  
**Arquitetura:** Proxy Reverso Multi-App com Vite Dev Servers
