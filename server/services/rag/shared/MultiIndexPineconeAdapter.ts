import { Pinecone } from '@pinecone-database/pinecone';
import { embeddingsService } from '../../embeddings';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

export interface PineconeVector {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

export interface PineconeQueryResponse {
  matches: Array<{
    id: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
}

export interface PineconeQueryOptions {
  indexName: string;
  vector: number[];
  topK: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

/**
 * Adapter multi-índices para Pinecone
 * Permite que cada RAG especializado use seu próprio índice
 */
export class MultiIndexPineconeAdapter {
  private indexes: Map<string, any> = new Map();
  private initializationPromises: Map<string, Promise<void>> = new Map();

  /**
   * Inicializa um índice específico se não existir
   */
  async ensureIndex(indexName: string, dimension: number = 768): Promise<void> {
    if (this.indexes.has(indexName)) {
      return;
    }

    // Evitar inicializações paralelas do mesmo índice
    if (this.initializationPromises.has(indexName)) {
      return await this.initializationPromises.get(indexName)!;
    }

    const initPromise = this.initializeIndex(indexName, dimension);
    this.initializationPromises.set(indexName, initPromise);

    try {
      await initPromise;
    } finally {
      this.initializationPromises.delete(indexName);
    }
  }

  /**
   * Inicialização real do índice
   */
  private async initializeIndex(indexName: string, dimension: number): Promise<void> {
    try {
      console.log(`🔍 Verificando índice Pinecone: ${indexName}`);
      
      // Verificar se o índice existe
      const existingIndexes = await pinecone.listIndexes();
      const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);

      if (!indexExists) {
        console.log(`📊 Criando novo índice Pinecone: ${indexName}`);
        await pinecone.createIndex({
          name: indexName,
          dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Aguardar o índice ficar pronto
        await this.waitForIndexReady(indexName);
      }

      // Conectar ao índice
      const index = pinecone.Index(indexName);
      this.indexes.set(indexName, index);
      
      console.log(`✅ Pinecone conectado ao índice: ${indexName}`);
    } catch (error) {
      console.error(`❌ Erro ao inicializar índice ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Aguarda índice ficar pronto
   */
  private async waitForIndexReady(indexName: string, maxWaitTime = 300000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexStats = await pinecone.describeIndex(indexName);
        if (indexStats.status?.ready) {
          console.log(`✅ Índice ${indexName} está pronto!`);
          return;
        }
        console.log(`⏳ Aguardando índice ${indexName} ficar pronto...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.log(`⏳ Índice ${indexName} ainda não disponível, aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error(`Timeout aguardando índice ${indexName} ficar pronto`);
  }

  /**
   * Faz upsert de vetores em um índice específico
   */
  async upsertVectors(indexName: string, vectors: PineconeVector[]): Promise<void> {
    await this.ensureIndex(indexName);
    const index = this.indexes.get(indexName)!;

    // Fazer upsert em lotes de 100 (limite do Pinecone)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(`📤 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} enviado para ${indexName}`);
    }

    console.log(`✅ ${vectors.length} vetores indexados em ${indexName}`);
  }

  /**
   * Realiza busca em um índice específico
   */
  async query(options: PineconeQueryOptions): Promise<PineconeQueryResponse> {
    await this.ensureIndex(options.indexName);
    const index = this.indexes.get(options.indexName)!;

    const result = await index.query({
      vector: options.vector,
      topK: options.topK,
      filter: options.filter,
      includeMetadata: options.includeMetadata || true
    });

    return result;
  }

  /**
   * Deleta vetores por filtro
   */
  async deleteByFilter(indexName: string, filter: Record<string, any>): Promise<void> {
    await this.ensureIndex(indexName);
    const index = this.indexes.get(indexName)!;

    await index.deleteMany(filter);
    console.log(`🗑️ Vetores deletados de ${indexName} com filtro:`, filter);
  }

  /**
   * Deleta vetores por IDs
   */
  async deleteByIds(indexName: string, ids: string[]): Promise<void> {
    await this.ensureIndex(indexName);
    const index = this.indexes.get(indexName)!;

    await index.deleteMany(ids);
    console.log(`🗑️ ${ids.length} vetores deletados de ${indexName}`);
  }

  /**
   * Obtém estatísticas do índice
   */
  async getIndexStats(indexName: string): Promise<any> {
    await this.ensureIndex(indexName);
    const index = this.indexes.get(indexName)!;

    return await index.describeIndexStats();
  }

  /**
   * Gera embeddings usando o serviço padrão
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return await embeddingsService.generateEmbedding(text);
  }

  /**
   * Gera múltiplos embeddings
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return await embeddingsService.generateEmbeddings(texts);
  }

  /**
   * Lista todos os índices disponíveis
   */
  listConnectedIndexes(): string[] {
    return Array.from(this.indexes.keys());
  }
}