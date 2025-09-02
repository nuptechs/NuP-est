/**
 * Ponto de entrada principal para o sistema de integração de IA
 * Exporta as principais interfaces e funções para uso nos serviços
 */

// Exportar tipos principais
export type { AIRequest, AIResponse, AIMetrics, AIProviderConfig } from './types';
export type { IAIProvider, IAIManager } from './interfaces';

// Exportar funções principais (injeção de dependência)
export { getAIManager, getAISystemStats } from './container';

// Exportar classes específicas (para casos avançados)
export { AIManager } from './manager';
export { OpenRouterProvider } from './providers/openrouter';

/**
 * Funções de conveniência para casos de uso comuns
 */
import { getAIManager } from './container';
import { AIRequest, AIResponse } from './types';

/**
 * Função simples para chat completion
 * Uso: const response = await aiChat('Explique o poder constituinte', 'user');
 */
export async function aiChat(content: string, role: 'user' | 'system' = 'user'): Promise<string> {
  const aiManager = getAIManager();
  
  const request: AIRequest = {
    messages: [{ role, content }],
    temperature: 0.7,
    maxTokens: 1500
  };
  
  const response = await aiManager.request(request, {
    question: role === 'user' ? content : undefined
  });
  return response.content;
}

/**
 * Função para chat com contexto (ex: RAG)
 */
export async function aiChatWithContext(
  userMessage: string, 
  systemContext: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<AIResponse> {
  const aiManager = getAIManager();
  
  const request: AIRequest = {
    model: options.model,
    messages: [
      { role: 'system', content: systemContext },
      { role: 'user', content: userMessage }
    ],
    temperature: options.temperature || 0.7,
    maxTokens: options.maxTokens || 1500
  };
  
  // Usar contexto inteligente para seleção de modelo
  return aiManager.request(request, {
    question: userMessage,
    knowledgeContext: systemContext
  });
}

/**
 * Função para análise de texto com retorno JSON
 */
export async function aiAnalyze<T = any>(
  content: string, 
  instruction: string,
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T> {
  const aiManager = getAIManager();
  
  const request: AIRequest = {
    messages: [
      { 
        role: 'system', 
        content: `${instruction}\n\nResponda APENAS com JSON válido, sem texto adicional.` 
      },
      { role: 'user', content }
    ],
    temperature: options.temperature || 0.3,
    maxTokens: options.maxTokens || 1000
  };
  
  const response = await aiManager.request(request, {
    question: content
  });
  
  // Extrair JSON da resposta
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Resposta da IA não contém JSON válido');
  }
  
  return JSON.parse(jsonMatch[0]);
}