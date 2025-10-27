import { db } from '../db.js';
import { processedFiles, materials, materialContentSegments, segmentTopics, contentSources } from '@shared/schema';
import type { InsertProcessedFile, ProcessedFile, InsertMaterialContentSegment, InsertSegmentTopic, InsertContentSource } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import fs from 'fs';
import { contentCategorizationService } from './ContentCategorizationService.js';

export interface CreateProcessedFileOptions {
  fileHash: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  extractedContent?: string;
  aiGeneratedTitle?: string;
  aiGeneratedDescription?: string;
}

export class ProcessedFileService {
  /**
   * Find existing processed file by hash
   */
  async findByHash(fileHash: string): Promise<ProcessedFile | undefined> {
    const [processedFile] = await db
      .select()
      .from(processedFiles)
      .where(eq(processedFiles.fileHash, fileHash))
      .limit(1);
    
    return processedFile;
  }

  /**
   * Create a new processed file entry
   */
  async create(options: CreateProcessedFileOptions): Promise<ProcessedFile> {
    const data: InsertProcessedFile = {
      fileHash: options.fileHash,
      filePath: options.filePath,
      fileName: options.fileName,
      fileType: options.fileType,
      fileSize: options.fileSize,
      extractedContent: options.extractedContent,
      aiGeneratedTitle: options.aiGeneratedTitle,
      aiGeneratedDescription: options.aiGeneratedDescription,
      referenceCount: 1,
      processingStatus: 'completed',
    };

    const [processedFile] = await db
      .insert(processedFiles)
      .values(data)
      .returning();
    
    return processedFile;
  }

  /**
   * Increment reference count when a new material references this file
   */
  async incrementReference(processedFileId: string): Promise<void> {
    await db
      .update(processedFiles)
      .set({ 
        referenceCount: sql`${processedFiles.referenceCount} + 1` 
      })
      .where(eq(processedFiles.id, processedFileId));
  }

  /**
   * Decrement reference count and delete file if no more references
   */
  async decrementReference(processedFileId: string): Promise<boolean> {
    const [processedFile] = await db
      .select()
      .from(processedFiles)
      .where(eq(processedFiles.id, processedFileId))
      .limit(1);

    if (!processedFile) {
      console.warn(`[ProcessedFileService] Processed file ${processedFileId} not found`);
      return false;
    }

    const newCount = Math.max(0, processedFile.referenceCount - 1);

    if (newCount === 0) {
      // No more references - delete the processed file record and physical file
      console.log(`[ProcessedFileService] Deleting processed file ${processedFile.fileName} (hash: ${processedFile.fileHash.substring(0, 12)}...)`);
      
      // Delete physical file
      if (processedFile.filePath && fs.existsSync(processedFile.filePath)) {
        try {
          fs.unlinkSync(processedFile.filePath);
          console.log(`[ProcessedFileService] Physical file deleted: ${processedFile.filePath}`);
        } catch (error) {
          console.error(`[ProcessedFileService] Failed to delete physical file:`, error);
        }
      }

      // Delete database record
      await db
        .delete(processedFiles)
        .where(eq(processedFiles.id, processedFileId));
      
      return true;
    } else {
      // Still has references - just decrement count
      await db
        .update(processedFiles)
        .set({ referenceCount: newCount })
        .where(eq(processedFiles.id, processedFileId));
      
      console.log(`[ProcessedFileService] Decremented reference count for ${processedFile.fileName} to ${newCount}`);
      return false;
    }
  }

  /**
   * Get or create processed file
   * - If file with same hash exists, return it (caller must increment reference count)
   * - If not, create new processed file (with initial reference count of 1)
   */
  async getOrCreate(options: CreateProcessedFileOptions): Promise<{
    processedFile: ProcessedFile;
    isNew: boolean;
  }> {
    const existing = await this.findByHash(options.fileHash);

    if (existing) {
      // File already processed - return it
      // NOTE: Caller must increment reference count AFTER successfully creating their material
      console.log(`[ProcessedFileService] Reusing existing processed file: ${existing.fileName} (hash: ${existing.fileHash.substring(0, 12)}...)`);
      
      return {
        processedFile: existing,
        isNew: false,
      };
    }

    // New file - create processed file entry with initial reference count of 1
    const processedFile = await this.create(options);
    console.log(`[ProcessedFileService] Created new processed file: ${processedFile.fileName} (hash: ${processedFile.fileHash.substring(0, 12)}...)`);
    
    return {
      processedFile,
      isNew: true,
    };
  }

