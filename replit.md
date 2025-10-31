# Overview

NuP-Study is an AI-powered adaptive study management platform that personalizes learning through deep user profiling and intelligent content delivery. It provides a comprehensive setup, an intuitive study hub with AI tools, flashcards, knowledge base management, and progress tracking. The platform features **Professor IA**, an advanced conversational AI tutor with ultra-low latency voice interactions (<500ms), designed to simulate learning from a dedicated human teacher. The project aims for a polished, professional user experience with adaptive learning strategies to enhance learning efficiency and engagement, offering a competitive edge in the e-learning market through truly personalized and adaptive learning journeys.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

## Recent Changes

**2025-10-31: Mind Maps System - Phase 2 Completa + UX Refinement + SimpleMind-Inspired Visual Design**
- Implementado sistema completo de Mapas Mentais com arquitetura modular e RAG integration
- **MindMapGenerator**: Serviço backend que usa HybridSearchService + GPT-4o-mini para gerar mapas mentais
- **Material → Mind Map**: Pipeline automático que converte materiais em mapas usando análise hierárquica de chunks RAG
- **Adaptive Learning Colors**: Nodes coloridos por performance do aluno (verde/amarelo/vermelho/cinza)
- **Subject Integration**: Filtro de mapas por disciplina na UI
- **Export Real**: SVG e PNG usando html-to-image no frontend
- **Navigation**: Link "Mapas Mentais" adicionado ao menu lateral e dashboard quick tools
- **Load de mapas**: Editor carrega nodes/edges/config persistidos do banco ao abrir mapa existente
- **UX Refinement (inspired by Xmind, Miro, Coggle):**
  - Full drag & drop with undo/redo history tracking
  - Real-time inline editing with Enter/blur commit
  - Handle-based node connections (drag to connect)
  - Modern visual design: rounded nodes, soft shadows, gradients, professional color palette
  - Keyboard shortcuts: Tab (add child), Enter (add sibling), Delete (remove), Cmd/Ctrl+Z/Y (undo/redo)
  - Double-click to edit node labels
  - Selection state synchronized with UI for accurate keyboard operations
