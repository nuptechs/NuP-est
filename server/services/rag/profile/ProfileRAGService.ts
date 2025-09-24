import { BaseRAGService, RAGConfig, RAGDocument, RAGQuery, RAGSearchResponse, RAGResult } from '../shared/BaseRAGService';

/**
 * RAG especializado para perfil do usuário e preferências de aprendizado
 * Mantém contexto sobre padrões de estudo, pontos fortes/fracos e progresso
 */
export class ProfileRAGService extends BaseRAGService {
  constructor(pineconeAdapter?: import('../shared/MultiIndexPineconeAdapter').MultiIndexPineconeAdapter) {
    super({
      indexName: 'nup-user-profiles',
      embeddingModel: 'text-embedding-004',
      maxResults: 12,
      minSimilarity: 0.65,
      chunkSize: 600,  // Chunks menores para dados de perfil específicos
      overlapSize: 100
    }, pineconeAdapter);
  }

  /**
   * Processa dados de perfil do usuário
   * Foca em padrões de estudo, preferências e historico de performance
   */
  async processDocument(document: RAGDocument): Promise<void> {
    this.validateDocument(document);
    
    const { result: processedData } = await this.measurePerformance(
      'Profile document processing',
      async () => {
        // Chunking especializado para dados de perfil
        const chunks = this.chunkForProfile(document.content);
        
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
                profileData: chunk.profileData,
                studyPatterns: chunk.studyPatterns,
                preferences: chunk.preferences,
                learningStyle: chunk.learningStyle,
                chunkType: 'user_profile',
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

    this.log('info', 'Profile document processed', {
      documentId: document.id,
      chunksProcessed: processedData.chunksProcessed
    });
  }

  /**
   * Busca especializada para dados de perfil
   * Retorna insights personalizados baseados no histórico do usuário
   */
  async search(query: RAGQuery): Promise<RAGSearchResponse> {
    const { result: searchResults, duration } = await this.measurePerformance(
      'Profile search',
      async (): Promise<RAGSearchResponse> => {
        const queryEmbedding = await this.generateEmbeddings(query.query);
        
        const searchResult = await this.pineconeAdapter.query({
          indexName: this.config.indexName,
          vector: queryEmbedding,
          topK: query.maxResults || this.config.maxResults || 10,
          filter: {
            userId: query.userId,
            chunkType: 'user_profile',
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
              profileData: match.metadata?.profileData,
              studyPatterns: match.metadata?.studyPatterns,
              preferences: match.metadata?.preferences,
              learningStyle: match.metadata?.learningStyle
            },
            similarity: match.score
          }));

        return {
          results,
          totalFound: results.length,
          processingTime: 0, // Será sobrescrito após measurePerformance
          query: query.query
        };
      }
    );

    // Corrigir processingTime após measurePerformance
    searchResults.processingTime = duration || 0;

    this.log('info', 'Profile search completed', {
      query: query.query,
      resultsFound: searchResults.totalFound,
      userId: query.userId
    });

    return searchResults;
  }

  /**
   * Analisa padrões de estudo do usuário
   */
  async analyzeStudyPatterns(userId: string): Promise<{
    studyTimes: string[];
    preferredSubjects: string[];
    strongAreas: string[];
    improvementAreas: string[];
    recommendedSchedule: string[];
  }> {
    const searchResults = await this.search({
      query: 'padrões de estudo performance histórico',
      userId,
      maxResults: 20
    });

    if (searchResults.results.length === 0) {
      return this.getDefaultAnalysis();
    }

    // Extrair padrões dos resultados
    const analysis = this.extractPatterns(searchResults.results);

    this.log('info', 'Study patterns analyzed', {
      userId,
      patternsFound: searchResults.results.length
    });

    return analysis;
  }

  /**
   * Atualiza perfil baseado em nova atividade
   */
  async updateProfile(
    userId: string,
    activityData: {
      subject: string;
      performance: number;
      timeSpent: number;
      difficulty: 'easy' | 'medium' | 'hard';
      timestamp: Date;
    }
  ): Promise<void> {
    // Criar documento com nova atividade
    const document: RAGDocument = {
      id: `activity_${Date.now()}`,
      userId,
      content: this.formatActivityForProfile(activityData),
      createdAt: new Date(),
      metadata: {
        type: 'activity_update',
        subject: activityData.subject,
        performance: activityData.performance
      }
    };

    await this.processDocument(document);

    this.log('info', 'Profile updated with new activity', {
      userId,
      subject: activityData.subject,
      performance: activityData.performance
    });
  }

  /**
   * Limpeza específica para dados de perfil
   */
  async cleanup(userId: string, olderThan?: Date): Promise<void> {
    await this.measurePerformance(
      'Profile cleanup',
      async () => {
        const filter: any = {
          userId,
          chunkType: 'user_profile'
        };

        if (olderThan) {
          filter.createdAt = { $lt: olderThan.toISOString() };
        }

        await this.pineconeAdapter.deleteByFilter(this.config.indexName, filter);
      }
    );

    this.log('info', 'Profile cleanup completed', { userId, olderThan });
  }

  /**
   * Chunking especializado para dados de perfil
   */
  private chunkForProfile(content: string): Array<{
    content: string;
    profileData: string[];
    studyPatterns: string[];
    preferences: string[];
    learningStyle: string;
  }> {
    const baseChunks = this.chunkText(content);
    
    return baseChunks.map(chunk => ({
      content: chunk,
      profileData: this.extractProfileData(chunk),
      studyPatterns: this.extractStudyPatterns(chunk),
      preferences: this.extractPreferences(chunk),
      learningStyle: this.detectLearningStyle(chunk)
    }));
  }

  /**
   * Extrai dados de perfil do texto
   */
  private extractProfileData(text: string): string[] {
    const profileData: string[] = [];
    
    // Padrões para dados de perfil
    const patterns = [
      /(?:forte em|bom em|facilidade com)\s+([a-záàâãéêíóôõú]+(?:\s+[a-záàâãéêíóôõú]+)*)/gi,
      /(?:dificuldade em|fraco em|problema com)\s+([a-záàâãéêíóôõú]+(?:\s+[a-záàâãéêíóôõú]+)*)/gi,
      /(?:prefere|gosta de|melhor com)\s+([a-záàâãéêíóôõú]+(?:\s+[a-záàâãéêíóôõú]+)*)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && profileData.length < 5) {
        const data = match[1]?.trim();
        if (data && data.length > 3) {
          profileData.push(data);
        }
      }
    });

