import { IAIManager, IAIProvider } from './interfaces';
import { AIRequest, AIResponse, AIMetrics } from './types';
import { ModelSelector } from './selector';
import { AppError, errorMessages } from '../../utils/ErrorHandler';

/**
 * Gerenciador centralizado de provedores de IA
 * Implementa fallbacks automáticos, balanceamento de carga e métricas
 */
export class AIManager implements IAIManager {
  private providers: Map<string, IAIProvider> = new Map();
  private requestHistory: Array<{ provider: string; success: boolean; timestamp: Date }> = [];
  private modelSelector = new ModelSelector();

  /**
   * Registra um novo provedor de IA
   */
  registerProvider(provider: IAIProvider): void {
    console.log(`📝 Registrando provedor de IA: ${provider.name}`);
    this.providers.set(provider.name, provider);
  }

  /**
   * Remove um provedor
   */
  unregisterProvider(name: string): void {
    console.log(`🗑️ Removendo provedor de IA: ${name}`);
    this.providers.delete(name);
  }

  /**
   * Obtém um provedor específico por nome
   */
  getProvider(name: string): IAIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Obtém o provedor ativo baseado em prioridade e disponibilidade
   */
  getActiveProvider(): IAIProvider {
    const enabledProviders = Array.from(this.providers.values())
      .filter((p: IAIProvider) => p.config.enabled)
      .sort((a: IAIProvider, b: IAIProvider) => a.config.priority - b.config.priority);

    if (enabledProviders.length === 0) {
      throw new AppError(503, errorMessages.AI_SERVICE_ERROR, 'Nenhum provedor de IA disponível');
    }

    // Por enquanto, retorna o primeiro (maior prioridade)
    // No futuro, pode implementar lógica mais sofisticada
    return enabledProviders[0];
  }

  /**
   * Realiza uma requisição com seleção inteligente de modelo e fallback automático
   */
  async request(request: AIRequest, context?: {
    question?: string;
    knowledgeContext?: string;
    webContext?: string;
  }): Promise<AIResponse> {
    const enabledProviders = Array.from(this.providers.values())
      .filter((p: IAIProvider) => p.config.enabled)
      .sort((a: IAIProvider, b: IAIProvider) => a.config.priority - b.config.priority);

    if (enabledProviders.length === 0) {
      throw new AppError(503, errorMessages.AI_SERVICE_ERROR, '❌ Nenhum provedor de IA disponível');
    }

    // 🧠 SELEÇÃO INTELIGENTE DE MODELO
    const modelSelection = this.modelSelector.selectOptimalModel(request, context);
    console.log(`🎯 Modelo selecionado: ${modelSelection.model} - ${modelSelection.reasoning}`);

    // Atualizar request com configurações otimizadas
    const optimizedRequest: AIRequest = {
      ...request,
      model: modelSelection.model,
      temperature: modelSelection.temperature || request.temperature,
      maxTokens: modelSelection.maxTokens || request.maxTokens,
      topP: modelSelection.topP || request.topP
    };

    // Otimizar prompt se necessário
    if (optimizedRequest.messages?.length > 0 && context?.question) {
      const lastMessage = optimizedRequest.messages[optimizedRequest.messages.length - 1];
      if (lastMessage.content) {
        lastMessage.content = this.modelSelector.optimizePromptForModel(lastMessage.content, modelSelection.model);
      }
    }

    let lastError: Error | null = null;

    for (const provider of enabledProviders) {
      try {
        console.log(`🎯 Tentando provedor: ${provider.name} com modelo ${modelSelection.model}`);
        
        const startTime = Date.now();
        const response = await provider.chatCompletion(optimizedRequest);
        
        // Registrar sucesso
        this.recordRequest(provider.name, true);
        
        console.log(`✅ Sucesso com ${provider.name} (${Date.now() - startTime}ms)`);
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Registrar falha
        this.recordRequest(provider.name, false);
        
        console.warn(`⚠️ Falha com ${provider.name}: ${lastError.message}`);
        
        // Se não é o último provedor, tentar o próximo
        if (provider !== enabledProviders[enabledProviders.length - 1]) {
          console.log(`🔄 Tentando próximo provedor...`);
          continue;
        }
      }
    }

    // Se chegou aqui, todos os provedores falharam
    console.error(`❌ Todos os provedores de IA falharam`);
    throw new AppError(503, errorMessages.AI_SERVICE_ERROR, `Todos os provedores de IA falharam. Último erro: ${lastError?.message}`);
  }

  /**
   * Lista todos os provedores disponíveis
   */
  listProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Obtém métricas consolidadas de todos os provedores
   */
  getConsolidatedMetrics(): AIMetrics[] {
    const allMetrics: AIMetrics[] = [];
    
    for (const provider of this.providers.values()) {
      allMetrics.push(...provider.getMetrics());
    }
    
    // Ordenar por timestamp (mais recentes primeiro)
    return allMetrics.sort((a, b) => b.requestTime.getTime() - a.requestTime.getTime());
  }

  /**
   * Obtém estatísticas de uso dos provedores
   */
  getProviderStats(): Array<{
    provider: string;
    totalRequests: number;
    successRate: number;
    avgLatency: number;
    totalCost: number;
    enabled: boolean;
  }> {
    const stats: Array<{
      provider: string;
      totalRequests: number;
      successRate: number;
      avgLatency: number;
      totalCost: number;
      enabled: boolean;
    }> = [];

    for (const provider of this.providers.values()) {
      const metrics = provider.getMetrics();
      
      if (metrics.length === 0) {
        stats.push({
          provider: provider.name,
          totalRequests: 0,
          successRate: 0,
          avgLatency: 0,
          totalCost: 0,
          enabled: provider.config.enabled
        });
        continue;
      }

      const successfulRequests = metrics.filter((m: AIMetrics) => m.success).length;
      const totalLatency = metrics.reduce((sum: number, m: AIMetrics) => sum + m.latency, 0);
      const totalCost = metrics.reduce((sum: number, m: AIMetrics) => sum + m.cost, 0);

      stats.push({
        provider: provider.name,
        totalRequests: metrics.length,
        successRate: (successfulRequests / metrics.length) * 100,
        avgLatency: totalLatency / metrics.length,
        totalCost,
        enabled: provider.config.enabled
      });
    }

    return stats.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * Registra histórico de requisições para fallback inteligente
   */
  private recordRequest(provider: string, success: boolean): void {
    this.requestHistory.push({
      provider,
      success,
      timestamp: new Date()
    });

    // Manter apenas as últimas 100 requisições
    if (this.requestHistory.length > 100) {
      this.requestHistory = this.requestHistory.slice(-100);
    }
  }
}