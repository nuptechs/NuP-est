/**
 * CHUNKING SERVICE - TYPE DEFINITIONS
 * 
 * Sistema modular de chunking de texto para diferentes casos de uso:
 * - TTS (Text-to-Speech): Limites estritos sem overlap
 * - RAG (Retrieval-Augmented Generation): Overlap semântico
 * - Uploads: Processamento hierárquico de documentos
 * - NuP-Chunks: Integração com processamento externo
 */

/**
 * Perfil de chunking pré-configurado para casos de uso comuns
 */
export type ChunkProfile = 
  | 'tts-deepgram'    // 2000 chars, sem overlap, quebra em sentenças
  | 'tts-whisper'     // 4096 chars, sem overlap, quebra em sentenças
  | 'rag-default'     // 1000 chars, overlap 200, quebra semântica
  | 'rag-chat'        // 1200 chars, overlap 200, contexto conversacional
  | 'upload-standard' // Processamento de uploads
  | 'custom';         // Configuração customizada

/**
 * Opções de configuração para chunking
 */
export interface ChunkOptions {
  /** Tamanho máximo de cada chunk em caracteres */
  maxChars: number;
  
  /** Tamanho do overlap entre chunks (para contexto semântico) */
  overlapChars?: number;
  
  /** Estratégia de quebra: onde quebrar o texto */
  splitOn?: 'sentence' | 'paragraph' | 'char';
  
  /** Tamanho mínimo de chunk (chunks menores são descartados ou mesclados) */
  minChunkSize?: number;
  
  /** Se deve truncar texto que exceder maxChars após tentativa de quebra */
  allowTruncation?: boolean;
  
  /** Preservar formatação (paragraphs, line breaks) */
  preserveFormatting?: boolean;
}

/**
 * Resultado do chunking com metadados
 */
export interface ChunkResult {
  /** Texto do chunk */
  text: string;
  
  /** Posição inicial no texto original (caractere) */
  startIndex: number;
  
  /** Posição final no texto original (caractere) */
  endIndex: number;
  
  /** Número do chunk na sequência */
  chunkNumber: number;
  
  /** Total de chunks gerados */
  totalChunks?: number;
  
  /** Se o chunk foi truncado */
  wasTruncated?: boolean;
  
  /** Metadados adicionais */
  metadata?: Record<string, any>;
}

/**
 * Interface para estratégias de chunking
 */
export interface IChunkingStrategy {
  /**
   * Nome identificador da estratégia
   */
  readonly name: string;
  
  /**
   * Divide texto em chunks segundo a estratégia
   * @param text - Texto a ser dividido
   * @param options - Opções de configuração
   * @returns Array de resultados de chunking
   */
  chunk(text: string, options: ChunkOptions): ChunkResult[];
  
  /**
   * Valida se as opções são compatíveis com esta estratégia
   * @param options - Opções a validar
   * @returns True se válidas, false caso contrário
   */
  validateOptions(options: ChunkOptions): boolean;
}

/**
 * Perfis pré-configurados mapeados para opções
 */
export const CHUNK_PROFILES: Record<ChunkProfile, ChunkOptions> = {
  'tts-deepgram': {
    maxChars: 2000,
    overlapChars: 0,
    splitOn: 'sentence',
    minChunkSize: 50,
    allowTruncation: false,
    preserveFormatting: false,
  },
  'tts-whisper': {
    maxChars: 4096,
    overlapChars: 0,
    splitOn: 'sentence',
    minChunkSize: 50,
    allowTruncation: false,
    preserveFormatting: false,
  },
  'rag-default': {
    maxChars: 1000,
    overlapChars: 200,
    splitOn: 'sentence',
    minChunkSize: 50,
    allowTruncation: false,
    preserveFormatting: true,
  },
  'rag-chat': {
    maxChars: 1200,
    overlapChars: 200,
    splitOn: 'paragraph',
    minChunkSize: 100,
    allowTruncation: false,
    preserveFormatting: true,
  },
  'upload-standard': {
    maxChars: 2000,
    overlapChars: 100,
    splitOn: 'paragraph',
    minChunkSize: 100,
    allowTruncation: false,
    preserveFormatting: true,
  },
  'custom': {
    maxChars: 1000,
    overlapChars: 0,
    splitOn: 'char',
    minChunkSize: 1,
    allowTruncation: true,
    preserveFormatting: false,
  },
};
