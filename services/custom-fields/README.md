# 🔧 NuP Custom Fields Service

**Serviço independente e reutilizável** para gerenciar campos personalizados dinâmicos em qualquer aplicação do ecossistema NuP.

---

## 🌟 Visão Geral

Este é um **microserviço standalone** que fornece campos customizáveis para qualquer app do monorepo NuP. Totalmente independente, framework-agnóstico, e pronto para produção.

### ✨ Características

- ✅ **100% Independente** - Não depende de nenhuma app específica
- ✅ **Multi-App Support** - Múltiplas apps podem usar simultaneamente
- ✅ **Framework Agnóstico** - SDK JavaScript puro (React, Vue, Svelte, vanilla)
- ✅ **Admin Panel** - Interface web para gerenciar campos
- ✅ **10+ Field Types** - text, select, date, file, checkbox, etc
- ✅ **Production Ready** - Rate limiting, validação, logs, segurança
- ✅ **Zero Dependencies** - Apps consumidoras não precisam instalar nada

---

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
cd services/custom-fields
npm install
```

### 2. Configurar Ambiente (opcional)

```bash
cp .env.example .env
# Edite .env se necessário
```

### 3. Iniciar Serviço

```bash
npm run dev
```

O serviço estará disponível em `http://localhost:3002`

---

## 📡 API Endpoints

### Health Check
```bash
GET http://localhost:3002/health
```

### Sections (Gerenciamento de Seções)

```bash
# Registrar seções (feito por cada app)
POST /api/sections
{
  "sections": [
    {
      "id": "user-profile",
      "name": "user_profile",
      "label": "User Profile",
      "description": "User information fields",
      "component_name": "UserProfileForm"
    }
  ]
}

# Listar seções
GET /api/sections

# Obter campos de uma seção
GET /api/forms/sections/:sectionName/fields
```

### Custom Fields

```bash
# Criar campo
POST /api/custom-fields
{
  "name": "email_address",
  "label": "Email Address",
  "type": "email",
  "form_section": "user_profile",
  "required": true,
  "placeholder": "your@email.com"
}

# Listar campos
GET /api/custom-fields?section=user_profile

# Atualizar campo
PUT /api/custom-fields/:id

# Deletar campo
DELETE /api/custom-fields/:id
```

### Values (Valores de Campos)

```bash
# Salvar valores
POST /api/forms/values
{
  "values": [
    {
      "field_id": "field-uuid",
      "analysis_id": "entity-uuid",
      "value": "john@example.com"
    }
  ]
}

# Obter valores de uma entidade
GET /api/forms/analysis/:entityId/values
```

---

## 🎯 Como Integrar em Apps NuP

### Opção 1: SDK JavaScript (Recomendado)

```html
<!-- Incluir SDK -->
<script src="http://localhost:3002/custom-fields-sdk.js"></script>

<script>
  // Inicializar SDK
  const sdk = new CustomFieldsSDK('http://localhost:3002');

  // Registrar seções da sua app
  await sdk.registerSections([
    {
      id: 'flashcard',
      name: 'flashcard_metadata',
      label: 'Flashcard Metadata',
      description: 'Campos customizáveis para flashcards'
    }
  ]);

  // Buscar campos
  const fields = await sdk.getFields('flashcard_metadata');

  // Renderizar dinamicamente
  fields.forEach(field => {
    // Criar inputs dinamicamente
  });

  // Salvar valores
  await sdk.saveValues('flashcard-123', 'flashcard_metadata', {
    'field-uuid-1': 'Valor 1',
    'field-uuid-2': 'Valor 2'
  });
</script>
```

### Opção 2: Direct HTTP Calls

