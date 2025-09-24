import { BaseRAGService, RAGConfig, RAGDocument, RAGQuery, RAGSearchResponse, RAGResult } from '../shared/BaseRAGService';

/**
 * RAG especializado para chat conversacional com IA
 * Mantém contexto conversacional e memória de longo prazo
 */
export class ChatRAGService extends BaseRAGService {
  private conversationHistory: Map<string, Array<{
    timestamp: Date;
    userMessage: string;
    aiResponse: string;
    context: string[];
  }>> = new Map();

  constructor() {
    super({
      indexName: 'nup-chat-context',
      embeddingModel: 'text-embedding-004',
      maxResults: 8,
      minSimilarity: 0.7,
      chunkSize: 1200, // Chunks maiores para contexto conversacional
      overlapSize: 300
    });
  }

  /**
   * Processa documento para contexto conversacional
   * Foca em criar conhecimento conversacional e contextual
   */
  async processDocument(document: RAGDocument): Promise<void> {
    this.validateDocument(document);
    
    const { result: processedData } = await this.measurePerformance(
      'Chat context document processing',
      async () => {
        // Chunking conversacional
        const chunks = this.chunkForConversation(document.content);
        
        // Processar cada chunk
        const processedChunks = await Promise.all(
          chunks.map(async (chunk, index) => {
            const embeddings = await this.generateEmbeddings(chunk.content);
            
            return {
              id: `${document.id}_chunk_${index}`,
              values: embeddings,
              metadata: {
                userId: document.userId,
                documentId: document.id,
                chunkIndex: index,
                content: chunk.content,
                topics: chunk.topics,
                entities: chunk.entities,
                conversationalValue: chunk.conversationalValue,
                chunkType: 'chat_context',
                createdAt: document.createdAt.toISOString(),
                ...document.metadata
              }
            };
          })
        );

        // Upsert no Pinecone
        await this.pineconeAdapter.upsertVectors(
          this.config.indexName,
          processedChunks
        );

        return { chunksProcessed: processedChunks.length };
      }
    );

    this.log('info', 'Document processed for chat context', {
      documentId: document.id,
      chunksProcessed: processedData.chunksProcessed
    });
  }

  /**
   * Busca contextual para conversação
   * Considera histórico da conversa e relevância contextual
   */
  async search(query: RAGQuery): Promise<RAGSearchResponse> {
    const { result: searchResults, duration } = await this.measurePerformance(
      'Chat contextual search',
      async (): Promise<RAGSearchResponse> => {
        // Enriquecer query com contexto conversacional
        const enrichedQuery = this.enrichQueryWithContext(query.query, query.userId);
        
        const queryEmbedding = await this.generateEmbeddings(enrichedQuery);
        
        const searchResult = await this.pineconeAdapter.query({
          indexName: this.config.indexName,
          vector: queryEmbedding,
          topK: query.maxResults || this.config.maxResults,
          filter: {
            userId: query.userId,
            chunkType: 'chat_context',
            ...query.filters
          },
          includeMetadata: true
        });

        const results: RAGResult[] = searchResult.matches
          .filter((match: any) => match.score >= (query.minSimilarity || this.config.minSimilarity!))
          .map((match: any) => ({
            id: match.id,
            content: match.metadata?.content as string,
            metadata: {
              ...match.metadata,
              topics: match.metadata?.topics,
              entities: match.metadata?.entities,
              conversationalValue: match.metadata?.conversationalValue
            },
            similarity: match.score
          }))
          // Reordenar por valor conversacional
          .sort((a: any, b: any) => {
            const aValue = a.metadata.conversationalValue as number || 0;
            const bValue = b.metadata.conversationalValue as number || 0;
            return (b.similarity * bValue) - (a.similarity * aValue);
          });

        return {
          results,
          totalFound: results.length,
          processingTime: duration,
          query: query.query
        };
      }
    );

    this.log('info', 'Chat contextual search completed', {
      originalQuery: query.query,
      resultsFound: searchResults.totalFound,
      userId: query.userId
    });

    return searchResults;
  }

  /**
   * Busca com contexto conversacional completo
   * Inclui histórico e contexto da conversa atual
   */
  async searchWithConversationContext(
    userMessage: string,
    userId: string,
    conversationId?: string
  ): Promise<{
    searchResults: RAGSearchResponse;
    conversationContext: string[];
    suggestedResponses: string[];
  }> {
    // Obter contexto da conversa
    const conversationContext = this.getConversationContext(userId);
    
    // Busca principal
    const searchResults = await this.search({
      query: userMessage,
      userId,
      maxResults: 6
    });

    // Extrair contextos relevantes
    const contexts = searchResults.results.map(result => result.content);
    
    // Sugestões de resposta baseadas no contexto
    const suggestedResponses = this.generateResponseSuggestions(
      userMessage,
      contexts,
      conversationContext
    );

    this.log('info', 'Conversation search with context completed', {
      userMessage,
      contextsFound: contexts.length,
      suggestionsGenerated: suggestedResponses.length,
      userId
    });

    return {
      searchResults,
      conversationContext,
      suggestedResponses
    };
  }

