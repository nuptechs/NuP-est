import type { IStorage } from '../../storage';
import type { InsertInteractionLog } from '../../../shared/schema';
import { StudentProfileGenerator } from './StudentProfileGenerator';

/**
 * Continuous Discovery Service
 * 
 * Tracks real-time student interactions and continuously refines learning profiles
 * based on behavioral patterns, comprehension signals, and engagement metrics.
 */
export class ContinuousDiscoveryService {
  constructor(
    private storage: IStorage,
    private profileGenerator: StudentProfileGenerator
  ) {}

  /**
   * Log a student interaction and analyze for profile updates
   * @returns Updated profile if significant change detected
   */
  async logInteraction(
    userId: string,
    assistantId: string | null,
    interactionData: {
      interactionType: 'question' | 'teaching' | 'assessment' | 'chat' | 'hint_request';
      context?: string;
      userInput?: string;
      assistantResponse?: string;
      emotionalState?: string;
      engagementLevel?: number;
      comprehensionLevel?: number;
      sessionDuration?: number;
      discoveries?: any;
      patternsDetected?: string[];
      deviceType?: string;
    }
  ) {
    // Create interaction log entry
    const interaction: InsertInteractionLog = {
      userId,
      assistantId,
      interactionType: interactionData.interactionType,
      context: interactionData.context,
      userInput: interactionData.userInput,
      assistantResponse: interactionData.assistantResponse,
      emotionalState: interactionData.emotionalState,
      engagementLevel: interactionData.engagementLevel?.toString(),
      comprehensionLevel: interactionData.comprehensionLevel?.toString(),
      sessionDuration: interactionData.sessionDuration,
      discoveries: interactionData.discoveries || {},
      patternsDetected: interactionData.patternsDetected || [],
      deviceType: interactionData.deviceType,
    };

    const loggedInteraction = await this.storage.createInteractionLog(interaction);

    // Check if we should trigger profile update
    const shouldUpdate = await this.shouldTriggerProfileUpdate(userId);

    if (shouldUpdate) {
      const lastUpdateTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      const updatedProfile = await this.profileGenerator.updateProfileFromInteractions(userId, lastUpdateTime);
      
      return {
        interaction: loggedInteraction,
        profileUpdated: true,
        newProfile: updatedProfile,
      };
    }

    return {
      interaction: loggedInteraction,
      profileUpdated: false,
    };
  }

  /**
   * Log a question attempt with detailed analysis
   */
  async logQuestionAttempt(
    userId: string,
    assistantId: string | null,
    questionId: string,
    response: string,
    isCorrect: boolean,
    timeSpent: number,
    hintsUsed: number,
    difficultyLevel: number,
    topic?: string // Topic/subject area for performance tracking
  ) {
    // Determine engagement based on time spent and hints
    const engagementLevel = this.analyzeEngagementNumeric(timeSpent, hintsUsed);
    
    // Determine comprehension based on correctness and time
    const comprehensionLevel = this.analyzeComprehensionNumeric(isCorrect, timeSpent, difficultyLevel);

    return await this.logInteraction(userId, assistantId, {
      interactionType: 'question',
      context: 'assessment',
      userInput: response,
      engagementLevel,
      comprehensionLevel,
      sessionDuration: timeSpent,
      discoveries: {
        questionId,
        topic: topic || 'general',
        difficultyLevel,
        hintsUsed,
        isCorrect,
      },
    });
  }

  /**
   * Log a study session
   */
  async logStudySession(
    userId: string,
    assistantId: string,
    sessionData: {
      startTime: Date;
      endTime: Date;
      activitiesCompleted: number;
      questionsAnswered: number;
      correctAnswers: number;
      topicsStudied: string[];
    }
  ) {
    const duration = Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000);
    const accuracy = sessionData.questionsAnswered > 0 
      ? sessionData.correctAnswers / sessionData.questionsAnswered 
      : 0;

    const engagementLevel = this.analyzeSessionEngagementNumeric(
      duration,
      sessionData.activitiesCompleted,
      sessionData.questionsAnswered
    );

    const comprehensionLevel = this.analyzeSessionComprehensionNumeric(accuracy);

