/**
 * Hint Generator Tool
 * 
 * Study tool that generates progressive hints (3 levels) using category-specific strategies.
 * Helps students when stuck without revealing the answer directly.
 * 
 * Implements ToolCapability for orchestration compatibility.
 */

import type { ToolCapability, ToolResult, StudyContext } from '../types';
import type { IPromptStrategy } from '../strategies/IPromptStrategy';
import { ExactasPromptStrategy } from '../strategies/ExactasPromptStrategy';
import { HumanasPromptStrategy } from '../strategies/HumanasPromptStrategy';
import { BiologicasPromptStrategy } from '../strategies/BiologicasPromptStrategy';
import { GenericPromptStrategy } from '../strategies/GenericPromptStrategy';
import type { IAIManager } from '../../ai/interfaces';

export interface HintGeneratorParams {
  question: string;
  correctAnswer: string;
  studentAnswer?: string;
  hintLevel: 1 | 2 | 3; // Progressive hint levels
}

export interface HintGeneratorData {
  hint: string;
  hintLevel: number;
  shouldRevealMore: boolean; // If student should request next level
  metadata: {
    categoryUsed: string;
    strategyName: string;
  };
}

/**
 * Hint Generator Tool
 */
export class HintGeneratorTool implements ToolCapability<HintGeneratorParams, HintGeneratorData> {
  readonly name = 'HintGenerator';
  readonly version = '1.0.0';
  readonly description = 'Generates progressive hints based on student profile and subject category';
  
  private strategyMap: Map<string, IPromptStrategy>;
  
  constructor(private aiManager: IAIManager) {
    this.strategyMap = new Map<string, IPromptStrategy>();
    this.strategyMap.set('exatas', new ExactasPromptStrategy());
    this.strategyMap.set('humanas', new HumanasPromptStrategy());
    this.strategyMap.set('biologicas', new BiologicasPromptStrategy());
    this.strategyMap.set('generic', new GenericPromptStrategy());
  }
  
  /**
   * Estimate time required (in minutes)
   */
  estimatedTime(context: StudyContext, params?: HintGeneratorParams): number {
    // Hints are quick - 30 seconds average
    return 0.5;
  }
  
  /**
   * Estimate cost (in dollars)
   */
  estimatedCost(context: StudyContext, params?: HintGeneratorParams): number {
    // Hints use fewer tokens than questions
    return 0.0005; // $0.0005 per hint
  }
  
  /**
   * Check if tool should execute
   */
  shouldExecute(context: StudyContext, params?: HintGeneratorParams): boolean {
    if (!params || !params.question || !params.correctAnswer) {
      console.warn('[HintGeneratorTool] Missing required parameters');
      return false;
    }
    
    if (params.hintLevel < 1 || params.hintLevel > 3) {
      console.warn('[HintGeneratorTool] Invalid hint level, must be 1-3');
      return false;
    }
    
    return true;
  }
  
  /**
   * Main execution
   */
  async execute(
    context: StudyContext,
    params?: HintGeneratorParams
  ): Promise<ToolResult<HintGeneratorData>> {
    const startTime = Date.now();
    
    if (!this.shouldExecute(context, params)) {
      return {
        toolName: this.name,
        success: false,
        data: {
          hint: '',
          hintLevel: 0,
          shouldRevealMore: false,
          metadata: {
            categoryUsed: 'none',
            strategyName: 'none',
          },
        },
        metadata: {
          timeSpent: 0,
          aiCalls: 0,
          tokensUsed: 0,
        },
        error: {
          message: 'Invalid parameters for hint generation',
          code: 'INVALID_PARAMS',
        },
      };
    }
    
    try {
      const { question, correctAnswer, studentAnswer, hintLevel } = params!;
      
      console.log(`[HintGeneratorTool] Generating hint level ${hintLevel}`);
      console.log(`[HintGeneratorTool] Subject: ${context.subject?.name} (${context.subject?.category})`);
      
      // STAGE 1: Select strategy based on subject category
      const strategy = this.selectStrategy(context);
      
      // STAGE 2: Build system prompt
      const systemPrompt = strategy.buildSystemPrompt(context);
      
      // STAGE 3: Build hint prompt using strategy's specialized method
      const hintPrompt = strategy.buildHintPrompt
        ? strategy.buildHintPrompt(question, correctAnswer, studentAnswer, hintLevel)
        : this.buildDefaultHintPrompt(question, correctAnswer, studentAnswer, hintLevel);
      
      // STAGE 4: Call AI
      const response = await this.aiManager.request({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: hintPrompt },
        ],
        model: 'gpt-4o-mini', // Hints don't need premium models
        temperature: 0.7,
        maxTokens: 500,
      });
      
      const hint = response.content.trim();
      
      const timeSpent = (Date.now() - startTime) / 1000;
      
      console.log(`[HintGeneratorTool] Hint generated successfully (${timeSpent.toFixed(2)}s)`);
      
      return {
        toolName: this.name,
        success: true,
        data: {
          hint,
          hintLevel,
          shouldRevealMore: hintLevel < 3, // Can request more hints if not at max level
          metadata: {
            categoryUsed: context.subject?.category || 'generic',
            strategyName: strategy.name,
          },
        },
        metadata: {
          timeSpent,
          aiCalls: 1,
          tokensUsed: 300, // Rough estimate
          cost: this.estimatedCost(context, params),
        },
      };
      
    } catch (error) {
      console.error('[HintGeneratorTool] Error:', error);
      
      const timeSpent = (Date.now() - startTime) / 1000;
      
      return {
        toolName: this.name,
        success: false,
        data: {
          hint: '',
          hintLevel: params?.hintLevel || 0,
          shouldRevealMore: false,
          metadata: {
            categoryUsed: context.subject?.category || 'generic',
            strategyName: 'error',
          },
        },
        metadata: {
          timeSpent,
          aiCalls: 0,
          tokensUsed: 0,
        },
        error: {
          message: (error as Error).message,
          code: 'HINT_GENERATION_ERROR',
          details: error,
        },
      };
    }
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
      console.warn(`[HintGeneratorTool] No strategy for category: ${context.subject.category}, using generic`);
      return this.strategyMap.get('generic')!;
    }
    
    return strategy;
  }
  
  /**
   * Default hint prompt (fallback if strategy doesn't implement custom one)
   */
  private buildDefaultHintPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer?: string,
    hintLevel: number = 1
  ): string {
    return `Forneça uma dica progressiva (nível ${hintLevel}/3) para ajudar o estudante.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer ? `TENTATIVA DO ALUNO: ${studentAnswer}` : ''}

NÍVEL DE DICA:
- Nível 1: Dica sutil, apenas aponta a direção
- Nível 2: Mais específica, mas não revela totalmente
- Nível 3: Bem detalhada, quase revelando a resposta

Forneça APENAS a dica para nível ${hintLevel}, de forma didática e encorajadora.`;
  }
}