  /**
   * Armazena interação conversacional na memória
   */
  storeConversationTurn(
    userId: string,
    userMessage: string,
    aiResponse: string,
    context: string[]
  ): void {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const userHistory = this.conversationHistory.get(userId)!;
    
    // Adicionar nova interação
    userHistory.push({
      timestamp: new Date(),
      userMessage,
      aiResponse,
      context
    });

    // Manter apenas últimas 10 interações por usuário
    if (userHistory.length > 10) {
      userHistory.splice(0, userHistory.length - 10);
    }

    this.log('info', 'Conversation turn stored', {
      userId,
      totalTurns: userHistory.length
    });
  }

  /**
   * Limpeza específica para contexto de chat
   */
  async cleanup(userId: string, olderThan?: Date): Promise<void> {
    await this.measurePerformance(
      'Chat context cleanup',
      async () => {
        // Limpar vetores
        const filter: any = {
          userId,
          chunkType: 'chat_context'
        };

        if (olderThan) {
          filter.createdAt = { $lt: olderThan.toISOString() };
        }

        await this.pineconeAdapter.deleteByFilter(this.config.indexName, filter);

        // Limpar histórico conversacional
        if (this.conversationHistory.has(userId)) {
          const userHistory = this.conversationHistory.get(userId)!;
          if (olderThan) {
            const filteredHistory = userHistory.filter(turn => turn.timestamp > olderThan);
            this.conversationHistory.set(userId, filteredHistory);
          } else {
            this.conversationHistory.delete(userId);
          }
        }
      }
    );

    this.log('info', 'Chat context cleanup completed', { userId, olderThan });
  }

  /**
   * Chunking especializado para conversação
   * Identifica tópicos, entidades e valor conversacional
   */
  private chunkForConversation(content: string): Array<{
    content: string;
    topics: string[];
    entities: string[];
    conversationalValue: number;
  }> {
    const baseChunks = this.chunkText(content);
    
    return baseChunks.map(chunk => ({
      content: chunk,
      topics: this.extractTopics(chunk),
      entities: this.extractEntities(chunk),
      conversationalValue: this.assessConversationalValue(chunk)
    }));
  }

  /**
   * Extrai tópicos principais para contexto conversacional
   */
  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    
    // Padrões para identificar tópicos
    const patterns = [
      /(?:sobre|acerca de|relativo a|quanto a)\s+([a-záàâãéêíóôõú]+(?:\s+[a-záàâãéêíóôõú]+)*)/gi,
      /(?:tema|tópico|assunto|questão)\s+(?:de\s+)?([a-záàâãéêíóôõú]+(?:\s+[a-záàâãéêíóôõú]+)*)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const topic = match[1]?.trim();
        if (topic && topic.length > 3 && topic.length < 30) {
          topics.push(topic);
        }
      }
    });

    return Array.from(new Set(topics)).slice(0, 3);
  }

  /**
   * Extrai entidades relevantes (pessoas, lugares, organizações)
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Padrões simples para entidades
    const patterns = [
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, // Nomes próprios simples
      /\b[A-Z]{2,}\b/g, // Siglas
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && entities.length < 5) {
        entities.push(match[0]);
      }
    });

    return Array.from(new Set(entities));
  }

  /**
   * Avalia valor conversacional do conteúdo
   */
  private assessConversationalValue(text: string): number {
    let score = 0.5; // Base score
    
    // Indicadores de alto valor conversacional
    if (/\?/.test(text)) score += 0.2; // Contém perguntas
    if (/(?:exemplo|caso|situação)/i.test(text)) score += 0.15; // Exemplos práticos
    if (/(?:como|quando|onde|por que|qual)/i.test(text)) score += 0.1; // Palavras interrogativas
    if (/(?:importante|fundamental|deve|precisa)/i.test(text)) score += 0.1; // Importância
    if (/(?:atenção|cuidado|observação)/i.test(text)) score += 0.05; // Alertas

    return Math.min(score, 1.0);
  }

  /**
   * Enriquece query com contexto conversacional
   */
  private enrichQueryWithContext(query: string, userId: string): string {
    const history = this.conversationHistory.get(userId);
    if (!history || history.length === 0) return query;

    // Pegar últimas 2 interações para contexto
    const recentHistory = history.slice(-2);
    const contextTerms = recentHistory.flatMap(turn => 
      [...this.extractTopics(turn.userMessage), ...this.extractTopics(turn.aiResponse)]
    );

    if (contextTerms.length === 0) return query;

    return `${query} contexto: ${contextTerms.join(' ')}`;
  }

  /**
   * Obtém contexto conversacional atual
   */
  private getConversationContext(userId: string): string[] {
    const history = this.conversationHistory.get(userId);
    if (!history) return [];

    return history.slice(-3).map(turn => `Usuario: ${turn.userMessage} | IA: ${turn.aiResponse}`);
  }

  /**
   * Gera sugestões de resposta baseadas no contexto
   */
  private generateResponseSuggestions(
    userMessage: string,
    contexts: string[],
    conversationHistory: string[]
  ): string[] {
    // Implementação simplificada - seria otimizada com IA
    const suggestions: string[] = [];

    if (userMessage.includes('?')) {
      suggestions.push('Posso explicar melhor esse conceito se preferir.');
    }

    if (contexts.length > 0) {
      suggestions.push('Baseando-me nos documentos disponíveis...');
    }

    if (conversationHistory.length > 0) {
      suggestions.push('Continuando nossa conversa anterior...');
    }

    return suggestions.slice(0, 3);
  }
}