import { BaseRAGService, RAGQuery, RAGSearchResponse, RAGDocument } from './BaseRAGService';

export interface RAGDomain {
  name: string;
  description: string;
  service: BaseRAGService;
  indexName: string;
  priority: number;
  enabled: boolean;
}

export interface CrossDomainQuery {
  query: string;
  userId: string;
  targetDomains?: string[]; // Se não especificado, busca em todos
  maxResultsPerDomain?: number;
  aggregateResults?: boolean;
}

export interface CrossDomainResult {
  domain: string;
  results: RAGSearchResponse;
  processingTime: number;
}

export interface AggregatedResponse {
  query: string;
  totalResults: number;
  totalProcessingTime: number;
  domainResults: CrossDomainResult[];
  aggregatedResults?: RAGSearchResponse; // Quando aggregateResults: true
}

/**
 * Orquestrador central que gerencia todos os RAGs especializados
 * Fornece busca cross-domain e coordenação entre diferentes sistemas RAG
 */
export class RAGOrchestrator {
  private domains: Map<string, RAGDomain> = new Map();
  private defaultMaxResults = 5;

  constructor() {
    this.log('info', '🎭 RAG Orchestrator initialized');
  }

  /**
   * Registra um RAG especializado no orquestrador
   */
  registerRAG(domain: RAGDomain): void {
    this.domains.set(domain.name, domain);
    this.log('info', `📝 Registered RAG domain: ${domain.name}`, {
      indexName: domain.indexName,
      priority: domain.priority,
      enabled: domain.enabled
    });
  }

  /**
   * Remove um RAG do orquestrador
   */
  unregisterRAG(domainName: string): void {
    if (this.domains.delete(domainName)) {
      this.log('info', `🗑️ Unregistered RAG domain: ${domainName}`);
    }
  }

