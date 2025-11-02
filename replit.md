# Overview

NuP-Study is an AI-powered adaptive study management platform that personalizes learning through deep user profiling and intelligent content delivery. It offers a comprehensive study hub with AI tools, flashcards, knowledge base management, and progress tracking. A key feature is **Professor IA**, an advanced conversational AI tutor with ultra-low latency voice interactions (<500ms), simulating a dedicated human teacher. The platform aims to provide a polished, professional user experience with adaptive learning strategies to enhance learning efficiency and engagement, offering truly personalized and adaptive learning journeys in the e-learning market.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## Frontend Architecture

The client uses React 18, TypeScript, and Vite, with `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI and Tailwind CSS for styling. Form validation is handled by React Hook Form with Zod. The UI is profile-driven with a centralized dashboard and a guided setup flow, ensuring consistency through a unified design system, supporting rich Markdown content rendering.

## Backend Architecture

The server is built with Express.js and TypeScript (ESM) and uses Drizzle ORM for type-safe PostgreSQL interactions. Replit Auth with Passport.js manages authentication, `express-session` for sessions, and Multer for file uploads. The API is RESTful with consistent error handling.

### Modular AI Pipeline

An adaptive learning AI pipeline features:
-   **StudyContextBuilder**: Aggregates user profile, subject, materials, performance, and RAG chunks.
-   **Prompt Strategies**: Category-specific pedagogical approaches.
-   **AIContentPipeline**: Manages content generation using priority-based model selection.
-   **QuestionGeneratorTool**: Generates adaptive questions using category-specific strategies and RAG.

### AI Content Validation Layer

A pre-generation validation system ensures content quality before AI processing:
-   **ContentValidator**: Modular validator with configurable thresholds and metrics.
-   **Quality Checks**: Validates quantity (min nodes/cards), text richness, concept diversity, and structural integrity.
-   **Descriptive Errors**: Provides actionable Portuguese error messages with specific improvement suggestions.
-   **Metrics Tracking**: Logs content metrics (text length, unique concepts, node distribution) for debugging.
-   **Integration**: Non-invasive layer in flashcard-generator and mindmap-generator services.
-   **Configurable Thresholds**: Adjustable validation rules via `updateValidationConfig()` helper.

### Intelligent Auto-Categorization

A 3-phase system categorizes subjects using pattern matching, AI fallback (GPT-4o-mini), and a safe default. It includes UX features like auto-suggestion, visual feedback, and manual override.

### Intelligent Text Chunking System

A modular chunking infrastructure uses a Strategy Pattern with pluggable strategies like `SemanticChunkStrategy`, `SentenceAwareChunkStrategy`, and `SimpleLimitChunkStrategy`. Pre-configured profiles exist for material upload, TTS, and RAG.

### Production RAG System (NotebookLM-Architecture)

A zero-hallucination retrieval system inspired by Google's NotebookLM:
-   **Hybrid Search**: Combines BM25 and Semantic Search (Pinecone) with weighted fusion.
-   **Cross-Encoder Reranking**: LLM-based post-retrieval scoring using GPT-4o-mini.
-   **Metadata Enrichment**: Auto-generates keywords, preserves document structure, and tracks source attribution.
-   **Confidence Scoring & Strict Refusal**: 4-level scoring with threshold-based refusal to prevent hallucinations, explicitly listing available topics when a query is not found.
-   **Prompt Engineering**: Strict RAG prompt forces AI to cite sources or state "not in materials," prohibiting external knowledge.
-   **Two-Mode Chat Behavior**: Contextual chat based on subject selection.

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores all application data, including AI-related data like learning difficulties, versioned student profiles, assistant instances, and interaction logs.

## Authentication & Authorization

Authentication uses Replit OAuth (OpenID Connect) with secure session-based authentication via HttpOnly cookies and route-level middleware. An admin system uses an `isAdmin` field and middleware to protect admin routes. A configurable auto-refresh system allows per-user profile refresh frequency.

## Voice Services (Freemium Feature)

### Traditional Voice Pipeline (Conversational Voice)

Uses a Strategy Pattern for voice services:
-   **NativeVoiceService (Free Tier)**: Browser Web Speech API.
-   **DeepgramVoiceService (Premium)**: Deepgram Nova-3 for STT, OpenAI TTS for responses.
-   **WhisperVoiceService (Premium - Alternative)**: OpenAI Whisper API for STT, OpenAI TTS API.

### Realtime Voice System (Professor IA)

A production-ready, modular architecture for ultra-low latency voice conversations:
-   **Architecture**: Provider-agnostic design using Strategy Pattern.
-   **OpenAI Realtime API**: Native bidirectional audio streaming with <500ms latency.
-   **Multi-session support**: Isolated providers per session.
-   **Function Calling**: Real-time student context retrieval.
-   **Adaptive pedagogy**: Automatically adjusts teaching style based on student profile.

### Student Profile Engine

A modular system for enriched student profiles:
-   **Architecture**: 3-component design: ProfileAnalyzer, ConversationTracker, StudentProfileService.
-   **Snapshot-based**: Data processed in background and saved as snapshots.
-   **Automatic conversation tracking**: Both voice systems track sessions, with AI analysis (GPT-4o-mini) extracting topics, concepts, understanding, and sentiment.
-   **Automatic profile updates**: Non-blocking updates triggered by question attempts, study session completion, and voice conversations.
-   **Rich metrics**: Overall accuracy, study hours, progress trends, strong/weak subjects, behavioral patterns, and AI-generated recommendations.
-   **Integration**: Professor IA fetches enriched profiles instantly during real-time voice.

## Mind Maps System

A complete Mind Maps system with a modular architecture and RAG integration. It features a `MindMapGenerator` (HybridSearchService + GPT-4o-mini), automatic material conversion to mind maps, adaptive learning colors for nodes, subject integration, and export to SVG/PNG. The UX is refined with drag & drop, inline editing, handle-based connections, keyboard shortcuts, and a SimpleMind-inspired visual design for a clean, minimal interface.

### Advanced Customization

A 3-level customization architecture: global style sheets, mind map specific overrides, and individual element styles. Includes 12 built-in style sheets and extensive customization options for node shapes, colors, borders, typography, and edge properties. Supports various color modes (type-based, level-based, branch-based, performance-based) with automatic hierarchy calculation. UI components facilitate style selection, and state is managed with Zustand, ensuring robust style application with fallbacks.

### Feature Module Encapsulation

The Mind Maps system is fully encapsulated within `client/src/features/mindmaps/`, following a professional feature-based architecture for isolation, easy integration, and removal.

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