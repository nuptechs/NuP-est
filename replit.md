# Overview

NuP-est is an AI-powered adaptive study management platform designed to personalize learning experiences through deep user profiling and intelligent content delivery. It provides a comprehensive setup, an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles. The project aims for a polished, professional user experience with intuitive navigation and adaptive learning strategies, ultimately enhancing learning efficiency and engagement.

# Recent Changes (October 2025)

**COMPREHENSIVE UX/UI REDESIGN COMPLETED**

All 9 core pages redesigned following modern design patterns (Notion/Linear/Figma style):

1. **Dashboard** (10+ cards → 4 stat cards): Clean KPI header, unified command bar, consistent Lucide icons
2. **Library** (793→340 lines, 57% reduction): 2-level navigation (Study Area → Material), unified create/edit modal, hierarchical query invalidation
3. **Personalized Assistant** (371→230 lines, 38% reduction): Clean sidebar navigation, lazy-loaded modules, focus on Chat
4. **Flashcards** (773→480 lines, 38% reduction): Unified wizard (3 methods), simplified study view, deck-centric navigation
5. **Goals** (819→350 lines, 57% reduction): Timeline layout, inline-editable targets, single CTA, sidebar stats
6. **Study** (321→280 lines, 13% reduction): Quick-start cards, collapsible advanced filters, robust empty states
7. **Analytics** (330 lines): KPI header, 2-column charts, **persistent period filter** (localStorage), filtered sessions table
8. **Topics** (456 lines): **Master-detail layout** with sticky drawer, 2-step create/edit modal, clean CRUD flows
9. **Landing** (124 lines): Modern hero, social proof, personas highlight

**Key Improvements:**
- ~40% overall code reduction (~3,500 → 2,100 lines)
- 100% adoption of UnifiedShell pattern
- Centralized design system (`design-system.ts`)
- Consistent spacing, typography, colors
- All pages use ModernPageHeader, ModernStatCard, ModernEmptyState
- Mobile-responsive layouts throughout
- All data-testids preserved for testing

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## Frontend Architecture

The client is built with React 18, TypeScript, and Vite. It utilizes `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI primitives and Tailwind CSS for styling. React Hook Form with Zod handles form validation. The UI is profile-driven, adapting to user study patterns, and features a centralized dashboard with a guided setup flow. A unified design system ensures consistency across spacing, typography, colors, and components.

## Backend Architecture

The server uses Express.js and TypeScript (ESM format) with Drizzle ORM for type-safe PostgreSQL interactions. Replit Auth with Passport.js manages authentication, express-session handles sessions, and multer manages file uploads. The API is RESTful with consistent error handling.

**Core AI Services:**
-   **AdaptiveAssessmentService**: IRT-based question selection and ability estimation.
-   **StudentProfileGenerator**: Analyzes interactions to create versioned student profiles.
-   **ContinuousDiscoveryService**: Tracks interactions, discovers topics, and updates profiles in real-time.
-   **PersonalizedAssistantCore**: Manages context, short/long-term memory, and session state for profile-aware adaptations.
-   **AdaptiveContentDelivery**: Generates AI-powered content, progressive hints, and personalized explanations.

**Key API Endpoints:**
-   `/api/assistant/question`: Generates adaptive questions.
-   `/api/assistant/hint`: Provides progressive hints.
-   `/api/assistant/explanation`: Delivers personalized explanations.
-   `/api/assistant/chat`: Manages conversational AI interactions.
-   `/api/assessment/adaptive`: Initiates adaptive assessments.
-   `/api/assessment/submit-answer`: Processes assessment answers and estimates ability.

Security features include backend-controlled assessment completion, layered Zod validation, ownership checks, and question persistence.

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores user data, subjects, topics, study materials, goals, sessions, and comprehensive AI-related data including learning difficulties, versioned student profiles, assistant instances, and interaction logs. The schema supports referential integrity and versioning.

## Authentication & Authorization

Authentication is handled via Replit OAuth (OpenID Connect) using secure session-based authentication with HttpOnly cookies and route-level middleware protection.

## AI Integration

The system integrates OpenRouter (DeepSeek R1 model) for advanced, profile-aware AI capabilities. This includes context-aware question generation, intelligent hints, personalized feedback, adaptive difficulty, and smart recommendations. The system can process uploaded study materials (PDF, DOC, DOCX, TXT, MD) for content generation.

**Integration Architecture:**
External service integrations are centralized, featuring a robust `AIClient` with retry mechanisms, exponential backoff, circuit breakers with half-open enforcement, and comprehensive rate limit handling for OpenAI/OpenRouter. The `PineconeClient` supports optimized batch upserts, retry logic, and namespace handling for vector database operations.

# External Dependencies

## Database & Storage
-   **Neon Database**: Serverless PostgreSQL for production.
-   **Local File Storage**: For uploaded study materials.

## Authentication Services
-   **Replit Auth**: OAuth provider using OpenID Connect.

## AI Services
-   **OpenAI API**: For GPT model integration.
-   **OpenRouter**: For advanced AI capabilities.

## UI & Styling
-   **shadcn/ui**: Component library.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon library.

## Development Tools
-   **Vite**: Build tool and development server.
-   **TypeScript**: For full-stack type safety.
-   **Replit Integration**: For development environment optimization.