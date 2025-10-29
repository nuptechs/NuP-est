/**
 * Types para Student Profile Engine
 */

export interface ProfileAnalysis {
  overallAccuracy: number;
  totalStudyHours: number;
  totalQuestions: number;
  correctAnswers: number;
  weeklyProgress: number;
  monthlyProgress: number;
  improvementTrend: 'ascending' | 'stable' | 'declining';
  strongSubjects: string[];
  weakSubjects: string[];
  currentFocus: string[];
}

export interface ConversationAnalysis {
  summary: string;
  keyPoints: string[];
  subject?: string;
  topics: string[];
  questionsAsked: number;
  conceptsExplained: string[];
  studentUnderstanding: 'excellent' | 'good' | 'partial' | 'struggling';
  difficultConcepts: string[];
  masteredConcepts: string[];
  studentSentiment: 'motivated' | 'neutral' | 'frustrated';
  engagementScore: number;
}

export interface BehaviorPatterns {
  studyStreak: number;
  avgSessionDuration: number;
  preferredStudyTime?: string;
  engagementLevel: 'high' | 'medium' | 'low';
}

export interface EnrichedProfile {
  userId: string;
  name: string;
  age?: number;
  studyObjective?: string;
  studyProfile?: string;
  learningStyle?: string;
  learningDifficulties: string[];
  
  // Métricas processadas
  metrics: ProfileAnalysis;
  
  // Padrões comportamentais
  behavior: BehaviorPatterns;
  
  // Conversas recentes
  recentConversations: ConversationAnalysis[];
  lastConversationDate?: Date;
  totalConversations: number;
  
  // Recomendações
  recommendedActions: string[];
  nextTopicsToStudy: string[];
  motivationalMessage?: string;
}
