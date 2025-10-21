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
 * - Circuit breaker para prevenir cascatas de falhas
 * - Rate limit handling inteligente
 * 
 * MELHORIAS IMPLEMENTADAS (October 2025):
 * - ✅ Circuit breaker com auto-recuperação e HALF_OPEN enforced em retries
 * - ✅ Detecção específica de rate limits (429)
 * - ✅ Backoff exponencial adaptativo
 * - ✅ Métricas de saúde do cliente
 * - ✅ Retry-After parsing robusto (delta-seconds + HTTP-date) com fallback
 */

import type { AIRequest, AIResponse, AIClientConfig, ProviderConfig } from './types';

/**
 * Estado do Circuit Breaker
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Funcionando normalmente
  OPEN = 'OPEN',         // Bloqueando requests
  HALF_OPEN = 'HALF_OPEN' // Testando recuperação
}

/**
 * Métricas do Circuit Breaker
 */
interface CircuitMetrics {
  consecutiveFailures: number;
  lastFailureTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  halfOpenRequests: number; // Contador de requests em HALF_OPEN
}

/**
 * Helper: Parse Retry-After header (suporta delta-seconds e HTTP-date)
 * Retorna null se inválido ou não-positivo (para fallback em backoff exponencial)
 */
function parseRetryAfter(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) {
    return null;
  }

  // Tentar parse como delta-seconds (número inteiro)
  const deltaSeconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(deltaSeconds) && deltaSeconds > 0) {
    return deltaSeconds * 1000; // Converter para ms
  }

  // Tentar parse como HTTP-date (RFC 9110)
  try {
    const retryDate = new Date(retryAfterHeader);
    if (!isNaN(retryDate.getTime())) {
      const waitMs = retryDate.getTime() - Date.now();
      // Apenas retornar se for positivo (no futuro)
      if (waitMs > 0) {
        return waitMs;
      }
    }
  } catch {
    // Ignorar erro de parse
  }

  // Inválido ou não-positivo -> retornar null para usar fallback
  return null;
}

