/**
 * CHUNKING SERVICE - EXPORT CENTRAL
 * 
 * Ponto único de exportação para o sistema de chunking.
 * Facilita imports e garante inicialização correta das estratégias.
 */

import { TextChunker } from './TextChunker';
import { SentenceAwareChunkStrategy } from './strategies/SentenceAwareChunkStrategy';
import { SimpleLimitChunkStrategy } from './strategies/SimpleLimitChunkStrategy';
import { SemanticChunkStrategy } from './strategies/SemanticChunkStrategy';

// Auto-registro de estratégias ao importar este módulo
const sentenceAware = new SentenceAwareChunkStrategy();
const simpleLimit = new SimpleLimitChunkStrategy();
const semantic = new SemanticChunkStrategy();

TextChunker.registerStrategy(sentenceAware);
TextChunker.registerStrategy(simpleLimit);
TextChunker.registerStrategy(semantic);

console.log('[Chunking] Estratégias registradas:', 
  sentenceAware.name, simpleLimit.name, semantic.name);

// Exportar tudo
export { TextChunker };
export { SentenceAwareChunkStrategy, SimpleLimitChunkStrategy, SemanticChunkStrategy };
export * from './types';
