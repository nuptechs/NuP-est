/**
 * OpenAI/OpenRouter Client
 * 
 * Cliente centralizado para comunicação com APIs de IA (OpenAI, OpenRouter, DeepSeek)
 * 
 * RESPONSABILIDADES:
 * - Configurar cliente com API keys
 * - Gerenciar retry/timeout
 * - Logging de requisições
 * - Tratamento de erros de API
 * 
 * GAPS CONHECIDOS:
 * - [ ] Timeout às vezes excede 45s em requests complexos
 * - [ ] Retry exponencial pode não ser suficiente para rate limits
 * - [ ] Falta circuit breaker para múltiplas falhas consecutivas
 */

import OpenAI from 'openai';
import type { AIRequest, AIResponse, AIClientConfig, ProviderConfig } from './types';

export class AIClient {
  private client: OpenAI;
  private config: AIClientConfig;
  private provider: ProviderConfig;

  constructor(providerConfig: ProviderConfig) {
    this.provider = providerConfig;
    this.config = {
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
      defaultModel: providerConfig.models.default,
      timeout: 45000, // 45s timeout
      retries: 3
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.retries,
    });

    console.log(`✅ [AI Client] Inicializado - Provider: ${providerConfig.provider}, Model: ${providerConfig.models.default}`);
  }

  /**
   * Envia requisição para API de IA
   */
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel || this.provider.models.default;

    try {
      console.log(`🤖 [AI Client] Request iniciado - Model: ${model}, Messages: ${request.messages.length}`);

      const completion = await this.client.chat.completions.create({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      });

      const duration = Date.now() - startTime;
      const response: AIResponse = {
        content: completion.choices[0]?.message?.content || '',
        model: completion.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined
      };

      console.log(`✅ [AI Client] Request completo - Duration: ${duration}ms, Tokens: ${response.usage?.totalTokens || 'N/A'}`);

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AI Client] Request falhou - Duration: ${duration}ms, Error: ${error.message}`);
      
      // Enriquecer erro com contexto
      throw new Error(`AI Request failed (${this.provider.provider}): ${error.message}`);
    }
  }

  /**
   * Gera embeddings para texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.provider.models.embedding || 'text-embedding-ada-002';
    
    try {
      console.log(`🔢 [AI Client] Gerando embedding - Model: ${model}, Text length: ${text.length}`);

      const response = await this.client.embeddings.create({
        model,
        input: text,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from API');
      }

      console.log(`✅ [AI Client] Embedding gerado - Dimensions: ${embedding.length}`);
      return embedding;
    } catch (error: any) {
      console.error(`❌ [AI Client] Embedding falhou - Error: ${error.message}`);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Retorna configuração do provider
   */
  getProviderInfo() {
    return {
      provider: this.provider.provider,
      model: this.provider.models.default,
      baseURL: this.provider.baseURL,
    };
  }
}

/**
 * Factory para criar clientes configurados
 */
export function createAIClient(provider: ProviderConfig): AIClient {
  return new AIClient(provider);
}
