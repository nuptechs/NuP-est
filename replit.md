# Overview

NuP-est is an AI-powered study management application that helps students organize their studies, track progress, and receive personalized AI-generated questions. The platform features a comprehensive study system with subjects, materials, goals, and analytics, built with a modern full-stack TypeScript architecture using React, Express, and PostgreSQL.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client is built with **React 18** and **TypeScript**, using **Vite** as the build tool and development server. The application follows a modern React patterns approach:

- **Routing**: Uses `wouter` for client-side routing with a simple, lightweight approach
- **State Management**: Leverages **TanStack Query (React Query)** for server state management and caching
- **UI Framework**: Implements **shadcn/ui** components with **Radix UI** primitives and **Tailwind CSS** for styling
- **Forms**: Uses **React Hook Form** with **Zod** validation for type-safe form handling
- **Authentication**: Client-side authentication state managed through React Query with automatic redirects

## Backend Architecture

The server is built with **Express.js** and **TypeScript** in ESM format:

- **Database ORM**: Uses **Drizzle ORM** with full TypeScript support and type-safe queries
- **Authentication**: Implements **Replit Auth** with OpenID Connect using Passport.js strategies
- **Session Management**: Uses **express-session** with PostgreSQL session storage via **connect-pg-simple**
- **File Uploads**: Handles file uploads with **multer** for study materials
- **API Design**: RESTful API with consistent error handling and request/response logging middleware

## Data Architecture

**Database**: PostgreSQL with Drizzle ORM providing type-safe database operations

**Schema Design**:
- **Users**: Core user profiles with study preferences (disciplined, undisciplined, average)
- **Subjects**: Study subjects with categories (exatas, humanas, biologicas) and priorities
- **Topics**: Hierarchical organization within subjects
- **Materials**: File uploads and content storage with subject/topic associations
- **Goals & Targets**: Goal-setting system with progress tracking
- **Study Sessions**: Time tracking and study activity logging
- **AI Questions & Attempts**: AI-generated questions with attempt tracking for analytics

## Authentication & Authorization

- **Replit OAuth**: Uses Replit's OpenID Connect for user authentication
- **Session-based Auth**: Secure session management with HttpOnly cookies
- **Middleware Protection**: Route-level authentication middleware for API endpoints
- **User Context**: Automatic user context injection in authenticated requests

## AI Integration

- **OpenAI Integration**: Uses GPT models for generating personalized study questions
- **Question Generation**: Context-aware question generation based on study materials and user profiles
- **Adaptive Difficulty**: Questions adapt to user's study profile and performance history
- **Content Processing**: Processes uploaded study materials to generate relevant questions

# External Dependencies

## Database & Storage
- **Neon Database**: PostgreSQL serverless database for production data storage
- **Local File Storage**: Multer-based file uploads stored in local filesystem

## Authentication Services
- **Replit Auth**: OAuth provider using OpenID Connect protocol
- **Session Storage**: PostgreSQL-based session persistence

## AI Services
- **OpenAI API**: GPT model integration for question generation and content analysis
- **File Processing**: Support for PDF, DOC, DOCX, TXT, and MD file analysis

## UI & Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool and development server with HMR support
- **TypeScript**: Full-stack type safety with shared schemas
- **Replit Integration**: Development environment optimization with Replit-specific plugins