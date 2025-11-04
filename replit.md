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