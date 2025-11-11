# NuPIdentity - Central de Identidade NuPtechs

## Overview

NuPIdentity is a centralized Identity and Access Management (IAM) platform for the NuPtechs ecosystem. It provides Single Sign-On (SSO), multi-tenant organization management, team collaboration, centralized authentication, and enterprise-grade permission management for all NuPtechs systems (e.g., NuP-Kan, NuP-CRM, NuP-ERP).

The platform centralizes the management of users, organizations, teams, permissions, and service accounts. External systems integrate by submitting their `permissions.json` via API and validate user authentication through NuPIdentity's REST endpoints. A core architectural principle is that the `identity_users` table is exclusive to NuPIdentity, serving as the single source of truth for all user identities across the NuPtechs suite.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Wouter for routing, TanStack Query for server state, React Hook Form with Zod for forms, Radix UI primitives with shadcn/ui components, and Tailwind CSS v3 for styling. Vite handles the build process, including a custom SSR setup for development. This stack emphasizes a modern, type-safe development experience with a focus on minimal bundle size and efficient data fetching.

**User Safety Features:**
- **Delete Confirmations:** All destructive actions (delete organization, delete team, cancel invitation) require explicit user confirmation via AlertDialog before execution
- **Clear Messaging:** Confirmation dialogs display the exact entity name and warn that actions are irreversible
- **Consistent Styling:** Destructive actions use red color scheme to indicate danger

