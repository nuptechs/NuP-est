/**
 * Generation Registry Service
 * 
 * Deterministic cache system for AI-generated content.
 * Ensures consistency: same input (content + profile) = same output
 * 
 * Key Features:
 * - SHA256 hashing of inputs for cache lookup
 * - Automatic invalidation when profile or content changes
 * - Usage statistics and cost tracking
 * - TTL-based expiration
 */

import crypto from 'crypto';
import type { IStorage } from '../storage';
import type { InsertAiGeneration, AiGeneration } from '@shared/schema';

interface GenerationInput {
  userId: string;
  contentType: 'mindmap' | 'flashcard' | 'quiz' | 'question' | 'assessment';
  sourceContentId?: string; // deckId, materialId, etc
  contentData: any; // The actual content to hash (flashcards, materials, etc)
  profileSnapshotId?: string; // Which profile version is being used
  parameters?: {
    layout?: string;
    temperature?: number;
    model?: string;
    [key: string]: any;
  };
}

interface GenerationResult {
  content: any; // The generated content
  fromCache: boolean;
  generatedAt: Date;
  usageCount?: number;
}

export class GenerationRegistry {
  constructor(private storage: IStorage) {}

  /**
   * Main method: Get cached generation or create new one
   */
  async getOrGenerate(
    input: GenerationInput,
    generateFn: () => Promise<any>
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    // Compute hash from input
    const hash = this.computeHash(input);
    
    console.log(`🔍 [GenerationRegistry] Looking up cache for ${input.contentType}`);
    console.log(`   Hash: ${hash}`);
    console.log(`   User: ${input.userId}`);
    console.log(`   Source: ${input.sourceContentId || 'N/A'}`);
    
    // Try to find cached generation
    const cached = await this.findByHash(input.userId, input.contentType, hash);
    
    if (cached && !this.isExpired(cached)) {
      // Cache HIT - update usage stats
      await this.incrementUsage(cached.id);
      
      const generationTime = Date.now() - startTime;
      console.log(`✅ [GenerationRegistry] Cache HIT! (${generationTime}ms)`);
      console.log(`   Originally generated: ${cached.createdAt}`);
      console.log(`   Usage count: ${(cached.usageCount || 0) + 1}`);
      
      return {
        content: cached.generatedContent,
        fromCache: true,
        generatedAt: cached.createdAt ? (cached.createdAt instanceof Date ? cached.createdAt : new Date(cached.createdAt)) : new Date(),
        usageCount: (cached.usageCount || 0) + 1,
      };
    }
    
    // Cache MISS - generate new content
    console.log(`❌ [GenerationRegistry] Cache MISS - generating new content...`);
    
    const generatedContent = await generateFn();
    const generationTime = Date.now() - startTime;
    
    // Save to cache
    await this.save({
      userId: input.userId,
      contentType: input.contentType,
      inputHash: hash,
      sourceContentId: input.sourceContentId,
      profileSnapshotId: input.profileSnapshotId,
      generationParams: input.parameters || {},
      generatedContent,
      modelUsed: input.parameters?.model || 'gpt-4o-mini',
      temperature: input.parameters?.temperature?.toString() || '0.5',
      generationTimeMs: generationTime,
      usageCount: 1,
      expiresAt: this.calculateExpiration() || undefined,
    });
    
    console.log(`💾 [GenerationRegistry] Saved to cache (${generationTime}ms)`);
    
    return {
      content: generatedContent,
      fromCache: false,
      generatedAt: new Date(),
      usageCount: 1,
    };
  }

  /**
   * Compute SHA256 hash from input parameters
   * This is the key for cache consistency
   */
  private computeHash(input: GenerationInput): string {
    // Create a canonical representation of the input
    const canonical = {
      contentType: input.contentType,
      sourceContentId: input.sourceContentId || '',
      profileSnapshotId: input.profileSnapshotId || '',
      // Sort content data keys for consistent hashing
      contentData: this.sortObjectKeys(input.contentData),
      // Include generation parameters that affect output
      parameters: this.sortObjectKeys(input.parameters || {}),
    };
    
    const canonicalString = JSON.stringify(canonical);
    
    // Compute SHA256 hash
    return crypto
      .createHash('sha256')
      .update(canonicalString)
      .digest('hex');
  }

  /**
   * Recursively sort object keys for consistent hashing
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    if (typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted: any, key) => {
          sorted[key] = this.sortObjectKeys(obj[key]);
          return sorted;
        }, {});
    }
    
    return obj;
  }

  /**
   * Find cached generation by hash
   */
  private async findByHash(
    userId: string,
    contentType: string,
    hash: string
  ): Promise<AiGeneration | null> {
    try {
      const generations = await this.storage.getAiGenerationsByHash(userId, contentType, hash);
      return generations.length > 0 ? generations[0] : null;
    } catch (error) {
      console.error('Error finding cached generation:', error);
      return null;
    }
  }

  /**
   * Save new generation to cache
   */
  private async save(generation: InsertAiGeneration): Promise<void> {
    try {
      await this.storage.createAiGeneration(generation);
    } catch (error) {
      console.error('Error saving generation to cache:', error);
      // Don't throw - cache failure shouldn't break generation
    }
  }

  /**
   * Increment usage count for cached generation
   */
  private async incrementUsage(generationId: string): Promise<void> {
    try {
      await this.storage.incrementAiGenerationUsage(generationId);
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      // Don't throw - tracking failure shouldn't break flow
    }
  }

  /**
   * Check if generation has expired
   */
  private isExpired(generation: AiGeneration): boolean {
    if (!generation.expiresAt) {
      return false; // No expiration set
    }
    
    return new Date(generation.expiresAt) < new Date();
  }

  /**
   * Calculate expiration date (30 days from now)
   */
  private calculateExpiration(): Date | undefined {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    return expirationDate;
  }

  /**
   * Invalidate cache for specific source content
   * Call this when deck/material is edited
   */
  async invalidateBySource(userId: string, sourceContentId: string): Promise<void> {
    try {
      await this.storage.deleteAiGenerationsBySource(userId, sourceContentId);
      console.log(`🗑️ [GenerationRegistry] Invalidated cache for source: ${sourceContentId}`);
    } catch (error) {
      console.error('Error invalidating cache by source:', error);
    }
  }

  /**
   * Invalidate cache for specific profile
   * Call this when user profile changes significantly
   */
  async invalidateByProfile(userId: string, profileSnapshotId: string): Promise<void> {
    try {
      await this.storage.deleteAiGenerationsByProfile(userId, profileSnapshotId);
      console.log(`🗑️ [GenerationRegistry] Invalidated cache for profile: ${profileSnapshotId}`);
    } catch (error) {
      console.error('Error invalidating cache by profile:', error);
    }
  }

  /**
   * Clean up expired generations
   * Run this periodically (e.g., daily cron job)
   */
  async cleanupExpired(): Promise<void> {
    try {
      await this.storage.deleteExpiredAiGenerations();
      console.log(`🧹 [GenerationRegistry] Cleaned up expired generations`);
    } catch (error) {
      console.error('Error cleaning up expired generations:', error);
    }
  }
}
