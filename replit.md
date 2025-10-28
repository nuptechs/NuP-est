# Overview

NuP-Study is an AI-powered adaptive study management platform designed to personalize learning experiences through deep user profiling and intelligent content delivery. It provides a comprehensive setup, an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles. The project aims for a polished, professional user experience with intuitive navigation and adaptive learning strategies, ultimately enhancing learning efficiency and engagement. The business vision is to provide a competitive edge in the e-learning market by offering a truly personalized and adaptive learning journey.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## Frontend Architecture

The client is built with React 18, TypeScript, and Vite. It utilizes `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI primitives and Tailwind CSS for styling. React Hook Form with Zod handles form validation. The UI is profile-driven, adapting to user study patterns, and features a centralized dashboard with a guided setup flow. A unified design system ensures consistency across spacing, typography, colors, and components, inspired by modern design patterns (Notion/Linear/Figma style). All 17 application pages have been redesigned for a professional user experience. Features like rich Markdown content rendering with syntax highlighting and intelligent semantic highlighting are integrated into components like Flashcards to enhance academic content presentation.

**Reusable UI Components:**
- `Hint` component (`client/src/components/ui/hint.tsx`): Encapsulated tooltip system based on Radix UI, providing accessible hints with configurable positioning, delays, and animations. Minimalista e moderno, integrado com sistema de configuração centralizado.
- Hints Configuration (`client/src/config/hints.ts`): Sistema centralizado para manter todas as mensagens de hints da aplicação, facilitando tradução, atualização e consistência.

## Backend Architecture

The server uses Express.js and TypeScript (ESM format) with Drizzle ORM for type-safe PostgreSQL interactions. Replit Auth with Passport.js manages authentication, express-session handles sessions, and multer manages file uploads. The API is RESTful with consistent error handling.

### Modular AI Pipeline Architecture (New)

**StudyContextBuilder** (`server/services/adaptive-learning/StudyContextBuilder.ts`):
- Aggregates comprehensive study context: user profile, subject (category/priority), materials, performance data, RAG chunks
- Parallel data fetching for performance optimization
- Integrates with Pinecone for RAG-enhanced content generation

**Prompt Strategies** (Category-specific pedagogical approaches):
- `ExactasPromptStrategy`: Mathematical rigor, step-by-step problem solving, formulas (Math, Physics, Chemistry)
- `HumanasPromptStrategy`: Critical analysis, interpretation, contextualization (History, Law, Philosophy)
- `BiologicasPromptStrategy`: Biological processes, systems integration, clinical reasoning (Biology, Medicine)
- Interface-based design (`IPromptStrategy`) allows A/B testing strategies without breaking production

**AIContentPipeline** (`server/services/adaptive-learning/pipeline/AIContentPipeline.ts`):
- Structured flow: Context → Strategy Selection → AI Execution → Validation → Result
- Priority-based model selection: HIGH priority → DeepSeek R1, MEDIUM/LOW → GPT-4o-mini
- Quality validation with automatic retry logic
- Telemetry and cost tracking

**QuestionGeneratorTool** (`server/services/adaptive-learning/tools/QuestionGeneratorTool.ts`):
- Implements `ToolCapability` interface for orchestration compatibility
- Generates adaptive questions using category-specific strategies
- RAG enrichment from uploaded materials
- Automatic question persistence to database
- Quality scoring and metadata tracking

**Legacy AI Services**:
Core AI services include Adaptive Assessment, Student Profile Generation, Continuous Discovery, Personalized Assistant, and Adaptive Content Delivery. Key API endpoints facilitate adaptive questions, hints, explanations, chat interactions, and assessment processing. Security features include backend-controlled assessment completion, layered Zod validation, ownership checks, and question persistence. Flashcard image uploads are handled through a dedicated authenticated endpoint, storing images locally and serving them statically. AI chat token limits have been significantly increased to support detailed academic responses.

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores user data, subjects, topics, study materials, goals, sessions, and comprehensive AI-related data including learning difficulties, versioned student profiles, assistant instances, and interaction logs. The schema supports referential integrity and versioning.

## Authentication & Authorization

Authentication is handled via Replit OAuth (OpenID Connect) using secure session-based authentication with HttpOnly cookies and route-level middleware protection.

## AI Integration

The system uses a **modular AI pipeline** with intelligent model selection:
- **DeepSeek R1** (via OpenRouter): For HIGH-priority subjects requiring advanced reasoning
- **GPT-4o-mini** (OpenAI): For MEDIUM/LOW-priority subjects, balancing speed and cost
- **Pinecone**: Vector database for RAG-enhanced content generation from uploaded materials

**Category-Aware Content Generation**:
- Subject categories (exatas/humanas/biologicas) trigger specialized prompt strategies
- Each category has domain-specific pedagogical approaches (mathematical rigor, critical analysis, biological processes)
- Priority levels (high/medium/low) influence model selection and difficulty calibration

The system can process uploaded study materials (PDF, DOC, DOCX, TXT, MD) for content generation. External service integrations are centralized with a robust `AIManager` and `PineconeClient` featuring retry mechanisms, exponential backoff, circuit breakers, and comprehensive rate limit handling.

### Intelligent Text Chunking System

**Architecture**: Modular chunking infrastructure using Strategy Pattern with pluggable strategies via `TextChunker` facade.

**Available Strategies**:
- **SemanticChunkStrategy** (`semantic`): AI-powered analysis identifies natural topic boundaries, creating self-contained chunks (200-2000 chars) with rich metadata (topic titles, keywords, academic level). **Guarantees 100% text coverage** by merging small chunks instead of discarding them. Ideal for study materials where preserving complete concepts is critical.
  - Cost: ~$0.001-0.003 per document
  - Time: ~2-8 seconds per document
  - Fallback: SentenceAwareChunkStrategy if AI fails
  
- **SentenceAwareChunkStrategy** (`sentence-aware`): Respects sentence boundaries for cleaner breaks. Used for RAG with configurable overlap (typically 200 chars for context preservation).

- **SimpleLimitChunkStrategy** (`simple-limit`): Character-based splitting with sentence fallback. Used for TTS where strict size limits apply (Deepgram: 2000 chars, Whisper: 4096 chars).

**Pre-configured Profiles**:
- `semantic-default`: Upload de materiais (2000 max, 200 min, sem overlap)
- `tts-deepgram`: Deepgram TTS (2000 chars, sem overlap, quebra em sentenças)
- `tts-whisper`: OpenAI Whisper TTS (4096 chars, sem overlap)
- `rag-default`: RAG padrão (1000 chars, overlap 200)
- `rag-chat`: Chat contextual (1200 chars, overlap 200)

**Integration Points**:
- **Material Upload** (`/api/materials/smart-upload`): Automatically uses semantic chunking via `ragService.splitIntoChunks()`
- **TTS Services**: Deepgram TTS uses `TextChunker.chunkTexts(text, 'tts-deepgram')` for unlimited text length support
- **RAG Services**: All specialized RAG services (Chat, Flashcard, Profile, Simulation) use `BaseRAGService.chunkText()` which delegates to TextChunker

**Key Files**:
- `server/services/chunking/TextChunker.ts`: Facade with strategy registration
- `server/services/chunking/strategies/SemanticChunkStrategy.ts`: AI-powered semantic analysis
- `server/services/chunking/types.ts`: Types and profile definitions
- `server/services/rag.ts`: Integration with material upload flow

## Voice Services (Freemium Feature)

**Architecture Pattern: Strategy Pattern**
- `IVoiceService` interface defines common contract for all voice implementations
- `VoiceServiceFactory` selects appropriate implementation based on user plan
- **Configuration**: Centralized in `client/src/services/voice/config.ts` for easy provider switching

**Implementations:**

1. **NativeVoiceService** (Free Tier - 🆓 Básico):
   - Uses browser Web Speech API
   - **Pros**: Free, low latency, streaming transcription
   - **Cons**: Chrome/Edge only, quality varies, Google server dependency
   - **Use cases**: Prototyping, basic voice input for free users

2. **DeepgramVoiceService** (Premium - ⚡ **CURRENT**):
   - **STT**: Deepgram Nova-3 ($0.0043/min) - 99% accuracy, <300ms latency
   - **TTS**: Deepgram Aura - natural voice synthesis
   - **Pros**: Best cost-benefit (40% cheaper than OpenAI), ultra-low latency (<300ms vs 2-4s), billing per second
   - **Cons**: Limited TTS voices compared to OpenAI
   - **Backend Routes**: 
     - `POST /api/voice/transcribe-deepgram` - Audio → Text
     - `POST /api/voice/synthesize-deepgram` - Text → Audio (2000 char limit)

3. **WhisperVoiceService** (Premium - ⭐ Alternative):
   - **STT**: OpenAI Whisper API ($0.006/min) - superior accuracy (~99%)
   - **TTS**: OpenAI TTS API ($0.015/1K chars) - 6 natural voices
   - **Pros**: Cross-browser, multilingual (50+ languages), professional quality, more voice options
   - **Cons**: Higher latency (~2-4s), more expensive
   - **Backend Routes**: 
     - `POST /api/voice/transcribe` - Audio → Text (25MB limit)
     - `POST /api/voice/synthesize` - Text → Audio (4096 char limit)

**Quick Provider Switch:**
Edit `client/src/services/voice/config.ts` → change `premiumProvider: 'deepgram'` to `'whisper'`

**Integration:**
- `VoiceToggle` component in AssistantChat shows tier indicator (Básico 🆓 / Premium ⭐)
- `SpeakButton` component in AI messages enables listening to responses (TTS)
- Transcribed text auto-populates message input
- Error handling with user-friendly feedback
- Automatic cleanup of temporary audio files

**TTS Features:**
- **Modo Básico 🆓**: Uses browser speechSynthesis API (plays directly, no audio download)
- **Modo Premium ⭐**: Uses OpenAI TTS API (generates high-quality MP3, requires credits)
- Button appears on hover over AI messages
- Visual feedback during generation (loading spinner)
- Pause/resume controls for playback

**Security:**
- API keys secured in backend only
- Audio uploads validated (format, size limits)
- Authentication required for all voice endpoints
- Premium enforcement prepared (commented TODOs for future activation)

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