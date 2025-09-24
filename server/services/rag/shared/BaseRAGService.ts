import { MultiIndexPineconeAdapter } from './MultiIndexPineconeAdapter';

export interface RAGConfig {
  indexName: string;
  embeddingModel?: string;
  maxResults?: number;
  minSimilarity?: number;
  chunkSize?: number;
  overlapSize?: number;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RAGQuery {
  query: string;
  userId: string;
  filters?: Record<string, any>;
  maxResults?: number;
  minSimilarity?: number;
}

export interface RAGResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export interface RAGSearchResponse {
  results: RAGResult[];
  totalFound: number;
  processingTime: number;
  query: string;
}

/**
 * Classe base abstrata para todos os serviços RAG especializados
 * Fornece funcionalidades comuns e força implementação de métodos específicos
 */
export abstract class BaseRAGService {
  protected config: RAGConfig;
  protected pineconeAdapter: MultiIndexPineconeAdapter;

  constructor(config: RAGConfig, pineconeAdapter?: MultiIndexPineconeAdapter) {
    this.config = {
      embeddingModel: 'text-embedding-004',
      maxResults: 10,
      minSimilarity: 0.7,
      chunkSize: 1000,
      overlapSize: 200,
      ...config
    };
    this.pineconeAdapter = pineconeAdapter || new MultiIndexPineconeAdapter();
  }

  /**
   * Método abstrato que cada RAG especializado deve implementar
   * Define como os documentos são processados para cada domínio
   */
  abstract processDocument(document: RAGDocument): Promise<void>;

  /**
   * Método abstrato para busca especializada por domínio
   */
  abstract search(query: RAGQuery): Promise<RAGSearchResponse>;

  /**
   * Método abstrato para limpeza/manutenção específica do domínio
   */
  abstract cleanup(userId: string, olderThan?: Date): Promise<void>;

  /**
   * Funcionalidade comum: gerar embeddings
   */
  protected async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const embeddings = await this.pineconeAdapter.generateEmbedding(text);
      return embeddings;
    } catch (error) {
      console.error(`❌ Erro ao gerar embeddings para ${this.config.indexName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao gerar embeddings: ${errorMessage}`);
    }
  }

  /**
   * Funcionalidade comum: chunking inteligente
   * CORREÇÃO: Previne loop infinito garantindo progresso mínimo
   */
  protected chunkText(text: string): string[] {
    const chunks: string[] = [];
    const { chunkSize, overlapSize } = this.config;
    
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize!, text.length);
      let chunk = text.slice(start, end);
      
      // Tenta quebrar em uma frase completa
      if (end < text.length) {
        const lastSentence = chunk.lastIndexOf('. ');
        const lastParagraph = chunk.lastIndexOf('\n\n');
        const breakPoint = Math.max(lastSentence, lastParagraph);
        
        if (breakPoint > start + chunkSize! * 0.6) {
          chunk = text.slice(start, breakPoint + 1);
        }
      }
      
      chunks.push(chunk.trim());
      
      // CORREÇÃO: Garantir progresso mínimo para prevenir loop infinito
      const actualChunkLength = chunk.length;
      const safeOverlap = Math.min(overlapSize || 0, actualChunkLength - 1);
      const nextStart = start + actualChunkLength - safeOverlap;
      
      // Garantir progresso mínimo de pelo menos 1 caractere
      start = Math.max(nextStart, start + 1);
      
      if (start >= text.length) break;
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Remove chunks muito pequenos
  }

  /**
   * Funcionalidade comum: logging estruturado
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      service: this.constructor.name,
      index: this.config.indexName,
      level,
      message,
      ...(metadata && { metadata })
    };

    const emoji = level === 'info' ? '📍' : level === 'warn' ? '⚠️' : '❌';
    console.log(`${emoji} [${this.constructor.name}] ${message}`, metadata ? metadata : '');
  }

  /**
   * Funcionalidade comum: validação de documentos
   */
  protected validateDocument(document: RAGDocument): void {
    if (!document.id) throw new Error('Document ID é obrigatório');
    if (!document.content) throw new Error('Document content é obrigatório');
    if (!document.userId) throw new Error('Document userId é obrigatório');
    if (document.content.length < 10) throw new Error('Document content muito pequeno');
    if (document.content.length > 100000) throw new Error('Document content muito grande');
  }

  /**
   * Funcionalidade comum: métricas de performance
   */
  protected async measurePerformance<T>(
    operation: string,
    func: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    try {
      const result = await func();
      const duration = Date.now() - startTime;
      this.log('info', `${operation} completed`, { duration: `${duration}ms` });
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.log('error', `${operation} failed`, { duration: `${duration}ms`, error: errorMessage });
      throw error;
    }
  }

  /**
   * Getter para configurações (somente leitura)
   */
  get configuration(): Readonly<RAGConfig> {
    return Object.freeze({ ...this.config });
  }
}