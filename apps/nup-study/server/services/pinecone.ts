import { Pinecone } from '@pinecone-database/pinecone';
import { embeddingsService } from './embeddings';
import { AppError, errorMessages } from '../utils/ErrorHandler';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

interface PineconeMetadata {
  userId: string;
  title: string;
  category: string;
  chunkIndex: number;
  content: string;
  materialId?: string; // ID do material (para filtrar RAG por matéria)
  jobId?: string; // ID do job de processamento (para grandes documentos)
  partId?: string; // ID da parte do documento
  partNumber?: number; // Número da parte
  sectionTitle?: string; // Título da seção
  keywords?: string[]; // Keywords extraídas para facilitar busca híbrida
}

export class PineconeService {
  private indexName = 'nup-est-knowledge';
  private index: any;

  constructor() {
    this.initializeIndex();
  }

  private async initializeIndex() {
    try {
      // Verificar se o índice existe, senão criar
      const existingIndexes = await pinecone.listIndexes();
      const indexExists = existingIndexes.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`📊 Criando índice Pinecone: ${this.indexName}`);
        await pinecone.createIndex({
          name: this.indexName,
          dimension: 768, // Dimensão do Google Gemini text-embedding-004
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Aguardar o índice ficar pronto
        await this.waitForIndexReady();
      }

      this.index = pinecone.Index(this.indexName);
      console.log(`✅ Pinecone conectado ao índice: ${this.indexName}`);
    } catch (error) {
      console.error('❌ Erro ao inicializar Pinecone:', error);
      throw error;
    }
  }

  private async waitForIndexReady(maxWaitTime = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexStats = await pinecone.describeIndex(this.indexName);
        if (indexStats.status?.ready) {
          console.log(`✅ Índice ${this.indexName} está pronto!`);
          return;
        }
        console.log(`⏳ Aguardando índice ficar pronto...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.log(`⏳ Índice ainda não disponível, aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new AppError(503, errorMessages.DATABASE_ERROR, 'Timeout aguardando índice ficar pronto');
  }

  /**
   * Adiciona documentos ao índice vetorial Pinecone
   */
  async upsertDocument(
    documentId: string,
    chunks: { content: string; chunkIndex: number; keywords?: string[] }[],
    metadata: Omit<PineconeMetadata, 'chunkIndex' | 'content' | 'keywords'>
  ) {
    try {
      if (!this.index) {
        await this.initializeIndex();
      }

      console.log(`🔄 Processando ${chunks.length} chunks para Pinecone...`);

      // Gerar embeddings para todos os chunks
      const embeddings = await embeddingsService.generateEmbeddings(
        chunks.map(chunk => chunk.content)
      );

      // Preparar vetores para upsert
      const vectors = chunks.map((chunk, index) => ({
        id: `${documentId}_${chunk.chunkIndex}`,
        values: embeddings[index],
        metadata: {
          ...metadata,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          keywords: chunk.keywords, // Incluir keywords na metadata
        }
      }));

      // Fazer upsert em lotes de 100 (limite do Pinecone)
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.index.upsert(batch);
        console.log(`📤 Batch ${Math.floor(i / batchSize) + 1} enviado para Pinecone`);
      }

      console.log(`✅ Documento ${documentId} indexado no Pinecone com ${chunks.length} chunks`);
    } catch (error) {
      console.error('❌ Erro ao fazer upsert no Pinecone:', error);
      throw error;
    }
  }

