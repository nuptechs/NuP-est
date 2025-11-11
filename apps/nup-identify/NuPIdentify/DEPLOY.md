# 🚀 Guia de Deploy - NuPIdentity

## Preparação para Deploy

### 1. Verificar Secrets de Produção

Certifique-se que as seguintes secrets estão configuradas no deployment:

```bash
DATABASE_URL=<url-do-postgres-production>
JWT_SECRET=<chave-secreta-producao>
JWT_REFRESH_SECRET=<chave-refresh-producao>
SESSION_SECRET=<chave-sessao-producao>
```

**⚠️ IMPORTANTE:** Use valores **diferentes** das secrets de desenvolvimento!

### 2. Configurar Database de Produção

1. Crie um banco PostgreSQL de produção (Neon recomendado)
2. Execute as migrations:
   ```bash
   npm run db:push
   ```
3. (Opcional) Crie usuário admin inicial:
   ```bash
   npm run seed
   ```

### 3. Build e Deploy

O Replit está configurado para:

1. **Build:** `npm run build`
   - Compila o frontend (Vite) → `dist/public/`
   - Compila o backend (esbuild) → `dist/index.js`
   - Total: ~82KB backend + ~442KB frontend

2. **Run:** `node dist/index.js`
   - Inicia servidor Node.js de produção
   - Serve frontend estático de `dist/public/`
   - API backend em `/api/*`
   - Porta: 5000 (automática)

### 4. Após o Deploy

1. **Obter URL de Produção:**
   - Acesse a aba "Deployments" no Replit
   - Copie a URL (ex: `https://nupidentity.replit.app`)

2. **Criar Usuário Admin:**
   - Acesse `https://sua-url/login`
   - Clique em "Registrar"
   - Crie o usuário admin
   - Faça login e vá em Settings
   - Copie o Access Token

3. **Configurar Domínio Customizado (Opcional):**
   - Vá em Deployments → Settings → Link a domain
   - Configure DNS do seu domínio
   - Exemplo: `identity.nuptechs.com`

## Integração com Sistemas Externos

### URL de Produção

Use a URL de produção nos sistemas externos:

```bash
# .env nos sistemas NuP-Kan, NuP-CRM, etc
IDENTITY_URL=https://sua-url-aqui
IDENTITY_ADMIN_TOKEN=<token-do-admin>
SYSTEM_ID=nup-kan
```

### Webhook URL

Configure a webhook URL em cada sistema:

```bash
# No NuPIdentity, em /systems
Webhook URL: https://nupkan.com/webhooks/identity
```

## Troubleshooting

### Deploy falha com erro de módulo

✅ **Solução:** Configuração corrigida de duas formas:
1. Configuração de deployment: `node dist/index.js`
2. Arquivo `index.js` na raiz como fallback (importa `dist/index.js`)
3. Build command: `npm run build` compila tudo antes

### Erro de conexão com banco

✅ **Solução:** Verifique:
1. `DATABASE_URL` está configurada nas Secrets do deployment
2. Banco de produção está acessível
3. IP do Replit está na whitelist do Neon

### Token JWT inválido

✅ **Solução:**
1. Verifique `JWT_SECRET` de produção
2. Gere novo token (login + Settings)
3. Tokens expiram em 1 hora

## Monitoramento

### Logs de Produção

Acesse logs em tempo real:
1. Deployments → Overview → Logs
2. Procure por erros ou warnings

### Health Check

Teste o endpoint de health:
```bash
curl https://sua-url/api/health
```

Deve retornar: `{ "status": "ok" }`

## Rollback

Se algo der errado:
1. Vá em Deployments → Overview
2. Clique em "Rollback" para versão anterior
3. Ou faça novo deploy da branch estável

---

**Deploy configurado e pronto para produção!** 🎉
