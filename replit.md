# Overview

NuP-est is an AI-powered adaptive study management platform that creates personalized learning experiences through deep user profiling and intelligent content delivery. The system guides users through a comprehensive setup process and provides an intuitive study hub with integrated AI tools, flashcards, knowledge base management, and progress tracking, all tailored to individual learning profiles.

# User Preferences

Preferred communication style: Simple, everyday language.
User Experience Focus: Intuitive, guided workflows with minimal cognitive load.
Design Philosophy: Clean, minimalist interfaces that prioritize user flow over feature complexity.

# Recent Changes

## ClickUp-Inspired Modernization (December 2024)

Successfully implemented comprehensive ClickUp-inspired visual modernization across all major application screens:

- **Dashboard (/dashboard)**: Modern hub design with clean card layout and study overview widgets
- **Goals (/goals)**: Modernized goal creation and management with improved target tracking
- **Study (/study)**: Updated study methods interface with modern card layout for study types
- **Library (/library)**: Enhanced hierarchical content management with improved navigation (Areas → Subjects → Materials)
- **Analytics**: Temporarily simplified to resolve JSX structure issues

**Key Improvements:**
- Consistent ClickUp Shell layout implementation across all pages
- Dark mode support with proper color schemes throughout
- Modern card designs using shadcn/ui components
- Improved spacing and typography following ClickUp design patterns
- Enhanced user experience with intuitive navigation flows
- Portuguese language support maintained across all modernized interfaces

**Technical Quality:**
- Fixed React Query patterns for better cache management
- Corrected navigation logic and breadcrumb functionality
- Resolved Lucide React import issues
- Improved component architecture with better separation of concerns

All modernized pages maintain full functionality while providing a more polished and professional user experience.

## Dashboard Layout Restructuring (September 2025)

Successfully restructured the dashboard layout to improve organization and visual hierarchy:

- **Profile Card Relocation**: Moved user profile card from "Ações Rápidas" (Quick Actions) section to "Content Overview" section as a dedicated third column
- **3-Column Content Overview**: Expanded the Content Overview from 2 columns to 3 columns:
  - **Column 1**: Matérias Recentes (Recent Subjects)
  - **Column 2**: Metas Ativas (Active Goals) 
  - **Column 3**: Seu Perfil (User Profile) - newly moved from quick actions
- **Visual Symmetry**: Implemented CSS flexbox enhancements to ensure all three columns maintain consistent heights (~350px minimum) even when empty
- **Responsive Design**: All columns stack vertically on mobile devices while maintaining proper spacing and heights
- **Profile Card Enhancement**: Updated profile avatar to 80x80px container with 48x48px User icon for better visual prominence

**Technical Implementation:**
- Modified `Grid columns={2}` to `Grid columns={3}` in Content Overview section
- Added `minHeight: '350px'` to all grid cards
- Enhanced CSS with flexbox properties to force equal column heights
- Added responsive breakpoints for mobile stacking behavior
- Maintained all existing Quick Actions functionality (Biblioteca, Criar Flashcards, Questões com IA, Chat com IA)

The restructured layout provides better visual balance and makes the user profile more prominent while maintaining clean organization of dashboard content.

## Intelligent Responsive Grid System (September 2025)

Implemented advanced responsive system for the "Ações Rápidas" (Quick Actions) section to ensure perfect symmetry across all screen sizes:

- **Unified Grid Layout**: Consolidated all 4 action cards (Biblioteca, Criar Flashcards, Questões com IA, Chat com IA) into a single intelligent responsive grid
- **Smart Breakpoint System**: Implemented precise CSS breakpoints for optimal layouts:
  - **Ultra-wide screens (1600px+)**: 3 columns with centered max-width container
  - **Large screens (1200-1599px)**: 3 columns with optimal spacing
  - **Medium-Large screens (900-1199px)**: 2 columns balanced layout
  - **Medium screens (700-899px)**: 2 columns compact spacing
  - **Small screens (below 700px)**: Single column stack
- **Perfect Symmetry**: Grid automatically adapts column count based on available space, maintaining visual balance
- **Smooth Transitions**: CSS Grid with auto-fit ensures seamless adaptation without layout shifts

**Technical Implementation:**
- Replaced separate row systems with unified `nup-cards-grid` responsive container
- Added intelligent `justify-content: center` for perfect card alignment
- Implemented 5-tier breakpoint system with optimized spacing variables
- Enhanced CSS Grid with `repeat(auto-fit, minmax())` for intelligent column distribution

The new system ensures cards are always symmetrically arranged regardless of screen size, providing an optimal user experience across all devices.

# System Architecture

## Frontend Architecture

The client is built with **React 18** and **TypeScript**, using **Vite** as the build tool and development server. The application follows a user-centric design approach:

- **Routing**: Uses `wouter` for client-side routing with a simple, lightweight approach
- **State Management**: Leverages **TanStack Query (React Query)** for server state management and caching
- **UI Framework**: Implements **shadcn/ui** components with **Radix UI** primitives and **Tailwind CSS** for styling
- **Forms**: Uses **React Hook Form** with **Zod** validation for type-safe form handling
- **Authentication**: Client-side authentication state managed through React Query with automatic redirects
- **User Experience**: Profile-driven interface that adapts to user study patterns and preferences
- **Dashboard**: Centralized hub design with guided setup flow and intuitive tool access

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

- **OpenRouter Integration**: Uses DeepSeek R1 model for advanced AI capabilities with cost optimization
- **Profile-Aware AI**: All AI interactions consider user study profile (disciplined, undisciplined, average)
- **Question Generation**: Context-aware question generation based on study materials and user profiles
- **Intelligent Hints**: AI-powered hint system during quizzes for guided learning
- **Personalized Feedback**: Post-quiz analysis with customized improvement recommendations
- **Adaptive Difficulty**: Questions and content adapt to user's study profile and performance history
- **Content Processing**: Processes uploaded study materials to generate relevant questions
- **Smart Recommendations**: AI suggests study strategies based on user profile and progress patterns

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