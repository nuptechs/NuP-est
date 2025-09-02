import { IAIManager } from './interfaces';
import { AIManager } from './manager';
import { OpenRouterProvider } from './providers/openrouter';

/**
 * Container de Injeção de Dependência para o sistema de IA
 * Centraliza a configuração e instanciação de todos os provedores
 */
export class AIContainer {
  private static instance: AIContainer;
  private aiManager: IAIManager;

  private constructor() {
    this.aiManager = new AIManager();
    this.setupProviders();
  }

  /**
   * Singleton - retorna a instância única do container
   */
  static getInstance(): AIContainer {
    if (!AIContainer.instance) {
      AIContainer.instance = new AIContainer();
    }
    return AIContainer.instance;
  }

  /**
   * Retorna o gerenciador de IA configurado
   */
  getAIManager(): IAIManager {
    return this.aiManager;
  }

  /**
   * Configura todos os provedores de IA disponíveis
   */
  private setupProviders(): void {
    console.log('🔧 Configurando provedores de IA...');

    // Configurar OpenRouter (provedor principal)
    if (process.env.OPENROUTER_API_KEY) {
      const openRouterProvider = new OpenRouterProvider(
        process.env.OPENROUTER_API_KEY,
        {
          priority: 1, // Prioridade mais alta
          enabled: true,
          defaultModel: 'deepseek/deepseek-r1'
        }
      );
      
      this.aiManager.registerProvider(openRouterProvider);
      console.log('✅ OpenRouter configurado como provedor principal');
    } else {
      console.warn('⚠️ OPENROUTER_API_KEY não encontrada');
    }

    // Aqui poderemos adicionar outros provedores no futuro:
    // - OpenAI (se tivermos chave)
    // - Anthropic
    // - Local models
    // - etc.

    const providers = this.aiManager.listProviders();
    console.log(`🎯 Sistema de IA configurado com ${providers.length} provedor(es)`);
  }

  /**
   * Reconfigura os provedores (útil para atualizações em runtime)
   */
  reconfigure(): void {
    console.log('🔄 Reconfigurando sistema de IA...');
    
    // Limpar provedores existentes
    const currentProviders = this.aiManager.listProviders();
    for (const provider of currentProviders) {
      this.aiManager.unregisterProvider(provider.name);
    }
    
    // Reconfigurar
    this.setupProviders();
  }

  /**
   * Obtém estatísticas do sistema de IA
   */
  getSystemStats() {
    const manager = this.aiManager as AIManager;
    return {
      providers: manager.listProviders().map(p => ({
        name: p.name,
        enabled: p.config.enabled,
        priority: p.config.priority,
        defaultModel: p.config.defaultModel,
        models: p.config.models
      })),
      stats: manager.getProviderStats(),
      totalRequests: manager.getConsolidatedMetrics().length
    };
  }
}

/**
 * Factory function para obter o gerenciador de IA
 * Esta é a interface principal que os serviços devem usar
 */
export function getAIManager(): IAIManager {
  return AIContainer.getInstance().getAIManager();
}

/**
 * Factory function para obter estatísticas do sistema
 */
export function getAISystemStats() {
  return AIContainer.getInstance().getSystemStats();
}