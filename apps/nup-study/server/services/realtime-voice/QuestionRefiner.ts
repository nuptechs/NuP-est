/**
 * QuestionRefiner - Pré-processa perguntas do aluno antes de enviar ao Realtime Voice
 * 
 * Funcionalidades:
 * - Resume perguntas longas mantendo contexto essencial
 * - Adiciona contexto do perfil do aluno
 * - Otimiza para respostas concisas e focadas
 */

import OpenAI from 'openai';

interface StudentContext {
  name?: string;
  learningDifficulties?: string[];
  learningObjectives?: string[];
  currentSubject?: string;
  category?: string;
}

interface RefinedQuestion {
  original: string;
  refined: string;
  context: string;
  estimatedResponseTime: number; // em segundos
}

export class QuestionRefiner {
  private openai: OpenAI;
  private maxResponseTime: number; // segundos

  constructor(openaiApiKey: string, maxResponseTime: number = 30) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.maxResponseTime = maxResponseTime;
  }

  /**
   * Refina uma pergunta do aluno para otimizar a resposta do professor
   */
  async refineQuestion(
    question: string,
    studentContext: StudentContext
  ): Promise<RefinedQuestion> {
    try {
      // Se a pergunta for muito curta, não precisa refinar
      if (question.length < 100) {
        return {
          original: question,
          refined: question,
          context: this.buildContextPrompt(studentContext),
          estimatedResponseTime: this.maxResponseTime,
        };
      }

      // Usar GPT-4o-mini para refinamento (rápido e barato)
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que refina perguntas de estudantes.
Sua tarefa: resumir a pergunta mantendo TODAS as informações relevantes, mas de forma concisa e clara.

Regras:
1. Mantenha o objetivo principal da pergunta
2. Preserve detalhes técnicos importantes
3. Remova redundâncias e divagações
4. Máximo de 2-3 frases
5. Sempre em português

Contexto do aluno:
${this.buildContextPrompt(studentContext)}`,
          },
          {
            role: 'user',
            content: `Pergunta original: "${question}"

Refine esta pergunta mantendo o essencial.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const refined = response.choices[0]?.message?.content?.trim() || question;

      return {
        original: question,
        refined,
        context: this.buildContextPrompt(studentContext),
        estimatedResponseTime: this.maxResponseTime,
      };

    } catch (error) {
      console.error('[QuestionRefiner] Erro ao refinar pergunta:', error);
      // Fallback: retornar pergunta original
      return {
        original: question,
        refined: question,
        context: this.buildContextPrompt(studentContext),
        estimatedResponseTime: this.maxResponseTime,
      };
    }
  }

  /**
   * Constrói prompt de contexto para o professor
   */
  private buildContextPrompt(context: StudentContext): string {
    const parts: string[] = [];

    if (context.name) {
      parts.push(`Aluno: ${context.name}`);
    }

    if (context.currentSubject) {
      parts.push(`Matéria atual: ${context.currentSubject}`);
    }

    if (context.category) {
      const categoryMap: Record<string, string> = {
        exatas: 'Exatas (foco em lógica, exemplos práticos)',
        humanas: 'Humanas (foco em contexto, narrativa)',
        biologicas: 'Biológicas (foco em processos, visualização)',
      };
      parts.push(`Área: ${categoryMap[context.category] || context.category}`);
    }

    if (context.learningDifficulties && context.learningDifficulties.length > 0) {
      parts.push(`Dificuldades: ${context.learningDifficulties.join(', ')}`);
    }

    if (context.learningObjectives && context.learningObjectives.length > 0) {
      parts.push(`Objetivos: ${context.learningObjectives.slice(0, 2).join(', ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Gera instruções para o professor baseado no tempo máximo
   */
  generateTeacherInstructions(): string {
    return `INSTRUÇÕES IMPORTANTES:
1. Seja CONCISO - Máximo ${this.maxResponseTime} segundos de resposta
2. Seja OBJETIVO - Vá direto ao ponto, sem rodeios
3. Seja CLARO - Use linguagem simples e direta
4. Seja FOCADO - Responda exatamente o que foi perguntado
5. Use EXEMPLOS PRÁTICOS quando necessário, mas breves
6. Se a pergunta for complexa, ofereça resumo primeiro e pergunte se quer detalhes

Estilo: Professor experiente que conhece o aluno e sabe exatamente o que ele precisa ouvir.`;
  }

  /**
   * Atualiza o tempo máximo de resposta
   */
  setMaxResponseTime(seconds: number): void {
    this.maxResponseTime = Math.max(10, Math.min(60, seconds)); // Entre 10-60 segundos
    console.log(`[QuestionRefiner] Tempo máximo atualizado: ${this.maxResponseTime}s`);
  }

  /**
   * Obtém o tempo máximo atual
   */
  getMaxResponseTime(): number {
    return this.maxResponseTime;
  }
}
