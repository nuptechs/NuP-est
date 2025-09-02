import { AIRequest } from './types';

/**
 * Seletor inteligente de modelos baseado no tipo de pergunta
 * RESPONSABILIDADE: Decidir qual modelo usar baseado no contexto
 */
export class ModelSelector {
  
  /**
   * Seleciona o modelo ótimo baseado na pergunta e contexto
   */
  selectOptimalModel(request: AIRequest, context?: {
    question?: string;
    knowledgeContext?: string;
    webContext?: string;
  }): {
    model: string;
    reasoning: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  } {
    
    if (!context?.question) {
      // Configuração padrão quando não há contexto específico
      return {
        model: 'deepseek/deepseek-r1',
        reasoning: 'Configuração padrão - pergunta geral',
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 1000,
        topP: request.topP || 0.9
      };
    }

    const question = context.question;
    const questionLower = question.toLowerCase();
    const hasComplexContext = (context.knowledgeContext?.length || 0) > 500 || 
                              (context.webContext?.length || 0) > 500;
    
    // 📊 DETECTAR PERGUNTAS SOBRE TABELAS/ANÁLISES (Claude 3.5 Sonnet - Alta qualidade)
    const tableKeywords = [
      'tabela', 'table', 'comparar', 'compare', 'análise', 'analysis', 
      'classificar', 'classify', 'organizar', 'organize', 'estruturar', 
      'listar detalhadamente', 'diferenças entre', 'semelhanças', 
      'quadro', 'matriz', 'planilha', 'dados organizados'
    ];
    const isTableAnalysis = tableKeywords.some(keyword => questionLower.includes(keyword));
    
    // 💻 DETECTAR PERGUNTAS TÉCNICAS/CÓDIGO (DeepSeek V3 - Especializado)
    const techKeywords = [
      'código', 'code', 'programar', 'programming', 'algoritmo', 'algorithm', 
      'função', 'function', 'javascript', 'python', 'sql', 'html', 'css', 
      'api', 'debug', 'erro técnico', 'implementar', 'desenvolvimento'
    ];
    const isTechnical = techKeywords.some(keyword => questionLower.includes(keyword));
    
    // 📝 DETECTAR PERGUNTAS COMPLEXAS QUE PRECISAM DE ALTA QUALIDADE
    const complexKeywords = [
      'explique detalhadamente', 'análise profunda', 'compare detalhadamente', 
      'dissertação', 'ensaio', 'redação', 'argumentação', 'fundamentação teórica'
    ];
    const isComplex = complexKeywords.some(keyword => questionLower.includes(keyword)) || hasComplexContext;
    
    // 📊 LÓGICA DE SELEÇÃO INTELIGENTE
    if (isTableAnalysis || question.length > 200) {
      return {
        model: "anthropic/claude-3.5-sonnet",
        reasoning: "Pergunta sobre tabelas/análises ou muito longa - usando Claude para máxima qualidade",
        temperature: 0.4,
        maxTokens: 1500,
        topP: 0.85
      };
    }
    
    if (isTechnical) {
      return {
        model: "deepseek/deepseek-v3",
        reasoning: "Pergunta técnica - usando DeepSeek V3 especializado",
        temperature: 0.3,
        maxTokens: 1200,
        topP: 0.8
      };
    }
    
    if (isComplex || hasComplexContext) {
      return {
        model: "anthropic/claude-3.5-sonnet",
        reasoning: "Pergunta complexa ou muito contexto - usando Claude para melhor qualidade",
        temperature: 0.5,
        maxTokens: 1200,
        topP: 0.9
      };
    }
    
    // 💰 PADRÃO: Perguntas gerais (DeepSeek R1 - Econômico)
    return {
      model: "deepseek/deepseek-r1",
      reasoning: "Pergunta geral - usando modelo econômico",
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9
    };
  }

  /**
   * Otimiza o prompt baseado nos limites do modelo selecionado
   */
  optimizePromptForModel(prompt: string, modelName: string): string {
    // Aproximação: 1 token ≈ 4 caracteres em português
    const estimatedTokens = Math.ceil(prompt.length / 4);
    
    // Limites seguros por modelo (deixando margem para resposta)
    const tokenLimits: Record<string, number> = {
      'anthropic/claude-3.5-sonnet': 8000, // Limite seguro para contas free
      'deepseek/deepseek-v3': 6000,
      'deepseek/deepseek-r1': 15000, // Modelo mais generoso
    };
    
    const maxTokens = tokenLimits[modelName] || 6000;
    
    if (estimatedTokens <= maxTokens) {
      console.log(`📏 Prompt OK: ${estimatedTokens} tokens (limite: ${maxTokens})`);
      return prompt;
    }

    console.log(`⚠️ Prompt muito grande: ${estimatedTokens} tokens, truncando para ${maxTokens}`);
    
    // Truncamento inteligente: manter a pergunta, reduzir contexto
    const targetChars = maxTokens * 4;
    const truncatedPrompt = prompt.substring(0, targetChars);
    
    console.log(`✅ Prompt otimizado: ${Math.ceil(truncatedPrompt.length / 4)} tokens`);
    
    return truncatedPrompt + '\n\n⚠️ Contexto reduzido devido a limites de tokens. Responda com base no conteúdo disponível.';
  }
}