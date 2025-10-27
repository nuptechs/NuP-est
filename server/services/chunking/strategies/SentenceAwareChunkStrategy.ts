/**
 * SENTENCE-AWARE CHUNKING STRATEGY
 * 
 * Estratégia que divide texto respeitando limites de sentenças e parágrafos.
 * Suporta overlap para manter contexto semântico (ideal para RAG).
 * 
 * Extraído de: BaseRAGService.chunkText()
 */

import type { IChunkingStrategy, ChunkOptions, ChunkResult } from '../types';

export class SentenceAwareChunkStrategy implements IChunkingStrategy {
  readonly name = 'sentence-aware';

  validateOptions(options: ChunkOptions): boolean {
    if (options.maxChars <= 0) return false;
    if (options.overlapChars && options.overlapChars >= options.maxChars) return false;
    return true;
  }

  chunk(text: string, options: ChunkOptions): ChunkResult[] {
    if (!this.validateOptions(options)) {
      throw new Error(`[${this.name}] Opções inválidas`);
    }

    const chunks: ChunkResult[] = [];
    const { maxChars, overlapChars = 0, minChunkSize = 50 } = options;
    
    let start = 0;
    let chunkNumber = 0;
    
    while (start < text.length) {
      const end = Math.min(start + maxChars, text.length);
      let chunkText = text.slice(start, end);
      let actualEnd = end;
      
      // Tenta quebrar em uma frase ou parágrafo completo
      if (end < text.length) {
        const lastSentence = chunkText.lastIndexOf('. ');
        const lastQuestion = chunkText.lastIndexOf('? ');
        const lastExclamation = chunkText.lastIndexOf('! ');
        const lastParagraph = chunkText.lastIndexOf('\n\n');
        
        // Encontra o melhor ponto de quebra
        const breakPoint = Math.max(
          lastSentence,
          lastQuestion,
          lastExclamation,
          lastParagraph
        );
        
        // Só quebra se o ponto estiver em posição razoável (>60% do chunk)
        if (breakPoint > maxChars * 0.6) {
          chunkText = text.slice(start, start + breakPoint + 1);
          actualEnd = start + breakPoint + 1;
        }
      }
      
      const trimmedChunk = chunkText.trim();
      
      // Sempre adicionar último chunk, mesmo se menor que minChunkSize
      const isLastChunk = actualEnd >= text.length;
      
      // Adiciona chunk se atender tamanho mínimo OU se for o último chunk
      if (trimmedChunk.length >= minChunkSize || isLastChunk) {
        chunks.push({
          text: trimmedChunk,
          startIndex: start,
          endIndex: actualEnd,
          chunkNumber: chunkNumber++,
          wasTruncated: false,
        });
      }
      
      // Calcula próximo início com overlap seguro
      const actualChunkLength = chunkText.length;
      const safeOverlap = Math.min(overlapChars, actualChunkLength - 1);
      const nextStart = start + actualChunkLength - safeOverlap;
      
      // Garante progresso mínimo (previne loop infinito)
      start = Math.max(nextStart, start + 1);
      
      if (start >= text.length) break;
    }
    
    // Adiciona totalChunks em todos os resultados
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    return chunks;
  }
}
