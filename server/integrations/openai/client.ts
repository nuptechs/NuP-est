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

import type { AIRequest, AIResponse, AIClientConfig, ProviderConfig } from './types';

/**
 * Helper: Fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 45000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error: any) {
      lastError = error;
      
      // Se foi timeout ou erro de rede, tentar novamente com backoff exponencial
      if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ [AI Client] Tentativa ${attempt}/${maxRetries} falhou. Aguardando ${waitTime}ms...`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Erro não recuperável, lançar imediatamente
      throw error;
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
}

export class AIClient {
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

    console.log(`✅ [AI Client] Inicializado - Provider: ${providerConfig.provider}, Model: ${providerConfig.models.default}`);
  }

  /**
   * Envia requisição para API de IA com chat completions
   */
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel || this.provider.models.default;

    try {
      console.log(`🤖 [AI Client] Request iniciado - Model: ${model}, Messages: ${request.messages.length}`);

      const response = await fetchWithRetry(
        `${this.config.baseURL}/chat/completions`,
        {
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
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP ?? 0.9,
          })
        },
        this.config.retries,
        this.config.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      const aiResponse: AIResponse = {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
        provider: this.provider.provider,
        requestId: data.id
      };

      console.log(`✅ [AI Client] Request completo - Duration: ${duration}ms, Tokens: ${aiResponse.usage?.totalTokens || 'N/A'}`);

      return aiResponse;
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

      const response = await fetchWithRetry(
        `${this.config.baseURL}/embeddings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: text,
          })
        },
        this.config.retries,
        this.config.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const embedding = data.data[0]?.embedding;
      
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
