# Guia de Deployment - Multi-Repl Architecture

## 🔑 Pré-requisito: Gerar JWT Secrets

**CRÍTICO:** Cada app DEVE ter seu próprio JWT_SECRET único e forte.

### Gerar Secrets Únicos

Execute este comando 3 vezes para gerar 3 secrets diferentes:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Salve os outputs como:
- `JWT_SECRET_STUDY` - Para NuP-Study
- `JWT_SECRET_IDENTIFY` - Para NuP-Identify  
- `JWT_SECRET_AIM` - Para NuP-AIM

**⚠️ NUNCA use `dev-secret-change-in-production` em produção!**

---

## 📦 Deployment de Cada App

### 1. NuP-Study

**Arquivo:** `apps/nup-study/`

**Secrets necessários:**
```env
DATABASE_URL=postgresql://[seu-database-url]
JWT_SECRET=[JWT_SECRET_STUDY]
NODE_ENV=production
PORT=5001
OPENAI_API_KEY=[sua-chave]
PINECONE_API_KEY=[sua-chave]
DEEPGRAM_API_KEY=[sua-chave]
```

**Comando de start:**
```json
{
  "scripts": {
    "start": "NODE_ENV=production tsx server/index.ts"
  }
}
```

**Health check:**
```bash
curl https://[seu-repl-url]/api/health
```

---

### 2. NuP-Identify

**Arquivo:** `apps/nup-identify/`

**Secrets necessários:**
```env
DATABASE_URL=postgresql://[seu-database-url]
JWT_SECRET=[JWT_SECRET_IDENTIFY]
SESSION_SECRET=[gere-outro-secret-forte]
NODE_ENV=production
PORT=5002
BASE_PREFIX=/nup-identify
REPLIT_CLIENT_ID=[oauth-client-id]
REPLIT_CLIENT_SECRET=[oauth-client-secret]
```

**Comando de start:**
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "start": "NODE_ENV=production tsx server/index.ts"
  }
}
```

**Health check:**
```bash
curl https://[seu-repl-url]/api/health
```

---

### 3. NuP-AIM

**Arquivo:** `apps/nup-aim/`

**Secrets necessários:**
```env
DATABASE_URL=postgresql://[seu-database-url]
JWT_SECRET=[JWT_SECRET_AIM]
NODE_ENV=production
PORT=5003
BASE_PREFIX=/nup-aim
```

**Comando de start:**
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/dev.ts",
    "start": "NODE_ENV=production tsx server/dev.ts"
  }
}
```

**Health check:**
```bash
curl https://[seu-repl-url]/api/health
```

---

### 4. Gateway

**Arquivo:** `apps/gateway/`

**Secrets necessários:**
```env
PORT=5000
NODE_ENV=production
NUP_STUDY_URL=https://[nup-study-repl].replit.dev
NUP_IDENTIFY_URL=https://[nup-identify-repl].replit.dev
NUP_AIM_URL=https://[nup-aim-repl].replit.dev
```

**Comando de start:**
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "start": "NODE_ENV=production tsx server/index.ts"
  }
}
```

**Health check:**
```bash
curl https://[gateway-url]/health
curl https://[gateway-url]/health/services
```

---

## 🔒 Checklist de Segurança

Antes de deploy em produção:

- [ ] JWT_SECRET único gerado para cada app
- [ ] SESSION_SECRET único gerado
- [ ] Secrets NUNCA commitados no Git
- [ ] DATABASE_URL com credenciais fortes
- [ ] NODE_ENV=production configurado
- [ ] HTTPS habilitado
- [ ] CORS configurado adequadamente
- [ ] Rate limiting implementado (futuro)

---

## 🚀 Ordem de Deployment

1. **Primeiro:** Deploy de cada app individual
   - NuP-Study
   - NuP-Identify
   - NuP-AIM

2. **Validar:** Testar health checks de cada app

3. **Último:** Deploy do Gateway
   - Configurar URLs dos apps nos Secrets
   - Testar `/health/services`

4. **Configurar Custom Domain (opcional)**
   - Apontar para o Gateway
   - Aguardar propagação DNS

---

## 📊 Validação Pós-Deploy

```bash
# Testar gateway
curl https://[gateway-url]/health

# Testar todos os serviços
curl https://[gateway-url]/health/services

# Deve retornar:
{
  "gateway": "running",
  "services": [
    { "name": "NuP-Study", "status": "healthy" },
    { "name": "NuP-Identify", "status": "healthy" },
    { "name": "NuP-AIM", "status": "healthy" }
  ]
}

# Testar rotas individuais
curl https://[gateway-url]/api/health          # NuP-Study
curl https://[gateway-url]/nup-identify/api/health   # NuP-Identify
curl https://[gateway-url]/nup-aim/api/health        # NuP-AIM
```

---

## 🔧 Troubleshooting

### Erro: 502 Bad Gateway

**Causa:** Serviço de destino não está rodando ou URL está incorreta

**Solução:**
1. Verificar se todos os Repls estão ativos
2. Confirmar URLs nos Secrets do Gateway
3. Testar health check diretamente no app

### Erro: Unauthorized / JWT Invalid

**Causa:** JWT_SECRET diferente entre apps

**Solução:**
1. Verificar se JWT_SECRET está configurado em cada app
2. Garantir que não há espaços ou caracteres extras
3. Regenerar tokens se necessário

### Erro: Database Connection

**Causa:** DATABASE_URL incorreto ou database inacessível

**Solução:**
1. Verificar DATABASE_URL em cada app
2. Confirmar que database está ativo
3. Testar conexão manualmente

---

## 📚 Recursos

- [Guia de Migração Multi-Repl](./MULTI_REPL_MIGRATION.md)
- [Gateway README](./apps/gateway/README.md)
- [Gerador de Secrets](https://randomkeygen.com/)
