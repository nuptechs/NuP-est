# Guia de Migração: Multi-Repl Architecture

Este guia detalha como migrar o monorepo NuPtechs para uma arquitetura Multi-Repl.

## 📋 Visão Geral

### Antes (Arquitetura Atual - Single Repl)
```
workspace (1 Repl)
├── server/index.ts (NuP-Study + Gateway)
├── apps/nup-identify (porta 5002)
└── apps/nup-aim (porta 5003)
```

**Problemas:**
- ❌ Acoplamento excessivo
- ❌ Conflitos de porta (EADDRINUSE)
- ❌ Deploy dependente
- ❌ Debugging difícil
- ❌ Performance degradada

### Depois (Multi-Repl)
```
4 Repls Independentes:
├── nup-gateway (porta 5000) ← Custom domain aponta aqui
├── nup-study (porta 5001)
├── nup-identify (porta 5002)
└── nup-aim (porta 5003)
```

**Benefícios:**
- ✅ Isolamento completo
- ✅ Deploy independente
- ✅ Escalabilidade horizontal
- ✅ Melhor observabilidade
- ✅ Performance otimizada

## 🚀 Passo a Passo

### Fase 1: Preparação (30 minutos)

#### 1.1 Gerar JWT Secrets Únicos

```bash
# Gerar secrets fortes
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copie os outputs para usar nos Repls
```

Você precisará de 3 secrets:
- `JWT_SECRET_STUDY`
- `JWT_SECRET_IDENTIFY` 
- `JWT_SECRET_AIM`

#### 1.2 Anotar DATABASE_URL

```bash
echo $DATABASE_URL
# Copie este valor - será usado em todos os Repls
```

### Fase 2: Criar Repls (1 hora)

#### 2.1 Criar Repl: NuP-Study

1. **Criar novo Repl:**
   - Nome: `nup-study`
   - Template: Node.js
   - Visibility: Private

2. **Copiar código:**
   ```bash
   # Do workspace original, copie:
   - server/
   - shared/
   - client/
   - package.json
   - tsconfig.json
   ```

3. **Configurar Secrets (aba Secrets):**
   ```
   DATABASE_URL=<seu-database-url>
   JWT_SECRET=<JWT_SECRET_STUDY-gerado>
   NODE_ENV=production
   PORT=5001
   ```

4. **Ajustar package.json:**
   ```json
   {
     "scripts": {
       "start": "NODE_ENV=production tsx server/index.ts"
     }
   }
   ```

5. **Deploy:**
   - Run: `npm install && npm start`
   - Anotar URL: `https://[uuid].replit.dev`

#### 2.2 Criar Repl: NuP-Identify

1. **Criar novo Repl:**
   - Nome: `nup-identify`
   - Template: Node.js
   - Visibility: Private

2. **Copiar código:**
   ```bash
   # Do workspace original, copie apps/nup-identify/:
   - server/
   - shared/
   - client/
   - package.json
   - tsconfig.json
   - drizzle.config.ts
   ```

3. **Configurar Secrets:**
   ```
   DATABASE_URL=<seu-database-url>
   JWT_SECRET=<JWT_SECRET_IDENTIFY-gerado>
   SESSION_SECRET=<gere-outro-secret>
   NODE_ENV=production
   PORT=5002
   BASE_PREFIX=/nup-identify
   ```

4. **Deploy:**
   - Run: `npm install && npm start`
   - Anotar URL: `https://[uuid].replit.dev`

#### 2.3 Criar Repl: NuP-AIM

1. **Criar novo Repl:**
   - Nome: `nup-aim`
   - Template: Node.js
   - Visibility: Private

2. **Copiar código:**
   ```bash
   # Do workspace original, copie apps/nup-aim/:
   - server/
   - shared/
   - client/
   - package.json
   - tsconfig.json
   ```

3. **Configurar Secrets:**
   ```
   DATABASE_URL=<seu-database-url>
   JWT_SECRET=<JWT_SECRET_AIM-gerado>
   NODE_ENV=production
   PORT=5003
   BASE_PREFIX=/nup-aim
   ```

4. **Deploy:**
   - Run: `npm install && npm start`
   - Anotar URL: `https://[uuid].replit.dev`

#### 2.4 Criar Repl: Gateway

1. **Criar novo Repl:**
   - Nome: `nup-gateway`
   - Template: Node.js
   - Visibility: Public (será o ponto de entrada)

2. **Copiar código:**
   ```bash
   # Do workspace original, copie apps/gateway/:
   - server/
   - package.json
   ```

