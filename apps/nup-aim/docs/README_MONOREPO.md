# NuP-AIM - Impact Analysis Generator

**App migrada com sucesso para o monorepo NuP!** 🎉

## 📋 Sobre a App

**NuP-AIM** (Análise de Impacto de Mudanças) é um sistema completo para geração e gerenciamento de análises de impacto de projetos, com:

- ✅ Frontend React + Vite (porta 5003)
- ✅ Backend Express + Drizzle ORM (porta 3001)
- ✅ Autenticação JWT
- ✅ Integração com Google Vision API
- ✅ Exportação de documentos (DOCX)
- ✅ Custom Fields dinâmicos
- ✅ Supabase integration

## 🚀 Como Rodar

### Desenvolvimento

```bash
# Na raiz do monorepo
cd apps/nup-aim

# Instalar dependências (se necessário)
pnpm install

# Rodar frontend + backend juntos
pnpm dev

# Ou rodar separadamente:
pnpm dev:client  # Frontend na porta 5003
pnpm dev:server  # Backend na porta 3001
```

### Acessar a App

- **Frontend**: http://localhost:5003
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📦 Build

```bash
pnpm build
```

## 🔧 Estrutura

```
apps/nup-aim/
├── src/                      # Frontend React
│   ├── components/          # Componentes React
│   ├── contexts/            # Contexts (Auth, Themes)
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Libs (Supabase, API client)
│   ├── services/            # Services
│   ├── utils/               # Utilit\u00e1rios
│   └── App.tsx              # App principal
├── server/                  # Backend Express
│   ├── db.ts               # Conex\u00e3o banco
│   ├── schema.ts           # Schemas Drizzle
│   └── index.ts            # Servidor Express
├── custom-fields-service/   # Servi\u00e7o de campos customiz\u00e1veis
├── field-extraction-api/    # API de extra\u00e7\u00e3o de campos
├── vision-service/          # Servi\u00e7o Google Vision
├── supabase/               # Configs e migra\u00e7\u00f5es Supabase
└── docs/                   # Documenta\u00e7\u00e3o

```

## 🔐 Vari\u00e1veis de Ambiente

Crie um arquivo `.env` em `apps/nup-aim/`:

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# Google Cloud Vision
GOOGLE_CLOUD_VISION_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# Supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...

# Email (SendGrid)
SENDGRID_API_KEY=...
FROM_EMAIL=noreply@example.com

# Frontend
VITE_API_URL=http://localhost:3001
```

## 📚 Depend\u00eancias Principais

### Frontend
- React 18
- Vite
- TailwindCSS
- Lucide React (ícones)
- React Query

### Backend
- Express
- Drizzle ORM
- PostgreSQL
- JWT
- Bcrypt
- Google Cloud Vision
- Supabase Client

## 🎯 Pr\u00f3ximos Passos (Migra\u00e7\u00e3o Completa para Monorepo)

Para integrar melhor com o ecossistema NuP, considere:

1. **Usar @nup/ui** para componentes UI compartilhados
2. **Usar @nup/auth-client** para autentica\u00e7\u00e3o unificada
3. **Usar @nup/api-client** para HTTP client compartilhado
4. **Usar @nup/shared-types** para types compartilhados

### Exemplo de Migra\u00e7\u00e3o Incremental

```typescript
// Antes
import { Button } from './components/ui/button';

// Depois (quando migrar)
import { Button } from '@nup/ui';
```

## 📖 Documenta\u00e7\u00e3o Adicional

Veja os arquivos de documenta\u00e7\u00e3o na pasta raiz:
- `INTEGRATION_GUIDE.md`
- `CUSTOM_FIELDS_IMPLEMENTATION.md`
- `CONFIGURACAO_GOOGLE_CLOUD_VISION.md`
- `INSTRUCOES_SUPABASE.md`

## 🐛 Troubleshooting

### Porta 5003 em uso
```bash
# Mude a porta no vite.config.ts
server: {
  port: 5004  // Nova porta
}
```

### Erro de conex\u00e3o com banco
- Verifique se DATABASE_URL est\u00e1 configurado
- Rode as migra\u00e7\u00f5es se necess\u00e1rio

### Backend n\u00e3o inicia
- Verifique se a porta 3001 est\u00e1 dispon\u00edvel
- Confira as vari\u00e1veis de ambiente

## 💡 Dicas

- Use `pnpm dev` para rodar frontend e backend juntos
- Logs do backend aparecem no terminal
- Frontend tem hot-reload autom\u00e1tico
- API endpoints est\u00e3o em `http://localhost:3001/api/*`

---

**Status**: ✅ App migrada e configurada no monorepo
**Porta Frontend**: 5003
**Porta Backend**: 3001
**Pr\u00f3ximo**: Instalar depend\u00eancias e testar
