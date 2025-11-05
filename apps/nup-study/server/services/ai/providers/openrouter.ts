import { IAIProvider } from '../interfaces';
import { AIRequest, AIResponse, AIMetrics, AIProviderConfig } from '../types';
import { AppError, errorMessages } from '../../../utils/ErrorHandler';
import { createAIClient, AIClient } from '../../../integrations/openai';

/**
 * Implementação do provedor OpenRouter
 * Agora usa o cliente centralizado em integrations/openai
 */
export class OpenRouterProvider implements IAIProvider {
  name = 'OpenRouter';
  config: AIProviderConfig;
  private metrics: AIMetrics[] = [];
  private aiClient: AIClient;

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
      costPerToken: 0.000001,
      enabled: true,
      priority: 1,
      ...config
    };

    // Criar cliente integrado
    this.aiClient = createAIClient({
      provider: 'openrouter',
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      models: {
        default: this.config.defaultModel,
      }
    });

    console.log(`✅ [OpenRouter] Provider inicializado com cliente integrado`);
  }

  /**
   * Realiza chat completion via OpenRouter usando cliente integrado
   */
  async chatCompletion(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel;
    
    try {
      console.log(`🔗 OpenRouter: Fazendo requisição para ${model}`);
      
      // Usar cliente integrado
      const aiResponse = await this.aiClient.sendRequest(request);

      const endTime = Date.now();

      // Registrar métricas
      this.recordMetrics({
        provider: this.name,
        model: aiResponse.model,
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