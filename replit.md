# Overview

NuP-Study is an AI-powered adaptive study management platform designed to personalize learning through deep user profiling and intelligent content delivery. It offers a comprehensive study hub featuring AI tools, flashcards, knowledge base management, and progress tracking. A standout feature is **Professor IA**, an advanced conversational AI tutor providing ultra-low latency voice interactions (<500ms) to simulate a dedicated human teacher. The platform aims to deliver a polished, professional user experience with adaptive learning strategies, enhancing learning efficiency and engagement to offer truly personalized educational journeys in the e-learning market.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## Frontend Architecture

The client utilizes React 18, TypeScript, and Vite, with `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI and Tailwind CSS for styling. Form validation is handled by React Hook Form with Zod. The UI is profile-driven with a centralized dashboard and a guided setup flow, ensuring consistency through a unified design system, supporting rich Markdown content rendering.

## Backend Architecture

The server is built with Express.js and TypeScript (ESM) and uses Drizzle ORM for type-safe PostgreSQL interactions. Replit Auth with Passport.js manages authentication, `express-session` for sessions, and Multer for file uploads. The API is RESTful with consistent error handling.

### Modular AI Pipeline

An adaptive learning AI pipeline features: `StudyContextBuilder`, `Prompt Strategies`, `AIContentPipeline`, and `QuestionGeneratorTool`.

### AI Content Validation Layer

A multi-layered pre-generation validation system (`content-validator.ts`, `semantic-analyzer.ts`, `structural-analysis`) ensures maximum content quality before AI processing, providing quality scoring, descriptive errors, and actionable suggestions in Portuguese.

### Deterministic AI Generation Cache

A production-ready caching system (`GenerationRegistry.ts`) uses SHA-256 content hashing for deterministic cache keys, a hybrid cache strategy, automatic invalidation based on content or profile changes, and TTL-based expiration. It significantly reduces OpenAI API calls (70-90% reduction) while maintaining adaptivity.

### Intelligent Auto-Categorization

A 3-phase system categorizes subjects using pattern matching, AI fallback (GPT-4o-mini), and a safe default, complemented by UX features like auto-suggestion and manual override.

### Intelligent Text Chunking System

A modular chunking infrastructure uses a Strategy Pattern with pluggable strategies like `SemanticChunkStrategy`, `SentenceAwareChunkStrategy`, and `SimpleLimitChunkStrategy`, with pre-configured profiles for various uses.

### Production RAG System (NotebookLM-Architecture)

A zero-hallucination retrieval system combines hybrid search (BM25 + Pinecone), cross-encoder reranking (GPT-4o-mini), metadata enrichment, confidence scoring with strict refusal, and prompt engineering to cite sources or state "not in materials."

### Interactive Chat Rendering System

A premium chat experience features intelligent content detection and interactive rendering. It includes a `Hierarchical Text Parser` for strict tree detection, a `Content Detection Layer` with priority systems, and interactive components like `InteractiveTable` (AG Grid) and `MindMapVisual` (React Flow) with full dark mode and responsive design.

### Document Outline Extraction (Nov 2025)

A reusable service for extracting hierarchical document structure (table of contents) from study materials. Supports granular chapter/section selection for flashcard generation, PPT creation, and other AI features.

**Architecture:**
- **DocumentOutlineExtractor**: Main service with lazy extraction + database caching at processedFile level (shared via SHA-256 deduplication)
- **Strategy Pattern**: Pluggable extraction strategies for different document types
  - `MarkdownStrategy`: Detects # headings in Markdown/TXT files
  - `AIStrategy`: GPT-4o-mini fallback for unstructured documents (PDFs, plain text)
  - Future: `PDFStrategy` (TOC extraction), `DOCXStrategy` (heading styles)

**Storage:**
- `documentOutline` (JSON): Hierarchical structure with metadata
- `outlineGeneratedAt` (timestamp): Cache invalidation tracking
- Stored at `processedFiles` level for deduplication (one extraction per unique file)

**Features:**
- Lazy extraction (on-demand, not during upload)
- Rich metadata per section: wordCount, estimatedFlashcards, startOffset, endOffset
- Supports deep hierarchies (tested up to 4 levels)
- API endpoint: `GET /api/materials/:id/outline`

**Use Cases:**
- Granular flashcard generation (select specific chapters)
- PPT generation from selected sections
- Mind Map focused on specific topics
- Study plan based on chapter structure

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores all application data, including AI-related data like learning difficulties, versioned student profiles, assistant instances, and interaction logs.

## Authentication & Authorization

Authentication uses Replit OAuth (OpenID Connect) with secure session-based authentication via HttpOnly cookies and route-level middleware. An admin system uses an `isAdmin` field and middleware.

## Voice Services (Freemium Feature)

### Traditional Voice Pipeline (Conversational Voice)

Uses a Strategy Pattern with `NativeVoiceService` (Free Tier), `DeepgramVoiceService` (Premium), and `WhisperVoiceService` (Premium - Alternative).

### Realtime Voice System (Professor IA)

A production-ready, modular architecture for ultra-low latency voice conversations, using the OpenAI Realtime API for bidirectional audio streaming (<500ms latency), multi-session support, function calling for real-time student context retrieval, and adaptive pedagogy.

### Student Profile Engine

A modular system for enriched student profiles with a 3-component design (`ProfileAnalyzer`, `ConversationTracker`, `StudentProfileService`). It uses snapshot-based processing, automatic conversation tracking with AI analysis (GPT-4o-mini), automatic profile updates, and rich metrics.

## Mind Maps System

A complete Mind Maps system with a modular architecture and RAG integration.

### Adaptive AI Generation (Profile-Aware)

Integrates `StudyContextBuilder` to load complete user profiles (difficulties, TDAH, objectives) for pedagogical adaptation (e.g., vibrant colors for ADHD, simple language for dyslexia). It ensures rich content with detailed descriptions and adaptive colors.

### Core Features

Includes `MindMapGenerator` (HybridSearchService + GPT-4o-mini), automatic material conversion, subject integration, export to SVG/PNG, and SimpleMind-inspired visual design with drag & drop and inline editing.

### SimpleMind Professional Features

Enhanced with advanced organization tools: collapse/expand branches, smart auto-collapse, free-form layout mode, outline view, and crosslinks. Supports rich content with checkboxes, custom icons/emojis, edge labels, and responsive nodes. Offers responsive layouts, multiple view modes (visual, outline, both), and a focus mode.

### Advanced Customization

A 3-level customization architecture (global, mind map specific, individual element) with 12 built-in style sheets and extensive options for node shapes, colors, borders, typography, and edge properties. Supports various color modes (type-based, level-based, branch-based, performance-based).

### Feature Module Encapsulation

The Mind Maps system is fully encapsulated within `client/src/features/mindmaps/` for isolation and easy integration.

## Monorepo Architecture (Nov 2025)

### Overview

The project is transitioning to a **modern monorepo architecture** using Turborepo and pnpm workspaces to support the NuP Ecosystem: multiple AI-powered applications that share code, deploy independently, and are modularly sellable.

### Structure

```
nup-ecosystem/
├── apps/                      # Deployable applications
│   ├── nup-study/            # Main study platform (migrated)
│   ├── nup-identify/         # Centralized auth/authorization (planned)
│   ├── nup-chunks/           # (planned)
│   ├── nup-aim/              # (planned)
│   ├── nup-kan/              # (planned)
│   └── nup-service/          # (planned)
├── packages/@nup/            # Shared code packages
│   ├── ui/                   # Design system (shadcn/ui)
│   ├── auth-client/          # Auth SDK (connects to NuP-Identify)
│   ├── api-client/           # HTTP client (TanStack Query)
│   └── shared-types/         # TypeScript types
└── features/@nup/            # Reusable features (sellable)
    ├── mindmaps/             # Mind Maps system (planned extraction)
    ├── professor-ia/         # Voice AI tutor (planned extraction)
    └── flashcards/           # Flashcard system (planned extraction)
