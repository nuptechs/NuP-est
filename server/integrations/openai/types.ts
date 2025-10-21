/**
 * OpenAI/OpenRouter Integration Types
 * 
 * Todos os tipos relacionados à comunicação com OpenAI e OpenRouter
 */

export interface AIRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIClientConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
  retries?: number;
}

export type AIProvider = 'openai' | 'openrouter' | 'deepseek';

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
  models: {
    default: string;
    chat?: string;
    completion?: string;
    embedding?: string;
  };
}
