import { db } from '../db.js';
import { processedFiles, materials } from '@shared/schema';
import type { InsertProcessedFile, ProcessedFile } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';

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
   * - If file with same hash exists, increment reference and return it
   * - If not, create new processed file
   */
  async getOrCreate(options: CreateProcessedFileOptions): Promise<{
    processedFile: ProcessedFile;
    isNew: boolean;
  }> {
    const existing = await this.findByHash(options.fileHash);

    if (existing) {
      // File already processed - increment reference count
      await this.incrementReference(existing.id);
      console.log(`[ProcessedFileService] Reusing existing processed file: ${existing.fileName} (hash: ${existing.fileHash.substring(0, 12)}...)`);
      
      return {
        processedFile: existing,
        isNew: false,
      };
    }

    // New file - create processed file entry
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
}

export const processedFileService = new ProcessedFileService();