```

### Shared Packages

**@nup/ui**: Design system with shadcn/ui components, hooks (`useToast`), and utilities (`cn()`). Ensures visual consistency across all apps.

**@nup/auth-client**: Authentication SDK with `AuthProvider`, `useAuth`, and `usePermissions` hooks. Implements granular permission system (app + feature level) connecting to NuP-Identify.

**@nup/api-client**: Configurable HTTP client with TanStack Query integration, default fetcher, and `apiRequest` helper for mutations.

**@nup/shared-types**: TypeScript types for all domain models (User, MindMap, Subject, Material, API responses) shared across apps.

### Benefits

- **Code Sharing**: Zero duplication of UI components, types, and utilities
- **Independent Deployments**: Each app deploys separately with own CI/CD
- **Modular Sales**: Features packaged as npm modules, sellable independently
- **Type Safety**: Shared types ensure consistency across frontend/backend
- **Consistent UX**: Single design system across all apps
- **Easy Integration Swapping**: Adapter pattern for STT/TTS/LLM providers
- **Developer Experience**: One repo, one install, unified tooling

### Migration Status

- **Phase**: Dual-run (legacy code + migrated code coexisting)
- **Backup**: Branch `backup/pre-monorepo-migration`, tag `v1.0-pre-monorepo`
- **Current**: Legacy code at root still in production, apps/nup-study ready for testing
- **Next**: Incremental import migration, feature extraction, deploy cutover

### Migrating Apps to Monorepo

**Quick Start:**
```bash
# Create new app structure automatically
./scripts/create-app.sh nup-nova-app 5002

# Install dependencies
pnpm install

# Run your new app
pnpm dev:nova-app
```

**Manual Migration Steps:**
1. Create app directory: `apps/nova-app/`
2. Copy existing code to appropriate directories (client/, server/, shared/)
3. Update imports to use `@nup/*` packages
4. Configure package.json, tsconfig.json, vite.config.ts
5. Add dev script to root package.json
6. Test with `pnpm dev:nova-app`

**Detailed Guide:** See `docs/MIGRAR_APPS.md` for complete migration instructions

**Helper Script:** `scripts/create-app.sh` creates boilerplate structure automatically

### NuP-Identify Integration

NuP-Identify will serve as the **centralized authentication and authorization system** for all NuP apps. It:
- Manages user accounts and sessions (OAuth, SSO)
- Controls granular feature access per app (e.g., "nup-study.mindmaps.write")
- Provides `@nup/auth-client` SDK for seamless integration
- Enables single sign-on across the ecosystem
- Supports independent app sales with feature gating

All apps will use `@nup/auth-client` to check permissions and access user context without managing auth themselves.

# External Dependencies

## Database & Storage
-   **Neon Database**: Serverless PostgreSQL.
-   **Local File Storage**: For uploaded study materials.

## Authentication Services
-   **Replit Auth**: OAuth provider.

## AI Services
-   **OpenAI API**: GPT models, Whisper, TTS.
-   **OpenRouter**: Advanced AI capabilities (DeepSeek R1).
-   **Pinecone**: Vector database for RAG.
-   **Deepgram**: Premium STT (Nova-3) and TTS (Aura).

## UI & Styling
-   **shadcn/ui**: Component library.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon library.