- **SimpleMind-Inspired Visual Design:**
  - Clean, minimal, elegant interface inspired by SimpleMind app
  - Removed React Flow default wrapper styling (white background, padding, shadows)
  - Nodes with solid backgrounds: root (blue), branch/leaf (white/slate-800 in dark mode)
  - Performance nodes with subtle colored backgrounds (emerald-50, amber-50, rose-50)
  - Subtle connection lines with smooth curves (smoothstep edges, #94a3b8)
  - Refined borders without heavy shadows
  - Invisible handles for cleaner appearance
  - Softer background dots with better spacing (#cbd5e1, 24px gap)
  - Adaptive node sizing with dynamic text width
  - Enhanced MiniMap: proper colors (performance/type), custom background and borders
  - Better error handling: localized messages for AI generation with detailed feedback
  - MiniMap opcional: toggle button na toolbar, desativado por padrão, preserva funcionalidade completa

**2025-10-31: Sistema de Customização Avançada (SimpleMind-Inspired) - COMPLETO ✅**
- **Arquitetura de 3 Níveis (COMPLETO):**
  - Level 1: Style Sheets globais (built-in + user custom)
  - Level 2: Mind Map Styles (overrides por mapa específico)
  - Level 3: Element Styles (customização individual de nodes/edges)
  - Fallback robusto usando DEFAULT_EDGE_STYLE/DEFAULT_NODE_STYLE
- **12 Style Sheets Built-in (COMPLETO):**
  - Clean & Minimal (Light/Dark), Bright Colors, Natural Colors, Pastel Dreams
  - Ocean Blue, Sunset Warm, Monochrome Elegant, Forest Green
  - Purple Majesty, Minimal Wireframe, Neon Cyberpunk
  - Todos com edgeStyles, nodeStyles e colorPalette completos
- **Customization Options (COMPLETO):**
  - Node shapes: rounded, rectangle, circle, hexagon, diamond, pill
  - Colors: fill, border, text (color picker com HEX input)
  - Borders: width (0-10px), style (solid/dashed/dotted), radius (0-50px)
  - Typography: font size (10-32px), weight (normal/medium/semibold/bold)
  - Edge types: smoothstep, straight, step, bezier
  - Edge properties: color, width (1-10px), animated toggle
- **Color Modes (TODOS IMPLEMENTADOS):**
  - Type-based: cor por tipo de nó (root/branch/leaf) ✅
  - Level-based: cor por nível hierárquico (0, 1, 2, ...) usando BFS ✅
  - Branch-based: filhos herdam cor do pai (hash consistente do branchId) ✅
  - Performance-based: cor por desempenho do aluno (adaptive learning) ✅
- **Hierarchy Calculation System:**
  - BFS algorithm em `hierarchyUtils.ts` para calcular levels e branchIds
  - `enrichNodesWithHierarchy()` enriquece nodes com metadata hierárquica
  - Recalculação automática em TODAS as operações que modificam topologia (addNode, deleteNode, addEdge, deleteEdge, applyEdgesChange, loadMindMap)
  - `getColorFromPalette()` helper para wrap-around de paletas
- **UI Components (COMPLETO):**
  - StylePanel: painel lateral com 3 tabs (Temas, Nós, Linhas)
  - Color picker com preview e HEX input
  - Sliders para thickness, radius, font size
  - Selects para shape, border style, font weight, edge type
  - Theme preview visual com grid de cards
  - Toggle button no toolbar (ícone Palette)
- **Zustand Store (COMPLETO):**
  - Gerencia hierarquia de estilos com merge automático
  - Auto-switch dark/light mode
  - Computed getters para node/edge styles com fallback garantido
  - getEdgeStyle sempre retorna EdgeStyle completo (usa DEFAULT_EDGE_STYLE)
- **Banco de Dados (COMPLETO):**
  - mind_map_style_sheets: style sheets globais (id, name, description, isBuiltIn, isDarkMode, colorMode, nodeStyles JSONB, edgeStyles JSONB, layoutConfig JSONB, colorPalette JSONB)
  - mind_map_element_styles: estilos individuais (id, mindMapId, elementId, elementType, nodeStyle JSONB, edgeStyle JSONB)
  - mind_maps: styleSheetId (FK) e customStyles (JSONB)
- **Edge Styling Integration (COMPLETO):**
  - MindMapEditor usa useStyleStore.getEdgeStyle para aplicar estilos
  - Fallback em cascata: Element > Map > Sheet > DEFAULT
  - Preserva valores falsy válidos (animated=false) com nullish coalescing
  - 100% à prova de crashes (architect-reviewed)
- **Status:** Sistema de customização SimpleMind-inspired totalmente funcional. Pendente: API backend para persistência de estilos customizados, testes end-to-end

**2025-10-31: Materiais Não Organizados**
- Adicionada seção "Materiais Não Organizados" na Biblioteca para visualizar materiais sem disciplina associada
- API /api/materials aceita parâmetro ?unorganized=true para filtrar materiais com subject_id IS NULL
- Usuários podem editar e associar materiais a disciplinas ou deixá-los sem disciplina
- Cache invalidation melhorado para atualizar todas as queries de materiais automaticamente

# System Architecture

## Frontend Architecture

The client uses React 18, TypeScript, and Vite, with `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI and Tailwind CSS for styling. Form validation is handled by React Hook Form with Zod. The UI is profile-driven with a centralized dashboard and a guided setup flow, ensuring consistency through a unified design system. It supports rich Markdown content rendering with syntax highlighting.

## Backend Architecture

The server is built with Express.js and TypeScript (ESM) and uses Drizzle ORM for type-safe PostgreSQL interactions. Replit Auth with Passport.js manages authentication, `express-session` for sessions, and Multer for file uploads. The API is RESTful with consistent error handling.

### Modular AI Pipeline

An adaptive learning AI pipeline features:
-   **StudyContextBuilder**: Aggregates user profile, subject, materials, performance, and RAG chunks.
-   **Prompt Strategies**: Category-specific pedagogical approaches (`Exactas`, `Humanas`, `Biologicas`).
-   **AIContentPipeline**: Manages content generation, using priority-based model selection (DeepSeek R1 for HIGH, GPT-4o-mini for MEDIUM/LOW).
-   **QuestionGeneratorTool**: Generates adaptive questions using category-specific strategies and RAG.

### Intelligent Auto-Categorization

A 3-phase system categorizes subjects:
1.  **Pattern Matching**: Static keyword mapping.
2.  **AI Fallback (GPT-4o-mini)**: Analyzes unknown subjects and suggests categories.
3.  **Safe Default**: Defaults to "humanas" if AI fails.
Includes UX features like auto-suggestion, visual feedback, and manual override.

### Intelligent Text Chunking System

A modular chunking infrastructure uses a Strategy Pattern with pluggable strategies via a `TextChunker` facade. Strategies include `SemanticChunkStrategy` (AI-powered, hierarchical analysis with rich metadata), `SentenceAwareChunkStrategy` (respects sentence boundaries for RAG), and `SimpleLimitChunkStrategy` (character-based for TTS). Pre-configured profiles exist for material upload, TTS, and RAG.

### Production RAG System (NotebookLM-Architecture)

A zero-hallucination retrieval system inspired by Google's NotebookLM:
-   **Hybrid Search**: Combines BM25 (keyword-based) and Semantic Search (dense vector embeddings via Pinecone) with weighted fusion (60% semantic, 40% keyword).
-   **Cross-Encoder Reranking**: LLM-based post-retrieval scoring using GPT-4o-mini to improve precision.
-   **Metadata Enrichment**: Auto-generates 15 keywords per chunk, preserves document structure, and tracks source attribution. Stored in Pinecone.
-   **Confidence Scoring & Strict Refusal**: 4-level scoring (none/low/medium/high) with threshold-based refusal (confidence=none) to prevent hallucinations, explicitly listing available topics when a query is not found.
-   **Prompt Engineering**: Strict RAG prompt forces AI to cite sources or state "not in materials," prohibiting external knowledge or speculation.
-   **Two-Mode Chat Behavior**: When a subject is selected, it uses hybrid search, reranking, and strict RAG. Otherwise, it acts as a general conversational assistant.

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores all application data, including AI-related data like learning difficulties, versioned student profiles, assistant instances, and interaction logs.

## Authentication & Authorization

Authentication uses Replit OAuth (OpenID Connect) with secure session-based authentication via HttpOnly cookies and route-level middleware. An admin system uses an `isAdmin` field in `users` and middleware to protect `/api/admin/*` routes. A configurable auto-refresh system allows per-user profile refresh frequency.

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
-   **Function Calling**: Real-time student context retrieval (profile, subject knowledge, learning history).
-   **Adaptive pedagogy**: Automatically adjusts teaching style based on student profile.

### Student Profile Engine

A modular system for enriched student profiles:
-   **Architecture**: 3-component design: ProfileAnalyzer, ConversationTracker, StudentProfileService.
-   **Snapshot-based**: Data processed in background and saved as snapshots for instantaneous reading.
-   **Automatic conversation tracking**: Both voice systems track sessions, with AI analysis (GPT-4o-mini) extracting topics, concepts, understanding, and sentiment.
-   **Automatic profile updates**: Non-blocking updates triggered by question attempts, study session completion, and voice conversations.
-   **Rich metrics**: Overall accuracy, study hours, progress trends, strong/weak subjects, behavioral patterns, and AI-generated recommendations.
-   **Integration**: Professor IA fetches enriched profiles instantly during real-time voice.

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