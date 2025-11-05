import type { ChatMessage } from "@shared/schema";
import type { IAIManager } from "../ai/interfaces";

export interface ConversationTopic {
  id: string;
  title: string;
  summary: string;
  messageIds: string[];
  startTime: string;
  endTime: string;
  messageCount: number;
}

export interface TemporalGroup {
  period: "today" | "yesterday" | "this_week" | "last_week" | "older";
  label: string;
  topics: ConversationTopic[];
  totalMessages: number;
}

/**
 * Analisa conversas e agrupa semanticamente usando IA
 */
export class ConversationAnalyzer {
  private aiManager: IAIManager;
  private cache: Map<string, TemporalGroup[]>;

  constructor(aiManager: IAIManager) {
    this.aiManager = aiManager;
    this.cache = new Map();
  }

  /**
   * Agrupa mensagens temporalmente e semanticamente
   */
  async analyzeConversations(
    messages: ChatMessage[],
    cacheKey?: string
  ): Promise<TemporalGroup[]> {
    // Check cache first
    if (cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Step 1: Group by time periods
    const temporalGroups = this.groupByTimePeriod(messages);

    // Step 2: For each temporal group, identify semantic topics using AI
    const enrichedGroups = await Promise.all(
      temporalGroups.map(async (group) => {
        const topics = await this.identifyTopics(group.messages);
        return {
          period: group.period,
          label: group.label,
          topics,
          totalMessages: group.messages.length,
        };
      })
    );

    // Cache result
    if (cacheKey) {
      this.cache.set(cacheKey, enrichedGroups);
    }

    return enrichedGroups;
  }

  /**
   * Agrupa mensagens por período temporal
   */
  private groupByTimePeriod(messages: ChatMessage[]): Array<{
    period: "today" | "yesterday" | "this_week" | "last_week" | "older";
    label: string;
    messages: ChatMessage[];
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const groups = {
      today: { period: "today" as const, label: "Hoje", messages: [] as ChatMessage[] },
      yesterday: { period: "yesterday" as const, label: "Ontem", messages: [] as ChatMessage[] },
      this_week: { period: "this_week" as const, label: "Esta Semana", messages: [] as ChatMessage[] },
      last_week: { period: "last_week" as const, label: "Semana Passada", messages: [] as ChatMessage[] },
      older: { period: "older" as const, label: "Mais Antigo", messages: [] as ChatMessage[] },
    };

    for (const message of messages) {
      const messageDate = new Date(message.createdAt || new Date());

      if (messageDate >= today) {
        groups.today.messages.push(message);
      } else if (messageDate >= yesterday) {
        groups.yesterday.messages.push(message);
      } else if (messageDate >= thisWeekStart) {
        groups.this_week.messages.push(message);
      } else if (messageDate >= lastWeekStart) {
        groups.last_week.messages.push(message);
      } else {
        groups.older.messages.push(message);
      }
    }

    return Object.values(groups).filter((g) => g.messages.length > 0);
  }

  /**
   * Usa IA para identificar tópicos semânticos em um grupo de mensagens
   */
  private async identifyTopics(messages: ChatMessage[]): Promise<ConversationTopic[]> {
    if (messages.length === 0) return [];

    // Se houver poucas mensagens (< 4), retorna um único tópico
    if (messages.length < 4) {
      return [
        {
          id: `topic-${messages[0].id}`,
          title: this.extractFirstQuestion(messages) || "Conversa",
          summary: "Conversa breve",
          messageIds: messages.map((m) => m.id),
          startTime: messages[0].createdAt?.toString() || new Date().toISOString(),
          endTime: messages[messages.length - 1].createdAt?.toString() || new Date().toISOString(),
          messageCount: messages.length,
        },
      ];
    }

    // Preparar contexto para a IA
    const conversationText = messages
      .map((m, i) => `[${i + 1}] ${m.role === "user" ? "Aluno" : "Assistente"}: ${m.content}`)
      .join("\n");

    const prompt = `Analise esta conversa entre um aluno e um assistente de estudos e identifique os diferentes TÓPICOS/ASSUNTOS discutidos.

CONVERSA:
${conversationText}

Agrupe as mensagens por assunto e retorne um JSON com este formato exato:
{
  "topics": [
    {
      "title": "título curto do tópico (max 50 chars)",
      "summary": "resumo breve (max 100 chars)",
      "messageIndices": [1, 2, 3]
    }
  ]
}

REGRAS:
- Máximo 5 tópicos
- Títulos devem ser descritivos e curtos
- Agrupe mensagens relacionadas ao mesmo assunto
- messageIndices são os números entre colchetes [1], [2], etc
- Retorne APENAS o JSON, sem texto adicional`;

    try {
      const response = await this.aiManager.request({
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em análise semântica de conversas educacionais. Retorne apenas JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 800,
      }, {
        question: "Agrupar mensagens por tópico semântico"
      });

      const content = response.content || "{}";
      const parsed = JSON.parse(content);

      // Converter para nosso formato
      const topics: ConversationTopic[] = (parsed.topics || []).map((topic: any, idx: number) => {
        const messageIndices = topic.messageIndices || [];
        const topicMessages = messageIndices
          .map((i: number) => messages[i - 1])
          .filter((m: ChatMessage | undefined) => m !== undefined);

        return {
          id: `topic-${idx}-${Date.now()}`,
          title: topic.title || "Sem título",
          summary: topic.summary || "",
          messageIds: topicMessages.map((m: ChatMessage) => m.id),
          startTime: topicMessages[0]?.createdAt?.toString() || messages[0].createdAt?.toString() || new Date().toISOString(),
          endTime: topicMessages[topicMessages.length - 1]?.createdAt?.toString() || messages[messages.length - 1].createdAt?.toString() || new Date().toISOString(),
          messageCount: topicMessages.length,
        };
      });

      return topics;
    } catch (error) {
      console.error("Error analyzing conversation topics:", error);
      // Fallback: retorna um único tópico
      return [
        {
          id: `topic-fallback-${Date.now()}`,
          title: this.extractFirstQuestion(messages) || "Conversa",
          summary: "Múltiplos assuntos discutidos",
          messageIds: messages.map((m) => m.id),
          startTime: messages[0].createdAt?.toString() || new Date().toISOString(),
          endTime: messages[messages.length - 1].createdAt?.toString() || new Date().toISOString(),
          messageCount: messages.length,
        },
      ];
    }
  }

  /**
   * Extrai a primeira pergunta do usuário como título
   */
  private extractFirstQuestion(messages: ChatMessage[]): string | null {
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (!firstUserMessage) return null;

    let text = firstUserMessage.content;
    // Truncar se muito longo
    if (text.length > 50) {
      text = text.substring(0, 47) + "...";
    }
    return text;
  }

  /**
   * Limpa cache antigo
   */
  clearCache(cacheKey?: string) {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }
}
