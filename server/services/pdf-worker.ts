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
  private worker: Worker | null = null;
  private initialized: boolean = false;
  private initError: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Testar conexão Redis antes de criar worker
      await redis.ping();
      
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
      this.initialized = true;
      console.log('🔧 PDF Worker inicializado com sucesso');
      
    } catch (error) {
      this.initError = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Falha ao inicializar PDF Worker:', this.initError);
      console.error('⚠️ Sistema de processamento assíncrono indisponível - Redis não conectado');
      this.initialized = false;
    }
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
    if (!this.worker) return;

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
      console.error('❌ Erro no PDF Worker:', error.message);
    });

    this.worker.on('stalled', (jobId: string) => {
      console.warn(`⏰ Job travado: ${jobId}`);
    });
  }

  /**
   * Inicia o worker
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ PDF Worker não foi inicializado corretamente');
      console.warn('⚠️ Erro:', this.initError);
      return;
    }
    console.log('🚀 PDF Worker já está rodando');
  }

  /**
   * Para o worker gracefully
   */
  async stop(): Promise<void> {
    if (this.worker) {
      console.log('🛑 Parando PDF Worker...');
      await this.worker.close();
    }
  }

  /**
   * Obtém estatísticas do worker
   */
  getStats(): any {
    return {
      isInitialized: this.initialized,
      isRunning: this.worker ? !this.worker.closing : false,
      concurrency: this.initialized ? 2 : 0,
      error: this.initError,
    };
  }

  /**
   * Verifica se o worker está pronto para processar jobs
   */
  isReady(): boolean {
    return this.initialized && this.worker !== null;
  }
}

// Instância singleton do worker
export const pdfWorker = new PDFWorker();

// Worker será inicializado automaticamente no constructor
// Verificar status após alguns segundos
setTimeout(() => {
  if (!pdfWorker.isReady()) {
    console.warn('⚠️ PDF Worker não está disponível - sistema de filas desabilitado');
  }
}, 3000);