# NuP_AIM Custom Fields Microservice

Microserviço independente para gerenciar campos personalizados do sistema NuP_AIM.

## 🚀 Funcionalidades

- **Gerenciamento de Campos Personalizados**: Criar, editar, excluir e reordenar campos customizados
- **Múltiplos Tipos de Campo**: text, textarea, number, date, select, checkbox, radio, file, email, url
- **Validação Flexível**: Regras de validação personalizáveis por campo
- **Organização por Seções**: Campos organizados por seções do formulário
- **Valores por Análise**: Armazenamento de valores específicos para cada análise
- **API RESTful**: Interface completa para integração com o NuP_AIM

## 📋 Tipos de Campo Suportados

| Tipo | Descrição | Opções Extras |
|------|-----------|---------------|
| `text` | Campo de texto simples | placeholder, validação de tamanho |
| `textarea` | Área de texto multilinha | placeholder, validação de tamanho |
| `number` | Campo numérico | min, max, step |
| `date` | Seletor de data | min, max |
| `select` | Lista suspensa | opções predefinidas |
| `checkbox` | Caixa de seleção | valor padrão |
| `radio` | Botões de opção | opções predefinidas |
| `file` | Upload de arquivo | tipos aceitos |
| `email` | Campo de email | validação automática |
| `url` | Campo de URL | validação automática |

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação
```bash
cd custom-fields-service
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

O serviço estará disponível em `http://localhost:3001`

## 📡 API Endpoints

### Custom Fields

#### Listar Campos
```http
GET /api/custom-fields
GET /api/custom-fields?section=basic_info
GET /api/custom-fields?active_only=false
```

#### Obter Campo Específico
```http
GET /api/custom-fields/:id
```

#### Criar Campo
```http
POST /api/custom-fields
Content-Type: application/json

{
  "name": "campo_personalizado",
  "label": "Campo Personalizado",
  "type": "text",
  "required": true,
  "placeholder": "Digite aqui...",
  "form_section": "basic_info",
  "validation_rules": "{\"min_length\": 3}",
  "order_index": 0
}
```

#### Atualizar Campo
```http
PUT /api/custom-fields/:id
Content-Type: application/json

{
  "label": "Novo Label",
  "required": false
}
```

#### Excluir Campo
```http
DELETE /api/custom-fields/:id
```

#### Reordenar Campos
```http
POST /api/custom-fields/reorder
Content-Type: application/json

{
  "fields": [
    {"id": "field1"},
    {"id": "field2"},
    {"id": "field3"}
  ]
}
```

### Form Sections

#### Listar Seções
```http
GET /api/forms/sections
```

#### Campos de uma Seção
```http
GET /api/forms/sections/:section/fields
```

### Field Values

#### Obter Valores de uma Análise
```http
GET /api/forms/analysis/:analysisId/values
```

#### Salvar Valores
```http
POST /api/forms/values
Content-Type: application/json

{
  "values": [
    {
      "field_id": "field-uuid",
      "analysis_id": "analysis-uuid",
      "value": "valor do campo"
    }
  ]
}
```

#### Atualizar Valor Específico
```http
PUT /api/forms/values/:id
Content-Type: application/json

{
  "value": "novo valor"
}
```

#### Excluir Valores de uma Análise
```http
DELETE /api/forms/analysis/:analysisId/values
```

#### Exportar Dados de uma Análise
```http
GET /api/forms/export/:analysisId
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,https://nup-aim.netlify.app
```

### Banco de Dados

O serviço usa SQLite para simplicidade e portabilidade. O banco é criado automaticamente em `data/custom-fields.db`.

## 🏗️ Arquitetura

```
custom-fields-service/
├── src/
│   ├── database/
│   │   └── init.js          # Inicialização do banco
│   ├── routes/
│   │   ├── customFields.js  # Rotas para campos
│   │   └── forms.js         # Rotas para formulários
│   ├── middleware/
│   │   └── errorHandler.js  # Tratamento de erros
│   ├── utils/
│   │   └── logger.js        # Sistema de logs
│   └── server.js            # Servidor principal
├── data/                    # Banco de dados SQLite
├── package.json
└── README.md
```

## 🔗 Integração com NuP_AIM

### 1. Configurar URL do Microserviço

No NuP_AIM, adicione a URL do microserviço:

```javascript
// src/config/customFields.js
export const CUSTOM_FIELDS_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://custom-fields-api.seu-dominio.com'
  : 'http://localhost:3001';
```

### 2. Cliente API

```javascript
// src/services/customFieldsApi.js
class CustomFieldsAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async getFieldsBySection(section) {
    const response = await fetch(`${this.baseURL}/api/forms/sections/${section}/fields`);
    return response.json();
  }

  async saveFieldValues(values) {
    const response = await fetch(`${this.baseURL}/api/forms/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });
    return response.json();
  }
}
```

### 3. Componente de Campo Dinâmico

```jsx
// src/components/DynamicField.jsx
const DynamicField = ({ field, value, onChange }) => {
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.required}
          >
            <option value="">Selecione...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      // ... outros tipos
    }
  };

  return (
    <div className="field-container">
      <label>{field.label}</label>
      {renderField()}
    </div>
  );
};
```

## 🔒 Segurança

- Rate limiting configurado (100 requests/15min por IP)
- Helmet.js para headers de segurança
- Validação rigorosa de entrada com Joi
- CORS configurado para domínios específicos
- Logs detalhados para auditoria

## 📈 Monitoramento

### Health Check
```http
GET /health
```

Retorna:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-12T10:30:00.000Z",
  "service": "NuP_AIM Custom Fields Service",
  "version": "1.0.0"
}
```

### Logs

O serviço gera logs estruturados para:
- Criação/edição/exclusão de campos
- Salvamento de valores
- Erros e exceções
- Requests de API

## 🚀 Deploy

### Docker (Recomendado)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3001
CMD ["npm", "start"]
```

### Netlify Functions

O microserviço pode ser adaptado para rodar como Netlify Functions para integração mais próxima com o NuP_AIM.

## 📝 Exemplos de Uso

### Criar Campo de Observações
```bash
curl -X POST http://localhost:3001/api/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "observacoes_adicionais",
    "label": "Observações Adicionais",
    "type": "textarea",
    "required": false,
    "placeholder": "Digite observações relevantes...",
    "form_section": "conclusions"
  }'
```

### Criar Campo de Prioridade
```bash
curl -X POST http://localhost:3001/api/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prioridade",
    "label": "Prioridade do Projeto",
    "type": "select",
    "required": true,
    "form_section": "basic_info",
    "options": "[{\"value\":\"baixa\",\"label\":\"Baixa\"},{\"value\":\"media\",\"label\":\"Média\"},{\"value\":\"alta\",\"label\":\"Alta\"},{\"value\":\"critica\",\"label\":\"Crítica\"}]"
  }'
```

### Salvar Valores de Campos
```bash
curl -X POST http://localhost:3001/api/forms/values \
  -H "Content-Type: application/json" \
  -d '{
    "values": [
      {
        "field_id": "campo-uuid-1",
        "analysis_id": "analise-uuid-1",
        "value": "Observações importantes sobre o projeto"
      },
      {
        "field_id": "campo-uuid-2", 
        "analysis_id": "analise-uuid-1",
        "value": "alta"
      }
    ]
  }'
```

Este microserviço fornece uma base sólida e extensível para adicionar campos personalizados ao NuP_AIM, mantendo a separação de responsabilidades e permitindo evolução independente das funcionalidades.