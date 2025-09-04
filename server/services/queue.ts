// LEGACY QUEUE SERVICE - NOT USED IN NEW ARCHITECTURE
// This file exists only to prevent import errors from legacy code
// The new architecture uses direct synchronous processing with DeepSeek R1

console.log('⚠️  AVISO: Serviço de filas legado detectado - nova arquitetura usa processamento síncrono');

// Interfaces mantidas para compatibilidade
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

// Stub classes para evitar erros de importação
export class QueueService {
  constructor() {
    console.log('⚠️  QueueService não é usado na nova arquitetura - processamento é síncrono');
  }

  async isRedisConnected(): Promise<boolean> {
    return false; // Redis não é necessário na nova arquitetura
  }

  async addPDFProcessingJob(data: PDFProcessingJobData): Promise<string> {
    throw new Error('QueueService não é usado na nova arquitetura. Use newEditalService.processEdital()');
  }

  async getJobStatus(jobId: string): Promise<any> {
    throw new Error('QueueService não é usado na nova arquitetura');
  }

  async getQueueStats(): Promise<any> {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      paused: 0
    };
  }
}

// Exportar instância stub para compatibilidade
export const queueService = new QueueService();

// Exportar filas stub
export const pdfProcessingQueue = {
  add: () => { throw new Error('Use newEditalService.processEdital()'); },
  getWaiting: () => Promise.resolve([]),
  getActive: () => Promise.resolve([]),
  getCompleted: () => Promise.resolve([]),
  getFailed: () => Promise.resolve([])
};