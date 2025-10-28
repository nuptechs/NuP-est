/**
 * TEXT CHUNKER - FACADE
 * 
 * Interface unificada para chunking de texto com múltiplas estratégias.
 * Suporta perfis pré-configurados e configuração customizada.
 * 
 * CASOS DE USO:
 * - TTS (Text-to-Speech): Respeitar limites de API (Deepgram 2000, Whisper 4096)
 * - RAG (Retrieval): Chunks com overlap semântico
 * - Uploads: Processamento de documentos grandes
 * - NuP-Chunks: Integração com processamento externo
 * 
 * EXEMPLO DE USO:
 * ```typescript
 * // Usando perfil pré-configurado
 * const chunks = TextChunker.chunk(longText, 'tts-deepgram');
 * 
 * // Usando configuração customizada
 * const chunks = TextChunker.chunk(longText, {
 *   maxChars: 2000,
 *   splitOn: 'sentence',
 *   overlapChars: 0
 * });
 * 
 * // Obter apenas textos (sem metadados)
 * const textChunks = TextChunker.chunkTexts(longText, 'tts-whisper');
 * ```
 */

import type { 
  ChunkProfile, 
  ChunkOptions, 
  ChunkResult, 
  IChunkingStrategy 
} from './types';
import { CHUNK_PROFILES } from './types';
import { SentenceAwareChunkStrategy } from './strategies/SentenceAwareChunkStrategy';
import { SimpleLimitChunkStrategy } from './strategies/SimpleLimitChunkStrategy';

export class TextChunker {
  private static strategies: Map<string, IChunkingStrategy> = new Map([
    ['sentence-aware', new SentenceAwareChunkStrategy()],
    ['simple-limit', new SimpleLimitChunkStrategy()],
  ]);

  /**
   * Divide texto em chunks usando perfil ou configuração customizada
   * 
   * @param text - Texto a ser dividido
   * @param profileOrOptions - Perfil pré-configurado ou opções customizadas
   * @returns Array de resultados de chunking com metadados (pode ser assíncrono)
   */
  static chunk(
    text: string,
    profileOrOptions: ChunkProfile | ChunkOptions
  ): ChunkResult[] | Promise<ChunkResult[]> {
    const options = this.resolveOptions(profileOrOptions);
    const strategy = this.selectStrategy(options, profileOrOptions);
    
    return strategy.chunk(text, options);
  }

  /**
   * Divide texto e retorna apenas os textos (sem metadados)
   * Conveniente quando metadados não são necessários
   * 
   * @param text - Texto a ser dividido
   * @param profileOrOptions - Perfil pré-configurado ou opções customizadas
   * @returns Array de strings (textos dos chunks) - pode ser assíncrono
   */
  static async chunkTexts(
    text: string,
    profileOrOptions: ChunkProfile | ChunkOptions
  ): Promise<string[]> {
    const results = await this.chunk(text, profileOrOptions);
    return results.map(r => r.text);
  }

  /**
   * Verifica se texto precisa ser dividido em chunks
   * 
   * @param text - Texto a verificar
   * @param maxChars - Limite máximo de caracteres
   * @returns True se texto excede o limite
   */
  static needsChunking(text: string, maxChars: number): boolean {
    return text.length > maxChars;
  }

  /**
   * Estima quantos chunks serão gerados
   * 
   * @param text - Texto a analisar
   * @param profileOrOptions - Perfil ou opções
   * @returns Estimativa de quantidade de chunks
   */
  static estimateChunkCount(
    text: string,
    profileOrOptions: ChunkProfile | ChunkOptions
  ): number {
    const options = this.resolveOptions(profileOrOptions);
    const avgChunkSize = options.maxChars * 0.8; // Estimativa conservadora
    return Math.ceil(text.length / avgChunkSize);
  }

  /**
   * Registra uma nova estratégia de chunking
   * Permite extensibilidade para casos customizados
   * 
   * @param strategy - Estratégia a registrar
   */
  static registerStrategy(strategy: IChunkingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Resolve perfil ou opções para opções concretas
   */
  private static resolveOptions(
    profileOrOptions: ChunkProfile | ChunkOptions
  ): ChunkOptions {
    if (typeof profileOrOptions === 'string') {
      const profile = profileOrOptions as ChunkProfile;
      if (!(profile in CHUNK_PROFILES)) {
        throw new Error(`Perfil de chunking desconhecido: ${profile}`);
      }
      return CHUNK_PROFILES[profile];
    }
    return profileOrOptions;
  }

  /**
   * Seleciona estratégia adequada baseada nas opções
   */
  private static selectStrategy(
    options: ChunkOptions,
    profileOrOptions: ChunkProfile | ChunkOptions
  ): IChunkingStrategy {
    // Se o perfil é 'semantic-default', usar estratégia semântica
    if (typeof profileOrOptions === 'string' && profileOrOptions === 'semantic-default') {
      const semanticStrategy = this.strategies.get('semantic');
      if (semanticStrategy) {
        return semanticStrategy;
      }
      console.warn('[TextChunker] Estratégia semântica não registrada, usando sentence-aware');
    }

    // Se tem overlap, usa sentence-aware (para RAG)
    if (options.overlapChars && options.overlapChars > 0) {
      return this.strategies.get('sentence-aware')!;
    }

    // Sem overlap, usa simple-limit (para TTS)
    return this.strategies.get('simple-limit')!;
  }
}

// Exportar classes para uso direto se necessário
export { SentenceAwareChunkStrategy } from './strategies/SentenceAwareChunkStrategy';
export { SimpleLimitChunkStrategy } from './strategies/SimpleLimitChunkStrategy';
export * from './types';
