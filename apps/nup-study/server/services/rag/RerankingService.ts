import { getAIManager } from '../ai/container';
import type { AIRequest } from '../ai/types';

/**
 * Serviço de reranking usando LLM como cross-encoder
 * Cross-encoder analisa relação query-document de forma mais profunda que embeddings
 * 
 * Alternativas:
 * - Usar API de reranking (Cohere, Jina AI)
 * - Usar modelo local (sentence-transformers/ms-marco-MiniLM)
 * - Usar LLM como juiz (atual - mais flexível mas mais custoso)
 */

export interface RerankingInput {
  query: string;
  document: string;
  metadata?: any;
}

export interface RerankingResult {
  score: number; // 0-1, quanto maior mais relevante
  metadata?: any;
}

export class RerankingService {
  /**
   * Rerank documents usando LLM como scoring function
   * LLM analisa relevância de cada documento para a query
   */
  async rerank(inputs: RerankingInput[]): Promise<RerankingResult[]> {
    if (inputs.length === 0) {
      return [];
    }

    try {
      // Para eficiência, vamos fazer batch scoring
      // Pedimos para LLM avaliar todos de uma vez
      const prompt = this.buildRerankingPrompt(inputs);
      
      const aiManager = getAIManager();
      const request: AIRequest = {
        messages: [
          {
            role: 'system',
            content: 'Você é um sistema de ranking de documentos. Avalie a relevância de cada documento para a query fornecida.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Baixa temperatura para avaliação consistente
        maxTokens: 500,
      };
      
      const response = await aiManager.request(request, {
        question: 'Relevance scoring for RAG reranking',
      });

      // Parsear scores da resposta
      const scores = this.parseRerankingScores(response.content);
      
      // Combinar com metadata original
      return inputs.map((input, idx) => ({
        score: scores[idx] || 0,
        metadata: input.metadata,
      }));
    } catch (error) {
      console.error('❌ [Reranking] Erro ao reranquear:', error);
      
      // Fallback: retornar scores uniformes
      return inputs.map(input => ({
        score: 0.5,
        metadata: input.metadata,
      }));
    }
  }

  /**
   * Constrói prompt para reranking
   */
  private buildRerankingPrompt(inputs: RerankingInput[]): string {
    const query = inputs[0].query;
    
    let prompt = `Query do usuário: "${query}"\n\n`;
    prompt += `Avalie a relevância de cada documento abaixo para esta query.\n`;
    prompt += `Retorne APENAS um array JSON com scores de 0 a 1 (ex: [0.9, 0.3, 0.7]).\n`;
    prompt += `Quanto mais relevante o documento, maior o score.\n\n`;
    prompt += `Documentos:\n\n`;

    inputs.forEach((input, idx) => {
      // Limitar tamanho do documento para não estourar contexto
      const truncatedDoc = input.document.substring(0, 500);
      prompt += `[${idx}] ${truncatedDoc}...\n\n`;
    });

    prompt += `\nRetorne apenas o array JSON com ${inputs.length} scores:`;
    
    return prompt;
  }

  /**
   * Parseia scores do response do LLM
   */
  private parseRerankingScores(response: string): number[] {
    try {
      // Tentar extrair array JSON da resposta
      const jsonMatch = response.match(/\[[\d\s.,]+\]/);
      if (!jsonMatch) {
        console.warn('⚠️ [Reranking] Não encontrou array JSON na resposta');
        return [];
      }

      const scores = JSON.parse(jsonMatch[0]);
      
      // Validar e normalizar
      return scores.map((s: any) => {
        const num = parseFloat(s);
        return isNaN(num) ? 0 : Math.max(0, Math.min(1, num));
      });
    } catch (error) {
      console.error('❌ [Reranking] Erro ao parsear scores:', error);
      return [];
    }
  }

  /**
   * Versão simplificada: reranking individual (mais preciso mas mais lento)
   */
  async rerankIndividual(inputs: RerankingInput[]): Promise<RerankingResult[]> {
    const results: RerankingResult[] = [];

    for (const input of inputs) {
      try {
        const score = await this.scoreDocumentRelevance(input.query, input.document);
        results.push({
          score,
          metadata: input.metadata,
        });
      } catch (error) {
        console.error('❌ [Reranking] Erro ao avaliar documento:', error);
        results.push({
          score: 0.5,
          metadata: input.metadata,
        });
      }
    }

    return results;
  }

  /**
   * Avalia relevância de um documento individual usando LLM
   */
  private async scoreDocumentRelevance(query: string, document: string): Promise<number> {
    const prompt = `Query: "${query}"

Documento:
${document.substring(0, 1000)}

Avalie a relevância deste documento para a query em uma escala de 0 a 1.
Retorne APENAS um número (ex: 0.85).`;

    const aiManager = getAIManager();
    const request: AIRequest = {
      messages: [
        {
          role: 'system',
          content: 'Você é um avaliador de relevância. Retorne apenas um número de 0 a 1.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      maxTokens: 10,
    };
    
    const response = await aiManager.request(request, {
      question: 'Score document relevance',
    });

    const score = parseFloat(response.content);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }
}

export const rerankingService = new RerankingService();
