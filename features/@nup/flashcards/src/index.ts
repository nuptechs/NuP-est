/**
 * @nup/flashcards - Sistema completo de flashcards
 * 
 * Features:
 * - Flashcard rendering with rich content support
 * - Markdown, tables, diagrams
 * - Spaced repetition
 * - Generate flashcards from mind maps
 * - Modern UI with flip animations
 */

// Components
export { default as ModernFlashcard } from './components/ModernFlashcard';
export { default as FlashcardRenderer } from './components/FlashcardRenderer';
export { default as RichFlashcardBack } from './components/RichFlashcardBack';

// Dialogs
export { default as GenerateFlashcardsDialog } from './dialogs/GenerateFlashcardsDialog';

// Re-export types if needed
export type { Flashcard } from '@nup/shared-types';
