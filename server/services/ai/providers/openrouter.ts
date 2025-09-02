import { IAIProvider } from '../interfaces';
import { AIRequest, AIResponse, AIMetrics, AIProviderConfig } from '../types';
import { AppError, errorMessages } from '../../../utils/ErrorHandler';

/**
 * Implementação do provedor OpenRouter
 * Suporta múltiplos modelos através do OpenRouter
 */
export class OpenRouterProvider implements IAIProvider {
  name = 'OpenRouter';
  config: AIProviderConfig;
  private metrics: AIMetrics[] = [];

  constructor(apiKey: string, config?: Partial<AIProviderConfig>) {
    this.config = {
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultModel: 'deepseek/deepseek-r1',
      models: [
        'deepseek/deepseek-r1',
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4-turbo',
        'openai/gpt-4o-mini',
        'meta-llama/llama-3.1-405b-instruct'
      ],
      costPerToken: 0.000001, // Custo estimado médio por token
      enabled: true,
      priority: 1,
      ...config
    };
  }

  /**
   * Realiza chat completion via OpenRouter
   */
  async chatCompletion(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel;
    
    try {
      console.log(`🔗 OpenRouter: Fazendo requisição para ${model}`);
      
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.REPLIT_DOMAIN || 'localhost',
          'X-Title': 'NuP-est Study Assistant'
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 1500,
          top_p: request.topP || 0.9,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(503, errorMessages.AI_SERVICE_ERROR, `OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      
      const aiResponse: AIResponse = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0
        } : undefined,
        model,
        provider: this.name,
        requestId: data.id
      };

      // Registrar métricas
      this.recordMetrics({
        provider: this.name,
        model,
        tokensUsed: aiResponse.usage?.totalTokens || 0,
        cost: this.calculateCost(aiResponse.usage?.totalTokens || 0),
        latency: endTime - startTime,
        requestTime: new Date(),
        success: true
      });

      console.log(`✅ OpenRouter: Resposta recebida (${aiResponse.usage?.totalTokens} tokens)`);
      return aiResponse;
      
    } catch (error) {
      const endTime = Date.now();
      
      // Registrar erro nas métricas
      this.recordMetrics({
        provider: this.name,
        model,
        tokensUsed: 0,
        cost: 0,
        latency: endTime - startTime,
        requestTime: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`❌ OpenRouter Error:`, error);
      throw error;
    }
  }

  /**
   * Verifica se o OpenRouter está disponível
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error(`❌ OpenRouter Health Check failed:`, error);
      return false;
    }
  }

  /**
   * Estima o custo de uma requisição
   */
  estimateCost(request: AIRequest): number {
    // Estimativa simples baseada no tamanho do prompt
    const estimatedTokens = request.messages
      .reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
    
    return this.calculateCost(estimatedTokens + (request.maxTokens || 500));
  }

  /**
   * Obtém métricas de uso
   */
  getMetrics(): AIMetrics[] {
    return [...this.metrics];
  }

  /**
   * Calcula o custo baseado em tokens
   */
  private calculateCost(tokens: number): number {
    return tokens * this.config.costPerToken;
  }

  /**
   * Registra métricas de uso
   */
  private recordMetrics(metrics: AIMetrics): void {
    this.metrics.push(metrics);
    
    // Manter apenas as últimas 1000 métricas
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }
}