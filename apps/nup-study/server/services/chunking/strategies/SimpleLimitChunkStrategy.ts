/**
 * SIMPLE LIMIT CHUNKING STRATEGY
 * 
 * Estratégia simples com limite estrito de caracteres.
 * SEM overlap - ideal para TTS onde cada chunk é independente.
 * Quebra em sentenças/parágrafos quando possível.
 */

import type { IChunkingStrategy, ChunkOptions, ChunkResult } from '../types';

export class SimpleLimitChunkStrategy implements IChunkingStrategy {
  readonly name = 'simple-limit';

  validateOptions(options: ChunkOptions): boolean {
    if (options.maxChars <= 0) return false;
    if (options.overlapChars && options.overlapChars > 0) {
      console.warn(`[${this.name}] Overlap não é suportado por esta estratégia, será ignorado`);
    }
    return true;
  }

  chunk(text: string, options: ChunkOptions): ChunkResult[] {
    if (!this.validateOptions(options)) {
      throw new Error(`[${this.name}] Opções inválidas`);
    }

    const chunks: ChunkResult[] = [];
    const { maxChars, minChunkSize = 50, splitOn = 'sentence' } = options;
    
    let start = 0;
    let chunkNumber = 0;
    
    while (start < text.length) {
      const end = Math.min(start + maxChars, text.length);
      let chunkText = text.slice(start, end);
      let actualEnd = end;
      let wasTruncated = false;
      
      // Tenta quebrar em boundary natural (se não é o último chunk)
      if (end < text.length) {
        const breakPoint = this.findBestBreakPoint(chunkText, splitOn);
        
        if (breakPoint > 0) {
          chunkText = chunkText.slice(0, breakPoint + 1);
          actualEnd = start + breakPoint + 1;
        } else {
          // Não encontrou ponto de quebra natural, trunca no limite
          wasTruncated = true;
        }
      }
      
      // Sempre adicionar último chunk, mesmo se menor que minChunkSize
      const isLastChunk = actualEnd >= text.length;
      
      // IMPORTANTE: Para TTS sem overlap, NÃO fazer trim para preservar todos os caracteres
      // Apenas verificar se o chunk não está vazio (só whitespace)
      const hasContent = chunkText.trim().length > 0;
      
      // Adiciona chunk se:
      // 1. Tiver conteúdo (não apenas whitespace)
      // 2. Atender tamanho mínimo OU ser o último chunk
      if (hasContent && (chunkText.length >= minChunkSize || isLastChunk)) {
        chunks.push({
          text: chunkText, // NÃO trim - preserva espaços
          startIndex: start,
          endIndex: actualEnd,
          chunkNumber: chunkNumber++,
          wasTruncated,
        });
      }
      
      // Próximo chunk começa onde este terminou (SEM overlap)
      start = actualEnd;
      
      if (start >= text.length) break;
    }
    
    // Adiciona totalChunks em todos os resultados
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  /**
   * Encontra o melhor ponto de quebra no chunk
   * @returns Índice do ponto de quebra, ou -1 se não encontrar
   */
  private findBestBreakPoint(text: string, splitOn: 'sentence' | 'paragraph' | 'char'): number {
    if (splitOn === 'char') {
      return text.length - 1; // Quebra no último caractere
    }

    if (splitOn === 'paragraph') {
      const lastParagraph = text.lastIndexOf('\n\n');
      if (lastParagraph > text.length * 0.5) {
        return lastParagraph + 1;
      }
    }

    // Tenta quebrar em sentença
    const sentenceEndings = [
      text.lastIndexOf('. '),
      text.lastIndexOf('? '),
      text.lastIndexOf('! '),
      text.lastIndexOf('.\n'),
      text.lastIndexOf('?\n'),
      text.lastIndexOf('!\n'),
    ];

    const bestSentenceBreak = Math.max(...sentenceEndings);
    
    // Só aceita se estiver em posição razoável (>50% do chunk)
    if (bestSentenceBreak > text.length * 0.5) {
      return bestSentenceBreak;
    }

    // Fallback: quebra em último espaço
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > text.length * 0.5) {
      return lastSpace;
    }

    return -1; // Não encontrou ponto de quebra adequado
  }
}
