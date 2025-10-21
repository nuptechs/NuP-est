# Overview

NuP-est is an AI-powered adaptive study management platform that creates personalized learning experiences through deep user profiling and intelligent content delivery. The system guides users through a comprehensive setup process and provides an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles. The project aims to offer a polished, professional user experience with a focus on intuitive navigation and adaptive learning strategies.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## Frontend Architecture

The client is built with **React 18** and **TypeScript**, using **Vite** as the build tool. It uses `wouter` for routing, **TanStack Query (React Query)** for server state management, and **shadcn/ui** with **Radix UI** primitives and **Tailwind CSS** for styling. **React Hook Form** with **Zod** handles form validation. The UI is profile-driven and adapts to user study patterns, featuring a centralized dashboard with a guided setup flow. A ClickUp-inspired modernization provides a consistent, modern visual design across all pages, including dark mode support and optimized responsive layouts.

## Backend Architecture

The server is built with **Express.js** and **TypeScript** in ESM format. It uses **Drizzle ORM** for type-safe PostgreSQL database interactions and **Replit Auth** with Passport.js for authentication. **express-session** with **connect-pg-simple** manages sessions, and **multer** handles file uploads. The API is RESTful with consistent error handling. 

**Core AI Services (Phase 3 Complete):**
1. **AdaptiveAssessmentService** - IRT-based question selection with ability estimation, optimal difficulty targeting, and zero-attempt guards
2. **StudentProfileGenerator** - Analyzes assessments/interactions to create versioned student profiles with categorical-to-numeric mapping and behavioral analysis
3. **ContinuousDiscoveryService** - Real-time interaction tracking with topic discovery, numeric engagement/comprehension parsing, and automatic profile updates
4. **PersonalizedAssistantCore** - Context management with short/long-term memory systems, session state tracking, and profile-aware adaptations
5. **AdaptiveContentDelivery** - AI-powered content generation with profile-aware questions, progressive hints (4 levels), personalized explanations, and safe difficulty adaptation

All services integrate with AIManager using proper AIRequest/AIResponse types, include Portuguese language support, handle edge cases (zero division, null values), and are architect-approved for production.

**AI Assistant API Endpoints (Phase 4 Complete):**
1. **POST /api/assistant/question** - Generate adaptive questions with profile-aware difficulty
2. **POST /api/assistant/hint** - Progressive hint system with 4 levels (Note: currently uses placeholder hint history, future enhancement needed for persisted hints)
3. **POST /api/assistant/explanation** - Personalized explanations adapted to learning profile
4. **POST /api/assistant/chat** - Conversational assistant with context management, saves user and AI messages to chatMessages table
5. **GET /api/assistant/:id/messages** - Retrieve chat history with pagination (default 100 messages)
6. **POST /api/profile/interaction** - Log interactions and trigger profile updates
7. **POST /api/assessment/adaptive** - Start adaptive assessments with IRT-based question selection

All endpoints include authentication, ownership verification, Zod validation, and consistent error handling. Questions are persisted with database-generated IDs for hint/explanation tracking. Chat messages are persisted with full conversation history.

**Frontend Integration (Phase 5 Complete):**
1. **usePersonalizedAssistant hook** - Auto-fetches/creates assistant and profile, provides mutations for configuration
2. **PersonalizedAssistantPage (Redesigned October 2025)** - Modern sidebar-based layout with:
   - **Sidebar (320px)**: Assistant header with gradient icon, subject/topic selectors with uppercase labels, vertical navigation (Chat, Questions, Assessment, Profile), contextual footer hints
   - **Main Content Area**: Clean header with title/description/badges, full-height content rendering, contextual empty states
   - **Mobile Responsive**: Toggle button with smooth slide-in/out animations, auto-close after navigation, dark backdrop overlay
   - **Smart Navigation**: Chat and Profile always available, Questions/Assessment disabled without subject selection with visual hints
   - **Modern UX**: Inspired by Notion/Linear/Figma - generous spacing, clear hierarchy, gradient accents, subtle backgrounds, no "AI-generated" appearance
