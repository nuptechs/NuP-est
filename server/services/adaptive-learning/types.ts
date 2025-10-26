/**
 * Core Types and Interfaces for Adaptive Learning System
 * 
 * This module defines the contracts for the modular, testable AI pipeline
 * that powers personalized study tools.
 */

import type {
  User,
  StudentLearningProfile,
  PersonalizedAssistant,
  Subject,
  Material,
  ProfileLearningDifficulty
} from '@shared/schema';

// ===== STUDY CONTEXT =====

/**
 * Unified context that aggregates ALL relevant data for AI decisions.
 * This is the single source of truth passed to all study tools.
 */
export interface StudyContext {
  // WHO IS THE STUDENT
  user: {
    id: string;
    name: string;
    studyProfile?: string;
  };
  
  // LEARNING PROFILE (strengths, weaknesses, motivation)
  profile: {
    id: string;
    strengths: any;
    weaknesses: any;
    motivationLevel: string;
    optimalStudyDuration: number;
    preferredContentTypes: string[];
    needsEncouragement: boolean;
  };
  
  // PERSONALIZED ASSISTANT (personality, communication style)
  assistant: {
    id: string;
    personality: 'encouraging' | 'professional' | 'friendly' | 'strict';
    communicationStyle: 'simple' | 'detailed' | 'visual' | 'step_by_step';
  };
  
  // ⭐ SUBJECT WITH CATEGORY/PRIORITY (NOW USED!)
  subject: {
    id: string;
    name: string;
    category: 'exatas' | 'humanas' | 'biologicas';
    priority: 'high' | 'medium' | 'low';
    color: string;
    description?: string;
  } | null;
  
  // STUDY MATERIALS (for RAG)
  materials: {
    id: string;
    title: string;
    type: string;
    filePath?: string;
    content?: string;
  }[];
  
  // RAG CHUNKS (if already searched)
  ragChunks?: {
    content: string;
    metadata: any;
    similarity: number;
  }[];
  
  // ⭐ RECENT PERFORMANCE (to adapt difficulty)
  performance: {
    recentAccuracy: number;
    avgResponseTime: number;
    weakTopics: string[];
    strongTopics: string[];
    lastStudySession?: Date;
    totalAttempts: number;
  };
  
  // SESSION CONSTRAINTS
  constraints: {
    timeAvailable: number; // minutes
    targetDifficulty?: number; // 0-3
    goalForSession: string;
  };
  
  // LEARNING DIFFICULTIES (dyslexia, ADHD, etc)
  learningDifficulties: {
    category: string;
    difficultyName: string;
    adaptations: any;
  }[];
}

// ===== TOOL CAPABILITY INTERFACE =====

/**
 * Common interface for all study tools (Questions, Flashcards, Chat, etc)
 * Enables orchestration and composition
 */
export interface ToolCapability<TParams = any, TData = any> {
  // IDENTIFICATION
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  
  // PLANNING (for orchestrator)
  estimatedTime(context: StudyContext, params?: TParams): number; // minutes
  estimatedCost(context: StudyContext, params?: TParams): number; // dollars
  
  // CONDITIONAL EXECUTION
  shouldExecute(context: StudyContext, params?: TParams): boolean;
  
  // MAIN EXECUTION
  execute(context: StudyContext, params?: TParams): Promise<ToolResult<TData>>;
  
  // OPTIONAL VALIDATION
  validate?(result: ToolResult<TData>): Promise<ValidationResult>;
}

/**
 * Standardized result from any tool execution
 */
export interface ToolResult<TData = any> {
  toolName: string;
  success: boolean;
  data: TData;
  
  metadata: {
    timeSpent: number; // seconds
    aiCalls: number;
    tokensUsed: number;
    cost?: number; // dollars
    quality?: number; // 0-1 if validated
  };
  
  telemetry?: {
    userEngagement?: 'high' | 'medium' | 'low';
    difficultyFeedback?: 'too_easy' | 'appropriate' | 'too_hard';
    discoveries?: any; // new insights about the student
  };
  
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Validation result for quality control
 */
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  field?: string;
  suggestion?: string;
}

// ===== PROMPT STRATEGY INTERFACE =====

/**
 * Strategy pattern for category-specific prompt engineering
 */
export interface IPromptStrategy {
  readonly category: 'exatas' | 'humanas' | 'biologicas' | 'generic';
  
  buildSystemPrompt(context: StudyContext): string;
  buildQuestionPrompt(context: StudyContext, topic: string, difficulty: number): string;
  buildHintPrompt?(question: string, correctAnswer: string, studentAnswer?: string): string;
  buildExplanationPrompt?(question: string, correctAnswer: string): string;
}

// ===== AI PIPELINE TYPES =====

/**
 * Specification for AI content generation
 */
export interface AIGenerationSpec<T = any> {
  context: StudyContext;
  strategy: IPromptStrategy;
  provider: 'openai' | 'deepseek' | 'openrouter';
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

/**
 * AI Provider response
 */
export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason?: string;
}

// ===== QUESTION TYPES =====

/**
 * Generated question data
 */
export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  adaptations: string[];
  difficulty: number;
  category?: string;
  topic?: string;
  metadata?: {
    sourceStrategy: string;
    ragUsed: boolean;
    qualityScore?: number;
  };
}

// ===== ORCHESTRATION TYPES =====

/**
 * Study session plan
 */
export interface StudySessionPlan {
  sessionId: string;
  userId: string;
  tools: ToolExecution[];
  estimatedDuration: number;
  estimatedCost: number;
  strategy: string;
}

export interface ToolExecution {
  tool: ToolCapability;
  order: number;
  params?: any;
  conditional?: boolean;
  estimatedTime: number;
}

/**
 * Session execution result
 */
export interface SessionResult {
  sessionId: string;
  plan: StudySessionPlan;
  results: ToolResult[];
  actualDuration: number;
  actualCost: number;
  success: boolean;
}
