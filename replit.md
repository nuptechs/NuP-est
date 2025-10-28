# Overview

NuP-Study is an AI-powered adaptive study management platform that personalizes learning through deep user profiling and intelligent content delivery. It offers a comprehensive setup, an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles. The project aims for a polished, professional user experience with adaptive learning strategies to enhance learning efficiency and engagement. The business vision is to provide a competitive edge in the e-learning market by offering a truly personalized and adaptive learning journey.

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

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores all application data, including comprehensive AI-related data such as learning difficulties, versioned student profiles, assistant instances, and interaction logs.

## Authentication & Authorization

Authentication is handled via Replit OAuth (OpenID Connect) using secure session-based authentication with HttpOnly cookies and route-level middleware protection.

## Voice Services (Freemium Feature)

An architecture using the Strategy Pattern provides voice services:
-   **NativeVoiceService (Free Tier)**: Uses browser Web Speech API for basic functionality.
-   **DeepgramVoiceService (Premium - Current)**: Utilizes Deepgram Nova-3 for STT and Deepgram Aura for TTS, offering high accuracy and low latency.
-   **WhisperVoiceService (Premium - Alternative)**: Uses OpenAI Whisper API for STT and OpenAI TTS API for superior accuracy and more voice options.
This system integrates TTS for AI responses and STT for user input, with security measures for API keys and audio processing.

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