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
import { AppError, errorMessages } from '../../utils/ErrorHandler';

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
 * Parser robusto e flexível para respostas JSON da IA
 * SOLUÇÃO: Múltiplos métodos + logs detalhados + fallback manual
 */
function parseAIResponseRobust(response: string, context: string): any {
  try {
    console.log(`🔍 DEBUG: Parsing resposta da IA para ${context}`);
    console.log(`📝 RESPOSTA COMPLETA DA IA:\n${response}\n--- FIM DA RESPOSTA ---`);
    
    // Múltiplas tentativas de extração de JSON
    let parsed: any = null;
    
    // Tentativa 1: JSON completo na resposta
    try {
      const fullJsonMatch = response.match(/\{[\s\S]*\}/);
      if (fullJsonMatch) {
        parsed = JSON.parse(fullJsonMatch[0]);
        console.log(`✅ JSON parseado (método 1):`, parsed);
      }
    } catch (e) {
      console.log(`⚠️ Método 1 falhou:`, e);
    }
    
    // Tentativa 2: JSON dentro de código (```json)
    if (!parsed) {
      try {
        const codeBlockMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch) {
          parsed = JSON.parse(codeBlockMatch[1].trim());
          console.log(`✅ JSON parseado (método 2):`, parsed);
        }
      } catch (e) {
        console.log(`⚠️ Método 2 falhou:`, e);
      }
    }
    
    // Tentativa 3: Buscar arrays específicos (para flashcards)
    if (!parsed) {
      try {
        const flashcardsMatch = response.match(/"flashcards":\s*\[([\s\S]*?)\]/);
        if (flashcardsMatch) {
          const flashcardsContent = `[${flashcardsMatch[1]}]`;
          const flashcardsArray = JSON.parse(flashcardsContent);
          parsed = { flashcards: flashcardsArray };
          console.log(`✅ JSON parseado (método 3 - flashcards):`, parsed);
        }
      } catch (e) {
        console.log(`⚠️ Método 3 falhou:`, e);
      }
    }
    
    // Tentativa 4: Buscar qualquer array
    if (!parsed) {
      try {
        const arrayMatch = response.match(/\[([\s\S]*?)\]/);
        if (arrayMatch) {
          const arrayContent = JSON.parse(arrayMatch[0]);
          parsed = { data: arrayContent };
          console.log(`✅ JSON parseado (método 4 - array genérico):`, parsed);
        }
      } catch (e) {
        console.log(`⚠️ Método 4 falhou:`, e);
      }
    }
    
    if (!parsed) {
      console.warn(`❌ NENHUM JSON VÁLIDO ENCONTRADO na resposta para ${context}`);
      console.log(`📋 Tentando interpretação manual da resposta...`);
      
      // Fallback manual - retorna estrutura mínima
      if (context.includes('flashcard')) {
        return { flashcards: [] };
      }
      
      return {};
    }

    console.log(`✅ Parsing bem-sucedido para ${context}:`, parsed);
    return parsed;
    
  } catch (error) {
    console.error(`❌ Erro crítico no parsing para ${context}:`, error);
    console.log(`📝 Resposta que causou erro: ${response.substring(0, 1000)}...`);
    
    // Retorno de emergência
    if (context.includes('flashcard')) {
      return { flashcards: [] };
    }
    
    return {};
  }
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
  
  // Parser robusto e flexível para JSON (mesmo que criamos para editais)
  return parseAIResponseRobust(response.content, 'resultado da análise');
}