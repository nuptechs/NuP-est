# Overview

NuP-Study is an AI-powered adaptive study management platform that personalizes learning through deep user profiling and intelligent content delivery. It offers a comprehensive setup, an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles. The platform features **Professor IA**, an advanced conversational AI tutor with ultra-low latency voice interactions (<500ms) that creates the experience of learning from a dedicated human teacher. The project aims for a polished, professional user experience with adaptive learning strategies to enhance learning efficiency and engagement. The business vision is to provide a competitive edge in the e-learning market by offering a truly personalized and adaptive learning journey.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## Frontend Architecture

The client is built with React 18, TypeScript, and Vite, utilizing `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI primitives and Tailwind CSS for styling. React Hook Form with Zod handles form validation. The UI is profile-driven and features a centralized dashboard with a guided setup flow. A unified design system ensures consistency, inspired by modern design patterns. Features include rich Markdown content rendering with syntax highlighting.

## Backend Architecture

The server uses Express.js and TypeScript (ESM format) with Drizzle ORM for type-safe PostgreSQL interactions. Replit Auth with Passport.js manages authentication, express-session handles sessions, and multer manages file uploads. The API is RESTful with consistent error handling.

### Modular AI Pipeline Architecture

The system employs a modular AI pipeline for adaptive learning, featuring:
-   **StudyContextBuilder**: Aggregates user profile, subject, materials, performance data, and RAG chunks.
-   **Prompt Strategies**: Category-specific pedagogical approaches (`ExactasPromptStrategy`, `HumanasPromptStrategy`, `BiologicasPromptStrategy`).
-   **AIContentPipeline**: Manages content generation flow from context to AI execution, with priority-based model selection (DeepSeek R1 for HIGH priority, GPT-4o-mini for MEDIUM/LOW).
-   **QuestionGeneratorTool**: Generates adaptive questions using category-specific strategies and RAG enrichment.

### Intelligent Auto-Categorization

A 3-phase system categorizes subjects:
1.  **Pattern Matching**: Static keyword mapping for common subjects.
2.  **AI Fallback (GPT-4o-mini)**: Analyzes unknown subjects and suggests categories with confidence.
3.  **Safe Default**: Defaults to "humanas" if AI categorization fails.
This system includes UX features like auto-suggestion with debounce, visual feedback, and manual override.

### Intelligent Text Chunking System

A modular chunking infrastructure uses a Strategy Pattern with pluggable strategies via a `TextChunker` facade.
-   **SemanticChunkStrategy**: Hierarchical AI-powered analysis to identify natural topic boundaries, ensuring 100% text coverage and semantic completeness, with rich metadata.
-   **SentenceAwareChunkStrategy**: Respects sentence boundaries for cleaner breaks, used for RAG.
-   **SimpleLimitChunkStrategy**: Character-based splitting with sentence fallback, used for TTS.
Pre-configured profiles exist for material upload, TTS services, and RAG.

### Production RAG System (NotebookLM-Architecture)
**Zero-hallucination retrieval system** inspired by Google's NotebookLM:

#### Hybrid Search (Semantic + BM25)
-   **BM25Service**: Keyword-based sparse retrieval for exact term matching
-   **Semantic Search**: Dense vector embeddings via Pinecone for context understanding
-   **Weighted Fusion**: Combines semantic (60%) + keyword (40%) scores for optimal precision/recall
-   **Why Hybrid**: Solves semantic-only failures when query terms differ from content terminology

#### Cross-Encoder Reranking
-   **RerankingService**: LLM-based post-retrieval scoring for final ranking
-   **Relevance Scoring**: GPT-4o-mini evaluates query-document pairs with 0-1 scores
-   **Why Reranking**: Improves precision by 15-30% over embedding similarity alone

#### Metadata Enrichment
-   **Keyword Extraction**: Auto-generates 15 keywords per chunk during indexation
-   **Section Preservation**: Maintains document structure metadata (sectionTitle, partNumber)
-   **Source Attribution**: Complete provenance tracking for citations
-   **Stored in Pinecone**: Keywords, materialId, title, category, jobId, partId

#### Confidence Scoring & Strict Refusal
-   **4-Level Scoring**: none/low/medium/high based on result quality + quantity
-   **Threshold-Based Refusal**: Automatically refuses when confidence=none
-   **Explicit Fallback**: Lists available topics when query not found in materials
-   **Why Critical**: Prevents hallucinations by forcing AI to admit lack of knowledge

#### Prompt Engineering
-   **Strict RAG Prompt**: Forces AI to cite sources explicitly or state "not in materials"
-   **Zero Hallucination**: Prohibits use of external knowledge, speculation, or invention
-   **Confidence Integration**: Includes score in prompt for AI awareness of result quality
-   **Citation Enforcement**: Requires "Segundo o Trecho X..." format for all claims

#### Two-Mode Chat Behavior
-   **Subject selected**: Hybrid search → reranking → strict prompt → cited responses
-   **No subject**: General conversational assistant (personality-driven)

#### Technical Stack
-   **Retrieval**: Hybrid (BM25 + Semantic) → Top-K=10, minSimilarity=0.65
-   **Reranking**: LLM-based relevance scoring (batch mode for efficiency)
-   **Indexation**: Semantic chunking + keyword extraction + enriched metadata
-   **Confidence**: Multi-factor scoring (avg similarity * 0.7 + count factor * 0.3)

Key files:
- `server/services/SubjectRAGService.ts` - RAG orchestrator with confidence scoring
- `server/services/rag/HybridSearchService.ts` - Hybrid retrieval engine
- `server/services/rag/BM25Service.ts` - Keyword-based sparse retrieval
- `server/services/rag/RerankingService.ts` - LLM-based reranking
- `server/services/pinecone.ts` - Vector store with enriched metadata
- `server/services/large-document-processing/LargeMaterialProcessor.ts` - Keyword extraction during indexation
- `server/routes.ts` (line ~2810) - Chat endpoint with RAG/general mode switching

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores all application data, including comprehensive AI-related data such as learning difficulties, versioned student profiles, assistant instances, and interaction logs.

## Authentication & Authorization

Authentication is handled via Replit OAuth (OpenID Connect) using secure session-based authentication with HttpOnly cookies and route-level middleware protection.

### Admin System (Temporary)
**Basic admin authorization** implemented with `isAdmin` middleware:
-   **Field**: `users.isAdmin` (boolean, default: false) - marks admin users
-   **Middleware**: `isAdmin` in `server/replitAuth.ts` - validates admin status for protected routes
-   **Protected endpoints**: All `/api/admin/*` routes require admin privileges
-   **Security**: Admin endpoints now protected against horizontal privilege escalation
-   **Future**: Will be replaced by NuPtechs central system for centralized user management, authentication, and feature authorization

### Configurable Auto-Refresh System
**Per-user profile refresh configuration**:
-   **Field**: `users.autoRefreshInterval` (integer, default: 60000ms) - controls profile refresh frequency
-   **Admin interface**: AdminProfiles page includes slider control for per-user configuration
-   **Self-access endpoint**: `/api/users/:userId` - users can only access their own data
-   **Admin endpoints**: `/api/admin/users/:userId` (read), `/api/admin/users/:userId/config` (write)
-   **Validation**: Enforces 5s-5min interval range to prevent abuse

## Voice Services (Freemium Feature)

### Traditional Voice Pipeline (Conversational Voice)
An architecture using the Strategy Pattern provides voice services:
-   **NativeVoiceService (Free Tier)**: Uses browser Web Speech API for basic functionality.
-   **DeepgramVoiceService (Premium)**: Utilizes Deepgram Nova-3 for STT and OpenAI TTS for responses (~2-3s latency).
-   **WhisperVoiceService (Premium - Alternative)**: Uses OpenAI Whisper API for STT and OpenAI TTS API for superior accuracy.

### Realtime Voice System (Professor IA - Phase 1 Completed)
**Production-ready modular architecture** for ultra-low latency voice conversations:
-   **Architecture**: Provider-agnostic design using Strategy Pattern - swap providers with 1 line of code
-   **OpenAI Realtime API**: Native bidirectional audio streaming with <500ms latency
-   **Multi-session support**: Isolated providers per session, supports multiple simultaneous students
-   **Function Calling**: Real-time student context retrieval (profile, subject knowledge, learning history)
-   **Error handling**: Robust cleanup prevents memory leaks, production-ready
-   **Adaptive pedagogy**: Automatically adjusts teaching style based on student profile (ADHD, dislexia, learning objectives)
-   **Cost**: ~$0.24/min (vs $0.18/min traditional, but 5x lower latency and natural interruptions)

Key files:
- `server/services/realtime-voice/RealtimeVoiceService.ts` - Orchestrator
- `server/services/realtime-voice/providers/OpenAIRealtimeProvider.ts` - OpenAI implementation
- `server/services/realtime-voice/providers/IRealtimeVoiceProvider.ts` - Provider interface
- `server/services/realtime-voice/functions/getStudentContext.ts` - Function calling (uses Student Profile Engine)
- `server/services/realtime-voice/functions/endConversation.ts` - Autonomous conversation ending
- `server/routes/realtimeVoice.ts` - WebSocket routes
- `server/services/realtime-voice/README.md` - Complete documentation

### Student Profile Engine (Production-Ready)
**Modular system for enriched student profiles** with pre-processed data to avoid expensive API calls during voice sessions:
-   **Architecture**: 3-component modular design - ProfileAnalyzer (metrics/evolution), ConversationTracker (AI-powered conversation analysis), StudentProfileService (orchestrator/façade)
-   **Snapshot-based**: Data is processed in background and saved as snapshots; reading is instantaneous (10-50ms vs 500-2000ms processing)
-   **Automatic conversation tracking**: 
    -   Both voice systems (Realtime & Conversational) track sessions automatically on disconnect
    -   AI analysis with GPT-4o-mini extracts topics/concepts/understanding/sentiment
    -   Fire-and-forget pattern: saves conversations without blocking session closure
-   **Automatic profile updates**: Non-blocking updates triggered by:
    -   Question attempts (after each answer submission)
    -   Study session completion (after marking session as complete)
    -   Voice conversations (after saving conversation summary)
-   **Rich metrics**: Overall accuracy, study hours, weekly/monthly progress, improvement trends, strong/weak subjects, current focus
-   **Behavioral patterns**: Study streak, preferred study time, average session duration, engagement level
-   **AI-generated recommendations**: Next topics, recommended actions, motivational messages
-   **Integration**: Professor IA's get_student_context() fetches enriched profile instantly during real-time voice
-   **Admin tools**: Backfill endpoint to process all users, refresh endpoint for single user, view endpoint for enriched profiles

Database tables:
- `student_profiles_enriched` - Enriched profile snapshots (updated in background)
- `conversation_summaries` - Full conversation analysis with AI insights
- `profile_metrics` - Detailed metrics by category/period (reserved for future)

Key files:
- `server/services/student-profile-engine/StudentProfileService.ts` - Public interface/orchestrator
- `server/services/student-profile-engine/ProfileAnalyzer.ts` - Metrics & evolution analysis
- `server/services/student-profile-engine/ConversationTracker.ts` - AI conversation analysis
- `server/services/student-profile-engine/types.ts` - TypeScript interfaces
- `server/routes/admin.ts` - Admin endpoints for profile management
- `server/services/student-profile-engine/README.md` - Complete documentation

# External Dependencies

## Database & Storage
-   **Neon Database**: Serverless PostgreSQL for production.
-   **Local File Storage**: For uploaded study materials.

## Authentication Services
-   **Replit Auth**: OAuth provider using OpenID Connect.

## AI Services
-   **OpenAI API**: For GPT model integration and Whisper/TTS.
-   **OpenRouter**: For advanced AI capabilities (DeepSeek R1).
-   **Pinecone**: Vector database for RAG-enhanced content generation.
-   **Deepgram**: For premium STT (Nova-3) and TTS (Aura) services.

## UI & Styling
-   **shadcn/ui**: Component library.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Radix UI**: Accessible component primitives.
-   **Lucide React**: Icon library.