# Services - Microserviços Backend Standalone

Microserviços backend independentes que servem múltiplas aplicações do ecossistema NuP.

## 🎯 O Que São Services?

Services são **aplicações backend completas** que rodam independentemente das apps principais. Cada service tem seu próprio servidor, banco de dados e deploy.

### Características Principais

✅ **Servidor próprio** - Express, Fastify, ou outro framework
✅ **Porta dedicada** - 3001, 3002, 3003, etc
✅ **Banco de dados próprio** - SQLite, PostgreSQL, ou outro
✅ **Deploy separado** - Railway, Fly.io, Heroku, etc
✅ **Isolamento completo** - NÃO faz parte do pnpm workspace
✅ **Multi-tenant** - Serve múltiplas apps simultaneamente

## 🧭 Quando Criar um Service?

Use este checklist para decidir se seu código deve ser um service:

### ✅ Criar Service SE:

- [ ] Precisa de servidor HTTP próprio (Express, Fastify, etc)
- [ ] Tem lógica backend complexa que serve MÚLTIPLAS apps
- [ ] Precisa escalar independentemente das apps
- [ ] Tem requisitos de deploy diferentes (ex: mais CPU, mais memória)
- [ ] Necessita de persistência/estado próprio (banco de dados)
- [ ] Pode ser reutilizado por apps fora do monorepo

### ❌ NÃO Criar Service SE:

- [ ] É apenas um helper ou utility (vai em `packages/`)
- [ ] Não precisa de servidor próprio
- [ ] Só será usado por uma app específica (vai dentro da `app/`)
- [ ] É lógica frontend (vai em `features/` ou `packages/`)

## 📂 Estrutura de um Service

```
services/
└── nome-do-service/
    ├── src/
    │   ├── server.js              # Ponto de entrada do servidor
    │   ├── routes/                # Rotas da API
    │   │   └── index.js
    │   ├── controllers/           # Lógica de negócio
    │   │   └── exemplo.controller.js
    │   ├── database/              # Configuração do banco
    │   │   ├── init.js
    │   │   └── migrations/
    │   └── middleware/            # Middlewares customizados
    │       └── validation.js
    ├── data/                      # Dados persistentes (SQLite, uploads, etc)
    │   └── database.db
    ├── tests/                     # Testes do service
    │   └── api.test.js
    ├── .env.example               # Variáveis de ambiente de exemplo
    ├── package.json               # Dependencies PRÓPRIAS (não workspace)
    └── README.md                  # Documentação específica
```

## 🚀 Como Criar um Novo Service

### Passo 1: Criar estrutura de pastas

```bash
mkdir -p services/meu-service/src
cd services/meu-service
```

### Passo 2: Inicializar package.json

```bash
npm init -y
```

**IMPORTANTE:** NÃO adicione o service ao `pnpm-workspace.yaml`. Services são isolados!

### Passo 3: Instalar dependências

```bash
npm install express cors helmet express-rate-limit joi
npm install --save-dev nodemon
```

### Passo 4: Criar servidor básico

```javascript
// src/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requests
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'meu-service' });
});

// Rotas
app.use('/api', require('./routes'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Service rodando na porta ${PORT}`);
});
```

### Passo 5: Adicionar scripts ao package.json

```json
{
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test tests/**/*.test.js"
  }
}
```

### Passo 6: Criar .env.example

```bash
PORT=3002
DATABASE_PATH=./data/database.db
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5001
NODE_ENV=development
```

### Passo 7: Documentar no README do service

Crie um `README.md` específico do service documentando:
- O que o service faz
- Como rodar localmente
- Como fazer deploy
- Endpoints da API
- Variáveis de ambiente

## 🔌 Como Apps Consomem Services

Apps se comunicam com services via **HTTP/API**:

```typescript
// apps/nup-study/server/routes.ts
app.get('/api/custom-fields', async (req, res) => {
  // Chama o service via HTTP
  const response = await fetch('http://localhost:3002/api/custom-fields');
  const data = await response.json();
  res.json(data);
});
```

**NUNCA** importe código diretamente do service:

```typescript
// ❌ ERRADO - Services não fazem parte do workspace
import { getFields } from '@nup/custom-fields-service';

// ✅ CORRETO - Use HTTP/API
const response = await fetch('http://service-url/api/fields');
```

## 🎯 Services Atuais

### custom-fields
- **Porta:** 3002
- **Função:** Gerenciamento de campos personalizados multi-app
- **Banco:** SQLite (`data/custom-fields.db`)
- **Status:** ✅ Produção

## 📖 Exemplos de Services Futuros

### auth-service
Autenticação centralizada para todo ecossistema NuP
- OAuth, JWT, sessões
- Porta: 3001

### ai-gateway
Proxy inteligente para APIs de LLMs
- Rate limiting, caching, fallbacks
- Porta: 3003

### analytics-service
Coleta e processamento de métricas
- Event tracking, dashboards
- Porta: 3004

## ⚠️ Regras Importantes

1. **Isolamento Total:** Services NÃO importam código de `apps/`, `features/`, ou `packages/`
2. **Comunicação HTTP:** Apps se comunicam com services via API REST/GraphQL
3. **Deploy Independente:** Cada service pode ser deployado separadamente
4. **Versionamento:** Use semver e documente breaking changes
5. **Multi-tenancy:** Services devem suportar múltiplas apps (use app_id nos requests)

## 🚢 Deploy de Services

Services podem ser deployados em:

- **Railway** - Recomendado (fácil, PostgreSQL grátis)
- **Fly.io** - Bom para escala global
- **Heroku** - Simples mas pago
- **AWS Lambda** - Serverless (mais complexo)
- **Docker** - Qualquer cloud

Cada service deve ter seu próprio deploy independente!

## 📚 Recursos

- [Express.js Docs](https://expressjs.com/)
- [Microservices Patterns](https://microservices.io/patterns/index.html)
- [API Design Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)
