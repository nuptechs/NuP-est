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
    
    // Tentativa 3: Buscar arrays específicos (para flashcards) - MELHORADO
    if (!parsed) {
      try {
        // Buscar início do array de flashcards, mesmo se incompleto
        const flashcardsMatch = response.match(/"flashcards":\s*\[([\s\S]*)/);
        if (flashcardsMatch) {
          let flashcardsContent = flashcardsMatch[1];
          
          // Tentar completar JSON incompleto
          const openBraces = (flashcardsContent.match(/\{/g) || []).length;
          const closeBraces = (flashcardsContent.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          // Se há flashcards no meio da resposta, vamos extrair o que conseguimos
          if (missingBraces > 0) {
            console.log(`🔧 Tentando reparar JSON incompleto (faltam ${missingBraces} '}' e possivelmente ']')`);
            
            // Adicionar closes faltantes
            for (let i = 0; i < missingBraces; i++) {
              flashcardsContent += '}';
            }
            
            // Se não termina com ], adicionar
            if (!flashcardsContent.trim().endsWith(']')) {
              flashcardsContent += ']';
            }
          }
          
          // Tentar parsear o array reparado
          const fullJson = `[${flashcardsContent}]`;
          const flashcardsArray = JSON.parse(fullJson);
          
          // Filtrar apenas flashcards válidos (que têm front e back)
          const validFlashcards = flashcardsArray.filter((card: any) => 
            card && typeof card === 'object' && card.front && card.back
          );
          
          parsed = { flashcards: validFlashcards };
          console.log(`✅ JSON parseado e reparado (método 3 - flashcards):`, parsed);
          console.log(`📊 Flashcards válidos extraídos: ${validFlashcards.length}`);
        }
      } catch (e) {
        console.log(`⚠️ Método 3 falhou:`, e);
        
        // Tentativa manual de extrair flashcards individuais
        try {
          console.log(`🔧 Tentativa de extração manual de flashcards...`);
          const manualCards = [];
          
          // Buscar padrões de flashcards individuais usando exec
          const cardRegex = /"front":\s*"([^"]*)",\s*"back":\s*"([^"]*)"/g;
          let match;
          
          while ((match = cardRegex.exec(response)) !== null) {
            manualCards.push({
              front: match[1],
              back: match[2]
            });
          }
          
          if (manualCards.length > 0) {
            parsed = { flashcards: manualCards };
            console.log(`✅ Extração manual bem-sucedida: ${manualCards.length} flashcards`);
          }
        } catch (manualError) {
          console.log(`⚠️ Extração manual também falhou:`, manualError);
        }
      }
    }
    
    // Tentativa 4: Buscar e reparar array de questões (quiz)
    if (!parsed && context.includes('quiz')) {
      try {
        console.log(`🔧 Tentando reparar array de questões...`);
        
        // Buscar início do array
        const arrayMatch = response.match(/\[([\s\S]*)/);
        if (arrayMatch) {
          let arrayContent = arrayMatch[1];
          
          // Contar chaves e colchetes para detectar incompletude
          const openBraces = (arrayContent.match(/\{/g) || []).length;
          const closeBraces = (arrayContent.match(/\}/g) || []).length;
          const openBrackets = (arrayContent.match(/\[/g) || []).length;
          const closeBrackets = (arrayContent.match(/\]/g) || []).length;
          
          const missingBraces = openBraces - closeBraces;
          const missingBrackets = openBrackets - closeBrackets;
          
          console.log(`📊 Análise: { abertas: ${openBraces}, fechadas: ${closeBraces}, faltam: ${missingBraces}`);
          console.log(`📊 Análise: [ abertas: ${openBrackets}, fechadas: ${closeBrackets}, faltam: ${missingBrackets}`);
          
          // Se há questões incompletas, tentar reparar
          if (missingBraces > 0 || missingBrackets > 0) {
            console.log(`🔧 Reparando JSON incompleto...`);
            
            // Adicionar chaves faltantes
            for (let i = 0; i < missingBraces; i++) {
              arrayContent += '}';
            }
            
            // Adicionar colchetes faltantes (menos 1 do array principal que adicionaremos)
            for (let i = 0; i < missingBrackets; i++) {
              arrayContent += ']';
            }
            
            // Se não termina com ], adicionar para fechar o array principal
            if (!arrayContent.trim().endsWith(']')) {
              arrayContent += ']';
            }
          }
          
          // Tentar parsear o array reparado
          const fullJson = `[${arrayContent}`;
          const questionsArray = JSON.parse(fullJson);
          
          // Filtrar apenas questões válidas
          const validQuestions = questionsArray.filter((q: any) => 
            q && typeof q === 'object' && q.question && Array.isArray(q.options)
          );
          
          parsed = validQuestions;
          console.log(`✅ Array reparado (método 4 - quiz): ${validQuestions.length} questões válidas`);
        }
      } catch (e) {
        console.log(`⚠️ Método 4 (quiz repair) falhou:`, e);
      }
    }
    
    // Tentativa 5: Buscar qualquer array (método original)
    if (!parsed) {
      try {
        const arrayMatch = response.match(/\[([\s\S]*?)\]/);
        if (arrayMatch) {
          const arrayContent = JSON.parse(arrayMatch[0]);
          parsed = Array.isArray(arrayContent) ? arrayContent : { data: arrayContent };
          console.log(`✅ JSON parseado (método 5 - array genérico):`, parsed);
        }
      } catch (e) {
        console.log(`⚠️ Método 5 falhou:`, e);
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