  /**
   * Busca TODOS os chunks de um usuário (fallback quando materialId não existe)
   */
  async getAllChunksForUser(
    userId: string
  ): Promise<{
    content: string;
    title: string;
    category: string;
    keywords?: string[];
    materialId?: string;
    sectionTitle?: string;
  }[]> {
    try {
      if (!this.index) {
        await this.initializeIndex();
      }

      const ones = new Array(768).fill(1);
      const magnitude = Math.sqrt(ones.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = ones.map(val => val / magnitude);
      
      const filter: any = { userId };

      const results = await this.index.query({
        vector: normalizedVector,
        topK: 10000,
        filter,
        includeMetadata: true,
        includeValues: false,
      });

      const chunks = results.matches?.map((match: any) => ({
        content: match.metadata.content,
        title: match.metadata.title,
        category: match.metadata.category,
        keywords: match.metadata.keywords,
        materialId: match.metadata.materialId,
        sectionTitle: match.metadata.sectionTitle,
      })) || [];

      console.log(`📦 [Pinecone] Recuperados ${chunks.length} chunks para userId ${userId} (fallback)`);
      
      return chunks;
    } catch (error) {
      console.error('❌ Erro ao buscar chunks do usuário:', error);
      return [];
    }
  }

  /**
   * Busca TODOS os chunks de determinados materiais (para BM25)
   * SEM filtro de similaridade - retorna tudo
   */
  async getAllChunksForMaterials(
    userId: string,
    materialIds: string[]
  ): Promise<{
    content: string;
    title: string;
    category: string;
    keywords?: string[];
    materialId?: string;
    sectionTitle?: string;
  }[]> {
    try {
      if (!this.index) {
        await this.initializeIndex();
      }

      if (!materialIds || materialIds.length === 0) {
        return [];
      }

      // Buscar TODOS os chunks desses materiais
      // NOTA: Pinecone rejeita vector zero, então usamos vector normalizado de 1s
      // Idealmente deveria ter índice BM25 separado, mas como workaround funcional:
      const ones = new Array(768).fill(1);
      const magnitude = Math.sqrt(ones.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = ones.map(val => val / magnitude);
      
      const filter: any = { 
        userId,
        materialId: { $in: materialIds }
      };

      const results = await this.index.query({
        vector: normalizedVector,
        topK: 10000, // Número alto para pegar todos
        filter,
        includeMetadata: true,
        includeValues: false,
      });

      const chunks = results.matches?.map((match: any) => ({
        content: match.metadata.content,
        title: match.metadata.title,
        category: match.metadata.category,
        keywords: match.metadata.keywords,
        materialId: match.metadata.materialId, // Para citações
        sectionTitle: match.metadata.sectionTitle, // Para citações
      })) || [];

      console.log(`📦 [Pinecone] Recuperados ${chunks.length} chunks para BM25 de ${materialIds.length} materiais`);
      
      return chunks;
    } catch (error) {
      console.error('❌ Erro ao buscar todos os chunks:', error);
      return [];
    }
  }

  /**
   * Busca semântica no Pinecone
   */
  async searchSimilarContent(
    query: string,
    userId: string,
    options: {
      topK?: number;
      category?: string;
      minSimilarity?: number;
      documentId?: string; // Filtrar por documento específico (legado)
      materialIds?: string[]; // NOVO: filtrar por múltiplos materiais
    } = {}
  ): Promise<{
    content: string;
    similarity: number;
    title: string;
    category: string;
  }[]> {
    try {
      if (!this.index) {
        await this.initializeIndex();
      }

      const { topK = 5, category, minSimilarity = 0.1, documentId, materialIds } = options;

      // Gerar embedding da query
      const queryEmbedding = await embeddingsService.generateEmbedding(query);

      // Preparar filtros
      const filter: any = { userId };
      if (category) {
        filter.category = category;
      }
      if (documentId) {
        filter.documentId = documentId; // CRÍTICO: filtrar apenas este documento
        console.log(`🎯 Filtrando RAG por documento específico: ${documentId}`);
      }
      if (materialIds && materialIds.length > 0) {
        // Pinecone suporta $in para array de valores
        filter.materialId = { $in: materialIds };
        console.log(`🎯 Filtrando RAG por ${materialIds.length} materiais: ${materialIds.join(', ')}`);
      }

      // Buscar no Pinecone
      const results = await this.index.query({
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata: true,
        includeValues: false,
      });

      // Processar resultados
      const similarContent = results.matches
        ?.filter((match: any) => match.score >= minSimilarity)
        .map((match: any) => ({
          content: match.metadata.content,
          similarity: match.score,
          title: match.metadata.title,
          category: match.metadata.category,
        })) || [];

      console.log(`🔍 Pinecone encontrou ${similarContent.length} resultados relevantes para userId: ${userId}`);
      
      // Se não encontrou nada, vamos debugar
      if (similarContent.length === 0) {
        console.log(`🔍 Debug - Filtros usados:`, filter);
        console.log(`🔍 Debug - Query: "${query}"`);
        console.log(`🔍 Debug - Total matches retornados:`, results.matches?.length || 0);
        
        // Tentar busca sem filtro para ver se há dados no índice
        const debugResults = await this.index.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true,
          includeValues: false,
        });
        
        console.log(`🔍 Debug - Busca sem filtro retornou:`, debugResults.matches?.length || 0, 'resultados');
        if (debugResults.matches && debugResults.matches.length > 0) {
          console.log(`🔍 Debug - Exemplo de metadata:`, debugResults.matches[0].metadata);
        }
      }
      
      return similarContent;
    } catch (error) {
      console.error('❌ Erro na busca do Pinecone:', error);
      return [];
    }
  }

  /**
   * Remove documento do índice
   */
  async deleteDocument(documentId: string) {
    try {
      if (!this.index) {
        await this.initializeIndex();
      }

      // Buscar todos os chunks do documento
      const results = await this.index.query({
        vector: new Array(768).fill(0), // Vector dummy para busca por filtro
        topK: 10000, // Número alto para pegar todos os chunks
        filter: { documentId },
        includeValues: false,
      });

      // Deletar todos os chunks encontrados
      if (results.matches && results.matches.length > 0) {
        const ids = results.matches.map((match: any) => match.id);
        await this.index.deleteMany(ids);
        console.log(`🗑️ Removidos ${ids.length} chunks do documento ${documentId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar documento do Pinecone:', error);
      throw error;
    }
  }

  /**
   * Estatísticas do índice
   */
  async getIndexStats() {
    try {
      if (!this.index) {
        await this.initializeIndex();
      }

      const stats = await this.index.describeIndexStats();
      return {
        totalVectors: stats.totalVectorCount || 0,
        dimension: stats.dimension || 0,
        indexFullness: stats.indexFullness || 0,
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { totalVectors: 0, dimension: 0, indexFullness: 0 };
    }
  }
}

export const pineconeService = new PineconeService();