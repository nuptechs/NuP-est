# Overview

**easy-nup** is a modern monorepo containing multiple AI-powered educational applications. The flagship app, **NuP-Study**, is an adaptive study management platform that personalizes learning through deep user profiling and intelligent content delivery. It provides a comprehensive study hub with AI tools, flashcards, knowledge base management, and progress tracking. A key feature is **Professor IA**, an advanced conversational AI tutor offering ultra-low latency voice interactions (<500ms) to simulate a human teacher.

The easy-nup monorepo uses a modern architecture with Turborepo and pnpm workspaces to support a scalable ecosystem of multiple, independently deployable, and modularly sellable AI-powered applications. All apps share a single PostgreSQL database with isolated schemas for logical separation.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## System Design and Workflows

The system features a scalable workflow architecture for managing multiple applications simultaneously, including centralized logging, automatic discovery, and resource control. This uses a `workflows-config.json` as a single source of truth for app registration, ports, and commands, generated via `manage-workflows.js` scripts.

## Deployment Architecture: Multi-Repl Gateway

The project uses a **Multi-Repl Gateway Architecture** for production deployment, separating concerns and enabling independent scaling:

```
┌─────────────────────────────────────┐
│   Gateway Repl (apps/gateway)       │
│   - Reverse proxy                   │
│   - Health checks                   │
│   - TLS termination                 │
│   - Centralized logging             │
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

**Benefits:**
- ✅ Independent deployment per app (no cascading failures)
- ✅ Horizontal scalability (each app scales independently)
- ✅ Better observability (isolated logs per service)
- ✅ Reduced coupling (single responsibility per Repl)
- ✅ Independent CI/CD pipelines

**Gateway Routes:**
- `/` → NuP-Study (main application)
- `/nup-identify/*` → NuP-Identify (auth service)
- `/nup-aim/*` → NuP-AIM (analysis service)

**Health Checks:**
- Gateway: `/health` and `/health/services`
- Each app: `/api/health`

**Migration:** See `MULTI_REPL_MIGRATION.md` and `DEPLOYMENT_GUIDE.md` for detailed migration and deployment instructions.

## Monorepo Architecture (easy-nup)

The easy-nup monorepo is structured using Turborepo and pnpm workspaces. It consists of:
- `apps/`: Deployable applications like `nup-study`, `nup-aim`, and planned `nup-identify`, `nup-chunks`, `nup-kan`, `nup-service`.
- `packages/@nup/`: Shared code packages including `ui` (shadcn/ui), `auth-client` (for NuP-Identify), `api-client` (TanStack Query), and `shared-types`.
- `features/@nup/`: Reusable, sellable features like `mindmaps`, `professor-ia`, and `flashcards`.
This structure promotes code sharing, independent deployments, modular sales, type safety, and consistent UX. NuP-Identify is planned as a centralized authentication and authorization system across all NuP apps.

## Frontend Architecture

The client is built with React 18, TypeScript, and Vite. It uses `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI and Tailwind CSS for styling. Form validation is handled by React Hook Form with Zod. The UI emphasizes a profile-driven dashboard, guided setup, and a unified design system.

## Backend Architecture

The server uses Express.js and TypeScript (ESM) with Drizzle ORM for type-safe PostgreSQL interactions. Authentication is managed via Replit Auth with Passport.js and `express-session`. File uploads use Multer. The API is RESTful with consistent error handling.

## Core Features and AI Pipeline

- **Modular AI Pipeline**: Includes `StudyContextBuilder`, `Prompt Strategies`, `AIContentPipeline`, and `QuestionGeneratorTool`.
- **AI Content Validation Layer**: A multi-layered pre-generation validation system (`content-validator.ts`, `semantic-analyzer.ts`, `structural-analysis`) ensures content quality, providing scores, errors, and suggestions in Portuguese.
- **Deterministic AI Generation Cache**: A production-ready caching system (`GenerationRegistry.ts`) uses SHA-256 hashing, a hybrid cache strategy, and automatic invalidation to reduce OpenAI API calls significantly while maintaining adaptivity.
- **Intelligent Auto-Categorization**: A 3-phase system categorizes subjects using pattern matching, AI fallback (GPT-4o-mini), and a safe default.
- **Intelligent Text Chunking System**: A modular infrastructure using a Strategy Pattern with pluggable strategies like `SemanticChunkStrategy`, `SentenceAwareChunkStrategy`, and `SimpleLimitChunkStrategy`.
- **Production RAG System**: A zero-hallucination retrieval system combining hybrid search (BM25 + Pinecone), cross-encoder reranking (GPT-4o-mini), metadata enrichment, confidence scoring, and prompt engineering.
- **Interactive Chat Rendering System**: A premium chat experience with intelligent content detection and interactive rendering, featuring a `Hierarchical Text Parser`, `Content Detection Layer`, and interactive components like `InteractiveTable` (AG Grid) and `MindMapVisual` (React Flow).
- **Document Outline Extraction**: A reusable service for extracting hierarchical document structure from study materials, supporting granular selection for AI features, using a Strategy Pattern for different document types and lazy extraction with database caching.

## Data Architecture

### Database Schema Strategy

The monorepo uses a **shared PostgreSQL database with isolated schemas** approach:

```
PostgreSQL Database (Neon)
├── Schema: nup_identify (21 tabelas)
│   └── Tabelas de identidade, usuários, organizações, permissões
├── Schema: nup_study (50 tabelas)
│   └── Tabelas de materiais, flashcards, mind maps, AI, perfis de alunos
└── Schema: nup_aim (futuro)
    └── Tabelas de análise de impacto
```

**Benefits:**
- **Logical Isolation:** Each app has its own namespace, preventing table name conflicts
- **Cost Efficient:** 1 PostgreSQL database vs 3 separate databases (~70% cost savings on Replit)
- **Easy Development:** Single DATABASE_URL, simplified local development
- **Future Flexibility:** Can migrate to separate databases when needed (1-2 hour migration)

**Implementation:**
- Each app uses `pgSchema("schema_name")` in Drizzle ORM
- Example: `const studySchema = pgSchema("nup_study");`
- Tables: `studySchema.table("users", {...})`
- Enums are schema-scoped to avoid conflicts: `studySchema.enum("enum_name", [...])`
- Session storage configured with `schemaName` option for connect-pg-simple

**Migration Path:**
The system was designed to easily migrate from schemas to separate databases:
1. Export schema: `pg_dump -n nup_study > backup.sql`
2. Create new database for the app
3. Import: `psql $NEW_DB_URL < backup.sql`
4. Update connection string in app config
5. Zero code changes required

A PostgreSQL database managed by Drizzle ORM stores all application data, including AI-related data, versioned student profiles, assistant instances, and interaction logs.

## Authentication & Authorization

Authentication utilizes Replit OAuth (OpenID Connect) with secure session-based authentication via HttpOnly cookies and route-level middleware. An admin system uses an `isAdmin` field and middleware for authorization.

## Voice Services

- **Traditional Voice Pipeline**: Uses a Strategy Pattern with `NativeVoiceService`, `DeepgramVoiceService`, and `WhisperVoiceService`.
- **Realtime Voice System (Professor IA)**: A modular architecture for ultra-low latency voice conversations using the OpenAI Realtime API for bidirectional audio streaming, multi-session support, function calling, and adaptive pedagogy.
- **Student Profile Engine**: A modular system for enriched student profiles with `ProfileAnalyzer`, `ConversationTracker`, and `StudentProfileService`, featuring snapshot-based processing and AI analysis for automatic updates and rich metrics.

## Mind Maps System

A complete Mind Maps system with modular architecture and RAG integration.
- **Adaptive AI Generation**: Integrates `StudyContextBuilder` to adapt mind map generation based on user profiles (e.g., learning difficulties, objectives) for pedagogical adaptation.
- **Core Features**: Includes `MindMapGenerator` (HybridSearchService + GPT-4o-mini), automatic material conversion, subject integration, export to SVG/PNG, and SimpleMind-inspired visual design.
- **Professional Features**: Enhanced with organization tools (collapse/expand, auto-collapse, free-form layout, outline view, crosslinks), rich content support (checkboxes, icons, edge labels), and multiple view modes.
- **Advanced Customization**: A 3-level customization architecture (global, mind map specific, element-specific) with built-in style sheets and extensive options for visual properties and color modes.
- **Encapsulation**: Fully encapsulated within `client/src/features/mindmaps/`.

# External Dependencies

## Database & Storage
- **Neon Database**: Serverless PostgreSQL.
- **Local File Storage**: For uploaded study materials.

## Authentication Services
- **Replit Auth**: OAuth provider.

## AI Services
- **OpenAI API**: GPT models, Whisper, TTS.
- **OpenRouter**: Advanced AI capabilities (DeepSeek R1).
- **Pinecone**: Vector database for RAG.
- **Deepgram**: Premium STT (Nova-3) and TTS (Aura).

## UI & Styling
- **shadcn/ui**: Component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.