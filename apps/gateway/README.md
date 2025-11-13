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

## Path Rewriting e Base Prefix

### Como Funciona

O gateway usa lógica condicional de path rewriting para garantir que:
- **Rotas API/WebSocket** sejam enviadas **sem prefixo** aos serviços downstream
- **Assets e HMR endpoints** sejam enviados **com prefixo** aos serviços downstream

#### Exemplo de Fluxo

**Requisição API:**
```
Cliente: GET /nup-identify/api/health
  ↓ Express remove mount path: /nup-identify
Gateway pathRewrite: /api/health (detecta /api, preserva sem prefixo)
  ↓
Downstream: GET http://localhost:5002/api/health ✅
```

**Requisição Asset:**
```
Cliente: GET /nup-identify/assets/logo.png
  ↓ Express remove mount path: /nup-identify
Gateway pathRewrite: /nup-identify/assets/logo.png (adiciona prefixo)
  ↓
Downstream: GET http://localhost:5002/nup-identify/assets/logo.png ✅
```

### Implementação

```javascript
pathRewrite: (path: string, req: any) => {
  const preserveList = ['/api', '/socket.io', '/ws'];
  
  // Preserva rotas API/WebSocket sem adicionar prefixo
  if (preserveList.some(p => path === p || path.startsWith(p + '/'))) {
    return path;
  }
  
  // Adiciona prefixo para assets, HMR, e rotas SPA
  return basePrefix + (path === '/' ? '' : path);
}
```

### Contrato com Serviços Downstream

**IMPORTANTE:** Os serviços proxiados (NuP-Identify, NuP-AIM) **DEVEM** ser configurados com `BASE_PREFIX`:

```javascript
// apps/nup-identify/vite.config.ts
const BASE_PREFIX = process.env.BASE_PREFIX || '/nup-identify';

export default defineConfig({
  base: BASE_PREFIX,
  // ...
});
```

Isso garante que:
- Assets sejam servidos com o prefixo correto (`/nup-identify/assets/*`)
- HMR endpoints funcionem (`/nup-identify/@vite/client`)
- Rotas API permaneçam root-relative (`/api/*`)

### Rotas Testadas

- ✅ `/nup-identify/api/health` → API sem prefixo
- ✅ `/nup-identify/` → HTML com prefixo
- ✅ `/nup-identify/assets/*` → Assets com prefixo
- ✅ `/nup-identify/@vite/client` → HMR com prefixo
- ✅ `/nup-identify/socket.io` → WebSocket sem prefixo

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
