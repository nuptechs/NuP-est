/**
 * Study Context Builder
 * 
 * Central aggregator that collects ALL relevant data for AI-powered study tools.
 * Performs parallel data fetching, RAG enrichment, and performance analysis.
 */

import type { IStorage } from '../../storage';
import type { StudyContext } from './types';
import { embeddingsService } from '../embeddings';
import { PineconeService } from '../pinecone';

interface ContextBuildConfig {
  subjectId?: string;
  topic?: string;
  timeAvailable?: number; // minutes
  goal?: string;
  includeRAG?: boolean;
}

export class StudyContextBuilder {
  private pineconeService: PineconeService;

  constructor(private storage: IStorage) {
    this.pineconeService = new PineconeService();
  }

  /**
   * Build complete study context for AI decision-making
   */
  async build(userId: string, config: ContextBuildConfig = {}): Promise<StudyContext> {
    try {
      // ===== PARALLEL DATA FETCHING (performance optimization) =====
      const [user, profile, assistant] = await Promise.all([
        this.storage.getUser(userId),
        this.storage.getActiveStudentProfile(userId),
        this.storage.getActiveAssistant(userId),
      ]);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (!profile) {
        throw new Error(`No active profile for user: ${userId}. Create initial profile first.`);
      }

      if (!assistant) {
        throw new Error(`No active assistant for user: ${userId}. Initialize assistant first.`);
      }

      // ===== FETCH SUBJECT AND MATERIALS (if specified) =====
      let subject = null;
      let materials: any[] = [];
      
      if (config.subjectId) {
        [subject, materials] = await Promise.all([
          this.storage.getSubject(config.subjectId),
          this.storage.getMaterials(userId, config.subjectId)
        ]);
      }

      // ===== PERFORMANCE TRACKING =====
      const performance = await this.loadRecentPerformance(userId, config.subjectId);

      // ===== LEARNING DIFFICULTIES =====
      const profileDifficulties = await this.storage.getProfileLearningDifficulties(profile.id);
      
      // Enrich with catalog data
      const difficulties = await Promise.all(
        profileDifficulties.map(async (pd) => {
          const catalogEntry = await this.storage.getLearningDifficulty(pd.difficultyId);
          return {
            profileDifficultyId: pd.id,
            category: catalogEntry?.category || 'unknown',
            difficultyName: catalogEntry?.displayName || 'unknown',
            impactLevel: pd.impactLevel,
            adaptations: pd.adaptationsApplied,
          };
        })
      );

      // ===== RAG ENRICHMENT (if topic provided and enabled) =====
      let ragChunks;
      if (config.topic && config.subjectId && materials.length > 0 && config.includeRAG !== false) {
        ragChunks = await this.searchRAG(config.topic, config.subjectId);
      }

      // ===== BUILD UNIFIED CONTEXT =====
      return {
        user: {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student',
          studyProfile: user.studyProfile || undefined,
        },

        profile: {
          id: profile.id,
          strengths: profile.strengths,
          weaknesses: profile.weaknesses,
          motivationLevel: profile.motivationLevel || '0.5',
          optimalStudyDuration: profile.optimalStudyDuration || 45,
          preferredContentTypes: profile.preferredContentTypes || [],
          needsEncouragement: profile.needsEncouragement || false,
        },

        assistant: {
          id: assistant.id,
          personality: assistant.personality as any,
          communicationStyle: assistant.communicationStyle as any,
        },

        // ⭐ SUBJECT WITH CATEGORY/PRIORITY (NOW USED!)
        subject: subject ? {
          id: subject.id,
          name: subject.name,
          category: subject.category as any,
          priority: subject.priority as any,
          color: subject.color || '#3b82f6',
          description: subject.description || undefined,
        } : null,

        materials: materials.map(m => ({
          id: m.id,
          title: m.title,
          type: m.type,
          filePath: m.filePath || undefined,
          content: m.content || undefined,
        })),

        ragChunks,

        performance,

        constraints: {
          timeAvailable: config.timeAvailable || 30,
          goalForSession: config.goal || 'general_study',
        },

        learningDifficulties: difficulties.map(d => ({
          category: d.category,
          difficultyName: d.difficultyName,
          adaptations: d.adaptations,
        })),
      };
    } catch (error) {
      console.error('Error building study context:', error);
      throw error;
    }
  }

