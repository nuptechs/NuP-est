import { pineconeService } from '../pinecone';
import { bm25Service } from './BM25Service';
import { rerankingService, type RerankingInput } from './RerankingService';

/**
 * Serviço de busca híbrida que combina:
 * 1. Busca semântica (dense vectors via Pinecone)
 * 2. Busca por palavras-chave (sparse BM25)
 * 3. Reranking com cross-encoder
 * 
 * Baseado na arquitetura do NotebookLM
 */

export interface HybridSearchOptions {
  topK?: number;
  minSimilarity?: number;
  userId: string;
  materialIds?: string[];
  category?: string;
  // Pesos para fusão de scores
  semanticWeight?: number; // 0-1, default 0.7
  bm25Weight?: number; // 0-1, default 0.3
  useReranking?: boolean; // default true
}

export interface HybridSearchResult {
  content: string;
  title: string;
  category: string;
  similarity: number; // Score semântico original
  bm25Score: number; // Score BM25
  fusedScore: number; // Score combinado (semantic + bm25)
  finalScore: number; // Score após reranking (se aplicado)
  materialId?: string;
  keywords?: string[];
}

export class HybridSearchService {
  /**
   * Busca híbrida combinando semântica + BM25 + reranking
   */
  async search(
    query: string,
    options: HybridSearchOptions
  ): Promise<HybridSearchResult[]> {
    const {
      topK = 10,
      minSimilarity = 0.1,
      userId,
      materialIds,
      category,
      semanticWeight = 0.7,
      bm25Weight = 0.3,
      useReranking = true,
    } = options;

    console.log(`🔍 [HybridSearch] Iniciando busca híbrida REAL para: "${query}"`);

    // ETAPA 1: Buscar TODOS os chunks dos materiais (para BM25 ter acesso completo)
    console.log(`📦 [HybridSearch] Buscando todos os chunks dos materiais...`);
    let allChunks = await pineconeService.getAllChunksForMaterials(userId, materialIds || []);
    
    // FALLBACK: Se filtro por materialId falhar (chunks antigos sem materialId), buscar por userId
    if (allChunks.length === 0 && materialIds && materialIds.length > 0) {
      console.log(`⚠️ [HybridSearch] Nenhum chunk com materialId - tentando fallback por userId...`);
      allChunks = await pineconeService.getAllChunksForUser(userId);
      console.log(`📦 [HybridSearch] Fallback recuperou ${allChunks.length} chunks (SEM filtro por material)`);
    }
    
    if (allChunks.length === 0) {
      console.log(`⚠️ [HybridSearch] Nenhum chunk encontrado mesmo com fallback`);
      return [];
    }
    
    console.log(`📊 [HybridSearch] Total de ${allChunks.length} chunks disponíveis para busca`);

    // ETAPA 2: Busca semântica (Pinecone) - paralela à BM25
    const semanticResults = await pineconeService.searchSimilarContent(
      query,
      userId,
      {
        topK: topK * 3, // Buscar mais resultados para ter pool maior
        minSimilarity: Math.max(minSimilarity * 0.5, 0.3), // Threshold mais permissivo
        materialIds,
        category,
      }
    );

    console.log(`📊 [HybridSearch] Busca semântica retornou ${semanticResults.length} resultados`);

    // ETAPA 3: Busca BM25 sobre TODOS os chunks (não apenas semantic results)
    const bm25Documents = allChunks.map((chunk, idx) => ({
      id: `${idx}`,
      content: chunk.content,
      metadata: chunk,
    }));

    const bm25Results = bm25Service.search(query, bm25Documents, topK * 3);
    const normalizedBM25 = bm25Service.normalizeScores(bm25Results);

    console.log(`📊 [HybridSearch] BM25 retornou ${bm25Results.length} resultados ranqueados`);

    // ETAPA 4: Fusão REAL - combinar semantic + BM25 (podem ser documentos diferentes!)
    const fusedResults = this.fuseBM25AndSemantic(
      semanticResults,
      bm25Results,
      allChunks,
      semanticWeight,
      bm25Weight
    );

    console.log(`📊 [HybridSearch] Fusão produziu ${fusedResults.length} resultados (semantic + BM25)`);

    // ETAPA 4: Reranking com cross-encoder (opcional mas recomendado)
    let finalResults = fusedResults.slice(0, topK * 2); // Pegar top 2x para reranking

    if (useReranking && finalResults.length > 0) {
      console.log(`🎯 [HybridSearch] Aplicando reranking em ${finalResults.length} resultados`);
      
      const rerankingInput = finalResults.map((r: HybridSearchResult) => ({
        query,
        document: r.content,
        metadata: r,
      }));

      const reranked = await rerankingService.rerank(rerankingInput);
      
      // Atualizar finalScore com reranking
      finalResults = reranked.map((r: any) => ({
        ...r.metadata,
        finalScore: r.score,
      }));

      console.log(`✅ [HybridSearch] Reranking concluído`);
    } else {
      // Se não usar reranking, finalScore = fusedScore
      finalResults = finalResults.map(r => ({
        ...r,
        finalScore: r.fusedScore,
      }));
    }

    // Ordenar por finalScore e retornar top-K
    const topResults = finalResults
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, topK);

