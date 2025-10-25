# Overview

NuP-est is an AI-powered adaptive study management platform designed to personalize learning experiences through deep user profiling and intelligent content delivery. It provides a comprehensive setup, an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles. The project aims for a polished, professional user experience with intuitive navigation and adaptive learning strategies, ultimately enhancing learning efficiency and engagement. The business vision is to provide a competitive edge in the e-learning market by offering a truly personalized and adaptive learning journey.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity. Modern UX inspired by best-in-class apps (Notion, Linear, Figma) - avoid "AI-generated" appearance through generous spacing, clear hierarchy, and intentional design choices.

# System Architecture

## Frontend Architecture

The client is built with React 18, TypeScript, and Vite. It utilizes `wouter` for routing, TanStack Query for server state management, and shadcn/ui with Radix UI primitives and Tailwind CSS for styling. React Hook Form with Zod handles form validation. The UI is profile-driven, adapting to user study patterns, and features a centralized dashboard with a guided setup flow. A unified design system ensures consistency across spacing, typography, colors, and components, inspired by modern design patterns (Notion/Linear/Figma style). All 17 application pages have been redesigned for a professional user experience. Features like rich Markdown content rendering with syntax highlighting and intelligent semantic highlighting are integrated into components like Flashcards to enhance academic content presentation.

## Backend Architecture

The server uses Express.js and TypeScript (ESM format) with Drizzle ORM for type-safe PostgreSQL interactions. Replit Auth with Passport.js manages authentication, express-session handles sessions, and multer manages file uploads. The API is RESTful with consistent error handling. Core AI services include Adaptive Assessment, Student Profile Generation, Continuous Discovery, Personalized Assistant, and Adaptive Content Delivery. Key API endpoints facilitate adaptive questions, hints, explanations, chat interactions, and assessment processing. Security features include backend-controlled assessment completion, layered Zod validation, ownership checks, and question persistence. Flashcard image uploads are handled through a dedicated authenticated endpoint, storing images locally and serving them statically. AI chat token limits have been significantly increased to support detailed academic responses.

## Data Architecture

A PostgreSQL database managed by Drizzle ORM stores user data, subjects, topics, study materials, goals, sessions, and comprehensive AI-related data including learning difficulties, versioned student profiles, assistant instances, and interaction logs. The schema supports referential integrity and versioning.

## Authentication & Authorization

Authentication is handled via Replit OAuth (OpenID Connect) using secure session-based authentication with HttpOnly cookies and route-level middleware protection.

## AI Integration

The system integrates OpenRouter (DeepSeek R1 model) for advanced, profile-aware AI capabilities, including context-aware question generation, intelligent hints, personalized feedback, adaptive difficulty, and smart recommendations. The system can process uploaded study materials (PDF, DOC, DOCX, TXT, MD) for content generation. External service integrations are centralized with a robust `AIClient` and `PineconeClient` featuring retry mechanisms, exponential backoff, circuit breakers, and comprehensive rate limit handling.

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