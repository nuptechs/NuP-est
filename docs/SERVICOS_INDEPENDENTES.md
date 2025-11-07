# 🔧 Serviços Independentes do Ecossistema NuP

Este documento descreve os serviços independentes extraídos do monorepo NuP e como integrá-los em suas aplicações.

---

## 📋 Serviços Disponíveis

### 1. Custom Fields Service

**Localização:** `services/custom-fields/`  
**Porta:** 3002  
**Status:** ✅ Pronto para produção

#### O que faz?

Fornece campos personalizados dinâmicos para qualquer app do ecossistema NuP. Permite que cada app defina suas próprias seções e campos customizáveis via API.

#### Apps que usam:

- ✅ **NuP-AIM** - Análises de impacto customizáveis
- 🔜 **NuP-Study** - Flashcards e perfis de estudante customizáveis
- 🔜 **NuP-Chunks** - Metadata em chunks de texto
- 🔜 **NuP-KAN** - Campos em cards Kanban

#### Principais Features:

- 10+ tipos de campo (text, select, date, file, etc)
- Admin panel web em `/widgets/admin`
- SDK JavaScript framework-agnóstico
- Rate limiting e segurança built-in
- Banco SQLite local (zero config)

---

## 🚀 Como Rodar os Serviços

### Custom Fields Service

```bash
# Opção 1: Terminal separado
cd services/custom-fields
npm install
npm run dev

# Opção 2: Em background
cd services/custom-fields && npm run dev &

# Verificar se está rodando
curl http://localhost:3002/health
```

**Acessar:**
- Health Check: http://localhost:3002/health
- Admin Panel: http://localhost:3002/widgets/admin
- API Base: http://localhost:3002/api

---

## 🔌 Como Integrar em Apps

### Passo 1: Garantir que o serviço está rodando

```bash
curl http://localhost:3002/health
# Deve retornar: {"status":"healthy",...}
```

### Passo 2: Registrar seções da sua app

**No backend da sua app** (server startup):

```javascript
// apps/nup-aim/server/index.ts
async function registerCustomFieldsSections() {
  const CUSTOM_FIELDS_URL = process.env.CUSTOM_FIELDS_SERVICE_URL || 'http://localhost:3002';
  
  const sections = [
    {
      id: 'basic-info',
      name: 'basic_info',
      label: 'Informações Básicas',
      description: 'Campos da seção básica',
      component_name: 'BasicInfoForm'
    }
  ];

  try {
    const response = await fetch(`${CUSTOM_FIELDS_URL}/api/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections })
    });
    
    if (response.ok) {
      console.log('✅ Custom Fields sections registered');
    }
  } catch (error) {
    console.warn('⚠️  Custom Fields service unavailable:', error.message);
  }
}

// Chamar na inicialização
await registerCustomFieldsSections();
```

### Passo 3: Usar no frontend

**Opção A: SDK JavaScript**

```html
<script src="http://localhost:3002/custom-fields-sdk.js"></script>

<script>
  const sdk = new CustomFieldsSDK('http://localhost:3002');
  
  // Buscar campos
  const fields = await sdk.getFields('basic_info');
  
  // Renderizar dinamicamente
  fields.forEach(field => {
    // Criar inputs
  });
  
  // Salvar valores
  await sdk.saveValues('entity-123', 'basic_info', {
    'field-uuid-1': 'valor1',
    'field-uuid-2': 'valor2'
  });
</script>
```

**Opção B: HTTP direto**

```javascript
// Fetch fields
const response = await fetch('http://localhost:3002/api/custom-fields?section=basic_info');
const { data: fields } = await response.json();

// Save values
await fetch('http://localhost:3002/api/forms/values', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    values: [
      { field_id: 'uuid', analysis_id: 'entity-id', value: 'my value' }
    ]
  })
});
```

---

## 🏗️ Arquitetura do Ecossistema

```
nup-ecosystem/
├── apps/
│   ├── nup-study/           # Consome custom-fields
│   ├── nup-aim/             # Consome custom-fields
│   └── nup-chunks/          # Consome custom-fields
│
├── services/                # ← Serviços independentes
│   ├── custom-fields/       # Port 3002
│   │   ├── src/
│   │   ├── data/            # SQLite DB
│   │   └── package.json
│   │
│   └── (futuros serviços)
│       ├── auth-service/    # Port 3003
│       ├── ai-gateway/      # Port 3004
│       └── analytics/       # Port 3005
│
├── packages/@nup/           # Shared code
│   ├── ui/
│   ├── auth-client/
│   └── api-client/
│
└── features/@nup/           # Reusable features
    ├── mindmaps/
    └── professor-ia/
