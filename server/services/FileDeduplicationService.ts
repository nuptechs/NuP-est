import crypto from 'crypto';
import fs from 'fs';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { materials } from '@shared/schema';

export interface DeduplicationResult {
  hash: string;
  isDuplicate: boolean;
  existingMaterial?: {
    id: string;
    title: string;
    filePath: string | null;
    subjectId: string | null;
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
   * Checks if a file with the same hash already exists in the database
   * @param fileHash - SHA-256 hash of the file
   * @param userId - User ID to scope the search (optional)
   * @returns Promise<DeduplicationResult>
   */
  async checkDuplicate(
    fileHash: string, 
    userId?: string
  ): Promise<DeduplicationResult> {
    try {
      const conditions = [eq(materials.fileHash, fileHash)];
      
      if (userId) {
        conditions.push(eq(materials.userId, userId));
      }

      const existingMaterials = await db
        .select({
          id: materials.id,
          title: materials.title,
          filePath: materials.filePath,
          subjectId: materials.subjectId,
          createdAt: materials.createdAt,
        })
        .from(materials)
        .where(conditions.length > 1 ? 
          // @ts-ignore - Drizzle typing issue with multiple conditions
          eq(materials.fileHash, fileHash) && eq(materials.userId, userId!) :
          eq(materials.fileHash, fileHash)
        )
        .limit(1);

      if (existingMaterials.length > 0) {
        return {
          hash: fileHash,
          isDuplicate: true,
          existingMaterial: existingMaterials[0],
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
   * @param userId - User ID to scope the search (optional)
   * @returns Promise<DeduplicationResult>
   */
  async checkFileForDuplication(
    filePath: string,
    userId?: string
  ): Promise<DeduplicationResult> {
    const hash = await this.generateFileHash(filePath);
    return this.checkDuplicate(hash, userId);
  }

  /**
   * Checks if a file already exists for the current user
   * Returns true if duplicate, false otherwise
   * @param filePath - Path to the file
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isDuplicateForUser(filePath: string, userId: string): Promise<boolean> {
    const result = await this.checkFileForDuplication(filePath, userId);
    return result.isDuplicate;
  }

  /**
   * Get detailed duplicate information including all occurrences
   * @param fileHash - SHA-256 hash of the file
   * @returns Promise with array of all materials with the same hash
   */
  async getDuplicateDetails(fileHash: string) {
    try {
      const duplicates = await db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          filePath: materials.filePath,
          subjectId: materials.subjectId,
          userId: materials.userId,
          createdAt: materials.createdAt,
        })
        .from(materials)
        .where(eq(materials.fileHash, fileHash));

      return duplicates;
    } catch (error) {
      console.error('[FileDeduplication] Error getting duplicate details:', error);
      return [];
    }
  }
}

export const fileDeduplicationService = new FileDeduplicationService();
