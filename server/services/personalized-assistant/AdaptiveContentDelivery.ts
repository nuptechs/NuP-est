import type { IStorage } from '../../storage';
import type { 
  PersonalizedAssistant,
  StudentLearningProfile,
  ProfileLearningDifficulty
} from '../../../shared/schema';
import { AIManager } from '../ai/manager';

/**
 * Adaptive Content Delivery Service
 * 
 * Generates profile-aware questions, hints, and explanations adapted to
 * each student's learning profile, difficulties, and preferences.
 */
export class AdaptiveContentDelivery {
  constructor(
    private storage: IStorage,
    private aiManager: AIManager
  ) {}

  /**
   * Generate a personalized question based on student profile
   */
  async generateQuestion(
    assistantId: string,
    topic: string,
    difficulty?: number
  ): Promise<{
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    adaptations: string[];
  }> {
    const assistant = await this.storage.getPersonalizedAssistant(assistantId);
    if (!assistant) {
      throw new Error('Assistant not found');
    }

    const profile = await this.storage.getStudentProfile(assistant.profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Get profile learning difficulties
    const difficulties = await this.storage.getProfileLearningDifficulties(profile.id);

    // Build adapted question prompt
    const prompt = await this.buildQuestionPrompt(assistant, profile, difficulties, topic, difficulty);

    // Generate question using AI
    const systemPrompt = await this.buildSystemPrompt(assistant, profile);
    const response = await this.aiManager.request({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
    });

    return this.parseQuestionResponse(response.content);
  }

  /**
   * Generate progressive hints for a question
   */
  async generateHints(
    assistantId: string,
    question: string,
    correctAnswer: string,
    studentAnswer?: string,
    previousHints: string[] = []
  ): Promise<{
    hint: string;
    hintLevel: number;
    revealPercentage: number;
  }> {
    const assistant = await this.storage.getPersonalizedAssistant(assistantId);
    if (!assistant) {
      throw new Error('Assistant not found');
    }

    const profile = await this.storage.getStudentProfile(assistant.profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const difficulties = await this.storage.getProfileLearningDifficulties(profile.id);

    const hintLevel = previousHints.length + 1;
    const prompt = this.buildHintPrompt(
      question,
      correctAnswer,
      studentAnswer,
      previousHints,
      hintLevel,
      profile,
      difficulties
    );

    const systemPrompt = await this.buildSystemPrompt(assistant, profile);
    const response = await this.aiManager.request({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.6,
      maxTokens: 300,
    });

    return {
      hint: response.content.trim(),
      hintLevel,
      revealPercentage: Math.min(hintLevel * 25, 75), // Max 75% reveal
    };
  }

  /**
   * Generate personalized explanation for a concept
   */
  async generateExplanation(
    assistantId: string,
    concept: string,
    context?: string
  ): Promise<{
    explanation: string;
    examples: string[];
    visualAids?: string[];
    adaptations: string[];
  }> {
    const assistant = await this.storage.getPersonalizedAssistant(assistantId);
    if (!assistant) {
      throw new Error('Assistant not found');
    }

    const profile = await this.storage.getStudentProfile(assistant.profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const difficulties = await this.storage.getProfileLearningDifficulties(profile.id);

    const prompt = this.buildExplanationPrompt(concept, context, profile, difficulties);

    const systemPrompt = await this.buildSystemPrompt(assistant, profile);
    const response = await this.aiManager.request({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1500,
    });

    return this.parseExplanationResponse(response.content);
  }

  /**
   * Adapt content difficulty based on student performance
   */
  async adaptContentDifficulty(
    currentDifficulty: number,
    recentPerformance: {
      correct: number;
      total: number;
      avgTime: number;
    },
    profile: StudentLearningProfile
  ): Promise<{
    newDifficulty: number;
    reasoning: string;
    recommendations: string[];
  }> {
    const motivationLevel = parseFloat(profile.motivationLevel || '0.5');
    
    let newDifficulty = currentDifficulty;
    let reasoning = '';
    const recommendations: string[] = [];

    // Guard against zero attempts
    if (recentPerformance.total === 0) {
      return {
        newDifficulty: currentDifficulty,
        reasoning: 'Dados insuficientes para ajustar dificuldade. Aguardando mais tentativas.',
        recommendations: [
          'Continue praticando no nível atual',
          'Coletar mais dados de desempenho',
        ],
      };
    }

    const accuracy = recentPerformance.correct / recentPerformance.total;

    // High accuracy - increase difficulty
    if (accuracy >= 0.8 && recentPerformance.avgTime < 60) {
      newDifficulty = Math.min(currentDifficulty + 0.5, 3.0);
      reasoning = 'Estudante demonstrando alta compreensão. Aumentando dificuldade para manter engajamento.';
      recommendations.push('Introduzir conceitos mais avançados');
      recommendations.push('Adicionar questões de aplicação prática');
    }
    // Low accuracy - decrease difficulty
    else if (accuracy < 0.5) {
      newDifficulty = Math.max(currentDifficulty - 0.5, 0.5);
      reasoning = 'Estudante com dificuldade. Reduzindo complexidade para construir confiança.';
      recommendations.push('Revisar conceitos fundamentais');
      recommendations.push('Fornecer mais exemplos práticos');
      recommendations.push('Considerar quebrar conteúdo em partes menores');
    }
    // Moderate performance - maintain with slight adjustments
    else {
      if (accuracy >= 0.65) {
        newDifficulty = Math.min(currentDifficulty + 0.2, 3.0);
        reasoning = 'Progresso consistente. Aumentando ligeiramente a dificuldade.';
      } else {
        reasoning = 'Mantendo nível atual para consolidação.';
      }
      recommendations.push('Continuar prática no nível atual');
      recommendations.push('Monitorar evolução nas próximas sessões');
    }

    // Consider motivation level
    if (motivationLevel < 0.4 && newDifficulty > currentDifficulty) {
      newDifficulty = currentDifficulty; // Don't increase if low motivation
      recommendations.push('Priorizar engajamento antes de aumentar dificuldade');
      recommendations.push('Usar gamificação e recompensas');
    }

    return {
      newDifficulty,
      reasoning,
      recommendations,
    };
  }

  /**
   * Build system prompt for content generation
   */
  private async buildSystemPrompt(
    assistant: PersonalizedAssistant,
    profile: StudentLearningProfile
  ): Promise<string> {
    const personalityPrompts = {
      encouraging: 'Use linguagem encorajadora e positiva. Celebre progressos e mantenha o estudante motivado.',
      professional: 'Mantenha tom profissional e objetivo. Seja claro e preciso nas explicações.',
      friendly: 'Use linguagem amigável e acessível. Seja como um mentor próximo.',
      strict: 'Seja direto e exigente. Mantenha altos padrões mas seja justo.',
    };

    const stylePrompts = {
      simple: 'Use linguagem simples e direta. Evite termos complexos. Explique tudo de forma clara.',
      detailed: 'Forneça explicações completas e detalhadas. Use exemplos e aprofunde conceitos.',
      visual: 'Use analogias visuais. Descreva diagramas e representações gráficas mentais.',
      step_by_step: 'Quebre tudo em passos numerados. Sempre estruture o conteúdo sequencialmente.',
    };

    const personalityKey = assistant.personality as keyof typeof personalityPrompts;
    const styleKey = assistant.communicationStyle as keyof typeof stylePrompts;

    return `Você é um assistente de ensino personalizado.

PERSONALIDADE: ${personalityPrompts[personalityKey]}
ESTILO: ${stylePrompts[styleKey]}

PERFIL DO ESTUDANTE:
- Objetivo: ${profile.primaryGoal}
- Motivação: ${profile.motivationLevel}
- Precisa encorajamento: ${profile.needsEncouragement ? 'Sim' : 'Não'}
- Duração ideal de estudo: ${profile.optimalStudyDuration || 45} minutos

Adapte todo conteúdo considerando essas características.`;
  }

  /**
   * Build question generation prompt
   */
  private async buildQuestionPrompt(
    assistant: PersonalizedAssistant,
    profile: StudentLearningProfile,
    difficulties: ProfileLearningDifficulty[],
    topic: string,
    targetDifficulty?: number
  ): Promise<string> {
    const adaptations = (assistant.currentAdaptations as any) || {};
    const difficultyLevel = targetDifficulty || 1.5;

    let prompt = `Crie uma questão de múltipla escolha sobre: ${topic}

NÍVEL DE DIFICULDADE: ${difficultyLevel.toFixed(1)}/3.0
FORMATO: Múltipla escolha com 4 alternativas

`;

    // Add adaptations based on difficulties
    if (difficulties.length > 0) {
      prompt += 'ADAPTAÇÕES NECESSÁRIAS:\n';
      for (const diff of difficulties) {
        const difficultyData = await this.storage.getLearningDifficulty(diff.difficultyId);
        if (difficultyData && diff.adaptationsApplied) {
          const adaptations = JSON.stringify(diff.adaptationsApplied);
          prompt += `- ${difficultyData.displayName}: ${adaptations}\n`;
        }
      }
      prompt += '\n';
    }

    // Add content pacing
    if (adaptations.contentPacing) {
      prompt += `RITMO: ${adaptations.contentPacing}\n`;
    }

    prompt += `
Retorne no formato JSON:
{
  "question": "texto da questão",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": "A",
  "explanation": "explicação detalhada",
  "adaptations": ["lista de adaptações aplicadas"]
}`;

    return prompt;
  }

  /**
   * Build hint generation prompt
   */
  private buildHintPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer: string | undefined,
    previousHints: string[],
    hintLevel: number,
    profile: StudentLearningProfile,
    difficulties: ProfileLearningDifficulty[]
  ): string {
    let prompt = `Forneça uma dica para ajudar o estudante a responder esta questão:

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
`;

    if (studentAnswer) {
      prompt += `RESPOSTA DO ESTUDANTE: ${studentAnswer}\n`;
    }

    if (previousHints.length > 0) {
      prompt += `\nDICAS JÁ FORNECIDAS:\n${previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`;
    }

    prompt += `\nNÍVEL DA DICA: ${hintLevel}/4
`;

    // Adapt hint level based on difficulties
    const hasAttentionIssues = difficulties.some((d: any) => {
      const adaptations = d.adaptationsApplied ? JSON.stringify(d.adaptationsApplied) : '';
      return adaptations.toLowerCase().includes('atenção');
    });

    if (hasAttentionIssues) {
      prompt += '\nOBSERVAÇÃO: Estudante com dificuldade de atenção. Seja conciso e direto.\n';
    }

    prompt += `
INSTRUÇÕES:
- Nível 1: Dica sutil que direciona o raciocínio
- Nível 2: Dica mais clara, mas não revela a resposta
- Nível 3: Dica bem específica, quase revelando a resposta
- Nível 4: Praticamente entregue a resposta, mas deixe o estudante concluir

Forneça apenas a dica, sem explicações adicionais.`;

    return prompt;
  }

  /**
   * Build explanation generation prompt
   */
  private buildExplanationPrompt(
    concept: string,
    context: string | undefined,
    profile: StudentLearningProfile,
    difficulties: ProfileLearningDifficulty[]
  ): string {
    let prompt = `Explique o conceito: ${concept}\n`;

    if (context) {
      prompt += `CONTEXTO: ${context}\n`;
    }

    prompt += '\n';

    // Add specific adaptations for difficulties
    if (difficulties.length > 0) {
      prompt += 'ADAPTE A EXPLICAÇÃO PARA:\n';
      difficulties.forEach((d: any) => {
        if (d.adaptationsApplied) {
          const adaptations = JSON.stringify(d.adaptationsApplied);
          prompt += `- ${adaptations}\n`;
        }
      });
      prompt += '\n';
    }

    // Communication style adaptation
    if (profile.preferredContentTypes) {
      prompt += `FORMATOS PREFERIDOS: ${profile.preferredContentTypes.join(', ')}\n`;
    }

    prompt += `
Retorne no formato JSON:
{
  "explanation": "explicação adaptada do conceito",
  "examples": ["exemplo 1", "exemplo 2", "exemplo 3"],
  "visualAids": ["descrição de diagrama 1", "descrição de diagrama 2"],
  "adaptations": ["lista das adaptações aplicadas"]
}`;

    return prompt;
  }

  /**
   * Parse question response from AI
   */
  private parseQuestionResponse(response: string): {
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    adaptations: string[];
  } {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          question: parsed.question || '',
          options: parsed.options,
          correctAnswer: parsed.correctAnswer || '',
          explanation: parsed.explanation || '',
          adaptations: parsed.adaptations || [],
        };
      }
    } catch (e) {
      console.error('Failed to parse question response:', e);
    }

    // Fallback parsing
    return {
      question: response,
      correctAnswer: 'A',
      explanation: 'Explicação não disponível',
      adaptations: [],
    };
  }

  /**
   * Parse explanation response from AI
   */
  private parseExplanationResponse(response: string): {
    explanation: string;
    examples: string[];
    visualAids?: string[];
    adaptations: string[];
  } {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          explanation: parsed.explanation || response,
          examples: parsed.examples || [],
          visualAids: parsed.visualAids,
          adaptations: parsed.adaptations || [],
        };
      }
    } catch (e) {
      console.error('Failed to parse explanation response:', e);
    }

    // Fallback
    return {
      explanation: response,
      examples: [],
      adaptations: [],
    };
  }
}
