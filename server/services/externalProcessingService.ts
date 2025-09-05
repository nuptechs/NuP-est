import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

export interface ProcessingRequest {
  filePath: string;
  fileName: string;
  concursoNome: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface ProcessingResponse {
  success: boolean;
  job_id?: string;
  error?: string;
}

export interface ProcessingResults {
  results: {
    embeddings: number[][];
    text_chunks: string[];
  };
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
}

/**
 * Serviço para integração com aplicação externa de processamento de documentos
 */
export class ExternalProcessingService {
  private baseUrl: string;
  private apiKey?: string;
  private isEnabled: boolean = false;

  constructor() {
    this.baseUrl = process.env.PROCESSING_SERVICE_URL || '';
    this.apiKey = process.env.PROCESSING_SERVICE_API_KEY;
    
    if (!this.baseUrl) {
      console.warn('⚠️ PROCESSING_SERVICE_URL not configured. External processing service disabled.');
      return;
    }

    // Validar se é uma URL válida
    try {
      new URL(this.baseUrl);
      this.isEnabled = true;
      console.log('✅ External processing service configured successfully');
    } catch (error) {
      console.warn(`⚠️ PROCESSING_SERVICE_URL deve ser uma URL válida. Atual: "${this.baseUrl}". Exemplo: https://sua-app.replit.dev`);
      console.warn('External processing service disabled.');
    }
  }

  /**
   * Envia arquivo para processamento na aplicação externa
   */
  async processDocument(request: ProcessingRequest): Promise<ProcessingResponse> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'External processing service not configured or disabled'
      };
    }

    try {
      console.log(`🚀 Enviando arquivo para processamento externo: ${request.fileName}`);
      
      // Verificar se arquivo existe
      if (!fs.existsSync(request.filePath)) {
        throw new Error(`Arquivo não encontrado: ${request.filePath}`);
      }

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', fs.createReadStream(request.filePath));
      formData.append('fileName', request.fileName);
      formData.append('concursoNome', request.concursoNome);
      formData.append('userId', request.userId);
      
      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      // Preparar headers
      const headers: Record<string, string> = {
        ...formData.getHeaders()
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      // Fazer requisição com AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout

      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na aplicação externa: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as ProcessingResponse;
      
      console.log(`✅ Resposta recebida da aplicação externa:`, {
        success: result.success,
        jobId: result.job_id
      });

      return result;

    } catch (error) {
      console.error('❌ Erro na integração com aplicação externa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido na aplicação externa'
      };
    }
  }

  /**
   * Verifica status de um job de processamento
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    if (!this.isEnabled) {
      return {
        jobId,
        status: 'failed',
        error: 'External processing service not configured or disabled'
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/api/status/${jobId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }

      return await response.json() as JobStatus;

    } catch (error) {
      console.error(`❌ Erro ao verificar status do job ${jobId}:`, error);
      return {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Aguarda conclusão de um job com polling
   */
  async waitForCompletion(jobId: string, maxWaitTime: number = 300000): Promise<JobStatus> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 segundos

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getJobStatus(jobId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      console.log(`⏳ Aguardando processamento... Status: ${status.status} (${status.progress || 0}%)`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return {
      jobId,
      status: 'failed',
      error: 'Timeout: processamento não completou no tempo esperado'
    };
  }

  /**
   * Obtém os resultados finais do processamento (embeddings e chunks de texto)
   */
  async getResults(jobId: string): Promise<{ success: boolean; results?: any; error?: string }> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'External processing service not configured or disabled'
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/api/results/${jobId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erro ao obter resultados: ${response.status}`);
      }

      const data = await response.json() as ProcessingResults;
      return {
        success: true,
        results: data.results
      };

    } catch (error) {
      console.error(`❌ Erro ao obter resultados do job ${jobId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Testa conectividade com a aplicação externa
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled) {
      return {
        success: false,
        message: 'External processing service not configured or disabled'
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/api/status/test`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 404) {
        // Status 404 is expected for test job ID, but means service is reachable
        return {
          success: true,
          message: 'Conexão com aplicação externa estabelecida com sucesso'
        };
      } else {
        return {
          success: false,
          message: `Aplicação externa retornou status ${response.status}`
        };
      }

    } catch (error) {
      return {
        success: false,
        message: `Erro de conectividade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
}

export const externalProcessingService = new ExternalProcessingService();