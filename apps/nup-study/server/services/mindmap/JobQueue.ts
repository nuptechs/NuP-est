import { randomUUID } from 'crypto';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job<TResult = any> {
  id: string;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TResult;
  error?: string;
  metadata?: Record<string, any>;
}

export type JobProcessor<TInput, TResult> = (
  input: TInput,
  updateProgress: (progress: number) => void
) => Promise<TResult>;

/**
 * In-memory job queue for async processing
 * Perfect for long-running AI operations
 */
export class JobQueue<TInput = any, TResult = any> {
  private jobs: Map<string, Job<TResult>> = new Map();
  private processor: JobProcessor<TInput, TResult>;
  private cleanupInterval: NodeJS.Timeout;
  private readonly MAX_JOB_AGE_MS = 1000 * 60 * 60; // 1 hour

  constructor(processor: JobProcessor<TInput, TResult>) {
    this.processor = processor;
    
    // Cleanup old jobs every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 1000 * 60 * 5);
  }

  /**
   * Create and enqueue a new job
   */
  async enqueue(input: TInput, metadata?: Record<string, any>): Promise<string> {
    const jobId = randomUUID();
    const job: Job<TResult> = {
      id: jobId,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      metadata,
    };

    this.jobs.set(jobId, job);
    
    // Process job asynchronously
    this.processJob(jobId, input);

    return jobId;
  }

  /**
   * Get job status and result
   */
  getJob(jobId: string): Job<TResult> | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs (for debugging)
   */
  getAllJobs(): Job<TResult>[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Process a job asynchronously
   */
  private async processJob(jobId: string, input: TInput): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Update status to processing
      job.status = 'processing';
      job.startedAt = new Date();
      job.progress = 5; // Start at 5%

      // Progress updater callback
      const updateProgress = (progress: number) => {
        const currentJob = this.jobs.get(jobId);
        if (currentJob) {
          currentJob.progress = Math.min(Math.max(progress, 0), 100);
        }
      };

      // Execute processor
      const result = await this.processor(input, updateProgress);

      // Mark as completed
      const completedJob = this.jobs.get(jobId);
      if (completedJob) {
        completedJob.status = 'completed';
        completedJob.progress = 100;
        completedJob.completedAt = new Date();
        completedJob.result = result;
      }
    } catch (error) {
      // Mark as failed
      const failedJob = this.jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.completedAt = new Date();
        failedJob.error = error instanceof Error ? error.message : String(error);
      }
      
      console.error(`[JobQueue] Job ${jobId} failed:`, error);
    }
  }

  /**
   * Cleanup jobs older than MAX_JOB_AGE_MS
   */
  private cleanupOldJobs(): void {
    const now = Date.now();
    const jobsToDelete: string[] = [];

    Array.from(this.jobs.entries()).forEach(([jobId, job]) => {
      const age = now - job.createdAt.getTime();
      if (age > this.MAX_JOB_AGE_MS && (job.status === 'completed' || job.status === 'failed')) {
        jobsToDelete.push(jobId);
      }
    });

    jobsToDelete.forEach(jobId => {
      this.jobs.delete(jobId);
    });

    if (jobsToDelete.length > 0) {
      console.log(`[JobQueue] Cleaned up ${jobsToDelete.length} old jobs`);
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
