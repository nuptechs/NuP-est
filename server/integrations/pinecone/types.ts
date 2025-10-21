/**
 * Pinecone Integration Types
 */

export interface PineconeConfig {
  apiKey: string;
  environment?: string;
  indexName: string;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface QueryRequest {
  vector: number[];
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface QueryMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface QueryResponse {
  matches: QueryMatch[];
  namespace?: string;
}
