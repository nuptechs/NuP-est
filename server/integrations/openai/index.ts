/**
 * OpenAI/OpenRouter Integration
 * 
 * Exporta cliente e tipos para uso em services
 */

export { AIClient, createAIClient } from './client';
export type { 
  AIRequest, 
  AIResponse, 
  AIClientConfig, 
  AIProvider,
  ProviderConfig 
} from './types';