```javascript
// Fetch fields
const response = await fetch('http://localhost:3002/api/forms/sections/flashcard_metadata/fields');
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

## 🎨 Field Types Suportados

| Tipo | Descrição | Validação |
|------|-----------|-----------|
| `text` | Texto simples | min/max length, pattern |
| `textarea` | Texto multilinha | min/max length |
| `number` | Numérico | min/max value, step |
| `email` | Email | Validação automática |
| `url` | URL | Validação automática |
| `date` | Data | min/max date |
| `select` | Dropdown | opções predefinidas |
| `checkbox` | Boolean | - |
| `radio` | Opções exclusivas | opções predefinidas |
| `file` | Upload | tipos aceitos |

---

## 🏗️ Arquitetura

```
services/custom-fields/
├── src/
│   ├── database/
│   │   └── init.js              # SQLite setup
│   ├── routes/
│   │   ├── customFields.js      # CRUD de campos
│   │   ├── forms.js             # Valores de formulários
│   │   ├── sections.js          # Gerenciamento de seções
│   │   └── widgets.js           # Admin panel + SDK
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── utils/
│   │   └── logger.js
│   └── server.js                # Express standalone
├── data/
│   └── custom-fields.db         # SQLite database (auto-created)
├── package.json
├── .env.example
└── README.md
```

---

## 🔐 Segurança

- ✅ **Rate Limiting**: 100 requests/15min por IP
- ✅ **Helmet.js**: Headers de segurança
- ✅ **CORS**: Configurável via env vars
- ✅ **Input Validation**: Joi schemas
- ✅ **SQL Injection**: Protected by better-sqlite3

---

## 🌍 Apps que Podem Usar

| App | Caso de Uso |
|-----|-------------|
| **NuP-Study** | Campos customizáveis em perfis de estudante, flashcards |
| **NuP-AIM** | Análises de impacto dinâmicas |
| **NuP-Chunks** | Metadata em chunks de texto |
| **NuP-KAN** | Campos em cards Kanban |
| **Qualquer App** | Formulários multi-tenant customizáveis |

---

## 📊 Admin Panel

Acesse o painel de administração em:
```
http://localhost:3002/widgets/admin
```

Permite:
- Criar/editar/deletar campos
- Organizar campos por seções
- Reordenar campos
- Ativar/desativar campos

---

## 🚢 Deploy

### Docker (Recomendado)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3002
CMD ["npm", "start"]
```

### Plataformas Suportadas

- ✅ Railway
- ✅ Fly.io
- ✅ Render
- ✅ DigitalOcean
- ✅ AWS/GCP/Azure
- ✅ Replit Deployments

---

## 🔧 Variáveis de Ambiente

```env
PORT=3002
NODE_ENV=production
ALLOWED_ORIGINS=https://nup-study.app,https://nup-aim.app
```

---

## 📖 Documentação Adicional

- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Guia completo de integração
- [QUICK_START.md](./QUICK_START.md) - Início rápido

---

## 💡 Exemplos de Uso

### NuP-Study: Flashcards Customizáveis

```javascript
await sdk.registerSections([{
  id: 'flashcard',
  name: 'flashcard_custom',
  label: 'Flashcard Custom Fields'
}]);

// Admin cria campos via Admin Panel
// Users preenchem valores dinamicamente
```

### NuP-AIM: Análises de Impacto

```javascript
await sdk.registerSections([{
  id: 'impact-analysis',
  name: 'impact_analysis',
  label: 'Impact Analysis Fields'
}]);
```

---

## 🆘 Troubleshooting

**Serviço não inicia?**
```bash
# Verifique se a porta 3002 está livre
lsof -i :3002

# Reinstale dependências
rm -rf node_modules package-lock.json
npm install
```

**CORS errors?**
```bash
# Adicione a origem da sua app no .env
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5003
```

**Database locked?**
```bash
# Remove o database e recria
rm data/custom-fields.db
npm run dev
```

---

## 📞 Support

- Health Check: http://localhost:3002/health
- Admin Panel: http://localhost:3002/widgets/admin
- API Base: http://localhost:3002/api

---

**Status**: ✅ Serviço independente pronto para produção  
**Versão**: 1.0.0  
**Licença**: MIT
