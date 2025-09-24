import { BaseRAGService, RAGConfig, RAGDocument, RAGQuery, RAGSearchResponse, RAGResult } from '../shared/BaseRAGService';

/**
 * RAG especializado para geração de flashcards
 * Otimizado para extrair conceitos chave, definições e perguntas/respostas
 */
export class FlashcardRAGService extends BaseRAGService {
  constructor() {
    super({
      indexName: 'nup-flashcards-kb',
      embeddingModel: 'text-embedding-004',
      maxResults: 15,
      minSimilarity: 0.75,
      chunkSize: 800,  // Chunks menores para conceitos mais precisos
      overlapSize: 150
    });
  }

  /**
   * Processa documento para geração de flashcards
   * Foca em conceitos, definições, termos técnicos e relações importantes
   */
  async processDocument(document: RAGDocument): Promise<void> {
    this.validateDocument(document);
    
    const { result: processedData } = await this.measurePerformance(
      'Flashcard document processing',
      async () => {
        // Chunking especializado para flashcards
        const chunks = this.chunkForFlashcards(document.content);
        
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
                concepts: chunk.concepts,
                definitions: chunk.definitions,
                importance: chunk.importance,
                chunkType: 'flashcard',
                createdAt: document.createdAt.toISOString(),
                ...document.metadata
              }
            };
          })
        );

        // Upsert no Pinecone
        await this.pineconeService.upsertVectors(
          this.config.indexName,
          processedChunks
        );

        return { chunksProcessed: processedChunks.length };
      }
    );

    this.log('info', 'Document processed for flashcards', {
      documentId: document.id,
      chunksProcessed: processedData.chunksProcessed
    });
  }

  /**
   * Busca especializada para flashcards
   * Retorna conteúdo otimizado para geração de perguntas e respostas
   */
  async search(query: RAGQuery): Promise<RAGSearchResponse> {
    const { result: searchResults, duration } = await this.measurePerformance(
      'Flashcard search',
      async () => {
        const queryEmbedding = await this.generateEmbeddings(query.query);
        
        const searchResult = await this.pineconeService.query({
          indexName: this.config.indexName,
          vector: queryEmbedding,
          topK: query.maxResults || this.config.maxResults,
          filter: {
            userId: query.userId,
            chunkType: 'flashcard',
            ...query.filters
          },
          includeMetadata: true
        });

        const results: RAGResult[] = searchResult.matches
          .filter(match => match.score >= (query.minSimilarity || this.config.minSimilarity!))
          .map(match => ({
            id: match.id,
            content: match.metadata?.content as string,
            metadata: {
              ...match.metadata,
              concepts: match.metadata?.concepts,
              definitions: match.metadata?.definitions,
              importance: match.metadata?.importance
            },
            similarity: match.score
          }));

        return {
          results,
          totalFound: results.length,
          processingTime: duration,
          query: query.query
        };
      }
    );

    this.log('info', 'Flashcard search completed', {
      query: query.query,
      resultsFound: searchResults.totalFound,
      userId: query.userId
    });

    return searchResults;
  }

  /**
   * Gera flashcards automaticamente baseado em uma consulta
   */
  async generateFlashcards(query: string, userId: string, maxCards: number = 10): Promise<Array<{
    question: string;
    answer: string;
    concept: string;
    difficulty: 'easy' | 'medium' | 'hard';
    source: string;
  }>> {
    // Buscar conteúdo relevante
    const searchResults = await this.search({
      query,
      userId,
      maxResults: Math.min(maxCards * 2, 20)
    });

    if (searchResults.results.length === 0) {
      return [];
    }

    // Aqui integraria com OpenAI para gerar flashcards
    // Por agora, retorno estrutura base para implementação futura
    const flashcards = searchResults.results
      .slice(0, maxCards)
      .map((result, index) => ({
        question: this.extractQuestion(result.content),
        answer: this.extractAnswer(result.content),
        concept: result.metadata.concepts?.[0] || 'Conceito Geral',
        difficulty: this.assessDifficulty(result.content),
        source: result.metadata.documentId as string
      }));

    this.log('info', 'Flashcards generated', {
      query,
      cardsGenerated: flashcards.length,
      userId
    });

    return flashcards;
  }

  /**
   * Limpeza específica para flashcards
   */
  async cleanup(userId: string, olderThan?: Date): Promise<void> {
    await this.measurePerformance(
      'Flashcard cleanup',
      async () => {
        const filter: any = {
          userId,
          chunkType: 'flashcard'
        };

        if (olderThan) {
          filter.createdAt = { $lt: olderThan.toISOString() };
        }

        await this.pineconeService.deleteByFilter(this.config.indexName, filter);
      }
    );

    this.log('info', 'Flashcard cleanup completed', { userId, olderThan });
  }

  /**
   * Chunking especializado para flashcards
   * Identifica conceitos, definições e termos importantes
   */
  private chunkForFlashcards(content: string): Array<{
    content: string;
    concepts: string[];
    definitions: string[];
    importance: 'high' | 'medium' | 'low';
  }> {
    const baseChunks = this.chunkText(content);
    
    return baseChunks.map(chunk => ({
      content: chunk,
      concepts: this.extractConcepts(chunk),
      definitions: this.extractDefinitions(chunk),
      importance: this.assessImportance(chunk)
    }));
  }

  /**
   * Extrai conceitos principais do texto
   */
  private extractConcepts(text: string): string[] {
    const concepts: string[] = [];
    
    // Padrões para identificar conceitos
    const patterns = [
      /([A-Z][a-záàâãéêíóôõú]+(?:\s+[A-Z][a-záàâãéêíóôõú]+)*)\s*(?:é|são|refere-se|define-se)/gi,
      /(?:conceito|termo|definição)\s+(?:de\s+)?([A-Z][a-záàâãéêíóôõú]+(?:\s+[A-Z][a-záàâãéêíóôõú]+)*)/gi,
      /([A-Z][a-záàâãéêíóôõú]+(?:\s+[A-Z][a-záàâãéêíóôõú]+)*)\s*:/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const concept = match[1]?.trim();
        if (concept && concept.length > 3 && concept.length < 50) {
          concepts.push(concept);
        }
      }
    });

    return [...new Set(concepts)].slice(0, 5); // Máximo 5 conceitos únicos
  }

  /**
   * Extrai definições do texto
   */
  private extractDefinitions(text: string): string[] {
    const definitions: string[] = [];
    
    // Padrões para definições
    const patterns = [
      /(.+?)\s+(?:é|são|refere-se|define-se|significa)\s+(.+?)(?:\.|;|!|\?)/gi,
      /(?:define-se|entende-se)\s+(.+?)\s+como\s+(.+?)(?:\.|;|!|\?)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && definitions.length < 3) {
        const definition = match[2]?.trim();
        if (definition && definition.length > 10) {
          definitions.push(definition);
        }
      }
    });

    return definitions;
  }

  /**
   * Avalia a importância do conteúdo para flashcards
   */
  private assessImportance(text: string): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Indicadores de alta importância
    const highImportancePatterns = [
      /(?:importante|fundamental|essencial|crítico|obrigatório)/i,
      /(?:lei|artigo|inciso|parágrafo)/i,
      /(?:princípio|conceito|definição)/i
    ];

    // Indicadores de média importância
    const mediumImportancePatterns = [
      /(?:recomenda|sugere|pode|deve)/i,
      /(?:exemplo|ilustração|caso)/i
    ];

    highImportancePatterns.forEach(pattern => {
      if (pattern.test(text)) score += 2;
    });

    mediumImportancePatterns.forEach(pattern => {
      if (pattern.test(text)) score += 1;
    });

    if (score >= 3) return 'high';
    if (score >= 1) return 'medium';
    return 'low';
  }

  /**
   * Extrai pergunta do conteúdo (implementação básica)
   */
  private extractQuestion(content: string): string {
    // Implementação simplificada - seria otimizada com IA
    const concepts = this.extractConcepts(content);
    if (concepts.length > 0) {
      return `O que é ${concepts[0]}?`;
    }
    return `Explique o conceito apresentado no seguinte trecho.`;
  }

  /**
   * Extrai resposta do conteúdo (implementação básica)
   */
  private extractAnswer(content: string): string {
    // Implementação simplificada - seria otimizada com IA
    const sentences = content.split('.').filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  /**
   * Avalia dificuldade do conteúdo
   */
  private assessDifficulty(content: string): 'easy' | 'medium' | 'hard' {
    const complexWords = content.split(' ').filter(word => word.length > 10).length;
    const sentenceLength = content.split('.').reduce((avg, sentence) => {
      const words = sentence.split(' ').length;
      return (avg + words) / 2;
    }, 0);

    if (complexWords > 3 || sentenceLength > 15) return 'hard';
    if (complexWords > 1 || sentenceLength > 10) return 'medium';
    return 'easy';
  }
}