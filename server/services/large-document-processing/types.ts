/**
 * TYPES FOR LARGE DOCUMENT PROCESSING
 * 
 * Defines interfaces for the modular large document processing system
 */

import type { ProcessingJob, ProcessingJobPart } from '@shared/schema';

/**
 * Document structure analysis result
 */
export interface DocumentStructure {
  title: string;
  totalPages: number;
  estimatedSizeBytes: number;
  
  // High-level sections identified by AI
  sections: DocumentSection[];
}

export interface DocumentSection {
  title: string;
  startPage: number;
  endPage: number;
  startIndex: number;
  endIndex: number;
  description: string;
  pageCount: number;
  estimatedSizeBytes: number;
  
  // Metadata for intelligent splitting
  isConceptComplete: boolean; // Can this section be split without losing context?
  relatedSections?: string[]; // Titles of related sections
}

/**
 * Intelligent split plan
 */
export interface SplitPlan {
  totalParts: number;
  parts: DocumentPart[];
  strategy: 'conceptual' | 'page-based' | 'hybrid';
  estimatedProcessingTime: number; // seconds
}

export interface DocumentPart {
  partNumber: number;
  title: string; // E.g., "Parte 1: Capítulos 1-5 - Direito Constitucional"
  startPage: number;
  endPage: number;
  startIndex: number;
  endIndex: number;
  sections: string[]; // Titles of sections included
  estimatedSizeBytes: number;
}

/**
 * Job status with detailed progress
 */
export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  currentPhase: 'analyzing' | 'splitting' | 'chunking' | 'indexing' | 'consolidating' | 'completed';
  
  // Progress tracking
  totalParts: number;
  completedParts: number;
  progressPercentage: number;
  
  // Current activity
  currentPartNumber?: number;
  currentActivity?: string; // E.g., "Processando parte 2/5: Capítulos 6-11"
  
  // Results
  chunksGenerated?: number;
  errorMessage?: string;
  
  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

/**
 * Interface for document structure analyzer
 * Pluggable: can use different AI providers
 */
export interface IDocumentStructureAnalyzer {
  /**
   * Analyzes document to identify high-level structure
   * @param text Full document text
   * @param metadata Document metadata (pageCount, fileName, etc)
   * @returns Structured analysis of the document
   */
  analyze(text: string, metadata: DocumentMetadata): Promise<DocumentStructure>;
}

export interface DocumentMetadata {
  fileName: string;
  pageCount: number;
  fileSize: number;
  fileType: string;
}

/**
 * Interface for intelligent document splitter
 * Pluggable: can use different splitting strategies
 */
export interface IIntelligentDocumentSplitter {
  /**
   * Creates a plan to split document into parts
   * @param structure Document structure from analyzer
   * @param maxPagesPerPart Maximum pages per part (default: 250)
   * @returns Plan for splitting the document
   */
  createSplitPlan(structure: DocumentStructure, maxPagesPerPart?: number): SplitPlan;
}

/**
 * Interface for job queue
 * Pluggable: can be swapped for Redis/BullMQ later
 */
export interface IJobQueue {
  /**
   * Creates a new job
   */
  createJob(jobData: CreateJobData): Promise<ProcessingJob>;
  
  /**
   * Creates parts for a job
   */
  createJobParts(jobId: string, parts: DocumentPart[]): Promise<ProcessingJobPart[]>;
  
  /**
   * Gets a job by ID
   */
  getJob(jobId: string): Promise<ProcessingJob | null>;
  
  /**
   * Gets all parts for a job
   */
  getJobParts(jobId: string): Promise<ProcessingJobPart[]>;
  
  /**
   * Updates job status
   */
  updateJobStatus(jobId: string, updates: Partial<ProcessingJob>): Promise<void>;
  
  /**
   * Updates part status
   */
  updatePartStatus(partId: string, updates: Partial<ProcessingJobPart>): Promise<void>;
  
  /**
   * Gets next pending job (for worker loop)
   */
  getNextPendingJob(): Promise<ProcessingJob | null>;
  
  /**
   * Gets next pending part for a job
   */
  getNextPendingPart(jobId: string): Promise<ProcessingJobPart | null>;
  
  /**
   * Gets detailed job status
   */
  getJobStatus(jobId: string): Promise<JobStatus | null>;
}

export interface CreateJobData {
  userId: string;
  type: 'large_document_processing';
  fileName: string;
  filePath: string;
  fileSize: number;
  metadata?: any;
}
