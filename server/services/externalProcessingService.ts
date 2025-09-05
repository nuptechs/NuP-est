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
  jobId?: string;
  chunks?: Array<{
    id: string;
    content: string;
    title: string;
    summary: string;
    keywords: string[];
    chunkIndex: number;
  }>;
  embeddings?: number[][];
  error?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
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

  constructor() {
    this.baseUrl = process.env.PROCESSING_SERVICE_URL || '';
    this.apiKey = process.env.PROCESSING_SERVICE_API_KEY;
    
    if (!this.baseUrl) {
      throw new Error('PROCESSING_SERVICE_URL environment variable is required');
    }

    // Validar se é uma URL válida
    try {
      new URL(this.baseUrl);
    } catch (error) {
      throw new Error(`PROCESSING_SERVICE_URL deve ser uma URL válida. Atual: "${this.baseUrl}". Exemplo: https://sua-app.replit.dev`);
    }
  }

  /**
   * Envia arquivo para processamento na aplicação externa
   */
  async processDocument(request: ProcessingRequest): Promise<ProcessingResponse> {
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
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Fazer requisição com AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout

      const response = await fetch(`${this.baseUrl}/process-document`, {
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
        jobId: result.jobId,
        chunksCount: result.chunks?.length || 0
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
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
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
   * Testa conectividade com a aplicação externa
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
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