    return Array.from(new Set(profileData));
  }

  /**
   * Extrai padrões de estudo
   */
  private extractStudyPatterns(text: string): string[] {
    const patterns: string[] = [];
    
    // Padrões de tempo e frequência
    const timePatterns = [
      /(?:estuda|estudou)\s+(?:das?\s+)?(\d{1,2}:\d{2}|\d{1,2}h)/gi,
      /(?:manhã|tarde|noite|madrugada)/gi,
      /(?:segunda|terça|quarta|quinta|sexta|sábado|domingo)/gi
    ];

    timePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && patterns.length < 8) {
        patterns.push(match[0]);
      }
    });

    return Array.from(new Set(patterns));
  }

  /**
   * Extrai preferências de aprendizado
   */
  private extractPreferences(text: string): string[] {
    const preferences: string[] = [];
    
    const prefPatterns = [
      /(?:visual|auditivo|prático|teórico)/gi,
      /(?:resumos|mapas mentais|flashcards|exercícios)/gi,
      /(?:sozinho|grupo|silêncio|música)/gi
    ];

    prefPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && preferences.length < 6) {
        preferences.push(match[0]);
      }
    });

    return Array.from(new Set(preferences));
  }

  /**
   * Detecta estilo de aprendizagem predominante
   */
  private detectLearningStyle(text: string): string {
    const scores = {
      visual: 0,
      auditivo: 0,
      cinestesico: 0,
      leitura: 0
    };

    // Indicadores de cada estilo
    if (/(?:visual|imagem|gráfico|diagrama|cor)/i.test(text)) scores.visual++;
    if (/(?:áudio|escuta|música|conversa|explica)/i.test(text)) scores.auditivo++;
    if (/(?:prática|movimento|fazer|experiência|tatil)/i.test(text)) scores.cinestesico++;
    if (/(?:texto|leitura|escrever|lista|resumo)/i.test(text)) scores.leitura++;

    // Retornar o estilo com maior pontuação
    const maxStyle = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    return maxStyle[0];
  }

  /**
   * Análise padrão quando não há dados suficientes
   */
  private getDefaultAnalysis() {
    return {
      studyTimes: ['20:00-22:00'],
      preferredSubjects: [],
      strongAreas: [],
      improvementAreas: [],
      recommendedSchedule: ['Segunda: 2h', 'Quarta: 2h', 'Sexta: 2h']
    };
  }

  /**
   * Extrai padrões dos resultados de busca
   */
  private extractPatterns(results: RAGResult[]) {
    // Implementação simplificada - seria mais sofisticada com ML
    const studyTimes = results
      .flatMap(r => r.metadata.studyPatterns as string[] || [])
      .filter(p => /\d{1,2}:\d{2}/.test(p))
      .slice(0, 3);

    const preferredSubjects = results
      .map(r => r.metadata.subject as string)
      .filter(Boolean)
      .slice(0, 5);

    return {
      studyTimes: studyTimes.length > 0 ? studyTimes : ['20:00-22:00'],
      preferredSubjects: Array.from(new Set(preferredSubjects)),
      strongAreas: [],
      improvementAreas: [],
      recommendedSchedule: ['Segunda: 2h', 'Quarta: 2h', 'Sexta: 2h']
    };
  }

  /**
   * Formata dados de atividade para inclusão no perfil
   */
  private formatActivityForProfile(activityData: any): string {
    return `Atividade de estudo: ${activityData.subject}. 
Performance: ${activityData.performance}%. 
Tempo gasto: ${activityData.timeSpent} minutos. 
Dificuldade: ${activityData.difficulty}. 
Data: ${activityData.timestamp.toLocaleDateString()}.`;
  }
}