/**
 * Helper: Fetch with timeout and retry logic
 * beforeRetry: callback opcional executado antes de cada tentativa
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 45000,
  beforeRetry?: () => void
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Executar callback antes de cada tentativa (validar circuit breaker)
    if (beforeRetry) {
      beforeRetry();
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Rate limit específico - aguardar mais tempo
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const parsedWait = parseRetryAfter(retryAfter);
        
        // Usar Retry-After se válido e positivo, senão usar backoff exponencial aumentado
        const waitTime = parsedWait !== null 
          ? Math.min(parsedWait, 60000) // Cap em 60s
          : Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        
        console.warn(`⚠️ [AI Client] Rate limit atingido (429). Aguardando ${waitTime}ms...`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
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
  private circuitState: CircuitState = CircuitState.CLOSED;
  private metrics: CircuitMetrics = {
    consecutiveFailures: 0,
    lastFailureTime: null,
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    halfOpenRequests: 0
  };

  // Configurações do circuit breaker
  private readonly FAILURE_THRESHOLD = 5;        // Falhas consecutivas para abrir
  private readonly RECOVERY_TIMEOUT = 60000;     // 60s até tentar recuperação
  private readonly HALF_OPEN_MAX_REQUESTS = 3;   // Requests de teste em HALF_OPEN

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
   * Verifica se circuit breaker permite a requisição
   * Lança erro se circuito estiver OPEN ou HALF_OPEN atingiu limite
   */
  private checkCircuitBreaker(): void {
    if (this.circuitState === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - (this.metrics.lastFailureTime || 0);
      
      // Tentar recuperação após timeout
      if (timeSinceLastFailure >= this.RECOVERY_TIMEOUT) {
        console.log('🔄 [Circuit Breaker] Transitando para HALF_OPEN - tentando recuperação');
        this.circuitState = CircuitState.HALF_OPEN;
        this.metrics.halfOpenRequests = 0; // Reset contador HALF_OPEN
        return;
      }
      
      throw new Error(
        `Circuit breaker OPEN - API indisponível. ` +
        `Próxima tentativa em ${Math.ceil((this.RECOVERY_TIMEOUT - timeSinceLastFailure) / 1000)}s`
      );
    }

    // Em HALF_OPEN, limitar a 3 requests de teste (ANTES de incrementar)
    if (this.circuitState === CircuitState.HALF_OPEN) {
      if (this.metrics.halfOpenRequests >= this.HALF_OPEN_MAX_REQUESTS) {
        console.warn('⚠️ [Circuit Breaker] Limite de requests HALF_OPEN atingido - reabrindo circuito');
        this.circuitState = CircuitState.OPEN;
        this.metrics.lastFailureTime = Date.now();
        throw new Error(
          `Circuit breaker HALF_OPEN limit exceeded - reabrindo circuito. ` +
          `Próxima tentativa em ${this.RECOVERY_TIMEOUT / 1000}s`
        );
      }
    }
  }

  /**
   * Incrementa contador HALF_OPEN (só chamado DEPOIS de checkCircuitBreaker() passar)
   */
  private incrementHalfOpenCounter(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.metrics.halfOpenRequests++;
      console.log(`🧪 [Circuit Breaker] Request HALF_OPEN ${this.metrics.halfOpenRequests}/${this.HALF_OPEN_MAX_REQUESTS}`);
    }
  }

  /**
   * Registra sucesso da requisição
   */
  private recordSuccess(): void {
    this.metrics.totalSuccesses++;
    this.metrics.consecutiveFailures = 0;
    
    // Se estava em HALF_OPEN, fechar o circuito
    if (this.circuitState === CircuitState.HALF_OPEN) {
      console.log('✅ [Circuit Breaker] Recuperação bem-sucedida - circuito FECHADO');
      this.circuitState = CircuitState.CLOSED;
      this.metrics.halfOpenRequests = 0;
    }
  }

  /**
   * Registra falha da requisição
   */
  private recordFailure(): void {
    this.metrics.totalFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = Date.now();
    
    // Se estava em HALF_OPEN, reabrir circuito imediatamente
    if (this.circuitState === CircuitState.HALF_OPEN) {
      console.error('🚨 [Circuit Breaker] Falha em HALF_OPEN - reabrindo circuito');
      this.circuitState = CircuitState.OPEN;
      this.metrics.halfOpenRequests = 0;
      return;
    }
    
    // Se atingiu threshold, abrir circuito
    if (this.metrics.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      console.error(
        `🚨 [Circuit Breaker] ABRINDO circuito - ${this.metrics.consecutiveFailures} falhas consecutivas`
      );
      this.circuitState = CircuitState.OPEN;
    }
  }

  /**
   * Envia requisição para API de IA com chat completions
   */
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    this.metrics.totalRequests++;
    
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
        this.config.timeout,
        // Callback para validar circuit breaker e incrementar contador antes de CADA tentativa
        () => {
          this.checkCircuitBreaker();
          this.incrementHalfOpenCounter();
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.recordFailure();
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

      this.recordSuccess();
      console.log(`✅ [AI Client] Request completo - Duration: ${duration}ms, Tokens: ${aiResponse.usage?.totalTokens || 'N/A'}`);

      return aiResponse;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.recordFailure();
      console.error(`❌ [AI Client] Request falhou - Duration: ${duration}ms, Error: ${error.message}`);
      
      // Enriquecer erro com contexto
      throw new Error(`AI Request failed (${this.provider.provider}): ${error.message}`);
    }
  }

  /**
   * Gera embeddings para texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    this.metrics.totalRequests++;
    
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
        this.config.timeout,
        // Callback para validar circuit breaker e incrementar contador antes de CADA tentativa
        () => {
          this.checkCircuitBreaker();
          this.incrementHalfOpenCounter();
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.recordFailure();
        throw new Error(`Embedding API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const embedding = data.data[0]?.embedding;
      
      if (!embedding) {
        throw new Error('No embedding returned from API');
      }

      this.recordSuccess();
      console.log(`✅ [AI Client] Embedding gerado - Dimensions: ${embedding.length}`);
      return embedding;
    } catch (error: any) {
      this.recordFailure();
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

  /**
   * Retorna métricas de saúde do cliente
   */
  getHealthMetrics() {
    const successRate = this.metrics.totalRequests > 0
      ? (this.metrics.totalSuccesses / this.metrics.totalRequests) * 100
      : 0;

    return {
      circuitState: this.circuitState,
      totalRequests: this.metrics.totalRequests,
      totalSuccesses: this.metrics.totalSuccesses,
      totalFailures: this.metrics.totalFailures,
      consecutiveFailures: this.metrics.consecutiveFailures,
      halfOpenRequests: this.metrics.halfOpenRequests,
      successRate: successRate.toFixed(2) + '%',
      isHealthy: this.circuitState !== CircuitState.OPEN && this.metrics.consecutiveFailures < 3
    };
  }

  /**
   * Reset manual do circuit breaker (uso em emergências)
   */
  resetCircuitBreaker(): void {
    console.log('🔧 [Circuit Breaker] Reset manual do circuito');
    this.circuitState = CircuitState.CLOSED;
    this.metrics.consecutiveFailures = 0;
    this.metrics.halfOpenRequests = 0;
  }
}

/**
 * Factory para criar clientes configurados
 */
export function createAIClient(provider: ProviderConfig): AIClient {
  return new AIClient(provider);
}
