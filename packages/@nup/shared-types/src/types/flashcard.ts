// Flashcard types for NuP ecosystem

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  imageUrl?: string | null;
  difficulty?: number | null;
  reviewCount?: number;
  lastReviewedAt?: Date | null;
  nextReviewAt?: Date | null;
  contentType?: string | null;
  backData?: any | null;
  mindMapId?: string | null;
  createdAt?: Date;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  subjectId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlashcardReview {
  id: string;
  flashcardId: string;
  userId: string;
  difficulty: number;
  reviewedAt?: Date;
}