**Design System (NuP-Kan Compatible):**
- **Typography:** Inter font family from Google Fonts with ligatures and alternative characters enabled
- **Primary Color:** Indigo/Purple (#6366F1) with full HSL-based color system
- **Border Radius:** 0.75rem (12px) applied consistently across all components (rounded-xl in Tailwind)
- **Dark Mode:** Full dark mode support with localStorage persistence and smooth transitions
- **Sidebar:** Custom color scheme with accent highlights and hover states
- **Components:** All UI components (Button, Card, Input, etc.) use rounded-xl borders and transition-all animations
- **Gradients:** Subtle accent-based gradients for backgrounds and hero sections

### Technical Implementations
The backend is built with Node.js and TypeScript, using Express.js for the HTTP server. Authentication is JWT-based, utilizing short-lived access tokens and longer-lived refresh tokens for security and user experience. Password hashing is handled by `bcryptjs`. The API follows a RESTful design with consistent error handling.

Data storage is managed by PostgreSQL (targeting Neon serverless) with Drizzle ORM for type-safe queries and Drizzle Kit for schema migrations. The database schema supports multi-tenancy, hierarchical organizations, teams, granular permissions, and enterprise features like delegated administration and service accounts across 19 tables. Key tables include `identity_users` (core identity), `organizations` (multi-tenancy), `teams`, `identity_profiles` (permission groups), and `identity_refresh_tokens`.

Authentication mechanisms include email/password, JWT tokens, and readiness for OAuth (Google, GitHub, etc.) and WebAuthn/Passkeys.

### Feature Specifications

**API Architecture:**
- **Authentication Endpoints (`/api/auth`):** Registration, login, token refresh, logout, and current user profile retrieval.
- **Validation Endpoints (`/api/validate`):** JWT token validation and specific user permission checks for external systems.
- **System Management (`/api/systems`):** Listing systems, retrieving system details, syncing functions from `permissions.json`, and listing system functions.
- **Organization Management (`/api/organizations`):** Full CRUD operations for organizations, including managing system access.
- **Team Management (`/api/teams`):** Full CRUD operations for teams, including member management.
- **Invitation Management (`/api/invitations`):** Creating, accepting, and canceling user invitations.
- **Webhook Management (`/api/webhooks`):** Event tracking, retry mechanism, and webhook delivery status monitoring.

**Permission System:**
Permissions are resolved hierarchically: User Overrides (highest priority), Team Profiles, User Profiles, and Global Profiles. This system supports multi-tenancy, scoped overrides (global, organization, team-specific), team-based and profile-based permissions, and individual user overrides with reasoning. External systems define their functions in `permissions.json` which are then synced with NuPIdentity.

**Enterprise Features:**
- **Multi-Tenancy:** Hierarchical organizations, isolation, and system access control.
- **Team Collaboration:** Teams within organizations, roles, and team-level permission profiles.
- **Delegated Administration:** Scoped administrative permissions (organization/team level) with audit trails.
- **User Invitations:** Token-based, email-centric invitation system with pre-assignment capabilities.
- **Service Accounts:** System-to-system authentication via API keys with granular permissions and activity tracking.
- **Webhook System:** Real-time event notifications for permissions changes, with automatic retry logic and delivery tracking.

## Integration Resources

- **INTEGRATION.md:** Complete integration guide for external systems
- **INTEGRATION_QUICKSTART.md:** Quick start guide (10 minutes to integrate)
- **DEPLOY.md:** Production deployment guide with troubleshooting
- **examples/:** Reference implementation scripts for Node.js/Express integration
  - `sync-permissions.js`: Automated permissions.json synchronization
  - `middleware-auth.js`: Authentication and authorization middleware
  - `express-integration.js`: Full Express.js integration example
- **Webhook Events:** Real-time notifications via HTTP callbacks when permissions change

## Deployment Configuration

- **Type:** Autoscale (production deployment)
- **Build Command:** `npm ci` (installs production dependencies)
- **Run Command:** `npm start` → `tsx server/index.ts` (production server)
- **Health Check:** `GET /api/health` (monitoring endpoint)
- **Secrets Required:** DATABASE_URL (auto-configured), JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET

### Deployment Status (October 25, 2025)

**PROBLEMA IDENTIFICADO E RESOLVIDO:**
- O deployment estava falhando na etapa "Promote" (após Provision/Build/Bundle)
- **Causa raiz 1:** `tsx` estava em devDependencies - Movido para dependencies (✅ CORRIGIDO)
- **Causa raiz 2:** npm start executava `tsx server/index.ts` diretamente, mas arquivos TS podem não estar no deployment
- **Solução final:** npm start agora executa `node index.js`, que usa tsx para executar server/index.ts (✅ APLICADA)
- **Bonus:** Criado .gitignore apropriado para garantir que arquivos TypeScript sejam incluídos no deployment

**PRÓXIMOS PASSOS QUANDO VOLTAR:**
1. Ir para a aba "Deploy" no Replit
2. Clicar em "Republish" ou "Deploy"
3. Adicionar 3 Environment Variables em "Advanced settings" → "Environment variables":
   ```
   JWT_SECRET=1bb4ab0f60b628b9e57f2a295c54ea384062754dcdc550a684e8b10596caaa15
   JWT_REFRESH_SECRET=370922b7cb007ad93ec90233b01d76e01c5bb2c8e4185466a4e4546a25f36cab
   SESSION_SECRET=b7f6be418114d9b00a68b100e06bc891a22fb1e9c7237b052dd60c5e3824cd1d
   ```
4. Clicar em "Deploy" e aguardar 3-5 minutos
5. Após deploy bem-sucedido, acessar https://nupidentify.replit.app
6. Criar primeiro usuário admin (admin@nuptechs.com)
7. Copiar Access Token em Settings para integrar com outros sistemas

**STATUS ATUAL:**
- ✅ Código corrigido (tsx em dependencies)
- ✅ Git sincronizado
- ✅ Banco de dados pronto (20 tabelas)
- ✅ Servidor de desenvolvimento funcionando
- ⏳ PENDENTE: Adicionar environment variables e fazer deploy

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL.
- **@neondatabase/serverless**: PostgreSQL driver for HTTP-based connections.

### Authentication Libraries
- **jsonwebtoken**: For JWT creation and verification.
- **bcryptjs**: For password hashing.
- **express-session**: For session management in OAuth flows.
- **@simplewebauthn/server** & **@simplewebauthn/browser**: For WebAuthn/Passkey support.

### Frontend UI Libraries
- **Radix UI**: Headless UI components.
- **Lucide React**: Icon library.
- **TanStack Query**: Data fetching and caching.
- **React Hook Form**: Form state management.
- **Zod**: Runtime validation and TypeScript schema inference.

### Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database migrations.
- **tsx**: TypeScript execution for Node.js.

### Third-Party Integrations (Configured)
- **Replit OAuth**: Client ID and secret configuration present.
- **OpenID Client**: OAuth 2.0/OIDC client library.