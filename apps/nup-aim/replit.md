# NuP_AIM - Sistema de Análise de Impacto

## Overview

NuP_AIM é um sistema completo para criação e gerenciamento de análises de impacto empresarial. O sistema permite que usuários autenticados criem, editem e exportem documentos de análise estruturados, incluindo funcionalidades avançadas como extração de campos via OCR/IA e verificação de email. A aplicação foi desenvolvida como uma Single Page Application (SPA) em React com TypeScript, integrando-se com diversos serviços externos para funcionalidades específicas.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Technology Stack**: React 18 + TypeScript + Vite + Tailwind CSS
- **Component Structure**: Baseado em componentes funcionais React com hooks customizados
- **State Management**: Context API para autenticação e estado global, React hooks para estado local
- **Routing**: SPA sem roteamento explícito, navegação baseada em estado de componentes
- **UI Framework**: Tailwind CSS para estilização, componentes Lucide React para ícones

### Authentication & Authorization System
**Hybrid Authentication**: O sistema implementa autenticação híbrida com fallback
- **Primary**: Supabase Authentication com verificação de email
- **Fallback**: Local storage authentication para desenvolvimento
- **Session Management**: Timeout automático de 30 minutos com monitoramento de atividade
- **Permissions**: Sistema granular baseado em perfis (Administrador/Usuário Padrão)
- **Security Features**: Row Level Security (RLS), rate limiting, CORS protection

### Data Storage Solutions
**Multi-tier Storage Strategy**:
- **Primary Database**: Supabase (PostgreSQL) para dados de produção
- **Local Storage**: Browser localStorage como fallback e cache
- **File Storage**: Base64 encoding para imagens inline nos documentos
- **Export Format**: Microsoft Word (.docx) via docx library

### Backend Architecture
**Microservices & Serverless Approach**:
- **Netlify Functions**: Serverless functions para processamento de email e OCR
- **Custom Fields Microservice**: Sistema independente de campos personalizados (porta 3002)
  - Framework-agnostic SDK JavaScript para integração
  - Admin panel completo para gestão de campos
  - SQLite storage para campos e valores
  - Suporta 10+ tipos de campo (text, textarea, number, date, select, checkbox, etc)
  - Drag & drop para reordenação de campos
  - React hooks para fácil integração
- **Field extraction API**: Gemini AI para extração inteligente de campos de imagens
- **Express.js Server**: Backend opcional com Drizzle ORM para desenvolvimento local
- **API Design**: RESTful endpoints com middleware para CORS, helmet, rate limiting

### Data Models
**Core Entities (PostgreSQL)**:
- **Users**: Gerenciamento de usuários com verificação de email
- **Profiles**: Sistema de perfis com permissões granulares
- **Projects**: Organização por projetos com flags de padrão
- **Analyses**: Documentos de análise estruturados com versionamento
- **Processes/Impacts/Risks/Mitigations/Conclusions**: Entidades relacionadas para análise completa
- **Custom Field Values**: Valores dos campos personalizados por análise

**Custom Fields Entities (SQLite - Microservice)**:
- **Form Sections**: Seções/páginas da aplicação registradas para customização
- **Custom Fields**: Definições de campos personalizados por seção
- **Custom Field Values**: Valores salvos dos campos customizados
- **Field Validations**: Regras de validação para campos

## External Dependencies

### Database & Authentication
- **Supabase**: PostgreSQL database, authentication, Row Level Security
- **Configuration**: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

### Email Services
- **SendGrid**: Transactional email service para verificação de usuários
- **Integration**: Via Netlify Functions com sender verification
- **Configuration**: SENDGRID_API_KEY, VERIFIED_SENDER_EMAIL

### OCR & Field Extraction
- **Google Cloud Vision API**: Optical Character Recognition para extração de texto
- **Configuration**: GOOGLE_APPLICATION_CREDENTIALS_JSON com service account
- **Fallback**: Regex-based field extraction quando API não disponível

