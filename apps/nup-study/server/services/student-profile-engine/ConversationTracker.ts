/**
 * ConversationTracker - Módulo encapsulado para rastrear e resumir conversas
 * 
 * Responsabilidades:
 * - Rastrear conversas do Professor IA
 * - Gerar resumos automáticos usando IA
 * - Extrair conceitos e tópicos discutidos
 * - Analisar compreensão e sentimento do aluno
 */

import { db } from '../../db.js';
import { conversationSummaries, type InsertConversationSummary } from '../../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import type { ConversationAnalysis } from './types.js';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ConversationTracker {
  private openaiApiKey: string;

  constructor(apiKey: string) {
    this.openaiApiKey = apiKey;
  }

  /**
   * Salva uma conversa completa e gera resumo automático
   */
  async trackConversation(
    userId: string,
    sessionId: string,
    messages: ConversationMessage[],
    startedAt: Date,
    endedAt?: Date
  ): Promise<string> {
    // Gerar análise da conversa
    const analysis = await this.analyzeConversation(messages);

    // Calcular duração
    const duration = endedAt && startedAt
      ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
      : null;

    // Criar transcrição completa
    const fullTranscript = messages
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n\n');

    // Salvar no banco
    const conversationData: InsertConversationSummary = {
      userId,
      sessionId,
      startedAt,
      endedAt: endedAt || null,
      duration,
      subject: analysis.subject || null,
      topics: analysis.topics,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      questionsAsked: analysis.questionsAsked,
      conceptsExplained: analysis.conceptsExplained,
      studentUnderstanding: analysis.studentUnderstanding,
      difficultConcepts: analysis.difficultConcepts,
      masteredConcepts: analysis.masteredConcepts,
      studentSentiment: analysis.studentSentiment,
      engagementScore: analysis.engagementScore.toString(),
      fullTranscript,
    };

    const [conversation] = await db.insert(conversationSummaries)
      .values(conversationData)
      .returning();

    console.log(`[ConversationTracker] Conversa salva: ${conversation.id}`);

    return conversation.id;
  }

  /**
   * Busca resumos das últimas conversas do aluno
   */
  async getRecentConversations(userId: string, limit: number = 5): Promise<ConversationAnalysis[]> {
    const conversations = await db.query.conversationSummaries.findMany({
      where: eq(conversationSummaries.userId, userId),
      orderBy: [desc(conversationSummaries.startedAt)],
      limit,
    });

    return conversations.map(c => ({
      summary: c.summary || '',
      keyPoints: c.keyPoints || [],
      subject: c.subject || undefined,
      topics: c.topics || [],
      questionsAsked: c.questionsAsked || 0,
      conceptsExplained: c.conceptsExplained || [],
      studentUnderstanding: (c.studentUnderstanding as any) || 'good',
      difficultConcepts: c.difficultConcepts || [],
      masteredConcepts: c.masteredConcepts || [],
      studentSentiment: (c.studentSentiment as any) || 'neutral',
      engagementScore: Number(c.engagementScore) || 3,
    }));
  }

  /**
   * Analisa conversa usando IA (GPT-4o-mini)
   */
  private async analyzeConversation(messages: ConversationMessage[]): Promise<ConversationAnalysis> {
    // Verificar se API key está configurada
    if (!this.openaiApiKey) {
      console.warn('[ConversationTracker] OpenAI API key não configurada, usando análise fallback');
      return this.simpleFallbackAnalysis(messages);
    }

    try {
      // Montar contexto da conversa
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'Aluno' : 'Professor'}: ${m.content}`)
        .join('\n');

      const prompt = `Analise a seguinte conversa entre um aluno e um Professor IA e forneça uma análise estruturada.

CONVERSA:
${conversationText}

Por favor, forneça uma análise JSON com:
- summary: Resumo conciso da conversa (max 200 caracteres)
- keyPoints: Array de 3-5 pontos principais discutidos
- subject: Matéria principal (se identificável, senão null)
- topics: Array de tópicos específicos abordados
- questionsAsked: Número de perguntas feitas pelo aluno
- conceptsExplained: Array de conceitos que o professor explicou
- studentUnderstanding: "excellent", "good", "partial" ou "struggling" (avalie pela qualidade das respostas)
- difficultConcepts: Array de conceitos onde o aluno teve dificuldade
- masteredConcepts: Array de conceitos que o aluno demonstrou dominar
- studentSentiment: "motivated", "neutral" ou "frustrated"
- engagementScore: Número de 1-5 (1=baixo engajamento, 5=alto engajamento)

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em análise de conversas educacionais. Sempre retorne JSON válido.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      
      // Parse JSON
      const analysis = JSON.parse(content);

      return {
        summary: analysis.summary || 'Conversa sobre estudos',
        keyPoints: analysis.keyPoints || [],
        subject: analysis.subject || undefined,
        topics: analysis.topics || [],
        questionsAsked: analysis.questionsAsked || 0,
        conceptsExplained: analysis.conceptsExplained || [],
        studentUnderstanding: analysis.studentUnderstanding || 'good',
        difficultConcepts: analysis.difficultConcepts || [],
        masteredConcepts: analysis.masteredConcepts || [],
        studentSentiment: analysis.studentSentiment || 'neutral',
        engagementScore: analysis.engagementScore || 3,
      };
    } catch (error) {
      console.error('[ConversationTracker] Erro ao analisar conversa:', error);
      
      // Fallback: análise simples sem IA
      return this.simpleFallbackAnalysis(messages);
    }
  }

  /**
   * Análise fallback simples (sem IA)
   */
  private simpleFallbackAnalysis(messages: ConversationMessage[]): ConversationAnalysis {
    const userMessages = messages.filter(m => m.role === 'user');
    const questionsAsked = userMessages.filter(m => m.content.includes('?')).length;

    return {
      summary: 'Conversa com Professor IA',
      keyPoints: ['Conversa registrada'],
      topics: [],
      questionsAsked,
      conceptsExplained: [],
      studentUnderstanding: 'good',
      difficultConcepts: [],
      masteredConcepts: [],
      studentSentiment: 'neutral',
      engagementScore: 3,
    };
  }
}
