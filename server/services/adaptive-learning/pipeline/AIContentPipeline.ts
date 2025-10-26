/**
 * AI Content Pipeline
 * 
 * Structured pipeline for AI content generation with validation and retry logic.
 * Flow: Context → Prompt Strategy → AI Provider → Validation → Result
 */

import type { StudyContext, AIGenerationSpec, AIResponse, GeneratedQuestion, ValidationResult } from '../types';
import type { IPromptStrategy } from '../strategies/IPromptStrategy';
import { ExactasPromptStrategy } from '../strategies/ExactasPromptStrategy';
import { HumanasPromptStrategy } from '../strategies/HumanasPromptStrategy';
import { BiologicasPromptStrategy } from '../strategies/BiologicasPromptStrategy';
import { GenericPromptStrategy } from '../strategies/GenericPromptStrategy';
import type { IAIManager } from '../../ai/interfaces';

/**
 * Content validator for quality control
 */
class QuestionValidator {
  async validate(question: GeneratedQuestion): Promise<ValidationResult> {
    const issues = [];
    
    // Check required fields
    if (!question.question || question.question.length < 20) {
      issues.push({
        severity: 'critical' as const,
        message: 'Questão muito curta ou vazia',
        field: 'question',
        suggestion: 'Questão deve ter pelo menos 20 caracteres',
      });
    }
    
    // Check options
    if (!question.options || question.options.length !== 4) {
      issues.push({
        severity: 'critical' as const,
        message: 'Deve ter exatamente 4 alternativas',
        field: 'options',
        suggestion: 'Forneça 4 alternativas (A, B, C, D)',
      });
    }
    
    // Check correct answer
    if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
      issues.push({
        severity: 'critical' as const,
        message: 'Resposta correta inválida',
        field: 'correctAnswer',
        suggestion: 'Use A, B, C ou D',
      });
    }
    
    // Check explanation
    if (!question.explanation || question.explanation.length < 30) {
      issues.push({
        severity: 'warning' as const,
        message: 'Explicação muito curta',
        field: 'explanation',
        suggestion: 'Forneça explicação detalhada (mínimo 30 caracteres)',
      });
    }
    
    // Calculate score
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    let score = 1.0;
    score -= criticalCount * 0.3;
    score -= warningCount * 0.1;
    score = Math.max(0, score);
    
    return {
      isValid: criticalCount === 0,
      score,
      issues,
    };
  }
}

/**
 * Main AI Content Pipeline
 */
export class AIContentPipeline {
  private strategyMap: Map<string, IPromptStrategy>;
  private validator: QuestionValidator;
  
  constructor(private aiManager: IAIManager) {
    this.strategyMap = new Map<string, IPromptStrategy>();
    this.strategyMap.set('exatas', new ExactasPromptStrategy());
    this.strategyMap.set('humanas', new HumanasPromptStrategy());
    this.strategyMap.set('biologicas', new BiologicasPromptStrategy());
    this.strategyMap.set('generic', new GenericPromptStrategy());
    
    this.validator = new QuestionValidator();
  }
  
