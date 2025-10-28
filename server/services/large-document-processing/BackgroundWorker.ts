/**
 * BACKGROUND WORKER
 * 
 * Processes large document jobs in the background.
 * Runs in a polling loop checking for pending jobs/parts.
 * 
 * Can be replaced with Redis/BullMQ later for better scalability.
 */

import { jobQueue } from './JobQueue';
import { largeMaterialProcessor } from './LargeMaterialProcessor';
import { fileProcessorService } from '../fileProcessor';
import fs from 'fs';

export class BackgroundWorker {
  private isRunning = false;
  private pollInterval = 5000; // 5 seconds
  private maxConcurrentJobs = 1; // Process one job at a time
  private currentJobCount = 0;

  /**
   * Starts the background worker
   */
  start(): void {
    if (this.isRunning) {
      console.log('[BackgroundWorker] ⚠️ Worker já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('[BackgroundWorker] 🚀 Worker iniciado');
    
    // Start polling loop
    this.pollLoop();
  }

  /**
   * Stops the background worker
   */
  stop(): void {
    this.isRunning = false;
    console.log('[BackgroundWorker] 🛑 Worker parado');
  }

  /**
   * Main polling loop
   */
  private async pollLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can process more jobs
        if (this.currentJobCount < this.maxConcurrentJobs) {
          await this.processNextJob();
        }
        
        // Wait before next poll
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error('[BackgroundWorker] ❌ Erro no loop de polling:', error);
        // Continue running even after errors
        await this.sleep(this.pollInterval);
      }
    }
  }

  /**
   * Processes the next pending job
   */
  private async processNextJob(): Promise<void> {
    try {
      // Get next pending job
      const job = await jobQueue.getNextPendingJob();
      
      if (!job) {
        // No pending jobs
        return;
      }

      console.log(`[BackgroundWorker] 📋 Encontrado job pendente: ${job.id}`);
      
      // Check if this is a newly pending job or a job with pending parts
      const parts = await jobQueue.getJobParts(job.id);
      const hasPendingParts = parts.some(p => p.status === 'pending');
      
      if (parts.length === 0) {
        // Job has no parts yet - shouldn't happen but handle gracefully
        console.warn(`[BackgroundWorker] ⚠️ Job ${job.id} não tem partes. Marcando como falhado.`);
        await jobQueue.updateJobStatus(job.id, {
          status: 'failed',
          errorMessage: 'Job não tem partes definidas',
        });
        return;
      }

      if (!hasPendingParts) {
        // No pending parts, check if we should mark as completed
        const allCompleted = parts.every(p => p.status === 'completed');
        if (allCompleted && job.status !== 'completed') {
          console.log(`[BackgroundWorker] ✅ Todas as partes completas, finalizando job ${job.id}`);
          await jobQueue.updateJobStatus(job.id, {
            status: 'completed',
            completedAt: new Date(),
          });
        }
        return;
      }

      // Mark job as processing
      if (job.status === 'pending') {
        await jobQueue.updateJobStatus(job.id, {
          status: 'processing',
          startedAt: new Date(),
        });
      }

      // Process next pending part
      const nextPart = await jobQueue.getNextPendingPart(job.id);
      
      if (!nextPart) {
        return;
      }

      this.currentJobCount++;
      
      try {
        console.log(`[BackgroundWorker] 🔄 Processando parte ${nextPart.partNumber}/${nextPart.totalParts} do job ${job.id}`);
        
        // Read file content
        const filePath = job.filePath;
        if (!fs.existsSync(filePath)) {
          throw new Error(`Arquivo não encontrado: ${filePath}`);
        }

        // Extract text from file
        const { text } = await fileProcessorService.processFile(filePath, job.fileName);

        // Process the part
        await largeMaterialProcessor.processPart(job.id, nextPart.id, text);
        
        console.log(`[BackgroundWorker] ✅ Parte ${nextPart.partNumber}/${nextPart.totalParts} concluída`);
      } catch (error) {
        console.error(`[BackgroundWorker] ❌ Erro ao processar parte ${nextPart.id}:`, error);
        // Error is already logged in processor, continue to next part
      } finally {
        this.currentJobCount--;
      }
    } catch (error) {
      console.error('[BackgroundWorker] ❌ Erro ao processar próximo job:', error);
    }
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets current worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentJobCount: this.currentJobCount,
      maxConcurrentJobs: this.maxConcurrentJobs,
      pollInterval: this.pollInterval,
    };
  }
}

// Singleton instance
export const backgroundWorker = new BackgroundWorker();

// Auto-start worker when server starts
if (process.env.NODE_ENV !== 'test') {
  console.log('[BackgroundWorker] 🎬 Auto-starting worker...');
  backgroundWorker.start();
}