  /**
   * Load recent performance metrics
   */
  private async loadRecentPerformance(userId: string, subjectId?: string) {
    try {
      // Get recent question attempts (last 50 for analysis)
      const allAttempts = await this.storage.getQuestionAttempts(userId);
      
      // Get all questions to create a lookup map
      const allQuestions = await this.storage.getAiQuestions(userId);
      const questionMap = new Map(allQuestions.map(q => [q.id, q]));
      
      // Enrich attempts with question data
      const attemptsWithQuestions = allAttempts.slice(0, 50).map(attempt => {
        const question = questionMap.get(attempt.questionId);
        return {
          ...attempt,
          topic: question?.topicId || 'general', // Use topicId as topic identifier
          subjectId: question?.subjectId,
        };
      });
      
      // Filter by subject if specified
      const attempts = subjectId 
        ? attemptsWithQuestions.filter(a => a.subjectId === subjectId).slice(0, 30)
        : attemptsWithQuestions.slice(0, 30);

      // Guard against no data
      if (attempts.length === 0) {
        return {
          recentAccuracy: 0.5, // neutral baseline
          avgResponseTime: 60,
          weakTopics: [],
          strongTopics: [],
          totalAttempts: 0,
        };
      }

      // Calculate accuracy
      const correct = attempts.filter(a => a.isCorrect).length;
      const accuracy = correct / attempts.length;

      // Calculate average response time
      const totalTime = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
      const avgTime = totalTime / attempts.length;

      // Analyze topics
      const topicStats = new Map<string, { correct: number; total: number }>();
      
      for (const attempt of attempts) {
        const topic = attempt.topic || 'general';
        const stats = topicStats.get(topic) || { correct: 0, total: 0 };
        stats.total++;
        if (attempt.isCorrect) stats.correct++;
        topicStats.set(topic, stats);
      }

      // Identify weak topics (< 50% accuracy)
      const weakTopics = Array.from(topicStats.entries())
        .filter(([_, stats]) => stats.total >= 3 && stats.correct / stats.total < 0.5)
        .map(([topic]) => topic);

      // Identify strong topics (> 80% accuracy)
      const strongTopics = Array.from(topicStats.entries())
        .filter(([_, stats]) => stats.total >= 3 && stats.correct / stats.total > 0.8)
        .map(([topic]) => topic);

      // Get last study session (filter out null)
      const lastSession = attempts.length > 0 && attempts[0].attemptedAt
        ? attempts[0].attemptedAt 
        : undefined;

      return {
        recentAccuracy: accuracy,
        avgResponseTime: avgTime,
        weakTopics,
        strongTopics,
        lastStudySession: lastSession,
        totalAttempts: attempts.length,
      };
    } catch (error) {
      console.error('Error loading performance:', error);
      // Return safe defaults on error
      return {
        recentAccuracy: 0.5,
        avgResponseTime: 60,
        weakTopics: [],
        strongTopics: [],
        totalAttempts: 0,
      };
    }
  }

  /**
   * Search RAG (Retrieval-Augmented Generation) for relevant material chunks
   */
  private async searchRAG(topic: string, subjectId: string) {
    try {
      // Get subject to find userId
      const subject = await this.storage.getSubject(subjectId);
      if (!subject) {
        return undefined;
      }

      // Search Pinecone for relevant chunks using the service's method
      const results = await this.pineconeService.searchSimilarContent(
        topic,
        subject.userId,
        {
          topK: 5,
          minSimilarity: 0.3,
        }
      );

      if (!results || results.length === 0) {
        return undefined;
      }

      return results.map((match: any) => ({
        content: match.content || '',
        metadata: {
          title: match.title,
          category: match.category,
        },
        similarity: match.similarity || 0,
      }));
    } catch (error) {
      console.error('Error searching RAG:', error);
      // Return undefined on RAG error (non-critical)
      return undefined;
    }
  }

  /**
   * Refresh context with new data (for adaptive sessions)
   */
  async refresh(context: StudyContext, updates: {
    newPerformance?: any;
    newTopic?: string;
  }): Promise<StudyContext> {
    // Refresh performance if needed
    let performance = context.performance;
    if (updates.newPerformance) {
      performance = await this.loadRecentPerformance(context.user.id, context.subject?.id);
    }

    // Refresh RAG if topic changed
    let ragChunks = context.ragChunks;
    if (updates.newTopic && context.subject) {
      ragChunks = await this.searchRAG(updates.newTopic, context.subject.id);
    }

    return {
      ...context,
      performance,
      ragChunks,
    };
  }
}
