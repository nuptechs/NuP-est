/**
 * Ponto de entrada para toda a arquitetura RAG modular
 * Gerencia instâncias dos RAGs especializados e do orquestrador
 */

import { RAGOrchestrator } from './shared/RAGOrchestrator';
import { FlashcardRAGService } from './flashcards/FlashcardRAGService';
import { ChatRAGService } from './chat/ChatRAGService';
import { MultiIndexPineconeAdapter } from './shared/MultiIndexPineconeAdapter';

// Instância singleton do adapter Pinecone
const pineconeAdapter = new MultiIndexPineconeAdapter();

// Instâncias dos RAGs especializados com adapter injetado
const flashcardRAG = new FlashcardRAGService(pineconeAdapter);
const chatRAG = new ChatRAGService(pineconeAdapter);

// Orquestrador central
const ragOrchestrator = new RAGOrchestrator();

// Registrar RAGs especializados com configurações de domínio
ragOrchestrator.registerRAG({
  name: 'flashcards',
  description: 'RAG especializado para geração de flashcards e conceitos',
  service: flashcardRAG,
  indexName: 'nup-flashcards-kb',
  priority: 1,
  enabled: true
});

ragOrchestrator.registerRAG({
  name: 'chat',
  description: 'RAG especializado para contexto conversacional e chat IA',
  service: chatRAG,
  indexName: 'nup-chat-context',
  priority: 2,
  enabled: true
});

// Exportações para uso externo
export {
  ragOrchestrator,
  flashcardRAG,
  chatRAG,
  pineconeAdapter
};

export default ragOrchestrator;