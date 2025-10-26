/**
 * Prompt Strategy Interface
 * 
 * Defines the contract for category-specific prompt engineering strategies.
 * Each category (Exatas, Humanas, Biológicas) has unique pedagogical approaches.
 */

import type { StudyContext } from '../types';

export interface IPromptStrategy {
  readonly category: 'exatas' | 'humanas' | 'biologicas' | 'generic';
  readonly name: string;
  
  /**
   * Build system prompt that defines the AI's role and personality
   */
  buildSystemPrompt(context: StudyContext): string;
  
  /**
   * Build question generation prompt
   */
  buildQuestionPrompt(context: StudyContext, topic: string, difficulty: number): string;
  
  /**
   * Build hint prompt (optional - can be overridden)
   */
  buildHintPrompt?(
    question: string,
    correctAnswer: string,
    studentAnswer?: string,
    hintLevel?: number
  ): string;
  
  /**
   * Build explanation prompt (optional - can be overridden)
   */
  buildExplanationPrompt?(
    question: string,
    correctAnswer: string,
    studentAnswer?: string
  ): string;
}

/**
 * Base strategy with common functionality
 */
export abstract class BasePromptStrategy implements IPromptStrategy {
  abstract readonly category: 'exatas' | 'humanas' | 'biologicas' | 'generic';
  abstract readonly name: string;
  
  /**
   * Build personality-aware system prompt
   */
  protected buildPersonalityPrompt(context: StudyContext): string {
    const personalityPrompts = {
      encouraging: 'Use linguagem encorajadora e positiva. Celebre progressos e mantenha o estudante motivado.',
      professional: 'Mantenha tom profissional e objetivo. Seja claro e preciso nas explicações.',
      friendly: 'Use linguagem amigável e acessível. Seja como um mentor próximo.',
      strict: 'Seja direto e exigente. Mantenha altos padrões mas seja justo.',
    };
    
    const stylePrompts = {
      simple: 'Use linguagem simples e direta. Evite termos complexos desnecessários.',
      detailed: 'Forneça explicações completas e detalhadas. Use exemplos e aprofunde conceitos.',
      visual: 'Use analogias visuais. Descreva diagramas e representações gráficas quando relevante.',
      step_by_step: 'Quebre tudo em passos numerados. Sempre estruture o conteúdo sequencialmente.',
    };
    
    const personality = personalityPrompts[context.assistant.personality];
    const style = stylePrompts[context.assistant.communicationStyle];
    
    return `PERSONALIDADE: ${personality}\nESTILO: ${style}`;
  }
  
  /**
   * Build profile-aware context
   */
  protected buildProfileContext(context: StudyContext): string {
    let profileText = `\nPERFIL DO ESTUDANTE:`;
    profileText += `\n- Motivação: ${this.getMotivationLabel(context.profile.motivationLevel)}`;
    
    if (context.profile.needsEncouragement) {
      profileText += `\n- Precisa de encorajamento: Sim`;
    }
    
    if (context.performance.recentAccuracy) {
      const accuracy = (context.performance.recentAccuracy * 100).toFixed(0);
      profileText += `\n- Desempenho recente: ${accuracy}% de acertos`;
    }
    
    if (context.performance.weakTopics.length > 0) {
      profileText += `\n- Tópicos com dificuldade: ${context.performance.weakTopics.slice(0, 3).join(', ')}`;
    }
    
    return profileText;
  }
  
  /**
   * Build adaptations for learning difficulties
   */
  protected buildAdaptationsPrompt(context: StudyContext): string {
    if (context.learningDifficulties.length === 0) {
      return '';
    }
    
    let adaptationsText = `\nADAPTAÇÕES NECESSÁRIAS:`;
    for (const difficulty of context.learningDifficulties) {
      adaptationsText += `\n- ${difficulty.difficultyName}: Aplicar adaptações apropriadas`;
    }
    
    return adaptationsText;
  }
  
  /**
   * Build priority-based instructions
   */
  protected buildPriorityInstructions(context: StudyContext): string {
    if (!context.subject) return '';
    
    const priorityInstructions = {
      high: `\n⭐ PRIORIDADE ALTA:
- Use questões de nível de concurso público/exame competitivo
- Exija conhecimento profundo e aplicação prática
- Baseie-se em questões de provas recentes quando possível
- Seja rigoroso na avaliação`,
      
      medium: `\n📊 PRIORIDADE MÉDIA:
- Use questões de nível intermediário
- Balance teoria e prática
- Foque em consolidação de conceitos`,
      
      low: `\n📚 PRIORIDADE BAIXA:
- Use questões de nível básico a intermediário
- Foque em fundamentos
- Priorize compreensão sobre complexidade`,
    };
    
    return priorityInstructions[context.subject.priority] || '';
  }
  
  /**
   * Build RAG context if available
   */
  protected buildRAGContext(context: StudyContext): string {
    if (!context.ragChunks || context.ragChunks.length === 0) {
      return '';
    }
    
    let ragText = `\n📚 MATERIAL DO ALUNO (use como referência):`;
    context.ragChunks.forEach((chunk, index) => {
      ragText += `\n\n[Trecho ${index + 1}]:\n${chunk.content.substring(0, 500)}...`;
    });
    
    return ragText;
  }
  
  private getMotivationLabel(level: string): string {
    const value = parseFloat(level);
    if (value >= 0.8) return 'Alta';
    if (value >= 0.5) return 'Média';
    return 'Baixa';
  }
  
  // Abstract methods to be implemented by subclasses
  abstract buildSystemPrompt(context: StudyContext): string;
  abstract buildQuestionPrompt(context: StudyContext, topic: string, difficulty: number): string;
  
  // Default implementations (can be overridden)
  buildHintPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer?: string,
    hintLevel: number = 1
  ): string {
    return `Forneça uma dica progressiva (nível ${hintLevel}/3) para a seguinte questão.
    
QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer ? `RESPOSTA DO ALUNO: ${studentAnswer}` : ''}

Dica nível ${hintLevel}:
- Nível 1: Dica sutil, aponta a direção
- Nível 2: Mais específica, mas sem revelar totalmente
- Nível 3: Bem detalhada, quase revelando a resposta

Forneça APENAS a dica, sem revelar a resposta diretamente.`;
  }
  
  buildExplanationPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer?: string
  ): string {
    return `Explique detalhadamente a resposta correta desta questão.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer ? `RESPOSTA DO ALUNO: ${studentAnswer}` : ''}

Forneça:
1. Por que esta é a resposta correta
2. Conceitos-chave envolvidos
3. Como evitar erros comuns
${studentAnswer && studentAnswer !== correctAnswer ? '4. Análise do erro cometido' : ''}`;
  }
}
