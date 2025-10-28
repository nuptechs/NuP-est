/**
 * JOB QUEUE SERVICE
 * 
 * Database-backed job queue for large document processing.
 * Persists jobs and parts in PostgreSQL for durability.
 * Can be replaced with Redis/BullMQ later without changing interfaces.
 */

import { db } from '../../db';
import { processingJobs, processingJobParts, type ProcessingJob, type ProcessingJobPart } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import type {
  IJobQueue,
  CreateJobData,
  DocumentPart,
  JobStatus,
} from './types';

export class DatabaseJobQueue implements IJobQueue {
  /**
   * Creates a new processing job
   */
  async createJob(jobData: CreateJobData): Promise<ProcessingJob> {
    const [job] = await db.insert(processingJobs).values({
      userId: jobData.userId,
      type: jobData.type,
      status: 'pending',
      fileName: jobData.fileName,
      filePath: jobData.filePath,
      fileSize: jobData.fileSize,
      metadata: jobData.metadata || {},
      attempts: 0,
      maxAttempts: 3,
    }).returning();

    console.log(`[JobQueue] ✅ Criado job ${job.id} para usuário ${jobData.userId}`);
    
    return job;
  }

  /**
   * Creates job parts for a large document processing job
   */
  async createJobParts(jobId: string, parts: DocumentPart[]): Promise<ProcessingJobPart[]> {
    const partsData = parts.map(part => ({
      jobId,
      partNumber: part.partNumber,
      totalParts: parts.length,
      sectionTitle: part.title,
      startPage: part.startPage,
      endPage: part.endPage,
      startIndex: part.startIndex,
      endIndex: part.endIndex,
      status: 'pending' as const,
      attempts: 0,
    }));

    const createdParts = await db.insert(processingJobParts).values(partsData).returning();

    console.log(`[JobQueue] ✅ Criadas ${createdParts.length} partes para job ${jobId}`);
    
    return createdParts;
  }

  /**
   * Gets a job by ID
   */
  async getJob(jobId: string): Promise<ProcessingJob | null> {
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, jobId))
      .limit(1);

    return job || null;
  }

  /**
   * Gets all parts for a job
   */
  async getJobParts(jobId: string): Promise<ProcessingJobPart[]> {
    const parts = await db
      .select()
      .from(processingJobParts)
      .where(eq(processingJobParts.jobId, jobId))
      .orderBy(processingJobParts.partNumber);

    return parts;
  }

  /**
   * Updates job status and metadata
   */
  async updateJobStatus(jobId: string, updates: Partial<ProcessingJob>): Promise<void> {
    await db
      .update(processingJobs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(processingJobs.id, jobId));

    console.log(`[JobQueue] 📝 Atualizado job ${jobId}:`, updates.status || 'metadata');
  }

  /**
   * Updates part status and metadata
   */
  async updatePartStatus(partId: string, updates: Partial<ProcessingJobPart>): Promise<void> {
    await db
      .update(processingJobParts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(processingJobParts.id, partId));
  }

  /**
   * Gets next pending job (for worker loop)
   */
  async getNextPendingJob(): Promise<ProcessingJob | null> {
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(
        and(
          or(
            eq(processingJobs.status, 'pending'),
            eq(processingJobs.status, 'processing')
          )
        )
      )
      .orderBy(processingJobs.createdAt)
      .limit(1);

    return job || null;
  }

  /**
   * Gets next pending part for a job
   */
  async getNextPendingPart(jobId: string): Promise<ProcessingJobPart | null> {
    const [part] = await db
      .select()
      .from(processingJobParts)
      .where(
        and(
          eq(processingJobParts.jobId, jobId),
          eq(processingJobParts.status, 'pending')
        )
      )
      .orderBy(processingJobParts.partNumber)
      .limit(1);

    return part || null;
  }

  /**
   * Gets detailed job status with progress information
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const parts = await this.getJobParts(jobId);
    const completedParts = parts.filter(p => p.status === 'completed').length;
    const totalParts = parts.length;
    const currentPart = parts.find(p => p.status === 'processing');

    // Calculate progress
    const progressPercentage = totalParts > 0 
      ? Math.round((completedParts / totalParts) * 100)
      : 0;

    // Determine current phase
    let currentPhase: JobStatus['currentPhase'] = 'pending' as any;
    if (job.status === 'completed') {
      currentPhase = 'completed';
    } else if (job.status === 'processing') {
      if (totalParts === 0) {
        currentPhase = 'analyzing';
      } else if (currentPart) {
        currentPhase = 'chunking';
      } else if (completedParts === totalParts) {
        currentPhase = 'consolidating';
      } else {
        currentPhase = 'chunking';
      }
    }

    // Calculate estimated completion
    let estimatedCompletion: Date | undefined;
    if (job.startedAt && currentPart && totalParts > 1) {
      const elapsedTime = Date.now() - job.startedAt.getTime();
      const avgTimePerPart = elapsedTime / Math.max(1, completedParts);
      const remainingParts = totalParts - completedParts;
      const estimatedRemainingTime = avgTimePerPart * remainingParts;
      estimatedCompletion = new Date(Date.now() + estimatedRemainingTime);
    }

    // Calculate total chunks generated
    const chunksGenerated = parts.reduce((sum, p) => sum + (p.chunksGenerated || 0), 0);

    return {
      id: job.id,
      status: job.status as any,
      currentPhase,
      totalParts,
      completedParts,
      progressPercentage,
      currentPartNumber: currentPart?.partNumber,
      currentActivity: currentPart 
        ? `Processando parte ${currentPart.partNumber}/${totalParts}: ${currentPart.sectionTitle}`
        : undefined,
      chunksGenerated: chunksGenerated > 0 ? chunksGenerated : undefined,
      errorMessage: job.errorMessage || undefined,
      createdAt: job.createdAt!,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      estimatedCompletion,
    };
  }
}

// Singleton instance
export const jobQueue = new DatabaseJobQueue();
