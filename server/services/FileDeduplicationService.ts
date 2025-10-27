import crypto from 'crypto';
import fs from 'fs';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { processedFiles } from '@shared/schema';

export interface DeduplicationResult {
  hash: string;
  isDuplicate: boolean;
  existingProcessedFile?: {
    id: string;
    fileName: string;
    filePath: string;
    extractedContent: string | null;
    aiGeneratedTitle: string | null;
    aiGeneratedDescription: string | null;
    createdAt: Date | null;
  };
}

export class FileDeduplicationService {
  
  /**
   * Generates SHA-256 hash of a file
   * @param filePath - Path to the file
   * @returns Promise<string> - Hex-encoded SHA-256 hash
   */
  async generateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (error) => reject(error));
    });
  }

  /**
   * Checks if a file with the same hash already exists in processed_files
   * @param fileHash - SHA-256 hash of the file
   * @returns Promise<DeduplicationResult>
   */
  async checkDuplicate(fileHash: string): Promise<DeduplicationResult> {
    try {
      const existingFiles = await db
        .select({
          id: processedFiles.id,
          fileName: processedFiles.fileName,
          filePath: processedFiles.filePath,
          extractedContent: processedFiles.extractedContent,
          aiGeneratedTitle: processedFiles.aiGeneratedTitle,
          aiGeneratedDescription: processedFiles.aiGeneratedDescription,
          createdAt: processedFiles.createdAt,
        })
        .from(processedFiles)
        .where(eq(processedFiles.fileHash, fileHash))
        .limit(1);

      if (existingFiles.length > 0) {
        return {
          hash: fileHash,
          isDuplicate: true,
          existingProcessedFile: existingFiles[0],
        };
      }

      return {
        hash: fileHash,
        isDuplicate: false,
      };
    } catch (error) {
      console.error('[FileDeduplication] Error checking duplicate:', error);
      return {
        hash: fileHash,
        isDuplicate: false,
      };
    }
  }

  /**
   * Complete deduplication check: generates hash and checks for duplicates
   * @param filePath - Path to the file
   * @returns Promise<DeduplicationResult>
   */
  async checkFileForDuplication(filePath: string): Promise<DeduplicationResult> {
    const hash = await this.generateFileHash(filePath);
    return this.checkDuplicate(hash);
  }

  /**
   * Checks if a file already exists (has been processed before)
   * Returns true if duplicate, false otherwise
   * @param filePath - Path to the file
   * @returns Promise<boolean>
   */
  async isDuplicate(filePath: string): Promise<boolean> {
    const result = await this.checkFileForDuplication(filePath);
    return result.isDuplicate;
  }

  /**
   * Get detailed duplicate information including all materials using this file
   * @param fileHash - SHA-256 hash of the file
   * @returns Promise with processed file details
   */
  async getDuplicateDetails(fileHash: string) {
    try {
      const duplicates = await db
        .select({
          id: processedFiles.id,
          fileName: processedFiles.fileName,
          filePath: processedFiles.filePath,
          fileType: processedFiles.fileType,
          extractedContent: processedFiles.extractedContent,
          aiGeneratedTitle: processedFiles.aiGeneratedTitle,
          aiGeneratedDescription: processedFiles.aiGeneratedDescription,
          referenceCount: processedFiles.referenceCount,
          createdAt: processedFiles.createdAt,
        })
        .from(processedFiles)
        .where(eq(processedFiles.fileHash, fileHash));

      return duplicates;
    } catch (error) {
      console.error('[FileDeduplication] Error getting duplicate details:', error);
      return [];
    }
  }
}

export const fileDeduplicationService = new FileDeduplicationService();
