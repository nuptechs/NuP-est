# 🚀 Quick Start: Migração Multi-Repl

## ⏱️ Tempo estimado: 3-4 horas (incluindo instalação de dependências)

---

## 📋 PREPARAÇÃO (5 min)

### 1. Gerar Secrets Únicos

No Shell do Replit, execute 3x:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Salve os 3 códigos gerados como:
- `JWT_SECRET_STUDY`
- `JWT_SECRET_IDENTIFY`
- `JWT_SECRET_AIM`

### 2. Copiar DATABASE_URL Atual

```bash
echo $DATABASE_URL
```
Salve este valor - será usado em todos os Repls.

---

## 🏗️ CRIAÇÃO DOS REPLS (45 min)

### REPL 1: Gateway (15 min)

**1. Criar Repl:**
- Nome: `nup-gateway`
- Template: Node.js
- Visibility: Public

**2. Copiar arquivos:**

**IMPORTANTE:** Copie os arquivos para a **RAIZ** do novo Repl (não em uma subpasta).

Do workspace atual, copie:
- `apps/gateway/server/index.ts` → `server/index.ts` (no novo Repl)
- `apps/gateway/package.json` → `package.json` (no novo Repl)
- `apps/gateway/tsconfig.json` → `tsconfig.json` (no novo Repl)

**Estrutura final no novo Repl:**
```
/ (raiz do Repl)
├── server/
│   └── index.ts
├── package.json
└── tsconfig.json
```

**3. Configurar Secrets:**

Na aba "Secrets" do novo Repl, adicionar:

```
PORT=5000
NODE_ENV=production
NUP_STUDY_URL=https://[AGUARDAR-URL-DO-REPL-NUP-STUDY]
NUP_IDENTIFY_URL=https://[AGUARDAR-URL-DO-REPL-NUP-IDENTIFY]
NUP_AIM_URL=https://[AGUARDAR-URL-DO-REPL-NUP-AIM]
```

**4. Configurar Run Command:**

Na aba "Shell" do Repl, criar arquivo `.replit`:
```bash
cat > .replit << 'EOF'
run = "npm start"
entrypoint = "server/index.ts"
EOF
```

**5. Deploy:**
- Click "Run"  
- Aguarde `npm install` completar (~2-3 min)
- Aguarde servidor iniciar
- Anotar URL do Repl

**⚠️ NÃO CONFIGURAR SECRETS AINDA - falta obter URLs dos outros serviços**

---

### REPL 2: NuP-Study (15 min)

**1. Criar Repl:**
- Nome: `nup-study`
- Template: Node.js
- Visibility: Private

**2. Copiar arquivos:**

**IMPORTANTE:** Copie os arquivos para a **RAIZ** do novo Repl.

Do workspace atual, copie TODO o conteúdo de `apps/nup-study/` para a raiz do novo Repl:
- `apps/nup-study/server/` → `server/` (no novo Repl)
- `apps/nup-study/client/` → `client/` (no novo Repl)
- `apps/nup-study/shared/` → `shared/` (no novo Repl)
- `apps/nup-study/package.json` → `package.json` (no novo Repl)
- `apps/nup-study/tsconfig.json` → `tsconfig.json` (no novo Repl)
- `apps/nup-study/vite.config.ts` → `vite.config.ts` (no novo Repl)

**TAMBÉM copie:**
- `server/index.ts` (arquivo raiz que chama registerRoutes) → `server-root.ts` (no novo Repl)

