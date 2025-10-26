/**
 * Explanation Generator Tool
 * 
 * Study tool that generates comprehensive explanations using category-specific strategies.
 * Explains why answers are correct/incorrect and provides learning insights.
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

export interface ExplanationGeneratorParams {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  wasCorrect: boolean;
}

export interface ExplanationGeneratorData {
  explanation: string;
  wasCorrect: boolean;
  keyLearnings: string[]; // Main takeaways from this question
  suggestedTopicsToReview?: string[]; // If student got it wrong
  metadata: {
    categoryUsed: string;
    strategyName: string;
    errorType?: 'conceptual' | 'calculation' | 'interpretation' | 'careless';
  };
}

/**
 * Explanation Generator Tool
 */
export class ExplanationGeneratorTool implements ToolCapability<ExplanationGeneratorParams, ExplanationGeneratorData> {
  readonly name = 'ExplanationGenerator';
  readonly version = '1.0.0';
  readonly description = 'Generates comprehensive explanations based on student profile and subject category';
  
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
  estimatedTime(context: StudyContext, params?: ExplanationGeneratorParams): number {
    // Explanations take longer than hints but less than questions
    return 1.0; // 1 minute average
  }
  
  /**
   * Estimate cost (in dollars)
   */
  estimatedCost(context: StudyContext, params?: ExplanationGeneratorParams): number {
    // Explanations use moderate tokens
    return 0.001; // $0.001 per explanation
  }
  
  /**
   * Check if tool should execute
   */
  shouldExecute(context: StudyContext, params?: ExplanationGeneratorParams): boolean {
    if (!params || !params.question || !params.correctAnswer || !params.studentAnswer) {
      console.warn('[ExplanationGeneratorTool] Missing required parameters');
      return false;
    }
    
    return true;
  }
  
  /**
   * Main execution
   */
  async execute(
    context: StudyContext,
    params?: ExplanationGeneratorParams
  ): Promise<ToolResult<ExplanationGeneratorData>> {
    const startTime = Date.now();
    
    if (!this.shouldExecute(context, params)) {
      return {
        toolName: this.name,
        success: false,
        data: {
          explanation: '',
          wasCorrect: false,
          keyLearnings: [],
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
          message: 'Invalid parameters for explanation generation',
          code: 'INVALID_PARAMS',
        },
      };
    }
    
    try {
      const { question, correctAnswer, studentAnswer, wasCorrect } = params!;
      
      console.log(`[ExplanationGeneratorTool] Generating explanation`);
      console.log(`[ExplanationGeneratorTool] Result: ${wasCorrect ? 'CORRECT' : 'INCORRECT'}`);
      console.log(`[ExplanationGeneratorTool] Subject: ${context.subject?.name} (${context.subject?.category})`);
      
      // STAGE 1: Select strategy based on subject category
      const strategy = this.selectStrategy(context);
      
      // STAGE 2: Build system prompt
      const systemPrompt = strategy.buildSystemPrompt(context);
      
      // STAGE 3: Build explanation prompt using strategy's specialized method
      const explanationPrompt = strategy.buildExplanationPrompt
        ? strategy.buildExplanationPrompt(question, correctAnswer, studentAnswer)
        : this.buildDefaultExplanationPrompt(question, correctAnswer, studentAnswer, wasCorrect);
      
      // STAGE 4: Add structured output request
      const enhancedPrompt = `${explanationPrompt}

IMPORTANTE: Retorne sua resposta em JSON válido com esta estrutura:
{
  "explanation": "Explicação completa e didática",
  "keyLearnings": ["Aprendizado 1", "Aprendizado 2", "Aprendizado 3"],
  ${!wasCorrect ? '"suggestedTopicsToReview": ["Tópico 1", "Tópico 2"],' : ''}
  "errorType": "${wasCorrect ? 'none' : 'Escolha UMA opção: conceptual, calculation, interpretation ou careless'}"
}

${!wasCorrect ? `
TIPOS DE ERRO:
- "conceptual": Erro de conceito/entendimento
- "calculation": Erro de cálculo/execução
- "interpretation": Erro de interpretação do enunciado
- "careless": Erro de distração/descuido
` : ''}`;
      
      // STAGE 5: Call AI
      const response = await this.aiManager.request({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enhancedPrompt },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000,
      });
      
      // STAGE 6: Parse response
      const parsed = this.parseExplanationResponse(response.content, wasCorrect);
      
      const timeSpent = (Date.now() - startTime) / 1000;
      
      console.log(`[ExplanationGeneratorTool] Explanation generated successfully (${timeSpent.toFixed(2)}s)`);
      
      return {
        toolName: this.name,
        success: true,
        data: {
          explanation: parsed.explanation,
          wasCorrect,
          keyLearnings: parsed.keyLearnings,
          suggestedTopicsToReview: parsed.suggestedTopicsToReview,
          metadata: {
            categoryUsed: context.subject?.category || 'generic',
            strategyName: strategy.name,
            errorType: parsed.errorType,
          },
        },
        metadata: {
          timeSpent,
          aiCalls: 1,
          tokensUsed: 500, // Rough estimate
          cost: this.estimatedCost(context, params),
        },
      };
      
    } catch (error) {
      console.error('[ExplanationGeneratorTool] Error:', error);
      
      const timeSpent = (Date.now() - startTime) / 1000;
      
      return {
        toolName: this.name,
        success: false,
        data: {
          explanation: '',
          wasCorrect: params?.wasCorrect || false,
          keyLearnings: [],
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
          code: 'EXPLANATION_GENERATION_ERROR',
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
      console.warn(`[ExplanationGeneratorTool] No strategy for category: ${context.subject.category}, using generic`);
      return this.strategyMap.get('generic')!;
    }
    
    return strategy;
  }
  
  /**
   * Default explanation prompt (fallback)
   */
  private buildDefaultExplanationPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer: string,
    wasCorrect: boolean
  ): string {
    return `Explique detalhadamente esta questão e a resposta do estudante.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
RESPOSTA DO ALUNO: ${studentAnswer}
RESULTADO: ${wasCorrect ? 'CORRETO ✓' : 'INCORRETO ✗'}

${wasCorrect ? `
Forneça:
1. Por que a resposta está correta
2. Conceitos-chave envolvidos
3. Como aplicar esse conhecimento
` : `
Forneça:
1. Por que a resposta do aluno está incorreta
2. Qual foi o erro de raciocínio
3. Explicação da resposta correta
4. Como evitar esse erro no futuro
5. Tópicos que devem ser revisados
`}

Seja didático, construtivo e encorajador.`;
  }
  
  /**
   * Parse AI response into structured explanation
   */
  private parseExplanationResponse(
    content: string,
    wasCorrect: boolean
  ): {
    explanation: string;
    keyLearnings: string[];
    suggestedTopicsToReview?: string[];
    errorType?: 'conceptual' | 'calculation' | 'interpretation' | 'careless';
  } {
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
        explanation: parsed.explanation || content,
        keyLearnings: parsed.keyLearnings || ['Revisar conceitos da questão'],
        suggestedTopicsToReview: parsed.suggestedTopicsToReview,
        errorType: parsed.errorType !== 'none' ? parsed.errorType : undefined,
      };
    } catch (error) {
      console.warn('[ExplanationGeneratorTool] Failed to parse JSON, using raw content');
      
      // Fallback: return raw content
      return {
        explanation: content,
        keyLearnings: ['Revisar conceitos da questão'],
        suggestedTopicsToReview: wasCorrect ? undefined : ['Revisar material de estudo'],
      };
    }
  }
}