  /**
   * Get total number of materials referencing a processed file
   */
  async getReferenceCount(processedFileId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(materials)
      .where(eq(materials.processedFileId, processedFileId));
    
    return Number(result[0]?.count || 0);
  }

  /**
   * FASE 1: Categorize content and create segments/topics/content source
   * Should be called after file processing to extract structured data
   */
  async processCategorization(
    processedFileId: string,
    materialId: string,
    fileName: string,
    materialTitle?: string
  ): Promise<{
    segmentId: string;
    contentSourceId?: string;
    topicIds: string[];
  }> {
    console.log(`[ProcessedFileService] Starting categorization for: ${fileName}`);
    
    // Get the processed file to extract content
    const [processedFile] = await db
      .select()
      .from(processedFiles)
      .where(eq(processedFiles.id, processedFileId))
      .limit(1);

    if (!processedFile || !processedFile.extractedContent) {
      throw new Error('Processed file not found or has no extracted content');
    }

    // Categorize content using AI
    const categorization = await contentCategorizationService.categorizeContent(
      processedFile.extractedContent,
      fileName,
      materialTitle
    );

    console.log(`[ProcessedFileService] Categorization complete. Topics: ${categorization.normalizedTopics.length}`);

    // Wrap all DB writes in a transaction to prevent orphaned records
    const result = await db.transaction(async (tx) => {
      // Extract and create/find content source if present
      let contentSourceId: string | undefined;
      const sourceInfo = await contentCategorizationService.extractContentSourceInfo(
        categorization.pedagogicalMetadata,
        categorization.contentSourceName,
        categorization.contentSourceType,
        categorization.contentSourceSpecialty
      );

      if (sourceInfo) {
        // Check if content source already exists
        const [existingSource] = await tx
          .select()
          .from(contentSources)
          .where(
            and(
              eq(contentSources.name, sourceInfo.name),
              eq(contentSources.type, sourceInfo.type)
            )
          )
          .limit(1);

        if (existingSource) {
          contentSourceId = existingSource.id;
          console.log(`[ProcessedFileService] Reusing existing content source: ${sourceInfo.name}`);
        } else {
          const sourceData: InsertContentSource = {
            name: sourceInfo.name,
            type: sourceInfo.type,
            specialty: sourceInfo.specialty,
            institution: sourceInfo.institution,
          };

          const [newSource] = await tx
            .insert(contentSources)
            .values(sourceData)
            .returning();
          
          contentSourceId = newSource.id;
          console.log(`[ProcessedFileService] Created new content source: ${sourceInfo.name}`);
        }
      }

      // Create material content segment
      const segmentData: InsertMaterialContentSegment = {
        materialId,
        processedFileId,
        contentSourceId,
        pedagogicalMetadata: categorization.pedagogicalMetadata,
        cleanContent: categorization.cleanContent,
        irrelevantContent: categorization.irrelevantContent,
        segmentType: 'full',
        segmentOrder: 0,
        contentHash: processedFile.fileHash,
        categorizationModel: 'gpt-4o-mini',
        categorizationConfidence: categorization.categorizationConfidence.toString(),
      };

      const [segment] = await tx
        .insert(materialContentSegments)
        .values(segmentData)
        .returning();

      console.log(`[ProcessedFileService] Created material content segment: ${segment.id}`);

      // Create segment topics
      const topicIds: string[] = [];
      for (const topicData of categorization.normalizedTopics) {
        const topicRecord: InsertSegmentTopic = {
          segmentId: segment.id,
          topic: topicData.topic,
          confidence: topicData.confidence.toString(),
          isPrimary: topicData.isPrimary,
        };

        const [topic] = await tx
          .insert(segmentTopics)
          .values(topicRecord)
          .returning();
        
        topicIds.push(topic.id);
      }

      console.log(`[ProcessedFileService] Created ${topicIds.length} segment topics`);

      return {
        segmentId: segment.id,
        contentSourceId,
        topicIds,
      };
    });

    return result;
  }
}

export const processedFileService = new ProcessedFileService();