**Estrutura final:**
```
/ (raiz do Repl)
├── server/        (routes, services, etc.)
├── client/        (React app)
├── shared/        (schema, types)
├── server-root.ts (entry point)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**3. Configurar Secrets:**

```
DATABASE_URL=[seu-database-url-copiado]
JWT_SECRET=[JWT_SECRET_STUDY]
NODE_ENV=production
PORT=5001
OPENAI_API_KEY=[copiar-do-workspace-atual]
PINECONE_API_KEY=[copiar-do-workspace-atual]
DEEPGRAM_API_KEY=[copiar-do-workspace-atual]
```

**4. Configurar Run Command:**

Criar arquivo `.replit`:
```bash
cat > .replit << 'EOF'
run = "npm run dev"
entrypoint = "server-root.ts"
EOF
```

**5. Deploy:**
- Click "Run"
- Aguarde `npm install` completar (~5-7 min - muitas dependências)
- Verificar logs: deve mostrar "serving on port 5001"
- **Anotar URL do Repl**

**5. Testar:**
```
https://[URL-DO-REPL]/api/health
```
Deve retornar: `{"status":"healthy","service":"NuP-Study",...}`

---

### REPL 3: NuP-Identify (15 min)

**1. Criar Repl:**
- Nome: `nup-identify`
- Template: Node.js
- Visibility: Private

**2. Copiar arquivos:**

**IMPORTANTE:** Copie para a **RAIZ** do novo Repl.

Do workspace atual, copie TODO o conteúdo de `apps/nup-identify/`:
- `apps/nup-identify/server/` → `server/` (no novo Repl)
- `apps/nup-identify/client/` → `client/` (no novo Repl)
- `apps/nup-identify/shared/` → `shared/` (no novo Repl)
- `apps/nup-identify/package.json` → `package.json`
- `apps/nup-identify/tsconfig.json` → `tsconfig.json`
- `apps/nup-identify/vite.config.ts` → `vite.config.ts`
- `apps/nup-identify/drizzle.config.ts` → `drizzle.config.ts`

**3. Configurar Secrets:**

```
DATABASE_URL=[seu-database-url-copiado]
JWT_SECRET=[JWT_SECRET_IDENTIFY]
SESSION_SECRET=[gere-outro-secret-com-node-crypto]
NODE_ENV=production
PORT=5002
BASE_PREFIX=/nup-identify
```

**4. Configurar Run Command:**

Criar `.replit`:
```bash
cat > .replit << 'EOF'
run = "npm run dev"
entrypoint = "server/index.ts"
EOF
```

**5. Deploy:**
- Click "Run"
- Aguarde `npm install` (~3-4 min)
- Verificar logs: "rodando em: http://localhost:5002"
- **Anotar URL do Repl**

**5. Testar:**
```
https://[URL-DO-REPL]/api/health
```
Deve retornar: `{"status":"healthy","service":"NuPIdentity",...}`

---

### REPL 4: NuP-AIM (15 min)

**1. Criar Repl:**
- Nome: `nup-aim`
- Template: Node.js
- Visibility: Private

**2. Copiar arquivos:**

**IMPORTANTE:** Copie para a **RAIZ** do novo Repl.

Do workspace atual, copie TODO o conteúdo de `apps/nup-aim/`:
- `apps/nup-aim/server/` → `server/` (no novo Repl)
- `apps/nup-aim/client/` → `client/` (no novo Repl)
- `apps/nup-aim/shared/` → `shared/` (no novo Repl)
- `apps/nup-aim/package.json` → `package.json`
- `apps/nup-aim/tsconfig.json` → `tsconfig.json`
- `apps/nup-aim/vite.config.ts` → `vite.config.ts`

**3. Configurar Secrets:**

```
DATABASE_URL=[seu-database-url-copiado]
JWT_SECRET=[JWT_SECRET_AIM]
NODE_ENV=production
PORT=5003
BASE_PREFIX=/nup-aim
```

**4. Configurar Run Command:**

Criar `.replit`:
```bash
cat > .replit << 'EOF'
run = "npm run dev"
entrypoint = "server/dev.ts"
EOF
```

**5. Deploy:**
- Click "Run"
- Aguarde `npm install` (~3-4 min)
- Verificar logs: "✅ JWT_SECRET configured (128 chars)"
- **Anotar URL do Repl**

**5. Testar:**
```
https://[URL-DO-REPL]/api/health
```
Deve retornar: `{"status":"healthy","service":"NuP-AIM",...}`

---

## 🔗 CONFIGURAÇÃO DO GATEWAY (15 min)

**1. Voltar ao Repl do Gateway**

**2. Atualizar Secrets com URLs dos serviços:**

```
NUP_STUDY_URL=https://[URL-ANOTADA-DO-NUP-STUDY]
NUP_IDENTIFY_URL=https://[URL-ANOTADA-DO-NUP-IDENTIFY]
NUP_AIM_URL=https://[URL-ANOTADA-DO-NUP-AIM]
```

**3. Restart:**
- Click "Stop" e depois "Run" novamente

**4. Testar Gateway Health:**
```
https://[URL-DO-GATEWAY]/health
```

Deve retornar: `{"status":"healthy","gateway":"running",...}`

**5. Testar Todos os Serviços via Gateway:**

```
https://[URL-DO-GATEWAY]/health/services
```

Deve retornar:
```json
{
  "gateway": "running",
  "services": [
    { "name": "NuP-Study", "status": "healthy" },
    { "name": "NuP-Identify", "status": "healthy" },
    { "name": "NuP-AIM", "status": "healthy" }
  ]
}
```

---

## ✅ VALIDAÇÃO FINAL (15 min)

### Testar Rotas via Gateway:

**1. NuP-Study:**
```
https://[URL-DO-GATEWAY]/
```

**2. NuP-Identify:**
```
https://[URL-DO-GATEWAY]/nup-identify/
```

**3. NuP-AIM:**
```
https://[URL-DO-GATEWAY]/nup-aim/
```

### Checklist:

- [ ] Gateway responde em `/health`
- [ ] Todos os serviços aparecem "healthy" em `/health/services`
- [ ] NuP-Study carrega pela raiz `/`
- [ ] NuP-Identify carrega em `/nup-identify/`
- [ ] NuP-AIM carrega em `/nup-aim/`
- [ ] Não há erros 502 Bad Gateway
- [ ] Login funciona
- [ ] Navegação entre apps funciona

---

## 🎯 CUSTOM DOMAIN (Opcional - 15 min)

**1. No Repl do Gateway:**
- Settings → Domains
- Add custom domain (ex: `api.nuptechs.com`)

**2. Configurar DNS:**
```
Type: CNAME
Name: api (ou @)
Value: [valor fornecido pelo Replit]
```

**3. Aguardar propagação (5-30 min)**

**4. Acessar:**
```
https://api.nuptechs.com
```

---

## 🔄 APÓS MIGRAÇÃO

### O que fazer com o workspace original?

1. **Pausar workflows** para não consumir recursos
2. **Manter por 1 semana** como backup
3. **Deletar** após validar que Multi-Repl está estável

### Monitoramento:

- Verificar logs de cada Repl individualmente
- Usar `/health/services` para overview
- Configurar alertas (futuro)

---

## 🆘 TROUBLESHOOTING

### Erro 502 Bad Gateway

**Causa:** Serviço de destino não está rodando

**Solução:**
1. Verificar se o Repl específico está ativo
2. Testar health check direto no serviço
3. Verificar URLs nos Secrets do Gateway

### Erro: EADDRINUSE

**Causa:** Porta já em uso

**Solução:**
1. Cada serviço DEVE usar porta diferente
2. Gateway: 5000
3. Study: 5001
4. Identify: 5002
5. AIM: 5003

### Erro: Unauthorized / JWT Invalid

**Causa:** JWT_SECRET diferente ou ausente

**Solução:**
1. Verificar JWT_SECRET em cada Repl
2. Garantir que tem pelo menos 32 caracteres
3. Regenerar se necessário

---

## 📊 TEMPO TOTAL ESTIMADO

| Fase | Tempo |
|------|-------|
| Preparação | 5 min |
| Gateway | 15 min |
| NuP-Study | 15 min |
| NuP-Identify | 15 min |
| NuP-AIM | 15 min |
| Configuração Gateway | 15 min |
| Validação | 15 min |
| Custom Domain (opcional) | 15 min |
| **TOTAL** | **~3-4 horas** |

**Nota:** Tempo inclui instalação de dependências (npm install) em cada Repl.

---

## ✨ BENEFÍCIOS IMEDIATOS

Após a migração:
- ✅ Deploy independente por app
- ✅ Zero conflitos de porta
- ✅ Logs isolados e claros
- ✅ Melhor performance
- ✅ Escalabilidade horizontal
- ✅ Debugging mais fácil

---

**Pronto! Siga este guia passo a passo e você terá uma arquitetura Multi-Repl robusta em ~2 horas.**
