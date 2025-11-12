# NuPtechs Gateway

Gateway de Proxy Reverso para arquitetura Multi-Repl do ecossistema NuPtechs.

## Arquitetura

```
┌─────────────────────────────────────┐
│   Gateway Repl (Este App)           │
│   Porta: 5000                        │
│   - Health checks                    │
│   - Proxy reverso                    │
│   - Logging centralizado             │
└────────────┬────────────────────────┘
             │
    ┌────────┼────────┬────────┐
    │        │        │        │
┌───▼───┐ ┌─▼───┐ ┌─▼───┐ ┌─▼───┐
│ NuP-  │ │ NuP-│ │ NuP-│ │Future│
│ Study │ │Identify│ │ AIM │ │ Apps │
│ :5001 │ │ :5002│ │:5003│ │      │
└───────┘ └─────┘ └─────┘ └─────┘
```

## Rotas

- `/` → NuP-Study (catch-all)
- `/nup-identify/*` → NuP-Identify
- `/nup-aim/*` → NuP-AIM
- `/health` → Status do Gateway
- `/health/services` → Status de todos os serviços

## Configuração

### Variáveis de Ambiente

```bash
PORT=5000
NODE_ENV=production

# URLs dos serviços (use URLs completas dos Repls)
NUP_STUDY_URL=https://[seu-repl-nup-study].replit.dev
NUP_IDENTIFY_URL=https://[seu-repl-nup-identify].replit.dev
NUP_AIM_URL=https://[seu-repl-nup-aim].replit.dev
```

## Deployment

### 1. Criar Repl para o Gateway

1. Criar novo Repl no Replit
2. Importar apenas a pasta `apps/gateway`
3. Configurar Secrets com as URLs dos serviços
4. Run: `npm install && npm start`

### 2. Configurar Custom Domain (Opcional)

1. No Repl do Gateway, vá em Settings
2. Configure Custom Domain (ex: api.nuptechs.com)
3. Aponte DNS para o domínio fornecido

## Health Checks

```bash
# Verificar gateway
curl https://[gateway-url]/health

# Verificar todos os serviços
curl https://[gateway-url]/health/services
```

## Logs

Em desenvolvimento, o gateway loga todas as requisições:
```
[Gateway] Proxying: GET /nup-identify/login -> http://localhost:5002
```

## Segurança

- Todas as requisições passam headers `X-Forwarded-*`
- Circuit breaker automático em caso de falha de serviço
- Timeout de 5s para health checks

## Troubleshooting

### Serviço retorna 502

- Verifique se o serviço está rodando: `GET /health/services`
- Confirme as URLs nas variáveis de ambiente
- Verifique logs do serviço específico

### WebSocket não funciona

- O Gateway suporta WebSocket (`ws: true`)
- Confirme que o serviço de destino suporta WS