3. **AdaptiveQuestions component** - Full question flow with progressive 4-level hints, answer submission, explanations, statistics tracking. Enhanced timeout handling with visual timer (shows after 10s, warning after 30s).
4. **AdaptiveAssessment component** - IRT-based adaptive assessment with real-time ability estimation, results with strengths/weaknesses/strategies
5. **AssistantChat component** - Real-time chat interface with markdown rendering, context-aware responses, persistent message history. Uses singleton queryClient with shared queryKey for reliable cache invalidation.
6. **StudentProfileView component** - Comprehensive profile visualization with cognitive abilities, learning style, study patterns

All components include proper data-testid attributes, error handling, loading states, and integrate seamlessly with Phase 4 backend endpoints.

## Data Architecture

The project uses a **PostgreSQL** database managed by **Drizzle ORM**. The schema includes tables for users, subjects, topics, study materials, goals, study sessions, and AI-related data (questions, attempts). A key feature is the comprehensive schema for the personalized AI teaching assistant, including tables for learning difficulties, versioned student learning profiles, personalized assistant instances, teaching strategies, adaptive assessments, and detailed interaction logs. This schema supports referential integrity, junction tables for many-to-many relationships, and versioning for student profiles.

## Authentication & Authorization

Authentication is handled via **Replit OAuth** (OpenID Connect). The system uses secure session-based authentication with HttpOnly cookies and route-level middleware protection for API endpoints. User context is automatically injected into authenticated requests.

## AI Integration

The system integrates **OpenRouter** (DeepSeek R1 model) for advanced AI capabilities. AI interactions are profile-aware, adapting to user study profiles (disciplined, undisciplined, average). Key AI features include context-aware question generation, intelligent hints, personalized feedback, adaptive difficulty for questions and content, and smart recommendations for study strategies. The system processes uploaded study materials (PDF, DOC, DOCX, TXT, MD) to generate relevant content and questions.

**Integration Architecture (October 2025 - REFACTORED):**

All external service integrations are now centralized in `server/integrations/`:
```
server/integrations/
├── openai/           # ✅ MIGRADO - OpenAI/OpenRouter/DeepSeek
├── document-ai/      # 🚧 Estrutura criada
├── pinecone/         # 🚧 Estrutura criada
└── README.md         # Documentação completa de gaps
```

**OpenAI/OpenRouter Integration:**
- ✅ **AIClient** centralizado com retry/timeout/logging
- ✅ Usado por: OpenRouterProvider, DeepSeekService, SmartSummaryService, AIService
- ✅ Benefícios: Retry exponencial (1s→2s→4s), timeout 45s, logging detalhado
- ✅ Zero dependências diretas em services
- 📝 **Gaps Documentados**: Ver `server/integrations/README.md`

**Known Limitations:**
- AI provider response times can be 15-30s for complex requests (OpenRouter latency with retry mechanism: timeout 45s + exponential backoff 1s→2s→4s)
- Hint endpoint uses placeholder previousHints array (future enhancement: persist hints in assistant_memory or interaction_logs)
- Timeout pode exceder 45s em requests muito complexos
- Retry exponencial pode ser insuficiente para rate limits intensos

**Production Readiness (October 2025):**
- ✅ Gap #1 Chat Persistence: Full implementation with chatMessages table, GET/POST endpoints, persistent conversation history
- ✅ Gap #2 AI Timeouts: 45s timeout + retry with exponential backoff, visual loading timers (10s/30s warnings)
- ✅ Gap #3 Migration Script: Idempotent script `scripts/migrate-learning-difficulties.ts` ready for production deployment
- ✅ Gap #4 Integration Architecture: Todas as integrações externas centralizadas em `server/integrations/`, gaps documentados
- ✅ UX Improvements: Chat/Profile tabs always accessible, Questions/Assessment require subject selection
- ✅ UI Redesign (October 2025): PersonalizedAssistantPage completely redesigned with modern sidebar layout, responsive mobile support, clean visual hierarchy
- ⚠️ Manual Testing Required: E2E playwright tests blocked by OIDC mock authentication (browser testing recommended)

# External Dependencies

## Database & Storage
- **Neon Database**: Serverless PostgreSQL for production.
- **Local File Storage**: For uploaded study materials.

## Authentication Services
- **Replit Auth**: OAuth provider using OpenID Connect.

## AI Services
- **OpenAI API**: For GPT model integration in question generation and content analysis.
- **OpenRouter**: For advanced AI capabilities.

## UI & Styling
- **shadcn/ui**: Component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.

## Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: For full-stack type safety.
- **Replit Integration**: For development environment optimization.