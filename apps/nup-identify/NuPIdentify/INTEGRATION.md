# 🔌 Guia de Integração NuPIdentity

## Visão Geral

O NuPIdentity é a central de identidade e gerenciamento de permissões para todo o ecossistema NuPtechs. Este guia mostra como integrar seu sistema (NuP-Kan, NuP-CRM, NuP-ERP, etc.) com a plataforma.

## 📋 Sumário

1. [Pré-requisitos](#pré-requisitos)
2. [Registro do Sistema](#registro-do-sistema)
3. [Sincronização de Permissões](#sincronização-de-permissões)
4. [Validação de Autenticação](#validação-de-autenticação)
5. [Validação de Permissões](#validação-de-permissões)
6. [Webhooks (Opcional)](#webhooks-opcional)
7. [Exemplos Práticos](#exemplos-práticos)

---

## Pré-requisitos

- Sistema NuPtechs com API REST
- Conta de administrador no NuPIdentity
- Token JWT de autenticação
- URL base do NuPIdentity (ex: `https://identity.nuptechs.com`)

---

## 1️⃣ Registro do Sistema

### Opção A: Registro Manual via API

```bash
curl -X POST https://identity.nuptechs.com/api/systems \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "nup-crm",
    "name": "NuP-CRM - Sistema de CRM",
    "description": "Sistema de gestão de relacionamento com clientes",
    "apiUrl": "https://crm.nuptechs.com",
    "webhookUrl": "https://crm.nuptechs.com/webhooks/identity",
    "isActive": true
  }'
```

### Opção B: Auto-registro via Sync

O sistema é criado automaticamente na primeira sincronização de permissões (recomendado).

---

## 2️⃣ Sincronização de Permissões

### Estrutura do `permissions.json`

Crie um arquivo `permissions.json` no seu projeto:

```json
{
  "system": {
    "id": "nup-crm",
    "name": "NuP-CRM - Sistema de CRM",
    "description": "Sistema de gestão de clientes",
    "apiUrl": "https://crm.nuptechs.com"
  },
  "functions": [
    {
      "key": "clients-view",
      "name": "Visualizar Clientes",
      "category": "Clientes",
      "description": "Permite visualizar lista de clientes",
      "endpoint": "GET /api/clients"
    },
    {
      "key": "clients-create",
      "name": "Criar Clientes",
      "category": "Clientes",
      "description": "Permite criar novos clientes",
      "endpoint": "POST /api/clients"
    },
    {
      "key": "clients-edit",
      "name": "Editar Clientes",
      "category": "Clientes",
      "description": "Permite editar clientes existentes",
      "endpoint": "PUT /api/clients/:id"
    },
    {
      "key": "clients-delete",
      "name": "Deletar Clientes",
      "category": "Clientes",
      "description": "Permite deletar clientes",
      "endpoint": "DELETE /api/clients/:id"
    }
  ]
}
```

### Campos Obrigatórios

#### System (opcional - para auto-registro):
- `id`: Identificador único do sistema (kebab-case)
- `name`: Nome amigável do sistema
- `description`: Descrição do sistema
- `apiUrl`: URL base da API do sistema

#### Functions (obrigatório):
- `key`: Identificador único da função (kebab-case)
- `name`: Nome amigável da função
- `category`: Categoria/módulo (ex: "Clientes", "Vendas", "Relatórios")
- `description`: Descrição do que a função permite
- `endpoint`: Endpoint da API (ex: "POST /api/clients")

### Endpoint de Sincronização

```bash
POST /api/systems/:systemId/sync-functions
```

**Exemplo:**

```bash
curl -X POST https://identity.nuptechs.com/api/systems/nup-crm/sync-functions \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d @permissions.json
```

**Resposta de Sucesso:**

```json
{
  "success": true,
  "message": "Sincronização concluída",
  "system": "NuP-CRM - Sistema de CRM",
  "summary": {
    "total": 15,
    "created": 12,
    "updated": 3,
    "unchanged": 0,
    "removed": 0
  },
  "removedFunctions": []
}
```

### Automação Recomendada

Configure a sincronização para rodar:
- **Na inicialização** do sistema (startup script)
- **No deploy** (CI/CD pipeline)
- **Manualmente** quando adicionar novas funcionalidades

---

## 3️⃣ Validação de Autenticação

### Endpoint de Validação

```bash
POST /api/validate/token
```

**Exemplo:**

```javascript
// Middleware de autenticação no seu sistema
async function validateNuPIdentityToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const response = await fetch('https://identity.nuptechs.com/api/validate/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    const userData = await response.json();
    req.user = userData; // Adiciona dados do usuário na requisição
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao validar token' });
  }
}
```

**Resposta de Sucesso:**

```json
{
  "valid": true,
  "user": {
    "id": "uuid-usuario",
    "name": "João Silva",
    "email": "joao@empresa.com",
    "organizationId": "uuid-org",
    "status": "active"
  }
}
```

---

## 4️⃣ Validação de Permissões

### Endpoint de Validação

```bash
POST /api/validate/permission
```

**Exemplo:**

```javascript
// Middleware de autorização no seu sistema
async function checkPermission(functionKey) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    try {
      const response = await fetch('https://identity.nuptechs.com/api/validate/permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          systemId: 'nup-crm',
          functionKey,
        }),
      });
      
      const result = await response.json();
      
      if (!result.allowed) {
        return res.status(403).json({
          error: 'Permissão negada',
          message: result.reason || 'Você não tem permissão para esta ação',
        });
      }
      
      req.permission = result;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao validar permissão' });
    }
  };
}

// Uso nas rotas
app.get('/api/clients', checkPermission('clients-view'), (req, res) => {
  // Retorna lista de clientes
});

app.post('/api/clients', checkPermission('clients-create'), (req, res) => {
  // Cria novo cliente
});
```

**Resposta de Sucesso:**

```json
{
  "allowed": true,
  "user": {
    "id": "uuid-usuario",
    "name": "João Silva",
    "email": "joao@empresa.com"
  },
  "permission": {
    "functionKey": "clients-view",
    "scope": "organization",
    "source": "team_profile"
  }
}
```

**Resposta de Negação:**

```json
{
  "allowed": false,
  "reason": "Usuário não possui permissão para esta função",
  "user": {
    "id": "uuid-usuario",
    "email": "joao@empresa.com"
  }
}
```

---

## 5️⃣ Webhooks (Opcional)

Configure um webhook para receber notificações quando permissões mudarem:

### Configuração

No registro do sistema, forneça a `webhookUrl`:

```json
{
  "webhookUrl": "https://crm.nuptechs.com/webhooks/identity"
}
```

### Eventos Recebidos

```json
{
  "event": "permissions.updated",
  "systemId": "nup-crm",
  "timestamp": "2025-10-25T10:30:00Z",
  "changes": {
    "userId": "uuid-usuario",
    "organizationId": "uuid-org",
    "changedFunctions": ["clients-view", "clients-create"]
  }
}
```

### Implementação

```javascript
app.post('/webhooks/identity', express.json(), (req, res) => {
  const { event, systemId, changes } = req.body;
  
  if (event === 'permissions.updated') {
    // Limpar cache de permissões do usuário
    clearUserPermissionsCache(changes.userId);
    
    console.log(`Permissões atualizadas para usuário ${changes.userId}`);
  }
  
  res.status(200).json({ received: true });
});
```

---

## 6️⃣ Exemplos Práticos

### Exemplo Completo - Node.js/Express

```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const IDENTITY_URL = 'https://identity.nuptechs.com';
const SYSTEM_ID = 'nup-crm';

// Middleware de autenticação
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
    
    req.user = await response.json();
    req.token = token;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao validar token' });
  }
}

// Middleware de autorização
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

// Rotas protegidas
app.get('/api/clients', authenticate, authorize('clients-view'), (req, res) => {
  res.json({ clients: [] });
});

app.post('/api/clients', authenticate, authorize('clients-create'), (req, res) => {
  res.json({ message: 'Cliente criado' });
});

app.listen(3000);
```

### Sincronização Automática

Crie um script `sync-permissions.js`:

```javascript
const fs = require('fs');
const fetch = require('node-fetch');

async function syncPermissions() {
  const permissions = JSON.parse(fs.readFileSync('./permissions.json', 'utf8'));
  const token = process.env.IDENTITY_ADMIN_TOKEN;
  
  console.log('🔄 Sincronizando permissões com NuPIdentity...');
  
  try {
    const response = await fetch(
      `https://identity.nuptechs.com/api/systems/${permissions.system.id}/sync-functions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissions),
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Sincronização concluída!');
      console.log(`   📊 Total: ${result.summary.total}`);
      console.log(`   ✨ Criadas: ${result.summary.created}`);
      console.log(`   🔄 Atualizadas: ${result.summary.updated}`);
    } else {
      console.error('❌ Erro na sincronização:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error.message);
    process.exit(1);
  }
}

syncPermissions();
```

Adicione ao `package.json`:

```json
{
  "scripts": {
    "sync:permissions": "node sync-permissions.js"
  }
}
```

---

## 🎯 Checklist de Integração

- [ ] Criar `permissions.json` com todas as funções do sistema
- [ ] Configurar variável de ambiente `IDENTITY_URL`
- [ ] Configurar variável de ambiente `IDENTITY_ADMIN_TOKEN`
- [ ] Implementar middleware de autenticação
- [ ] Implementar middleware de autorização
- [ ] Adicionar script de sincronização automática
- [ ] Configurar sincronização no CI/CD
- [ ] Testar validação de token
- [ ] Testar validação de permissões
- [ ] Configurar webhook (opcional)
- [ ] Documentar permissões no README do projeto

---

## 📚 Recursos Adicionais

- **API Reference:** [Documentação completa da API](./README.md)
- **Exemplos:** [Pasta de exemplos](./examples/)
- **Suporte:** suporte@nuptechs.com

---

## 🔒 Segurança

### Boas Práticas

1. **Tokens JWT:** Sempre valide tokens em cada requisição
2. **HTTPS:** Use sempre HTTPS em produção
3. **Cache:** Implemente cache de permissões com TTL curto (5-10min)
4. **Rate Limiting:** Implemente limite de requisições
5. **Logs:** Registre todas as tentativas de acesso negadas

### Exemplo de Cache

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function checkPermissionCached(token, functionKey) {
  const cacheKey = `${token}:${functionKey}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  const result = await checkPermission(token, functionKey);
  
  cache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });
  
  return result;
}
```

---

**Última atualização:** Outubro 2025  
**Versão da API:** v1.0.0
