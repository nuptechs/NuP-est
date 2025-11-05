import { AIRequest, AIResponse, AIMetrics, AIProviderConfig } from './types';

/**
 * Interface principal para qualquer provedor de IA
 * Todos os provedores (OpenRouter, OpenAI, Anthropic, etc.) devem implementar esta interface
 */
export interface IAIProvider {
  name: string;
  config: AIProviderConfig;
  
  /**
   * Realiza uma requisição de chat completion
   */
  chatCompletion(request: AIRequest): Promise<AIResponse>;
  
  /**
   * Verifica se o provedor está disponível e funcionando
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Calcula o custo estimado de uma requisição
   */
  estimateCost(request: AIRequest): number;
  
  /**
   * Obtém métricas de uso do provedor
   */
  getMetrics(): AIMetrics[];
}

/**
 * Interface para o gerenciador/factory de provedores de IA
 */
export interface IAIManager {
  /**
   * Registra um novo provedor de IA
   */
  registerProvider(provider: IAIProvider): void;
  
  /**
   * Remove um provedor
   */
  unregisterProvider(name: string): void;
  
  /**
   * Obtém um provedor específico por nome
   */
  getProvider(name: string): IAIProvider | undefined;
  
  /**
   * Obtém o provedor ativo (baseado em prioridade e disponibilidade)
   */
  getActiveProvider(): IAIProvider;
  
  /**
   * Realiza uma requisição com fallback automático e seleção inteligente de modelo
   */
  request(request: AIRequest, context?: {
    question?: string;
    knowledgeContext?: string;
    webContext?: string;
  }): Promise<AIResponse>;
  
  /**
   * Lista todos os provedores disponíveis
   */
  listProviders(): IAIProvider[];
  
  /**
   * Obtém métricas consolidadas de todos os provedores
   */
  getConsolidatedMetrics(): AIMetrics[];
}