3. **Configurar Secrets:**
   ```
   PORT=5000
   NODE_ENV=production
   NUP_STUDY_URL=<URL-do-repl-nup-study>
   NUP_IDENTIFY_URL=<URL-do-repl-nup-identify>
   NUP_AIM_URL=<URL-do-repl-nup-aim>
   ```

4. **Deploy:**
   - Run: `npm install && npm start`
   - Anotar URL: `https://[uuid].replit.dev`
   - **Esta será sua URL principal!**

### Fase 3: Configuração Final (30 minutos)

#### 3.1 Testar Health Checks

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
```

#### 3.2 Testar Rotas

```bash
# NuP-Study
curl https://[gateway-url]/api/health

# NuP-Identify
curl https://[gateway-url]/nup-identify/api/health

# NuP-AIM
curl https://[gateway-url]/nup-aim/api/health
```

#### 3.3 Configurar Custom Domain (Opcional)

1. No Repl do Gateway:
   - Settings → Domains
   - Add custom domain (ex: `api.nuptechs.com`)
   
2. Configurar DNS:
   ```
   Type: CNAME
   Name: api (ou @)
   Value: [valor fornecido pelo Replit]
   ```

3. Aguardar propagação (5-30 min)

4. Acessar: `https://api.nuptechs.com`

### Fase 4: Validação (30 minutos)

#### 4.1 Checklist de Validação

- [ ] Gateway responde em `/health`
- [ ] Todos os serviços aparecem "healthy" em `/health/services`
- [ ] Login funciona no NuP-Identify via `/nup-identify/login`
- [ ] Dashboard do NuP-Study carrega via `/`
- [ ] NuP-AIM acessível via `/nup-aim`
- [ ] WebSocket funciona (se aplicável)
- [ ] Logs aparecem corretamente em cada Repl
- [ ] Não há erros 502 Bad Gateway
- [ ] Performance está aceitável (<500ms de latência)

#### 4.2 Teste de Carga

```bash
# Testar concorrência (opcional, use Apache Bench ou similar)
ab -n 100 -c 10 https://[gateway-url]/health
```

### Fase 5: Migração de Tráfego (1 hora)

#### 5.1 Atualizar Referências

- Atualizar URLs em:
  - Documentação
  - Frontend configs
  - Webhooks externos
  - Integrações

#### 5.2 Rollback Plan

Se algo der errado:
1. Reativar Repl original (`workspace`)
2. Redirecionar tráfego de volta
3. Investigar issues nos novos Repls
4. Tentar novamente quando resolver

### Fase 6: Deprecar Setup Antigo (1 semana depois)

Após validar que tudo funciona:

1. Pausar Repl original (`workspace`)
2. Monitorar por 1 semana
3. Se estável, deletar Repl original
4. Limpar recursos não utilizados

## 📊 Comparação de Custos

| Item | Single Repl | Multi-Repl | Economia |
|------|-------------|------------|----------|
| Compute | 1x Always-On | 4x Always-On | -300% |
| Database | 1x PostgreSQL | 1x PostgreSQL | 0% |
| Bandwidth | Compartilhado | Isolado | Melhor QoS |
| **Total** | $X/mês | $4X/mês | Vale o isolamento |

**Nota:** O custo aumenta, mas os benefícios compensam:
- Deploy independente
- Escalabilidade
- Melhor performance
- Menor risco

## 🔒 Segurança

### Checklist de Segurança

- [ ] JWT_SECRET rotacionado em todos os apps
- [ ] SESSION_SECRET único por app
- [ ] DATABASE_URL com credenciais fortes
- [ ] Secrets nunca commitados no Git
- [ ] HTTPS habilitado em todos os Repls
- [ ] CORS configurado adequadamente
- [ ] Rate limiting implementado (futuro)

## 📚 Recursos

- [Documentação do Gateway](./apps/gateway/README.md)
- [Replit Multi-App Deployment](https://docs.replit.com)
- [HTTP Proxy Middleware](https://github.com/chimurai/http-proxy-middleware)

## 🆘 Suporte

Em caso de problemas:

1. Verificar logs em cada Repl
2. Testar health checks
3. Validar variáveis de ambiente
4. Consultar este guia
5. Reverter para Single Repl se necessário

## ✅ Conclusão

Após completar todas as fases, você terá:
- ✅ Arquitetura desacoplada e escalável
- ✅ Deploy independente por app
- ✅ Melhor observabilidade
- ✅ Performance otimizada
- ✅ Segurança aprimorada

**Tempo total estimado:** 3-4 horas

**Próximos passos sugeridos:**
1. Implementar CI/CD para cada Repl
2. Adicionar monitoramento (Sentry, DataDog)
3. Configurar backups automáticos
4. Planejar estratégia de scaling
