/**
 * Question Generator Tool
 * 
 * Study tool that generates adaptive questions using category-specific strategies,
 * RAG enrichment, and quality validation.
 * 
 * Implements ToolCapability for orchestration compatibility.
 */

import type { ToolCapability, ToolResult, StudyContext, GeneratedQuestion } from '../types';
import { AIContentPipeline } from '../pipeline/AIContentPipeline';
import type { IAIManager } from '../../ai/interfaces';
import type { IStorage } from '../../../storage';

export interface QuestionGeneratorParams {
  topic: string;
  difficulty?: number; // 0.5-3.0
  count?: number; // number of questions to generate
}

export interface QuestionGeneratorData {
  questions: GeneratedQuestion[];
  metadata: {
    categoryUsed: string;
    priorityLevel: string;
    ragEnriched: boolean;
    averageQuality: number;
  };
}

/**
 * Question Generator Tool
 */
export class QuestionGeneratorTool implements ToolCapability<QuestionGeneratorParams, QuestionGeneratorData> {
  readonly name = 'QuestionGenerator';
  readonly version = '2.0.0';
  readonly description = 'Generates adaptive questions based on student profile and subject category';
  
  private pipeline: AIContentPipeline;
  
  constructor(
    private aiManager: IAIManager,
    private storage: IStorage
  ) {
    this.pipeline = new AIContentPipeline(aiManager);
  }
  
  /**
   * Estimate time required (in minutes)
   */
  estimatedTime(context: StudyContext, params?: QuestionGeneratorParams): number {
    const count = params?.count || 1;
    
    // HIGH priority: use DeepSeek (slower but better quality) - 3min/question
    if (context.subject?.priority === 'high') {
      return count * 3;
    }
    
    // MEDIUM/LOW: use OpenAI (faster) - 1.5min/question
    return count * 1.5;
  }
  
  /**
   * Estimate cost (in dollars)
   */
  estimatedCost(context: StudyContext, params?: QuestionGeneratorParams): number {
    const count = params?.count || 1;
    
    // DeepSeek pricing: ~$0.002 per question
    // OpenAI GPT-4o-mini: ~$0.001 per question
    if (context.subject?.priority === 'high') {
      return count * 0.002; // DeepSeek
    }
    
    return count * 0.001; // OpenAI
  }
  
  /**
   * Check if tool should execute
   * QuestionGenerator always executes (it's a core tool)
   */
  shouldExecute(context: StudyContext, params?: QuestionGeneratorParams): boolean {
    // Must have a subject
    if (!context.subject) {
      console.warn('[QuestionGeneratorTool] No subject in context');
      return false;
    }
    
    return true;
  }
  
  /**
   * Main execution
   */
  async execute(
    context: StudyContext,
    params?: QuestionGeneratorParams
  ): Promise<ToolResult<QuestionGeneratorData>> {
    const startTime = Date.now();
    
    if (!params || !params.topic) {
      return {
        toolName: this.name,
        success: false,
        data: {
          questions: [],
          metadata: {
            categoryUsed: 'none',
            priorityLevel: 'none',
            ragEnriched: false,
            averageQuality: 0,
          },
        },
        metadata: {
          timeSpent: 0,
          aiCalls: 0,
          tokensUsed: 0,
        },
        error: {
          message: 'Missing required parameter: topic',
          code: 'MISSING_PARAM',
        },
      };
    }
    
    try {
      const { topic, difficulty = 1.5, count = 1 } = params;
      
      console.log(`[QuestionGeneratorTool] Generating ${count} question(s) on "${topic}"`);
      console.log(`[QuestionGeneratorTool] Subject: ${context.subject?.name} (${context.subject?.category})`);
      console.log(`[QuestionGeneratorTool] Priority: ${context.subject?.priority}`);
      console.log(`[QuestionGeneratorTool] Difficulty: ${difficulty.toFixed(1)}/3.0`);
      
      // Generate questions
      const questions: GeneratedQuestion[] = [];
      
      for (let i = 0; i < count; i++) {
        const question = await this.pipeline.generateQuestion({
          context,
          topic,
          difficulty,
        });
        
        questions.push(question);
        
        // Persist to database
        await this.storage.createAiQuestion({
          userId: context.user.id,
          subjectId: context.subject!.id,
          topicId: null, // topicId could be derived from topic string if needed
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: difficulty.toString(),
          studyProfile: context.user.studyProfile || undefined,
        });
        
        console.log(`[QuestionGeneratorTool] Generated question ${i + 1}/${count}`);
      }
      
      // Calculate metadata
      const qualityScores = questions
        .map(q => q.metadata?.qualityScore || 0.5)
        .filter(s => s > 0);
      
      const averageQuality = qualityScores.length > 0
        ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length
        : 0.5;
      
      const ragEnriched = questions.some(q => q.metadata?.ragUsed);
      
      const timeSpent = (Date.now() - startTime) / 1000;
      
      return {
        toolName: this.name,
        success: true,
        data: {
          questions,
          metadata: {
            categoryUsed: context.subject?.category || 'generic',
            priorityLevel: context.subject?.priority || 'medium',
            ragEnriched,
            averageQuality,
          },
        },
        metadata: {
          timeSpent,
          aiCalls: count,
          tokensUsed: count * 500, // Rough estimate
          cost: this.estimatedCost(context, params),
          quality: averageQuality,
        },
        telemetry: {
          difficultyFeedback: this.assessDifficultyFeedback(difficulty, context.performance.recentAccuracy),
        },
      };
      
    } catch (error) {
      console.error('[QuestionGeneratorTool] Error:', error);
      
      const timeSpent = (Date.now() - startTime) / 1000;
      
      return {
        toolName: this.name,
        success: false,
        data: {
          questions: [],
          metadata: {
            categoryUsed: context.subject?.category || 'generic',
            priorityLevel: context.subject?.priority || 'medium',
            ragEnriched: false,
            averageQuality: 0,
          },
        },
        metadata: {
          timeSpent,
          aiCalls: 0,
          tokensUsed: 0,
        },
        error: {
          message: (error as Error).message,
          code: 'GENERATION_ERROR',
          details: error,
        },
      };
    }
  }
  
  /**
   * Assess if difficulty is appropriate
   */
  private assessDifficultyFeedback(
    targetDifficulty: number,
    recentAccuracy: number
  ): 'too_easy' | 'appropriate' | 'too_hard' {
    // If accuracy is very high (>85%) and difficulty is low, it's too easy
    if (recentAccuracy > 0.85 && targetDifficulty < 2.0) {
      return 'too_easy';
    }
    
    // If accuracy is very low (<40%) and difficulty is high, it's too hard
    if (recentAccuracy < 0.4 && targetDifficulty > 1.5) {
      return 'too_hard';
    }
    
    return 'appropriate';
  }
}
