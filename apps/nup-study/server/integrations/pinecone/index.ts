/**
 * Pinecone Integration
 */

export { PineconeClient, createPineconeClient } from './client';
export type { 
  PineconeConfig, 
  VectorRecord, 
  QueryRequest, 
  QueryMatch,
  QueryResponse 
} from './types';