    console.log(`✅ [HybridSearch] Retornando ${topResults.length} resultados finais`);
    
    return topResults;
  }

  /**
   * Fusão REAL de semantic + BM25 - pode adicionar novos documentos!
   * Esta é a correção crítica: BM25 pode encontrar docs que semantic não encontrou
   */
  private fuseBM25AndSemantic(
    semanticResults: any[],
    bm25Results: any[],
    allChunks: any[],
    semanticWeight: number,
    bm25Weight: number
  ): HybridSearchResult[] {
    // Mapas para lookup rápido
    const semanticMap = new Map<string, number>();
    semanticResults.forEach((r, idx) => {
      // Usar conteúdo como key (primeiros 100 chars para identificação)
      const key = r.content.substring(0, 100);
      semanticMap.set(key, r.similarity);
    });

    const bm25Map = new Map<number, number>();
    bm25Results.forEach(r => {
      bm25Map.set(parseInt(r.id), r.score);
    });

    // UNIÃO de resultados semantic + BM25
    const fusedMap = new Map<string, HybridSearchResult>();

    // Adicionar todos os resultados semânticos
    semanticResults.forEach(r => {
      const key = r.content.substring(0, 100);
      const bm25Score = 0; // Será atualizado se BM25 também encontrou
      
      fusedMap.set(key, {
        content: r.content,
        title: r.title,
        category: r.category,
        similarity: r.similarity,
        bm25Score,
        fusedScore: r.similarity * semanticWeight,
        finalScore: r.similarity * semanticWeight,
      });
    });

    // Adicionar/atualizar com resultados BM25
    bm25Results.forEach(bm25Result => {
      const chunkIdx = parseInt(bm25Result.id);
      const chunk = allChunks[chunkIdx];
      if (!chunk) return;

      const key = chunk.content.substring(0, 100);
      const existing = fusedMap.get(key);

      if (existing) {
        // Documento já estava em semantic - atualizar BM25 score
        existing.bm25Score = bm25Result.score;
        existing.fusedScore = (existing.similarity * semanticWeight) + (bm25Result.score * bm25Weight);
        existing.finalScore = existing.fusedScore;
      } else {
        // NOVO documento encontrado apenas pelo BM25!
        fusedMap.set(key, {
          content: chunk.content,
          title: chunk.title,
          category: chunk.category,
          similarity: 0, // Não tinha score semântico
          bm25Score: bm25Result.score,
          fusedScore: bm25Result.score * bm25Weight,
          finalScore: bm25Result.score * bm25Weight,
        });
      }
    });

    // Converter para array e ordenar por fusedScore
    return Array.from(fusedMap.values())
      .sort((a, b) => b.fusedScore - a.fusedScore);
  }

  /**
   * Reciprocal Rank Fusion (alternativa ao weighted sum)
   * Usado pelo Google e é mais robusto que weighted sum
   */
  private reciprocalRankFusion(
    semanticResults: any[],
    bm25Results: any[],
    k: number = 60
  ): HybridSearchResult[] {
    const scores = new Map<number, number>();

    // Adicionar scores baseados em posição (rank)
    semanticResults.forEach((r, rank) => {
      scores.set(rank, (scores.get(rank) || 0) + (1 / (k + rank + 1)));
    });

    bm25Results.forEach((r, rank) => {
      const idx = parseInt(r.id);
      scores.set(idx, (scores.get(idx) || 0) + (1 / (k + rank + 1)));
    });

    // Criar resultados combinados
    return semanticResults
      .map((semanticResult, idx) => ({
        content: semanticResult.content,
        title: semanticResult.title,
        category: semanticResult.category,
        similarity: semanticResult.similarity,
        bm25Score: 0, // RRF não usa scores diretos
        fusedScore: scores.get(idx) || 0,
        finalScore: scores.get(idx) || 0,
      }))
      .filter(r => r.fusedScore > 0);
  }
}

export const hybridSearchService = new HybridSearchService();
