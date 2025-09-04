import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { processingJobs } from '../../shared/schema';
import { editalService } from './edital';
import { PDFProcessingJobData, JobResult } from './queue';

// Configuração do Redis para BullMQ (mesma do queue)
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // Necessário para BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

/**
 * Worker para processar PDFs de forma assíncrona
 */
export class PDFWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'pdf-processing',
      async (job: Job<PDFProcessingJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: redis,
        concurrency: 2, // Processar até 2 jobs simultaneamente
        limiter: {
          max: 5, // Máximo 5 jobs por minuto
          duration: 60 * 1000,
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Processa um job de PDF
   */
  private async processJob(job: Job<PDFProcessingJobData>): Promise<JobResult> {
    const { jobId, userId, filePath, fileName, metadata } = job.data;
    
    console.log(`🔄 Iniciando processamento do job ${jobId}: ${fileName}`);

    try {
      // Atualizar status no banco para "processing"
      await this.updateJobStatus(jobId, 'processing', null, null, new Date());

      // Atualizar progresso
      await job.updateProgress(10);

      // Processar baseado no tipo
      let result: any;
      const processingLogs: string[] = [];

      if (metadata.type === 'edital_processing' && metadata.concursoNome) {
        processingLogs.push(`Iniciando processamento de edital para: ${metadata.concursoNome}`);
        await job.updateProgress(30);

        // Usar o serviço de edital existente
        result = await editalService.processarEdital(
          metadata.concursoNome,
          filePath,
          fileName
        );
        
        processingLogs.push(`Edital processado com sucesso: ${result.id}`);
        processingLogs.push(`Cargo único: ${result.hasSingleCargo ? 'Sim' : 'Não'}`);
        if (result.cargoName) {
          processingLogs.push(`Cargo: ${result.cargoName}`);
        }
        
        await job.updateProgress(80);
      } else {
        // Processamento genérico de PDF
        processingLogs.push('Processando PDF genérico');
        await job.updateProgress(50);
        
        // Aqui poderia usar apenas o pdfService para processamento básico
        result = {
          type: 'generic_pdf',
          fileName,
          processed: true,
          message: 'PDF processado com sucesso'
        };
      }

      await job.updateProgress(90);

      // Atualizar job como completo no banco
      await this.updateJobStatus(
        jobId, 
        'completed', 
        result, 
        null, 
        null, 
        new Date(),
        processingLogs.join('\n')
      );

      await job.updateProgress(100);
      
      console.log(`✅ Job ${jobId} processado com sucesso`);
      
      return {
        success: true,
        result,
        processingLogs
      };

    } catch (error) {
      console.error(`❌ Erro no processamento do job ${jobId}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Atualizar job como falha no banco
      await this.updateJobStatus(
        jobId, 
        'failed', 
        null, 
        errorMessage, 
        null, 
        new Date()
      );

      // Re-throw para que o BullMQ trate a falha
      throw new Error(`Falha no processamento: ${errorMessage}`);
    }
  }

  /**
   * Atualiza o status do job no banco de dados
   */
  private async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
    result: any = null,
    errorMessage: string | null = null,
    startedAt: Date | null = null,
    completedAt: Date | null = null,
    processingLogs: string | null = null
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (result !== null) updateData.result = result;
      if (errorMessage !== null) updateData.errorMessage = errorMessage;
      if (startedAt !== null) updateData.startedAt = startedAt;
      if (completedAt !== null) updateData.completedAt = completedAt;
      if (processingLogs !== null) updateData.processingLogs = processingLogs;

      await db
        .update(processingJobs)
        .set(updateData)
        .where(eq(processingJobs.id, jobId));

      console.log(`📝 Status do job ${jobId} atualizado para: ${status}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar status do job ${jobId}:`, error);
    }
  }

  /**
   * Configura event handlers para o worker
   */
  private setupEventHandlers(): void {
    this.worker.on('ready', () => {
      console.log('🔧 PDF Worker está pronto e aguardando jobs');
    });

    this.worker.on('active', (job: Job<PDFProcessingJobData>) => {
      console.log(`🔄 Processando job: ${job.id} - ${job.data.fileName}`);
    });

    this.worker.on('completed', (job: Job<PDFProcessingJobData>) => {
      console.log(`✅ Job completo: ${job.id} - ${job.data.fileName}`);
    });

    this.worker.on('failed', (job: Job<PDFProcessingJobData> | undefined, error: Error) => {
      console.error(`❌ Job falhou: ${job?.id || 'unknown'} - Erro: ${error.message}`);
    });

    this.worker.on('error', (error: Error) => {
      console.error('❌ Erro no PDF Worker:', error);
    });

    this.worker.on('stalled', (jobId: string) => {
      console.warn(`⏰ Job travado: ${jobId}`);
    });
  }

  /**
   * Inicia o worker
   */
  async start(): Promise<void> {
    console.log('🚀 Iniciando PDF Worker...');
    // Worker é iniciado automaticamente no constructor
  }

  /**
   * Para o worker gracefully
   */
  async stop(): Promise<void> {
    console.log('🛑 Parando PDF Worker...');
    await this.worker.close();
  }

  /**
   * Obtém estatísticas do worker
   */
  getStats(): any {
    return {
      isRunning: !this.worker.closing,
      concurrency: 2,
    };
  }
}

// Instância singleton do worker
export const pdfWorker = new PDFWorker();

// Auto-iniciar o worker quando o módulo for importado
pdfWorker.start().catch(console.error);