/**
 * Tipos base para o sistema de integração de IA
 */

// Configuração base de uma requisição para IA
export interface AIRequest {
  model?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

// Resposta padronizada de qualquer provedor de IA
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  requestId?: string;
}

// Métricas de performance e custo
export interface AIMetrics {
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  latency: number;
  requestTime: Date;
  success: boolean;
  error?: string;
}

// Configuração de um provedor de IA
export interface AIProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  models: string[];
  costPerToken: number;
  enabled: boolean;
  priority: number; // Para fallbacks
}

// Tipos específicos para diferentes casos de uso
export interface ChatCompletionRequest extends AIRequest {
  type: 'chat';
}

export interface AnalysisRequest extends AIRequest {
  type: 'analysis';
  expectJson?: boolean;
}

export interface GenerationRequest extends AIRequest {
  type: 'generation';
  count?: number;
  expectJson?: boolean;
}