    return await this.logInteraction(userId, assistantId, {
      interactionType: 'teaching',
      context: 'study_session',
      engagementLevel,
      comprehensionLevel,
      sessionDuration: duration,
      discoveries: {
        startTime: sessionData.startTime.toISOString(),
        endTime: sessionData.endTime.toISOString(),
        activitiesCompleted: sessionData.activitiesCompleted,
        questionsAnswered: sessionData.questionsAnswered,
        correctAnswers: sessionData.correctAnswers,
        topicsStudied: sessionData.topicsStudied,
        accuracy,
      },
    });
  }

  /**
   * Get recent interaction patterns for a student
   */
  async getInteractionPatterns(userId: string, limit = 50) {
    const interactions = await this.storage.getInteractionLogs(userId, undefined, limit);

    // Analyze patterns
    const patterns = {
      totalInteractions: interactions.length,
      questionAttempts: interactions.filter((i: any) => i.interactionType === 'question').length,
      hintsRequested: interactions.filter((i: any) => i.interactionType === 'hint_request').length,
      studySessions: interactions.filter((i: any) => i.context === 'study_session').length,
      
      avgEngagement: this.calculateAverageEngagement(interactions),
      avgComprehension: this.calculateAverageComprehension(interactions),
      avgSessionDuration: this.calculateAverageSessionDuration(interactions),
      
      recentTrend: this.analyzeRecentTrend(interactions),
      strugglingTopics: this.identifyStrugglingAreas(interactions),
      strengtheningTopics: this.identifyStrentheningAreas(interactions),
    };

    return patterns;
  }

  /**
   * Determine if profile should be updated based on interaction count
   */
  private async shouldTriggerProfileUpdate(userId: string): Promise<boolean> {
    const profile = await this.storage.getActiveStudentProfile(userId);
    if (!profile) return false;

    // Get recent interactions since last profile update
    const recentInteractions = await this.storage.getInteractionLogs(userId, undefined, 100);
    
    const profileUpdateTime = profile.updatedAt || profile.createdAt;
    const interactionsSinceUpdate = recentInteractions.filter(
      (i: any) => i.createdAt && profileUpdateTime && new Date(i.createdAt) > new Date(profileUpdateTime)
    );

    // Trigger update every 20 interactions
    return interactionsSinceUpdate.length >= 20;
  }

  /**
   * Analyze engagement from individual question attempt (numeric)
   */
  private analyzeEngagementNumeric(timeSpent: number, hintsUsed: number): number {
    // Very quick or many hints = low engagement
    if (timeSpent < 10 || hintsUsed > 3) return 0.2;
    
    // Reasonable time and few hints = high engagement
    if (timeSpent > 30 && hintsUsed <= 1) return 0.9;
    
    return 0.5;
  }

  /**
   * Analyze comprehension from question attempt (numeric)
   */
  private analyzeComprehensionNumeric(isCorrect: boolean, timeSpent: number, difficulty: number): number {
    if (isCorrect) {
      // Quick and correct = high comprehension
      if (timeSpent < 60) return 0.85;
      return 0.6;
    }
    
    // Incorrect but spent time = needs support
    if (timeSpent > 120) return 0.25;
    
    return 0.35;
  }

  /**
   * Analyze engagement from full session (numeric)
   */
  private analyzeSessionEngagementNumeric(duration: number, activities: number, questions: number): number {
    const activityRate = duration > 0 ? activities / (duration / 60) : 0; // activities per minute
    
    if (duration < 300 || activityRate < 0.5) return 0.2; // < 5 min or low activity
    if (duration > 1800 && activityRate > 1.5) return 0.9; // > 30 min and active
    
    return 0.5;
  }

  /**
   * Analyze comprehension from session accuracy (numeric)
   */
  private analyzeSessionComprehensionNumeric(accuracy: number): number {
    if (accuracy >= 0.8) return 0.85;
    if (accuracy >= 0.5) return 0.5;
    return 0.25;
  }

  /**
   * Calculate average engagement from interactions
   * Handles both numeric decimal strings and categorical values
   */
  private calculateAverageEngagement(interactions: any[]): number {
    const withEngagement = interactions.filter((i: any) => i.engagementLevel);
    if (withEngagement.length === 0) return 0.5;

    const scoreMap: Record<string, number> = {
      'high': 0.9,
      'medium': 0.5,
      'low': 0.2,
      'frustrated': 0.1,
    };

    const total = withEngagement.reduce((sum: number, i: any) => {
      // Try parsing as decimal string first
      const numericScore = parseFloat(i.engagementLevel);
      if (!isNaN(numericScore)) {
        return sum + numericScore;
      }
      
      // Fall back to categorical mapping
      const score = scoreMap[i.engagementLevel] ?? 0.5;
      return sum + score;
    }, 0);

    return total / withEngagement.length;
  }

  /**
   * Calculate average comprehension from interactions
   * Handles both numeric decimal strings and categorical values
   */
  private calculateAverageComprehension(interactions: any[]): number {
    const withComprehension = interactions.filter((i: any) => i.comprehensionLevel);
    if (withComprehension.length === 0) return 0.5;

    const scoreMap: Record<string, number> = {
      'high': 0.85,
      'medium': 0.5,
      'low': 0.3,
      'needs_support': 0.2,
    };

    const total = withComprehension.reduce((sum: number, i: any) => {
      // Try parsing as decimal string first
      const numericScore = parseFloat(i.comprehensionLevel);
      if (!isNaN(numericScore)) {
        return sum + numericScore;
      }
      
      // Fall back to categorical mapping
      const score = scoreMap[i.comprehensionLevel] ?? 0.5;
      return sum + score;
    }, 0);

    return total / withComprehension.length;
  }

  /**
   * Calculate average session duration
   */
  private calculateAverageSessionDuration(interactions: any[]): number {
    const sessions = interactions.filter(i => i.sessionDuration && i.sessionDuration > 0);
    if (sessions.length === 0) return 0;

    const total = sessions.reduce((sum, i) => sum + (i.sessionDuration || 0), 0);
    return total / sessions.length;
  }

  /**
   * Analyze recent trend (improving/declining/stable)
   */
  private analyzeRecentTrend(interactions: any[]): string {
    if (interactions.length < 10) return 'insufficient_data';

    const recent = interactions.slice(0, 10);
    const older = interactions.slice(10, 20);

    const recentScore = this.calculateAverageComprehension(recent);
    const olderScore = this.calculateAverageComprehension(older);

    if (recentScore > olderScore + 0.15) return 'improving';
    if (recentScore < olderScore - 0.15) return 'declining';
    return 'stable';
  }

  /**
   * Identify topics where student is struggling
   */
  private identifyStrugglingAreas(interactions: any[]): string[] {
    const questionAttempts = interactions.filter((i: any) => i.interactionType === 'question');
    
    const topicPerformance: Record<string, { correct: number; total: number }> = {};

    questionAttempts.forEach((attempt: any) => {
      // Extract topic from discoveries (where logQuestionAttempt stores it)
      const topic = attempt.discoveries?.topic || 'unknown';
      const isCorrect = attempt.discoveries?.isCorrect ?? false;
      
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0 };
      }
      
      topicPerformance[topic].total++;
      if (isCorrect) {
        topicPerformance[topic].correct++;
      }
    });

    // Topics with < 50% accuracy and at least 3 attempts
    return Object.entries(topicPerformance)
      .filter(([_, stats]) => stats.total >= 3 && stats.correct / stats.total < 0.5)
      .map(([topic]) => topic);
  }

  /**
   * Identify topics where student is strengthening
   */
  private identifyStrentheningAreas(interactions: any[]): string[] {
    const questionAttempts = interactions.filter((i: any) => i.interactionType === 'question');
    
    const topicPerformance: Record<string, { correct: number; total: number }> = {};

    questionAttempts.forEach((attempt: any) => {
      // Extract topic from discoveries (where logQuestionAttempt stores it)
      const topic = attempt.discoveries?.topic || 'unknown';
      const isCorrect = attempt.discoveries?.isCorrect ?? false;
      
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0 };
      }
      
      topicPerformance[topic].total++;
      if (isCorrect) {
        topicPerformance[topic].correct++;
      }
    });

    // Topics with > 75% accuracy and at least 3 attempts
    return Object.entries(topicPerformance)
      .filter(([_, stats]) => stats.total >= 3 && stats.correct / stats.total > 0.75)
      .map(([topic]) => topic);
  }
}
