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

### AI Content Validation Layer (Enhanced)

A multi-layered pre-generation validation system ensures maximum content quality before AI processing:

**Core Validation (content-validator.ts)**:
-   **Modular Validator**: Supports mind maps, flashcards, and quiz content with type-specific rules.
-   **Configurable Thresholds**: Adjustable validation rules via `updateValidationConfig()` for all content types.
-   **Quality Scoring**: 0-100 score with minimum thresholds (30 for maps/flashcards, 35 for quizzes).
-   **Descriptive Errors**: Actionable Portuguese error messages with specific improvement suggestions.
-   **Integration**: Non-invasive layer in flashcard-generator, mindmap-generator, and quiz services.

**Semantic Analysis (semantic-analyzer.ts)**:
-   **Stopword Filtering**: Portuguese stopwords removed for meaningful concept extraction.
-   **Generic Concept Detection**: Flags vague terms ("coisa", "tipo", "elemento") for replacement.
-   **Quality Metrics**: Concept diversity, vocabulary richness, text complexity, average concept length.
-   **Automatic Suggestions**: Context-aware improvement tips based on analysis results.
-   **Performance**: Linear-time scans optimized for typical payload sizes.

**Structural Analysis**:
-   **Orphaned Nodes Detection**: Identifies disconnected nodes in mind maps.
-   **Duplicate Edge Detection**: Finds redundant connections in graph structures.
-   **Depth Calculation**: Measures hierarchy depth via BFS traversal.
-   **Component Analysis**: Tracks disconnected graph components.

**Validation Outputs**:
-   **ValidationResult**: isValid, error, details, qualityScore, suggestions, semanticAnalysis, structuralAnalysis.
-   **Rich Metrics**: Logs all analysis data for debugging and continuous improvement.
-   **User-Friendly**: All messages in Portuguese with actionable next steps.

### Deterministic AI Generation Cache

A production-ready caching system ensures consistency and reduces API costs for AI-generated content:

**Architecture (GenerationRegistry.ts)**:
-   **SHA-256 Content Hashing**: Deterministic cache keys from canonicalized input (content + profile snapshot + parameters)
-   **Hybrid Cache Strategy**: Same input + same profile = identical output every time
-   **Automatic Invalidation**: Cache cleared when source content (deck/material) or user profile changes
-   **TTL-based Expiration**: 30-day default with automatic cleanup of expired entries
-   **Usage Tracking**: Counts cache hits, generation time, token costs for analytics

**Database Schema (ai_generations)**:
-   Stores: inputHash, contentType, sourceContentId, profileSnapshotId, generatedContent, metadata
-   Indexed for fast lookups by hash, user, content type, source, and profile
-   Supports all content types: mind maps, flashcards, quizzes, questions

**Integration Points**:
-   **Mind Map Generator**: Checks cache before OpenAI API calls (70-90% reduction)
-   **Deck Update Routes**: Auto-invalidates cache on PATCH /api/flashcard-decks/:id
-   **Profile Updates**: Cache invalidation hook ready for profile mutation flows

**Performance Impact**:
-   Cache HIT: ~50-100ms (database lookup)
-   Cache MISS: ~2-5s (full AI generation + save to cache)
-   Cost savings: 70-90% reduction in OpenAI API calls while maintaining full adaptivity

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

A complete Mind Maps system with a modular architecture and RAG integration. Features:

### Adaptive AI Generation (Profile-Aware)
-   **StudyContextBuilder Integration**: Loads complete user profile (difficulties, TDAH, objectives, learning evolution)
-   **Pedagogical Adaptation**: 
    -   TDAH: Vibrant high-contrast colors, chunked concepts, mnemonic devices, concise text
    -   Dislexia: Simple language, visual metaphors, bullet points
    -   Memory issues: Strong mnemonics, associations, storytelling, practical examples
    -   Low motivation: Encouraging language, real-world applications
-   **Rich Content**: Leaf nodes include detailed descriptions (2-4 sentences) with examples and key points
-   **Adaptive Colors**: 7 vibrant colors for ADHD, 4 balanced colors for standard profiles
-   **Graceful Fallback**: Works without profile (uses best practices defaults)

### Core Features
-   `MindMapGenerator` (HybridSearchService + GPT-4o-mini with adaptive prompts)
-   Automatic material conversion to mind maps
-   Subject integration and export to SVG/PNG
-   Drag & drop, inline editing, handle-based connections, keyboard shortcuts
-   SimpleMind-inspired visual design for a clean, minimal interface

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