```

---

## 🔐 Variáveis de Ambiente

### Para o Serviço

```env
# services/custom-fields/.env
PORT=3002
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5003
```

### Para as Apps

```env
# apps/nup-aim/.env (ou apps/nup-study/.env)
CUSTOM_FIELDS_SERVICE_URL=http://localhost:3002
```

---

## 📊 Gestão de Campos (Admin Panel)

Qualquer admin pode acessar:

```
http://localhost:3002/widgets/admin
```

No painel é possível:

- ✅ Criar novos campos
- ✅ Editar campos existentes
- ✅ Deletar campos
- ✅ Reordenar campos
- ✅ Ativar/desativar campos
- ✅ Organizar por seções

---

## 🚢 Deploy

### Desenvolvimento

Cada serviço roda independentemente em portas diferentes:

| Serviço | Porta | Comando |
|---------|-------|---------|
| Custom Fields | 3002 | `cd services/custom-fields && npm run dev` |
| NuP-Study | 5000 | `cd apps/nup-study && npm run dev` |
| NuP-AIM | 5003 | `cd apps/nup-aim && npm run dev` |

### Produção

Serviços podem ser deployados em:

1. **Mesma infraestrutura** (Railway, Render, etc) - múltiplos containers
2. **Infraestruturas separadas** - cada serviço em seu próprio host
3. **Serverless** (AWS Lambda, Google Cloud Functions)
4. **Replit Deployments** - múltiplos deployments

**Exemplo Docker Compose:**

```yaml
version: '3.8'
services:
  custom-fields:
    build: ./services/custom-fields
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - ALLOWED_ORIGINS=https://nup-study.app,https://nup-aim.app
    volumes:
      - custom-fields-data:/app/data

  nup-study:
    build: ./apps/nup-study
    ports:
      - "5000:5000"
    environment:
      - CUSTOM_FIELDS_SERVICE_URL=http://custom-fields:3002
    depends_on:
      - custom-fields

volumes:
  custom-fields-data:
```

---

## 🔄 Fluxo de Dados

```
┌─────────────────────┐
│   NuP-Study App     │
│   (Frontend)        │
└──────────┬──────────┘
           │
           │ HTTP Request
           │
           ▼
┌─────────────────────┐
│   NuP-Study App     │
│   (Backend)         │◄───┐
└──────────┬──────────┘    │
           │                │
           │ Register       │ Fetch
           │ Sections       │ Fields
           │                │
           ▼                │
┌─────────────────────────┐│
│  Custom Fields Service  ││
│  Port 3002              ││
│  ┌─────────────────┐   ││
│  │  SQLite DB      │   ││
│  │  - Sections     │   ││
│  │  - Fields       │   ││
│  │  - Values       │   ││
│  └─────────────────┘   ││
└─────────────────────────┘│
           ▲                │
           │                │
           └────────────────┘
     (Outros apps também
      podem consumir)
```

---

## 💡 Melhores Práticas

### 1. Registrar seções no startup

```javascript
// No server/index.ts da sua app
app.listen(PORT, async () => {
  console.log(`App running on port ${PORT}`);
  
  // Registrar seções
  await registerCustomFieldsSections();
});
```

### 2. Graceful degradation

Se o serviço estiver offline, a app principal deve continuar funcionando:

```javascript
try {
  await registerCustomFieldsSections();
} catch (error) {
  console.warn('Custom Fields service unavailable - continuing without it');
  // App continua normalmente
}
```

### 3. Cache no frontend

```javascript
// Cache fields em localStorage ou React Query
const { data: fields } = useQuery({
  queryKey: ['custom-fields', section],
  queryFn: () => sdk.getFields(section),
  staleTime: 5 * 60 * 1000 // 5 min
});
```

### 4. Environment-aware URLs

```javascript
const CUSTOM_FIELDS_URL = 
  process.env.NODE_ENV === 'production'
    ? 'https://custom-fields.nup-services.com'
    : 'http://localhost:3002';
```

---

## 🆘 Troubleshooting

### Serviço não responde

```bash
# Verificar se está rodando
curl http://localhost:3002/health

# Verificar logs
cd services/custom-fields
npm run dev
```

### CORS errors

Adicione a origem da sua app no `.env`:

```env
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5003,http://localhost:5173
```

### Database locked

```bash
cd services/custom-fields
rm data/custom-fields.db
npm run dev  # Recria automaticamente
```

---

## 📚 Documentação Adicional

- [Custom Fields README](../services/custom-fields/README.md)
- [Integration Guide](../services/custom-fields/INTEGRATION_GUIDE.md)
- [Seed Sections Example](../services/custom-fields/seed-sections.example.js)

---

## 🔮 Futuros Serviços Planejados

| Serviço | Porta | Descrição | Status |
|---------|-------|-----------|--------|
| Custom Fields | 3002 | Campos customizáveis | ✅ Pronto |
| Auth Service | 3003 | Autenticação centralizada | 🔜 Planejado |
| AI Gateway | 3004 | Proxy unificado para LLMs | 🔜 Planejado |
| Analytics | 3005 | Tracking e métricas | 🔜 Planejado |
| Notification Service | 3006 | Push/Email/SMS | 🔜 Planejado |

---

**Última atualização:** Novembro 2025  
**Mantido por:** NuP Team
