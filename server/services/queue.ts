import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

// Configuração do Redis para BullMQ
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // Necessário para BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

// Interfaces para jobs
export interface PDFProcessingJobData {
  jobId: string;
  userId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  metadata: {
    concursoNome?: string;
    type?: string;
    [key: string]: any;
  };
}

export interface JobResult {
  success: boolean;
  result?: any;
  error?: string;
  processingLogs?: string[];
}

// Fila para processamento de PDFs
export const pdfProcessingQueue = new Queue('pdf-processing', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Manter últimos 100 jobs completos
    removeOnFail: 50,      // Manter últimos 50 jobs com falha
    attempts: 3,           // Tentar até 3 vezes
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Classe para gerenciar filas
export class QueueService {
  private static instance: QueueService;
  
  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Adiciona um job de processamento de PDF na fila
   */
  async addPDFProcessingJob(data: PDFProcessingJobData): Promise<Job<PDFProcessingJobData>> {
    console.log(`🔄 Enfileirando job de PDF: ${data.fileName} para usuário ${data.userId}`);
    
    const job = await pdfProcessingQueue.add('process-pdf', data, {
      jobId: data.jobId,
      priority: data.metadata.type === 'edital_processing' ? 10 : 5, // Editais têm prioridade
    });

    console.log(`✅ Job ${job.id} enfileirado com sucesso`);
    return job;
  }

  /**
   * Obtém o status de um job
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress?: number;
    result?: any;
    error?: string;
  } | null> {
    try {
      const job = await pdfProcessingQueue.getJob(jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      
      return {
        status: state,
        progress: job.progress as number,
        result: job.returnvalue,
        error: job.failedReason,
      };
    } catch (error) {
      console.error(`❌ Erro ao obter status do job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Lista jobs de um usuário
   */
  async getUserJobs(userId: string, status?: string): Promise<any[]> {
    try {
      const jobs = await pdfProcessingQueue.getJobs(['active', 'waiting', 'completed', 'failed'], 0, 50);
      
      const userJobs = jobs.filter(job => job.data.userId === userId);
      
      if (status) {
        const filteredJobs = [];
        for (const job of userJobs) {
          const jobState = await job.getState();
          if (jobState === status) {
            filteredJobs.push(job);
          }
        }
        return filteredJobs;
      }
      
      return userJobs;
    } catch (error) {
      console.error(`❌ Erro ao listar jobs do usuário ${userId}:`, error);
      return [];
    }
  }

  /**
   * Remove um job da fila
   */
  async removeJob(jobId: string): Promise<boolean> {
    try {
      const job = await pdfProcessingQueue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`🗑️ Job ${jobId} removido da fila`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Erro ao remover job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Limpa jobs antigos
   */
  async cleanQueue(): Promise<void> {
    try {
      await pdfProcessingQueue.clean(24 * 60 * 60 * 1000, 100); // Limpar jobs de mais de 24h
      console.log('🧹 Fila limpa com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar fila:', error);
    }
  }

  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats(): Promise<any> {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        pdfProcessingQueue.getWaiting(),
        pdfProcessingQueue.getActive(),
        pdfProcessingQueue.getCompleted(),
        pdfProcessingQueue.getFailed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas da fila:', error);
      return { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Verifica se o Redis está conectado
   */
  async isRedisConnected(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      console.error('❌ Redis não está conectado:', error);
      return false;
    }
  }
}

// Instância singleton
export const queueService = QueueService.getInstance();