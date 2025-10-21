/**
 * Pinecone Client
 * 
 * Cliente para armazenamento e consulta de vetores
 * 
 * RESPONSABILIDADES:
 * - Conexão com índice Pinecone
 * - Upsert de vetores com batch otimizado
 * - Query de similaridade
 * - Gerenciamento de namespaces
 * - Retry logic para rate limits
 * 
 * MELHORIAS IMPLEMENTADAS (October 2025):
 * - ✅ Batch upsert otimizado (100 vetores por batch)
 * - ✅ Retry automático com exponential backoff
 * - ✅ Detecção de rate limits (429)
 * - ✅ Logging detalhado
 * - ✅ Health check real
 */

import { Pinecone, Index } from '@pinecone-database/pinecone';
import type { PineconeConfig, VectorRecord, QueryRequest, QueryResponse, QueryMatch } from './types';

/**
 * Helper: Retry com exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Rate limit - aguardar mais tempo
      if (error.status === 429 || error.message?.includes('rate limit')) {
        const waitTime = Math.min(initialDelay * Math.pow(2, attempt - 1), 30000);
        console.warn(`⚠️ [Pinecone] Rate limit atingido. Aguardando ${waitTime}ms...`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Erro de rede - retry com backoff
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        const waitTime = Math.min(initialDelay * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ [Pinecone] Tentativa ${attempt}/${maxRetries} falhou. Aguardando ${waitTime}ms...`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Erro não recuperável
      throw error;
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

export class PineconeClient {
  private config: PineconeConfig;
  private pinecone: Pinecone;
  private index: Index | null = null;
  private connected: boolean = false;

  // Configurações de batch
  private readonly BATCH_SIZE = 100; // Limite do Pinecone
  private readonly MAX_RETRIES = 3;

  constructor(config: PineconeConfig) {
    this.config = config;
    this.pinecone = new Pinecone({
      apiKey: config.apiKey,
    });
    console.log(`📍 [Pinecone] Cliente configurado - Index: ${config.indexName}`);
  }

  /**
   * Inicializa conexão com o índice
   */
  private async ensureConnected(): Promise<void> {
    if (this.connected && this.index) {
      return;
    }

    try {
      console.log(`🔌 [Pinecone] Conectando ao índice ${this.config.indexName}...`);
      
      // Verificar se índice existe
      const existingIndexes = await retryWithBackoff(() => this.pinecone.listIndexes());
      const indexExists = existingIndexes.indexes?.some(idx => idx.name === this.config.indexName);

      if (!indexExists) {
        throw new Error(`Índice ${this.config.indexName} não encontrado. Crie o índice primeiro.`);
      }

      this.index = this.pinecone.Index(this.config.indexName);
      this.connected = true;
      console.log(`✅ [Pinecone] Conectado ao índice ${this.config.indexName}`);
    } catch (error: any) {
      console.error(`❌ [Pinecone] Falha na conexão: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upsert vetores no índice com batch otimizado
   */
  async upsert(vectors: VectorRecord[], namespace?: string): Promise<void> {
    await this.ensureConnected();
    
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    const totalVectors = vectors.length;
    console.log(`📤 [Pinecone] Upsert iniciado - Vectors: ${totalVectors}, Namespace: ${namespace || 'default'}`);
    
    try {
      const startTime = Date.now();
      
      // Processar em batches
      const batches = Math.ceil(totalVectors / this.BATCH_SIZE);
      
      for (let i = 0; i < totalVectors; i += this.BATCH_SIZE) {
        const batch = vectors.slice(i, i + this.BATCH_SIZE);
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;
        
        await retryWithBackoff(
          async () => {
            if (namespace) {
              await this.index!.namespace(namespace).upsert(batch);
            } else {
              await this.index!.upsert(batch);
            }
          },
          this.MAX_RETRIES
        );
        
        console.log(`📦 [Pinecone] Batch ${batchNumber}/${batches} enviado (${batch.length} vectors)`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [Pinecone] Upsert completo - ${totalVectors} vectors em ${duration}ms`);
    } catch (error: any) {
      console.error(`❌ [Pinecone] Upsert falhou: ${error.message}`);
      throw new Error(`Pinecone upsert failed: ${error.message}`);
    }
  }

  /**
   * Query vetores similares
   */
  async query(request: QueryRequest, namespace?: string): Promise<QueryResponse> {
    await this.ensureConnected();
    
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    const topK = request.topK || 10;
    console.log(`🔍 [Pinecone] Query iniciado - TopK: ${topK}, Namespace: ${namespace || 'default'}`);
    
    try {
      const startTime = Date.now();
      
      const queryRequest = {
        vector: request.vector,
        topK,
        filter: request.filter,
        includeMetadata: request.includeMetadata ?? true,
      };

      const response = await retryWithBackoff(
        async () => {
          if (namespace) {
            return await this.index!.namespace(namespace).query(queryRequest);
          } else {
            return await this.index!.query(queryRequest);
          }
        },
        this.MAX_RETRIES
      );

      const duration = Date.now() - startTime;
      const matches: QueryMatch[] = (response.matches || []).map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata,
      }));

      console.log(`✅ [Pinecone] Query completo - ${matches.length} resultados em ${duration}ms`);

      return {
        matches,
        namespace: namespace || 'default',
      };
    } catch (error: any) {
      console.error(`❌ [Pinecone] Query falhou: ${error.message}`);
      throw new Error(`Pinecone query failed: ${error.message}`);
    }
  }

  /**
   * Deleta vetores por IDs
   */
  async deleteByIds(ids: string[], namespace?: string): Promise<void> {
    await this.ensureConnected();
    
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    console.log(`🗑️ [Pinecone] Delete iniciado - IDs: ${ids.length}, Namespace: ${namespace || 'default'}`);
    
    try {
      await retryWithBackoff(
        async () => {
          if (namespace) {
            await this.index!.namespace(namespace).deleteMany(ids);
          } else {
            await this.index!.deleteMany(ids);
          }
        },
        this.MAX_RETRIES
      );

      console.log(`✅ [Pinecone] Delete completo - ${ids.length} vectors removidos`);
    } catch (error: any) {
      console.error(`❌ [Pinecone] Delete falhou: ${error.message}`);
      throw new Error(`Pinecone delete failed: ${error.message}`);
    }
  }

  /**
   * Deleta todos os vetores de um namespace
   */
  async deleteAll(namespace?: string): Promise<void> {
    await this.ensureConnected();
    
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    console.log(`🗑️ [Pinecone] Delete ALL iniciado - Namespace: ${namespace || 'default'}`);
    
    try {
      await retryWithBackoff(
        async () => {
          if (namespace) {
            await this.index!.namespace(namespace).deleteAll();
          } else {
            await this.index!.deleteAll();
          }
        },
        this.MAX_RETRIES
      );

      console.log(`✅ [Pinecone] Namespace limpo com sucesso`);
    } catch (error: any) {
      console.error(`❌ [Pinecone] Delete ALL falhou: ${error.message}`);
      throw new Error(`Pinecone deleteAll failed: ${error.message}`);
    }
  }

  /**
   * Obtém estatísticas do índice
   */
  async getStats(namespace?: string): Promise<any> {
    await this.ensureConnected();
    
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    try {
      const stats = await retryWithBackoff(
        () => this.index!.describeIndexStats()
      );

      console.log(`📊 [Pinecone] Stats obtidos - Total vectors: ${stats.totalRecordCount || 0}`);
      return stats;
    } catch (error: any) {
      console.error(`❌ [Pinecone] Stats falhou: ${error.message}`);
      throw new Error(`Pinecone stats failed: ${error.message}`);
    }
  }

  /**
   * Verifica conexão com Pinecone
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureConnected();
      
      // Tentar obter stats como health check
      await this.getStats();
      
      console.log(`✅ [Pinecone] Health check passou`);
      return true;
    } catch (error) {
      console.error(`❌ [Pinecone] Health check falhou`);
      return false;
    }
  }

  /**
   * Retorna informações de configuração
   */
  getConfig() {
    return {
      indexName: this.config.indexName,
      connected: this.connected,
      batchSize: this.BATCH_SIZE,
      maxRetries: this.MAX_RETRIES,
    };
  }
}

/**
 * Factory para criar clientes configurados
 */
export function createPineconeClient(config: PineconeConfig): PineconeClient {
  return new PineconeClient(config);
}
