# 🚀 Guia Rápido de Integração - NuPIdentity

## Para Desenvolvedores de Sistemas Externos (NuP-Kan, NuP-CRM, etc.)

### 1️⃣ Obter Credenciais do NuPIdentity

**URL de Produção:** `https://sua-url-aqui.replit.app`

1. Acesse o NuPIdentity
2. Faça login como admin
3. Vá em **Settings** (menu lateral)
4. Copie o **Access Token** (botão de copiar)

### 2️⃣ Criar `permissions.json` no seu Sistema

No **raiz** do seu projeto (NuP-Kan, NuP-CRM, etc):

```json
{
  "system": {
    "id": "nup-kan",
    "name": "NuP-Kan - Sistema Kanban",
    "description": "Sistema de gestão de projetos estilo Kanban",
    "apiUrl": "https://nupkan.nuptechs.com"
  },
  "functions": [
    {
      "key": "boards-view",
      "name": "Visualizar Boards",
      "category": "Boards",
      "description": "Permite visualizar boards do sistema",
      "endpoint": "GET /api/boards"
    },
    {
      "key": "boards-create",
      "name": "Criar Boards",
      "category": "Boards",
      "description": "Permite criar novos boards",
      "endpoint": "POST /api/boards"
    },
    {
      "key": "boards-delete",
      "name": "Deletar Boards",
      "category": "Boards",
      "description": "Permite deletar boards",
      "endpoint": "DELETE /api/boards/:id"
    }
  ]
}
```

### 3️⃣ Configurar Variáveis de Ambiente

Adicione no arquivo `.env` ou nas Secrets do Replit:

```bash
# NuPIdentity Configuration
IDENTITY_URL=https://sua-url-aqui.replit.app
IDENTITY_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SYSTEM_ID=nup-kan
```

### 4️⃣ Copiar Scripts de Integração

Copie a pasta `examples/` do NuPIdentity para seu projeto:

```bash
mkdir integration
cp -r /caminho/nupidentity/examples/* ./integration/
```

Agora você tem:
- `integration/sync-permissions.js` - Sincroniza permissões
- `integration/middleware-auth.js` - Middlewares prontos
- `integration/express-integration.js` - Exemplo completo

### 5️⃣ Sincronizar Permissões (Primeira Vez)

```bash
node integration/sync-permissions.js
```

Você verá:
```
✅ Sincronização concluída com sucesso!
📊 Resumo:
   ✨ Novas funções: 13
```

### 6️⃣ Adicionar Middleware de Autenticação

**No seu servidor Express:**

```javascript
// middleware/auth.js
const IDENTITY_URL = process.env.IDENTITY_URL;
const SYSTEM_ID = process.env.SYSTEM_ID;

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const response = await fetch(`${IDENTITY_URL}/api/validate/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    const data = await response.json();
    req.user = data.user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao validar token' });
  }
}

function authorize(functionKey) {
  return async (req, res, next) => {
    try {
      const response = await fetch(`${IDENTITY_URL}/api/validate/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: req.token,
          systemId: SYSTEM_ID,
          functionKey,
        }),
      });
      
      const result = await response.json();
      
      if (!result.allowed) {
        return res.status(403).json({
          error: 'Permissão negada',
          message: result.reason,
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao validar permissão' });
    }
  };
}

module.exports = { authenticate, authorize };
```

### 7️⃣ Proteger Suas Rotas

```javascript
// routes/boards.routes.js
const { authenticate, authorize } = require('../middleware/auth');

// Rotas protegidas
router.get('/boards', 
  authenticate, 
  authorize('boards-view'), 
  (req, res) => {
    // Listar boards
  }
);

router.post('/boards', 
  authenticate, 
  authorize('boards-create'), 
  (req, res) => {
    // Criar board
  }
);

router.delete('/boards/:id', 
  authenticate, 
  authorize('boards-delete'), 
  (req, res) => {
    // Deletar board
  }
);
```

### 8️⃣ (Opcional) Configurar Webhook

Para receber notificações quando permissões mudam:

```javascript
// routes/webhooks.routes.js
app.post('/webhooks/identity', express.json(), (req, res) => {
  const { event, systemId, data } = req.body;
  
  if (event === 'permissions.updated') {
    console.log(`Permissões atualizadas para usuário ${data.userId}`);
    // Limpar cache de permissões
  }
  
  res.status(200).json({ received: true });
});
```

E configure a URL do webhook no NuPIdentity:

```bash
PATCH https://sua-url-nupidentity/api/systems/nup-kan
{
  "webhookUrl": "https://nupkan.com/webhooks/identity"
}
```

---

## ✅ Checklist de Integração

- [ ] Obter URL e Token do NuPIdentity
- [ ] Criar `permissions.json` no projeto
- [ ] Configurar variáveis de ambiente
- [ ] Copiar scripts de integração
- [ ] Sincronizar permissões (`node integration/sync-permissions.js`)
- [ ] Adicionar middleware de autenticação
- [ ] Proteger rotas com `authenticate` e `authorize`
- [ ] (Opcional) Configurar webhook
- [ ] Testar autenticação
- [ ] Testar autorização de permissões

---

## 📚 Mais Recursos

- **Documentação Completa:** `INTEGRATION.md`
- **Exemplos de Código:** Pasta `examples/`
- **Troubleshooting:** `DEPLOY.md`

---

**Integração completa em 10 minutos!** 🎉