### Deployment & Hosting
- **Primary**: Netlify for static hosting com serverless functions
- **Development**: Vite dev server com proxy para APIs locais
- **Build**: Vite build com otimizações para produção

### Document Processing
- **docx Library**: Geração de documentos Microsoft Word
- **file-saver**: Download de arquivos no browser
- **Base64 Encoding**: Para armazenamento de imagens inline

### Security & Performance
- **bcryptjs**: Hash de senhas (em desenvolvimento local)
- **jsonwebtoken**: JWT tokens para sessões
- **cors**: Cross-Origin Resource Sharing
- **helmet**: Security headers
- **express-rate-limit**: Rate limiting para APIs

### Development Tools
- **TypeScript**: Type safety e desenvolvimento
- **ESLint**: Code linting e quality
- **Tailwind CSS**: Utility-first styling
- **Vite**: Build tool e desenvolvimento server
- **UUID**: Geração de identificadores únicos
- **Drizzle ORM**: Type-safe database queries para PostgreSQL

## Custom Fields Microservice

### Arquitetura
O microserviço de campos personalizados é completamente independente e reutilizável para qualquer aplicação.

**Localização**: `custom-fields-service/`
**Porta Interna**: 3002 (proxied via porta 5000)
**Database**: SQLite (independente do PostgreSQL principal)

### Proxy Configuration
Para garantir compatibilidade com o ambiente Replit e acesso via browser, implementamos um sistema de proxy no backend Express (server/index.ts):

**Proxy de API** (`/api/custom-fields-proxy/*`):
- Frontend faz requisições para `/api/custom-fields-proxy/*`
- Backend faz proxy para `http://localhost:3002/api/*`
- Suporta todos os métodos HTTP (GET, POST, PUT, DELETE)
- Headers JSON automáticos

**Proxy de Widgets** (`/custom-fields-admin/*`):
- Frontend acessa admin panel via `/custom-fields-admin/admin`
- Backend faz proxy para `http://localhost:3002/widgets/*`
- Suporta HTML, CSS, JavaScript e outros assets
- Content-Type detection automático

### Recursos
- **JavaScript SDK**: Biblioteca client-side framework-agnostic (integrado via hook)
- **React Integration**: Hook `useCustomFields` com state management completo
- **Admin Panel**: Interface web para gestão (via proxy: `/custom-fields-admin/admin`)
- **Demo Page**: Exemplos de integração (via proxy: `/custom-fields-admin/demo`)
- **API REST**: Endpoints completos para CRUD de campos e valores

### Integração no NuP_AIM
```typescript
// 1. Hook integrado no frontend
import { useCustomFields } from '@/hooks/useCustomFields';

// 2. Usar no componente
const { fields, values, loading, updateValue } = useCustomFields('basic_info', analysisId);

// 3. Renderizar campos dinâmicos
<CustomFieldsSection
  sectionName="basic_info"
  analysisId={analysisId}
  initialValues={storedValues}
  onValuesChange={(values) => handleFieldsChange(values)}
/>
```

### URLs Importantes
- **Main App**: http://0.0.0.0:5000 (porta exposta publicamente)
- **Admin Panel**: http://0.0.0.0:5000/custom-fields-admin/admin (via proxy)
- **Microservice Direct** (interno): http://localhost:3002 (não acessível externamente)
- **API Health Check**: http://localhost:3002/health (interno)
- **Quick Start**: `custom-fields-service/QUICK_START.md`
- **Integration Guide**: `custom-fields-service/INTEGRATION_GUIDE.md`

### Estado Atual (Nov 2025)
✅ **Integração Completa e Funcional**:
- 6 seções registradas automaticamente (basic_info, scope, impacts, risks, mitigations, conclusions)
- Persistência dupla: localStorage + microservice API
- Proteção contra race conditions em troca de análises
- Admin panel acessível via menu do usuário
- Degradação graceful para modo offline
- Feedback de erros detalhado para o usuário
- Zero data contamination entre análises
- Zero data loss em qualquer cenário