import { ragOrchestrator, flashcardRAG, chatRAG, profileRAG, simulationRAG } from '../index';
import { RAGDocument, RAGQuery } from '../shared/BaseRAGService';

/**
 * Adaptador para migrar serviços legados para a nova arquitetura RAG modular
 * Mantém compatibilidade com APIs existentes enquanto usa a arquitetura moderna
 */
export class LegacyRAGAdapter {
  
  /**
   * Compatibilidade com PineconeService.searchSimilarContent()
   * Migra automaticamente para RAG apropriado baseado no contexto
   */
  async searchSimilarContent(
    query: string,
    userId: string,
    options: {
      topK?: number;
      category?: string;
      minSimilarity?: number;
      documentId?: string;
    } = {}
  ): Promise<Array<{
    content: string;
    similarity: number;
    title: string;
    category: string;
  }>> {
    try {
      console.log(`🔍 Legacy adapter: Migrando busca "${query}" para RAG modular`);
      
      // Determinar qual RAG usar baseado na categoria ou contexto
      const ragType = this.determineRAGType(query, options.category);
      
      // Executar busca usando RAG apropriado
      const ragQuery: RAGQuery = {
        query,
        userId,
        maxResults: options.topK || 10,
        minSimilarity: options.minSimilarity || 0.7,
        filters: options.documentId ? { documentId: options.documentId } : {}
      };

      let searchResults;
      
      switch (ragType) {
        case 'flashcards':
          searchResults = await flashcardRAG.search(ragQuery);
          break;
        case 'chat':
          searchResults = await chatRAG.search(ragQuery);
          break;
        case 'simulation':
          searchResults = await simulationRAG.search(ragQuery);
          break;
        case 'profile':
          searchResults = await profileRAG.search(ragQuery);
          break;
        default:
          // Cross-domain search se não conseguir determinar
          const crossDomainResults = await ragOrchestrator.searchCrossDomain({
            query,
            userId,
            maxResultsPerDomain: Math.ceil((options.topK || 10) / 2)
          });
          
          // Converter resultado agregado para formato legacy
          const aggregatedResults = crossDomainResults.domainResults.flatMap((domain: any) => 
            domain.results.results.map((result: any) => ({
              content: result.content,
              similarity: result.similarity,
              title: result.metadata.title || 'Sem título',
              category: domain.domain
            }))
          );
          
          return aggregatedResults.slice(0, options.topK || 10);
      }

      // Converter para formato legacy (apenas se não foi cross-domain)
      if ('results' in searchResults) {
        const legacyResults = searchResults.results.map(result => ({
          content: result.content,
          similarity: result.similarity,
          title: result.metadata.title || result.metadata.documentId || 'Sem título',
          category: options.category || ragType
        }));
        
        console.log(`✅ Legacy adapter: ${legacyResults.length} resultados encontrados via RAG modular`);
        return legacyResults;
      }
      
      return [];


    } catch (error) {
      console.error('❌ Erro no legacy adapter:', error);
      return [];
    }
  }

