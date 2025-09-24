/**
 * Ponto de entrada para toda a arquitetura RAG modular
 * Gerencia instâncias dos RAGs especializados e do orquestrador
 */

import { RAGOrchestrator } from './shared/RAGOrchestrator';
import { FlashcardRAGService } from './flashcards/FlashcardRAGService';
import { ChatRAGService } from './chat/ChatRAGService';
import { ProfileRAGService } from './profile/ProfileRAGService';
import { SimulationRAGService } from './simulation/SimulationRAGService';
import { MultiIndexPineconeAdapter } from './shared/MultiIndexPineconeAdapter';

// Instância singleton do adapter Pinecone
const pineconeAdapter = new MultiIndexPineconeAdapter();

// Instâncias dos RAGs especializados com adapter injetado
const flashcardRAG = new FlashcardRAGService(pineconeAdapter);
const chatRAG = new ChatRAGService(pineconeAdapter);
const profileRAG = new ProfileRAGService(pineconeAdapter);
const simulationRAG = new SimulationRAGService(pineconeAdapter);

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

ragOrchestrator.registerRAG({
  name: 'profile',
  description: 'RAG especializado para perfil do usuário e padrões de aprendizado',
  service: profileRAG,
  indexName: 'nup-user-profiles',
  priority: 3,
  enabled: true
});

ragOrchestrator.registerRAG({
  name: 'simulation',
  description: 'RAG especializado para simulados e questões de concurso',
  service: simulationRAG,
  indexName: 'nup-simulations-kb',
  priority: 4,
  enabled: true
});

// Exportações para uso externo
export {
  ragOrchestrator,
  flashcardRAG,
  chatRAG,
  profileRAG,
  simulationRAG,
  pineconeAdapter
};

export default ragOrchestrator;