  /**
   * Lista todos os domínios registrados
   */
  listDomains(): RAGDomain[] {
    return Array.from(this.domains.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Obtém um RAG específico por nome
   */
  getDomain(name: string): RAGDomain | undefined {
    return this.domains.get(name);
  }

  /**
   * Busca em um domínio específico
   */
  async searchInDomain(domainName: string, query: RAGQuery): Promise<RAGSearchResponse> {
    const domain = this.domains.get(domainName);
    if (!domain) {
      throw new Error(`Domain '${domainName}' not found`);
    }

    if (!domain.enabled) {
      throw new Error(`Domain '${domainName}' is disabled`);
    }

    return await domain.service.search(query);
  }

  /**
   * Busca cross-domain inteligente
   * Busca em múltiplos domínios simultaneamente e agrega resultados
   */
  async searchCrossDomain(query: CrossDomainQuery): Promise<AggregatedResponse> {
    const startTime = Date.now();
    
    // Determinar domínios alvo
    const targetDomains = query.targetDomains?.length 
      ? query.targetDomains.filter(name => this.domains.has(name))
      : Array.from(this.domains.keys());

    const enabledDomains = targetDomains.filter(name => {
      const domain = this.domains.get(name);
      return domain?.enabled === true;
    });

    if (enabledDomains.length === 0) {
      throw new Error('No enabled domains available for search');
    }

    this.log('info', `🔍 Cross-domain search initiated`, {
      query: query.query,
      targetDomains: enabledDomains,
      userId: query.userId
    });

    // Executar buscas em paralelo
    const searchPromises = enabledDomains.map(async (domainName): Promise<CrossDomainResult> => {
      const domain = this.domains.get(domainName)!;
      const domainStartTime = Date.now();
      
      try {
        const ragQuery: RAGQuery = {
          query: query.query,
          userId: query.userId,
          maxResults: query.maxResultsPerDomain || this.defaultMaxResults
        };

        const results = await domain.service.search(ragQuery);
        const processingTime = Date.now() - domainStartTime;

        return {
          domain: domainName,
          results,
          processingTime
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.log('error', `Failed search in domain ${domainName}`, { error: errorMessage });
        return {
          domain: domainName,
          results: {
            results: [],
            totalFound: 0,
            processingTime: Date.now() - domainStartTime,
            query: query.query
          },
          processingTime: Date.now() - domainStartTime
        };
      }
    });

    const domainResults = await Promise.all(searchPromises);
    const totalProcessingTime = Date.now() - startTime;

    // Agregar resultados se solicitado
    let aggregatedResults: RAGSearchResponse | undefined;
    if (query.aggregateResults) {
      aggregatedResults = this.aggregateResults(domainResults, query.query);
    }

    const response: AggregatedResponse = {
      query: query.query,
      totalResults: domainResults.reduce((sum, result) => sum + result.results.totalFound, 0),
      totalProcessingTime,
      domainResults: domainResults.sort((a, b) => {
        // Ordenar por número de resultados encontrados (decrescente)
        return b.results.totalFound - a.results.totalFound;
      }),
      ...(aggregatedResults && { aggregatedResults })
    };

    this.log('info', `✅ Cross-domain search completed`, {
      totalResults: response.totalResults,
      domainsSearched: enabledDomains.length,
      processingTime: `${totalProcessingTime}ms`
    });

    return response;
  }

  /**
   * Processa um documento em um domínio específico
   */
  async processDocumentInDomain(domainName: string, document: RAGDocument): Promise<void> {
    const domain = this.domains.get(domainName);
    if (!domain) {
      throw new Error(`Domain '${domainName}' not found`);
    }

    if (!domain.enabled) {
      throw new Error(`Domain '${domainName}' is disabled`);
    }

    return await domain.service.processDocument(document);
  }

  /**
   * Limpeza cross-domain
   */
  async cleanupAllDomains(userId: string, olderThan?: Date): Promise<void> {
    const enabledDomains = Array.from(this.domains.values())
      .filter(domain => domain.enabled);

    const cleanupPromises = enabledDomains.map(domain => 
      domain.service.cleanup(userId, olderThan)
    );

    await Promise.all(cleanupPromises);
    
    this.log('info', `🧹 Cleanup completed across all domains`, {
      domainsProcessed: enabledDomains.length,
      userId
    });
  }

  /**
   * Habilita/desabilita um domínio
   */
  setDomainStatus(domainName: string, enabled: boolean): void {
    const domain = this.domains.get(domainName);
    if (domain) {
      domain.enabled = enabled;
      this.log('info', `🔄 Domain ${domainName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Obtém estatísticas de todos os domínios
   */
  getStats(): Array<{
    domain: string;
    indexName: string;
    enabled: boolean;
    priority: number;
  }> {
    return Array.from(this.domains.values()).map(domain => ({
      domain: domain.name,
      indexName: domain.indexName,
      enabled: domain.enabled,
      priority: domain.priority
    }));
  }

  /**
   * Agrega resultados de múltiplos domínios em uma resposta unificada
   */
  private aggregateResults(domainResults: CrossDomainResult[], query: string): RAGSearchResponse {
    const allResults = domainResults.flatMap(domainResult => 
      domainResult.results.results.map(result => ({
        ...result,
        metadata: {
          ...result.metadata,
          domain: domainResult.domain
        }
      }))
    );

    // Ordenar por similaridade e limitar resultados
    const sortedResults = allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20); // Máximo 20 resultados agregados

    const totalProcessingTime = domainResults.reduce(
      (sum, result) => sum + result.processingTime, 0
    );

    return {
      results: sortedResults,
      totalFound: allResults.length,
      processingTime: totalProcessingTime,
      query
    };
  }

  /**
   * Logging estruturado
   */
  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    const emoji = level === 'info' ? '🎭' : level === 'warn' ? '⚠️' : '❌';
    console.log(`${emoji} [RAGOrchestrator] ${message}`, metadata ? metadata : '');
  }
}