  /**
   * Compatibilidade com PineconeService.upsertDocument()
   * Redireciona para RAG apropriado baseado no tipo de documento
   */
  async upsertDocument(
    documentId: string,
    chunks: { content: string; chunkIndex: number }[],
    metadata: {
      userId: string;
      title: string;
      category: string;
      [key: string]: any;
    }
  ): Promise<void> {
    try {
      console.log(`📤 Legacy adapter: Migrando upload "${documentId}" para RAG modular`);
      
      // Determinar RAG baseado na categoria
      const ragType = this.determineRAGType(metadata.title, metadata.category);
      
      // Criar documento no formato moderno
      const ragDocument: RAGDocument = {
        id: documentId,
        userId: metadata.userId,
        content: chunks.map(chunk => chunk.content).join('\n\n'),
        createdAt: new Date(),
        metadata: {
          ...metadata,
          originalChunks: chunks.length,
          migratedFromLegacy: true
        }
      };

      // Processar no RAG apropriado
      switch (ragType) {
        case 'flashcards':
          await flashcardRAG.processDocument(ragDocument);
          break;
        case 'chat':
          await chatRAG.processDocument(ragDocument);
          break;
        case 'simulation':
          await simulationRAG.processDocument(ragDocument);
          break;
        case 'profile':
          await profileRAG.processDocument(ragDocument);
          break;
        default:
          // Processar em múltiplos RAGs se categoria é geral
          await flashcardRAG.processDocument(ragDocument);
          break;
      }

      console.log(`✅ Legacy adapter: Documento "${documentId}" processado no RAG ${ragType}`);

    } catch (error) {
      console.error(`❌ Erro no upload legacy de ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Compatibilidade com RAGService queries
   * Migra para busca cross-domain inteligente
   */
  async queryRAG(
    query: string,
    userId: string,
    context?: string
  ): Promise<{
    answer: string;
    sources: Array<{
      content: string;
      similarity: number;
      metadata: any;
    }>;
    confidence: number;
  }> {
    try {
      console.log(`🎯 Legacy adapter: Query RAG "${query}" via orquestrador`);
      
      // Usar orquestrador para busca inteligente cross-domain
      const crossDomainResults = await ragOrchestrator.searchCrossDomain({
        query,
        userId,
        maxResultsPerDomain: 3,
        aggregateResults: true
      });

      if (!crossDomainResults.aggregatedResults) {
        return {
          answer: 'Não foi possível encontrar informações relevantes.',
          sources: [],
          confidence: 0
        };
      }

      // Gerar resposta contextual (implementação simplificada)
      const topSources = crossDomainResults.aggregatedResults.results.slice(0, 5);
      const combinedContext = topSources.map((r: any) => r.content).join('\n\n');
      
      // Resposta básica baseada no contexto
      const answer = await this.generateContextualAnswer(query, combinedContext, context);
      
      return {
        answer,
        sources: topSources.map((source: any) => ({
          content: source.content,
          similarity: source.similarity,
          metadata: source.metadata
        })),
        confidence: topSources.length > 0 ? topSources[0].similarity : 0
      };

    } catch (error) {
      console.error('❌ Erro na query RAG legacy:', error);
      return {
        answer: 'Erro ao processar consulta.',
        sources: [],
        confidence: 0
      };
    }
  }

  /**
   * Determina qual RAG usar baseado no contexto
   */
  private determineRAGType(query: string, category?: string): 'flashcards' | 'chat' | 'simulation' | 'profile' | 'general' {
    const queryLower = query.toLowerCase();
    const categoryLower = category?.toLowerCase() || '';

    // Regras de classificação inteligente
    if (categoryLower.includes('concurso') || categoryLower.includes('questao') || 
        queryLower.includes('simulado') || queryLower.includes('prova')) {
      return 'simulation';
    }

    if (categoryLower.includes('flashcard') || queryLower.includes('conceito') || 
        queryLower.includes('definição') || queryLower.includes('termo')) {
      return 'flashcards';
    }

    if (categoryLower.includes('chat') || categoryLower.includes('conversa') ||
        queryLower.includes('explique') || queryLower.includes('como')) {
      return 'chat';
    }

    if (categoryLower.includes('perfil') || categoryLower.includes('usuario') ||
        queryLower.includes('estudo') || queryLower.includes('aprendizado')) {
      return 'profile';
    }

    return 'general';
  }

  /**
   * Gera resposta contextual simplificada
   */
  private async generateContextualAnswer(query: string, context: string, additionalContext?: string): Promise<string> {
    // Implementação simplificada - seria integrada com IA futuramente
    const lines = context.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return 'Não encontrei informações específicas sobre sua consulta.';
    }

    const relevantLines = lines
      .filter(line => {
        const queryWords = query.toLowerCase().split(' ');
        return queryWords.some(word => line.toLowerCase().includes(word));
      })
      .slice(0, 3);

    if (relevantLines.length > 0) {
      return `Baseado nas informações encontradas:\n\n${relevantLines.join('\n\n')}`;
    }

    return `Informações relacionadas:\n\n${lines.slice(0, 2).join('\n\n')}`;
  }

  /**
   * Limpa dados de um usuário específico em todos os RAGs
   */
  async cleanupUserData(userId: string, olderThan?: Date): Promise<void> {
    console.log(`🧹 Legacy adapter: Limpando dados do usuário ${userId}`);
    
    const cleanupPromises = [
      flashcardRAG.cleanup(userId, olderThan),
      chatRAG.cleanup(userId, olderThan),
      profileRAG.cleanup(userId, olderThan),
      simulationRAG.cleanup(userId, olderThan)
    ];

    await Promise.allSettled(cleanupPromises);
    console.log(`✅ Legacy adapter: Limpeza concluída para usuário ${userId}`);
  }

  /**
   * Estatísticas dos RAGs para compatibilidade
   */
  async getRAGStats(): Promise<{
    totalIndexes: number;
    activeConnections: number;
    domains: string[];
  }> {
    const domains = ragOrchestrator.listDomains();
    
    return {
      totalIndexes: domains.length,
      activeConnections: domains.filter(d => d.enabled).length,
      domains: domains.map(d => d.name)
    };
  }
}

// Instância singleton para uso pelos serviços legados
export const legacyRAGAdapter = new LegacyRAGAdapter();