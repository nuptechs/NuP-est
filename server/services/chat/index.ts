import { ConversationAnalyzer } from './ConversationAnalyzer';
import { getAIManager } from '../ai/index';

// Singleton do ConversationAnalyzer para reutilizar cache entre requests
let globalAnalyzerInstance: ConversationAnalyzer | null = null;

/**
 * Obtém a instância global do ConversationAnalyzer (singleton com cache persistente)
 */
export function getConversationAnalyzer(): ConversationAnalyzer {
  if (!globalAnalyzerInstance) {
    const aiManager = getAIManager();
    globalAnalyzerInstance = new ConversationAnalyzer(aiManager);
    console.log('📊 ConversationAnalyzer singleton criado');
  }
  return globalAnalyzerInstance;
}

export { ConversationAnalyzer } from './ConversationAnalyzer';
export type { ConversationTopic, TemporalGroup } from './ConversationAnalyzer';
