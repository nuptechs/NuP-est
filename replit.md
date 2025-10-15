# Overview

NuP-est is an AI-powered adaptive study management platform that creates personalized learning experiences through deep user profiling and intelligent content delivery. The system guides users through a comprehensive setup process and provides an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles. The project aims to offer a polished, professional user experience with a focus on intuitive navigation and adaptive learning strategies.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity.

# System Architecture

## Frontend Architecture

The client is built with **React 18** and **TypeScript**, using **Vite** as the build tool. It uses `wouter` for routing, **TanStack Query (React Query)** for server state management, and **shadcn/ui** with **Radix UI** primitives and **Tailwind CSS** for styling. **React Hook Form** with **Zod** handles form validation. The UI is profile-driven and adapts to user study patterns, featuring a centralized dashboard with a guided setup flow. A ClickUp-inspired modernization provides a consistent, modern visual design across all pages, including dark mode support and optimized responsive layouts.

## Backend Architecture

The server is built with **Express.js** and **TypeScript** in ESM format. It uses **Drizzle ORM** for type-safe PostgreSQL database interactions and **Replit Auth** with Passport.js for authentication. **express-session** with **connect-pg-simple** manages sessions, and **multer** handles file uploads. The API is RESTful with consistent error handling. Core services include adaptive assessment, student profile generation and versioning, continuous interaction discovery, and a personalized AI assistant core with context and memory management.

## Data Architecture

The project uses a **PostgreSQL** database managed by **Drizzle ORM**. The schema includes tables for users, subjects, topics, study materials, goals, study sessions, and AI-related data (questions, attempts). A key feature is the comprehensive schema for the personalized AI teaching assistant, including tables for learning difficulties, versioned student learning profiles, personalized assistant instances, teaching strategies, adaptive assessments, and detailed interaction logs. This schema supports referential integrity, junction tables for many-to-many relationships, and versioning for student profiles.

## Authentication & Authorization

Authentication is handled via **Replit OAuth** (OpenID Connect). The system uses secure session-based authentication with HttpOnly cookies and route-level middleware protection for API endpoints. User context is automatically injected into authenticated requests.

## AI Integration

The system integrates **OpenRouter** (DeepSeek R1 model) for advanced AI capabilities. AI interactions are profile-aware, adapting to user study profiles (disciplined, undisciplined, average). Key AI features include context-aware question generation, intelligent hints, personalized feedback, adaptive difficulty for questions and content, and smart recommendations for study strategies. The system processes uploaded study materials (PDF, DOC, DOCX, TXT, MD) to generate relevant content and questions.

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