  /**
   * Generate content using the full pipeline
   */
  async generateQuestion(spec: {
    context: StudyContext;
    topic: string;
    difficulty: number;
    maxRetries?: number;
  }): Promise<GeneratedQuestion> {
    const maxRetries = spec.maxRetries || 2;
    let attempts = 0;
    let lastError: Error | null = null;
    
    while (attempts < maxRetries) {
      try {
        // STAGE 1: Select strategy based on subject category
        const strategy = this.selectStrategy(spec.context);
        
        // STAGE 2: Build prompts
        const systemPrompt = strategy.buildSystemPrompt(spec.context);
        const questionPrompt = strategy.buildQuestionPrompt(spec.context, spec.topic, spec.difficulty);
        
        // STAGE 3: Select AI provider based on priority
        const provider = this.selectProvider(spec.context);
        const model = this.selectModel(provider, spec.context);
        
        // STAGE 4: Call AI
        const aiResponse = await this.callAI({
          systemPrompt,
          userPrompt: questionPrompt,
          provider,
          model,
        });
        
        // STAGE 5: Parse response
        const question = this.parseQuestionResponse(aiResponse.content);
        
        // STAGE 6: Validate
        const validation = await this.validator.validate(question);
        
        if (validation.isValid) {
          // SUCCESS - return enriched question
          return {
            ...question,
            difficulty: spec.difficulty,
            topic: spec.topic,
            category: spec.context.subject?.category,
            metadata: {
              sourceStrategy: strategy.name,
              ragUsed: !!spec.context.ragChunks && spec.context.ragChunks.length > 0,
              qualityScore: validation.score,
            },
          };
        }
        
        // Validation failed - retry with feedback
        if (attempts < maxRetries - 1) {
          console.log(`[AIContentPipeline] Validation failed (attempt ${attempts + 1}), retrying...`);
          console.log(`[AIContentPipeline] Issues:`, validation.issues);
          attempts++;
          continue;
        }
        
        // Last attempt failed - return anyway with low quality score
        console.warn(`[AIContentPipeline] Max retries reached, returning questionable result`);
        return {
          ...question,
          difficulty: spec.difficulty,
          topic: spec.topic,
          category: spec.context.subject?.category,
          metadata: {
            sourceStrategy: strategy.name,
            ragUsed: !!spec.context.ragChunks && spec.context.ragChunks.length > 0,
            qualityScore: validation.score,
          },
        };
        
      } catch (error) {
        lastError = error as Error;
        console.error(`[AIContentPipeline] Error on attempt ${attempts + 1}:`, error);
        attempts++;
        
        if (attempts >= maxRetries) {
          throw new Error(`Failed to generate question after ${maxRetries} attempts: ${lastError?.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    throw new Error(`Failed to generate question: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Select prompt strategy based on subject category
   */
  private selectStrategy(context: StudyContext): IPromptStrategy {
    if (!context.subject || !context.subject.category) {
      return this.strategyMap.get('generic')!;
    }
    
    const strategy = this.strategyMap.get(context.subject.category);
    if (!strategy) {
      console.warn(`[AIContentPipeline] No strategy for category: ${context.subject.category}, using generic`);
      return this.strategyMap.get('generic')!;
    }
    
    console.log(`[AIContentPipeline] Using strategy: ${strategy.name}`);
    return strategy;
  }
  
  /**
   * Select AI provider based on subject priority
   */
  private selectProvider(context: StudyContext): 'openai' | 'deepseek' | 'openrouter' {
    if (!context.subject) {
      return 'openai'; // Default
    }
    
    // HIGH priority: use best model (DeepSeek R1)
    if (context.subject.priority === 'high') {
      console.log(`[AIContentPipeline] HIGH priority subject - using DeepSeek R1`);
      return 'deepseek';
    }
    
    // MEDIUM/LOW: use OpenAI (faster, cheaper)
    console.log(`[AIContentPipeline] ${context.subject.priority} priority - using OpenAI`);
    return 'openai';
  }
  
  /**
   * Select AI model based on provider
   */
  private selectModel(provider: string, context: StudyContext): string {
    if (provider === 'deepseek') {
      return 'deepseek-chat'; // DeepSeek R1
    }
    
    // OpenAI - use GPT-4o-mini for efficiency
    return 'gpt-4o-mini';
  }
  
  /**
   * Call AI with retry logic
   */
  private async callAI(params: {
    systemPrompt: string;
    userPrompt: string;
    provider: string;
    model: string;
  }): Promise<AIResponse> {
    const response = await this.aiManager.request({
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      model: params.model,
      temperature: 0.7,
      maxTokens: 1500,
    });
    
    return {
      content: response.content,
      tokensUsed: 0, // AI response doesn't include token count directly
      model: params.model,
      finishReason: 'stop',
    };
  }
  
  /**
   * Parse AI response into structured question
   */
  private parseQuestionResponse(content: string): GeneratedQuestion {
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        question: parsed.question || '',
        options: parsed.options || [],
        correctAnswer: parsed.correctAnswer || 'A',
        explanation: parsed.explanation || '',
        adaptations: parsed.adaptations || [],
        difficulty: 1.5, // Will be overridden
      };
    } catch (error) {
      console.error('[AIContentPipeline] Failed to parse AI response:', error);
      console.error('[AIContentPipeline] Response was:', content);
      
      // Return a placeholder to avoid total failure
      return {
        question: 'Erro ao processar questão. Tente novamente.',
        options: ['A) Erro', 'B) Erro', 'C) Erro', 'D) Erro'],
        correctAnswer: 'A',
        explanation: 'Falha ao gerar explicação.',
        adaptations: ['error'],
        difficulty: 1.0,
      };
    }
  }
}
