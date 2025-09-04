// LEGACY PDF WORKER - NOT USED IN NEW ARCHITECTURE
// This file exists only to prevent import errors from legacy code
// The new architecture uses direct synchronous processing with DeepSeek R1

console.log('⚠️  AVISO: PDF Worker legado detectado - nova arquitetura usa processamento síncrono');

import { PDFProcessingJobData, JobResult } from './queue';

/**
 * Stub class para evitar erros de importação
 * A nova arquitetura não usa workers - processamento é direto e síncrono
 */
export class PDFWorker {
  private initialized: boolean = false;
  private initError: string | null = null;

  constructor() {
    console.log('⚠️  PDFWorker não é usado na nova arquitetura - processamento é síncrono');
    this.initialized = true;
  }

  async isInitialized(): Promise<boolean> {
    return true; // Sempre "inicializado" para evitar erros
  }

  getInitError(): string | null {
    return null; // Sem erros pois não conecta a Redis
  }

  async start(): Promise<void> {
    console.log('⚠️  PDFWorker.start() não é necessário na nova arquitetura');
  }

  async stop(): Promise<void> {
    console.log('⚠️  PDFWorker.stop() não é necessário na nova arquitetura');
  }

  private async processJob(job: any): Promise<JobResult> {
    throw new Error('PDFWorker não é usado na nova arquitetura. Use newEditalService.processEdital()');
  }

  async getWorkerStats(): Promise<any> {
    return {
      completed: 0,
      failed: 0,
      active: 0,
      waiting: 0,
      stalled: 0
    };
  }
}

// Exportar instância para compatibilidade
export const pdfWorker = new PDFWorker();