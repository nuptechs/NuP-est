/**
 * Generic Prompt Strategy
 * 
 * Fallback strategy for subjects without specific category classification.
 * Provides basic prompt scaffolding without specialized pedagogical approaches.
 */

import { BasePromptStrategy } from './IPromptStrategy';
import type { StudyContext } from '../types';

export class GenericPromptStrategy extends BasePromptStrategy {
  readonly category = 'generic' as const;
  readonly name = 'Genérica';
  
  buildSystemPrompt(context: StudyContext): string {
    return `Você é um professor experiente especializado em criar conteúdo educacional de alta qualidade.

${this.buildPersonalityPrompt(context)}
${this.buildProfileContext(context)}
${this.buildAdaptationsPrompt(context)}

Adapte todo conteúdo considerando essas características.`;
  }
  
  buildQuestionPrompt(context: StudyContext, topic: string, difficulty: number): string {
    return `Crie uma questão de múltipla escolha sobre: ${topic}

NÍVEL: ${difficulty.toFixed(1)}/3.0
FORMATO: 4 alternativas (A, B, C, D), uma única resposta correta

${this.buildPriorityInstructions(context)}
${this.buildRAGContext(context)}

Retorne APENAS JSON válido:
{
  "question": "...",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": "A",
  "explanation": "...",
  "adaptations": []
}`;
  }
}
