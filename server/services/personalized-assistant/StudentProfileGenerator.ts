import { storage } from '../../storage';
import type {
  AdaptiveAssessment,
  StudentAssessmentAttempt,
  InsertStudentLearningProfile,
  StudentLearningProfile,
  InsertProfileLearningDifficulty,
  UserLearningDifficulty,
} from '@shared/schema';

/**
 * Student Profile Generator Service
 * Analyzes assessment results and creates versioned learning profiles
 */
export class StudentProfileGenerator {
  /**
   * Generate initial learning profile from assessment results
   */
  async generateInitialProfile(
    userId: string,
    assessmentId: string
  ): Promise<StudentLearningProfile> {
    const assessment = await storage.getAdaptiveAssessment(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (!assessment.isComplete) {
      throw new Error('Assessment must be completed before generating profile');
    }

    const attempts = await storage.getStudentAssessmentAttempts(userId, assessmentId);

    // Deactivate any existing active profiles
    const existingProfiles = await storage.getStudentProfiles(userId);
    for (const profile of existingProfiles) {
      if (profile.isActive) {
        await storage.updateStudentProfile(profile.id, { isActive: false });
      }
    }

    // Calculate next version number
    const version = existingProfiles.length + 1;

    // Analyze assessment results
    const analysis = await this.analyzeAssessmentResults(assessment, attempts);

    // Create profile using actual schema fields
    const profileData: InsertStudentLearningProfile = {
      userId,
      version,
      isActive: true,
      primaryGoal: 'General Learning', // Will be updated by user
      
      // Strengths and weaknesses as JSONB
      strengths: this.buildStrengthsObject(assessment, analysis),
      weaknesses: this.buildWeaknessesObject(assessment, analysis),
      
      // Study patterns
      optimalStudyDuration: this.estimateOptimalDuration(analysis),
      bestStudyTimes: [], // Will be discovered over time
      preferredContentTypes: this.suggestContentTypes(analysis),
      
      // Motivation
      motivationLevel: this.estimateMotivationLevel(attempts),
      needsEncouragement: analysis.engagementPattern === 'low_engagement',
      respondsToGamification: analysis.motivationTriggers.includes('fast_paced_challenges'),
      prefersStructuredPlan: true, // Default assumption
      
      // Metadata
      discoverySource: 'initial_assessment',
      confidenceScore: assessment.confidenceLevel || '0',
      totalInteractions: attempts.length,
    };

    const profile = await storage.createStudentProfile(profileData);

    // Link user's learning difficulties to profile
    await this.linkLearningDifficulties(userId, profile.id, analysis);

    return profile;
  }

  /**
   * Update existing profile based on new interactions
   */
  async updateProfileFromInteractions(
    userId: string,
    interactionsSince: Date
  ): Promise<StudentLearningProfile> {
    const currentProfile = await storage.getActiveStudentProfile(userId);
    if (!currentProfile) {
      throw new Error('No active profile found. Create initial profile first.');
    }

    // Get recent interactions for analysis
    const interactions = await storage.getInteractionLogs(userId, undefined, 100);
    const recentInteractions = interactions.filter(
      i => i.createdAt && new Date(i.createdAt) > interactionsSince
    );

    if (recentInteractions.length < 10) {
      // Not enough data for meaningful update
      return currentProfile;
    }

    // Analyze interaction patterns
    const updates = await this.analyzeInteractionPatterns(recentInteractions);

    // Create new version if significant changes detected
    const significantChange = this.detectSignificantChange(currentProfile, updates);

    if (significantChange) {
      // Deactivate current profile
      await storage.updateStudentProfile(currentProfile.id, { isActive: false });

      // Create new version - carry forward all fields and apply updates
      const newVersion = currentProfile.version + 1;
      const newProfileData: InsertStudentLearningProfile = {
        userId: currentProfile.userId,
        primaryGoal: currentProfile.primaryGoal,
        discoverySource: 'continuous_discovery',
        version: newVersion,
        isActive: true,
        
        // Carry forward all study preferences
        optimalStudyDuration: currentProfile.optimalStudyDuration,
        bestStudyTimes: currentProfile.bestStudyTimes || [],
        preferredContentTypes: currentProfile.preferredContentTypes || [],
        secondaryGoals: currentProfile.secondaryGoals || [],
        targetDate: currentProfile.targetDate,
        availableHoursPerDay: currentProfile.availableHoursPerDay,
        
        // Carry forward personality
        prefersStructuredPlan: currentProfile.prefersStructuredPlan,
        respondsToGamification: currentProfile.respondsToGamification,
        
        // Carry forward strengths/weaknesses (will be updated if in updates)
        strengths: currentProfile.strengths as any,
        weaknesses: currentProfile.weaknesses as any,
        
        // Apply updates (overrides carried values if present)
        ...updates,
        
        // Update metadata
        confidenceScore: currentProfile.confidenceScore,
        totalInteractions: (currentProfile.totalInteractions || 0) + recentInteractions.length,
      };

      const newProfile = await storage.createStudentProfile(newProfileData);
      
      // Re-link learning difficulties with real interaction-derived analysis
      await this.linkLearningDifficulties(userId, newProfile.id, updates);
      
      return newProfile;
    } else {
      // Update current profile
      const updated = await storage.updateStudentProfile(currentProfile.id, {
        ...updates,
        totalInteractions: (currentProfile.totalInteractions || 0) + recentInteractions.length,
      });
      
      return updated;
    }
  }

  /**
   * Analyze assessment results to extract learning patterns
   */
  private async analyzeAssessmentResults(
    assessment: AdaptiveAssessment,
    attempts: StudentAssessmentAttempt[]
  ): Promise<{
    learningPace: string;
    comprehensionLevel: string;
    retentionPattern: string;
    attentionSpan: string;
    engagementPattern: string;
    motivationTriggers: string[];
    bestPerformanceTime: string | null;
    preferredDifficulty: string;
    errorPatterns: string[];
  }> {
    const avgTime = this.calculateAverageTime(attempts);
    const avgAccuracy = this.calculateAccuracy(attempts);
    const engagementLevels = attempts.map(a => a.engagementLevel || 'medium');

    return {
      learningPace: this.determineLearningPace(avgTime),
      comprehensionLevel: this.determineComprehensionLevel(avgAccuracy),
      retentionPattern: this.analyzeRetentionPattern(attempts),
      attentionSpan: this.analyzeAttentionSpan(attempts),
      engagementPattern: this.analyzeEngagementPattern(engagementLevels),
      motivationTriggers: this.identifyMotivationTriggers(attempts),
      bestPerformanceTime: null, // Will be updated over time
      preferredDifficulty: this.analyzePreferredDifficulty(attempts),
      errorPatterns: this.identifyErrorPatterns(attempts),
    };
  }

  /**
   * Analyze interaction patterns for profile updates
   * Returns comprehensive learning pattern data for both profile updates and difficulty impact
   */
  private async analyzeInteractionPatterns(
    interactions: any[]
  ): Promise<any> {
    // Map categorical values to numeric scores
    const engagementScore = (level: string): number => {
      const numericLevel = parseFloat(level);
      if (!isNaN(numericLevel)) return numericLevel;
      
      // Categorical mapping
      if (level === 'high') return 0.9;
      if (level === 'medium') return 0.5;
      if (level === 'low') return 0.2;
      if (level === 'frustrated') return 0.1;
      return 0.5; // default
    };

    const comprehensionScore = (level: string): number => {
      const numericLevel = parseFloat(level);
      if (!isNaN(numericLevel)) return numericLevel;
      
      // Categorical mapping
      if (level === 'high') return 0.85;
      if (level === 'medium') return 0.5;
      if (level === 'low' || level === 'needs_support') return 0.25;
      return 0.5; // default
    };

    const avgEngagement = interactions.reduce(
      (sum, i) => sum + engagementScore(i.engagementLevel || 'medium'), 
      0
    ) / interactions.length;

    const avgComprehension = interactions.reduce(
      (sum, i) => sum + comprehensionScore(i.comprehensionLevel || 'medium'),
      0
    ) / interactions.length;

    // Analyze session durations for attention span
    const sessionDurations = interactions
      .map(i => i.sessionDuration || 0)
      .filter(d => d > 0);
    
    const avgDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a: number, b: number) => a + b, 0) / sessionDurations.length
      : 0;

    // Determine attention span from session durations
    let attentionSpan = 'moderate';
    if (avgDuration < 900) attentionSpan = 'very_short'; // < 15 min
    else if (avgDuration < 1800) attentionSpan = 'short'; // < 30 min  
    else if (avgDuration < 3600) attentionSpan = 'moderate'; // < 60 min
    else attentionSpan = 'long';

    // Determine learning pace from comprehension vs time
    let learningPace = 'moderate';
    if (avgComprehension > 0.7 && avgDuration < 1800) learningPace = 'fast';
    else if (avgComprehension < 0.5 || avgDuration > 3600) learningPace = 'slow';

    // Determine comprehension level
    let comprehensionLevel = 'medium';
    if (avgComprehension >= 0.7) comprehensionLevel = 'high';
    else if (avgComprehension < 0.5) comprehensionLevel = 'needs_support';

    // Calculate optimal duration from patterns
    const optimalDuration = this.estimateOptimalDurationFromInteractions(attentionSpan);

    // Engagement pattern
    let engagementPattern = 'moderately_engaged';
    if (avgEngagement > 0.7) engagementPattern = 'highly_engaged';
    else if (avgEngagement < 0.4) engagementPattern = 'low_engagement';

    return {
      // Profile update fields
      motivationLevel: avgEngagement.toFixed(2),
      needsEncouragement: avgEngagement < 0.4,
      optimalStudyDuration: optimalDuration,
      
      // Analysis fields for difficulty linking
      attentionSpan,
      learningPace,
      comprehensionLevel,
      engagementPattern,
      errorPatterns: [], // Will be populated from attempt analysis
      motivationTriggers: avgEngagement > 0.7 ? ['success_and_achievement'] : [],
    };
  }

  private estimateOptimalDurationFromInteractions(attentionSpan: string): number {
    if (attentionSpan === 'very_short') return 15;
    if (attentionSpan === 'short') return 25;
    if (attentionSpan === 'moderate') return 45;
    return 60; // long
  }

  /**
   * Detect if changes are significant enough for new version
   */
  private detectSignificantChange(
    current: StudentLearningProfile,
    updates: Partial<InsertStudentLearningProfile>
  ): boolean {
    // Check for major motivation shifts
    const currentMotivation = parseFloat(current.motivationLevel || '0.5');
    const newMotivation = updates.motivationLevel ? parseFloat(updates.motivationLevel) : currentMotivation;
    
    if (Math.abs(newMotivation - currentMotivation) > 0.3) return true;

    // Check if encouragement needs changed
    if (updates.needsEncouragement !== undefined && 
        updates.needsEncouragement !== current.needsEncouragement) {
      return true;
    }

    return false;
  }

  /**
   * Link user's learning difficulties to profile
   */
  private async linkLearningDifficulties(
    userId: string,
    profileId: string,
    analysis: any
  ): Promise<void> {
    const userDifficulties = await storage.getUserLearningDifficulties(userId);

    for (const difficulty of userDifficulties) {
      // Estimate impact level based on analysis
      const impactLevel = this.estimateImpactLevel(difficulty, analysis);

      const profileDifficulty: InsertProfileLearningDifficulty = {
        profileId,
        difficultyId: difficulty.difficultyId,
        impactLevel: impactLevel.toString(),
        adaptationsApplied: this.suggestAdaptations(difficulty.difficultyId, analysis),
      };

      await storage.addProfileLearningDifficulty(profileDifficulty);
    }
  }

  /**
   * Estimate impact level of a difficulty on this profile
   */
  private estimateImpactLevel(
    difficulty: UserLearningDifficulty,
    analysis: any
  ): number {
    // Base impact on severity
    let impact = 0.5;

    if (difficulty.severity === 'severe') impact = 0.9;
    else if (difficulty.severity === 'moderate') impact = 0.6;
    else if (difficulty.severity === 'mild') impact = 0.3;

    // Adjust based on observed patterns
    if (analysis.attentionSpan === 'very_short' && difficulty.difficultyId.includes('adhd')) {
      impact = Math.min(1, impact + 0.2);
    }

    if (analysis.learningPace === 'slow' && difficulty.difficultyId.includes('processing')) {
      impact = Math.min(1, impact + 0.15);
    }

    return impact;
  }

  /**
   * Suggest adaptations for a difficulty
   */
  private suggestAdaptations(difficultyId: string, analysis: any): any {
    const adaptations: any = {};

    // ADHD adaptations
    if (difficultyId.includes('adhd')) {
      adaptations.chunking = true;
      adaptations.frequentBreaks = true;
      adaptations.interactiveElements = true;
      adaptations.visualAids = true;
    }

    // Dyslexia adaptations
    if (difficultyId.includes('dyslexia')) {
      adaptations.increasedFontSize = true;
      adaptations.dyslexicFont = true;
      adaptations.audioSupport = true;
      adaptations.coloredOverlays = true;
    }

    // Processing speed adaptations
    if (difficultyId.includes('processing')) {
      adaptations.extraTime = true;
      adaptations.simplifiedInstructions = true;
      adaptations.stepByStep = true;
    }

    return adaptations;
  }

  // Helper methods for analysis
  private calculateAverageTime(attempts: StudentAssessmentAttempt[]): number {
    const total = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    return attempts.length > 0 ? total / attempts.length : 0;
  }

  private calculateAccuracy(attempts: StudentAssessmentAttempt[]): number {
    const correct = attempts.filter(a => a.isCorrect).length;
    return attempts.length > 0 ? correct / attempts.length : 0;
  }

  private determineLearningPace(avgTime: number): string {
    if (avgTime < 20) return 'fast';
    if (avgTime < 60) return 'moderate';
    return 'slow';
  }

  private determineComprehensionLevel(accuracy: number): string {
    if (accuracy >= 0.8) return 'high';
    if (accuracy >= 0.6) return 'medium';
    return 'needs_support';
  }

  private analyzeRetentionPattern(attempts: StudentAssessmentAttempt[]): string {
    // Analyze if accuracy improves or declines over time
    if (attempts.length < 5) return 'insufficient_data';

    const firstHalf = attempts.slice(0, Math.floor(attempts.length / 2));
    const secondHalf = attempts.slice(Math.floor(attempts.length / 2));

    const firstAccuracy = this.calculateAccuracy(firstHalf);
    const secondAccuracy = this.calculateAccuracy(secondHalf);

    if (secondAccuracy > firstAccuracy + 0.1) return 'improving';
    if (secondAccuracy < firstAccuracy - 0.1) return 'declining';
    return 'stable';
  }

  private analyzeAttentionSpan(attempts: StudentAssessmentAttempt[]): string {
    const avgTime = this.calculateAverageTime(attempts);
    const timeVariance = this.calculateVariance(attempts.map(a => a.timeSpent || 0));

    if (avgTime < 15 && timeVariance < 100) return 'very_short';
    if (avgTime < 30 && timeVariance < 200) return 'short';
    if (avgTime < 90) return 'moderate';
    return 'long';
  }

  private analyzeEngagementPattern(engagementLevels: string[]): string {
    const highCount = engagementLevels.filter(e => e === 'high').length;
    const frustratedCount = engagementLevels.filter(e => e === 'frustrated').length;

    const ratio = engagementLevels.length > 0 ? highCount / engagementLevels.length : 0;

    if (frustratedCount > engagementLevels.length * 0.3) return 'frustrated';
    if (ratio > 0.7) return 'highly_engaged';
    if (ratio > 0.4) return 'moderately_engaged';
    return 'low_engagement';
  }

  private identifyMotivationTriggers(attempts: StudentAssessmentAttempt[]): string[] {
    const triggers: string[] = [];

    // Analyze what drives engagement
    const successfulWithHighEngagement = attempts.filter(
      a => a.isCorrect && a.engagementLevel === 'high'
    );

    if (successfulWithHighEngagement.length > attempts.length * 0.3) {
      triggers.push('success_and_achievement');
    }

    const quickResponses = attempts.filter(a => (a.timeSpent || 0) < 20);
    if (quickResponses.length > attempts.length * 0.5) {
      triggers.push('fast_paced_challenges');
    }

    return triggers;
  }

  private analyzePreferredDifficulty(attempts: StudentAssessmentAttempt[]): string {
    // Find difficulty level with best engagement
    const difficultyEngagement = new Map<string, number[]>();

    for (const attempt of attempts) {
      const difficulty = this.categorizeDifficulty(
        parseFloat(attempt.difficultyPresentedAt || '0')
      );
      
      if (!difficultyEngagement.has(difficulty)) {
        difficultyEngagement.set(difficulty, []);
      }
      
      const engagement = attempt.engagementLevel === 'high' ? 1 : 
                        attempt.engagementLevel === 'medium' ? 0.5 : 0;
      difficultyEngagement.get(difficulty)?.push(engagement);
    }

    let bestDifficulty = 'medium';
    let highestEngagement = 0;

    for (const [difficulty, engagements] of Array.from(difficultyEngagement.entries())) {
      const avg = engagements.reduce((a: number, b: number) => a + b, 0) / engagements.length;
      if (avg > highestEngagement) {
        highestEngagement = avg;
        bestDifficulty = difficulty;
      }
    }

    return bestDifficulty;
  }

  private identifyErrorPatterns(attempts: StudentAssessmentAttempt[]): string[] {
    const patterns: string[] = [];

    const incorrectAttempts = attempts.filter(a => !a.isCorrect);
    if (incorrectAttempts.length === 0) return patterns;

    // Check for rushing
    const rushedErrors = incorrectAttempts.filter(a => (a.timeSpent || 0) < 10);
    if (rushedErrors.length > incorrectAttempts.length * 0.5) {
      patterns.push('rushing_through_questions');
    }

    // Check for overthinking
    const overthinkers = incorrectAttempts.filter(a => (a.timeSpent || 0) > 120);
    if (overthinkers.length > incorrectAttempts.length * 0.3) {
      patterns.push('overthinking_responses');
    }

    // Check hint dependency
    const hintDependence = incorrectAttempts.filter(a => (a.hintsRequested || 0) > 2);
    if (hintDependence.length > incorrectAttempts.length * 0.4) {
      patterns.push('requires_significant_guidance');
    }

    return patterns;
  }

  private categorizeDifficulty(value: number): string {
    if (value < -0.5) return 'easy';
    if (value < 0.5) return 'medium';
    return 'hard';
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a: number, b: number) => a + b, 0) / values.length;
  }

  /**
   * Build strengths object from assessment
   */
  private buildStrengthsObject(assessment: AdaptiveAssessment, analysis: any): any {
    const strengths: any = {};

    // Add identified strengths with scores
    if (assessment.identifiedStrengths) {
      for (const strength of assessment.identifiedStrengths) {
        strengths[strength] = 0.8; // High proficiency
      }
    }

    // Add pattern-based strengths
    if (analysis.comprehensionLevel === 'high') {
      strengths['quick_comprehension'] = 0.85;
    }

    if (analysis.learningPace === 'fast') {
      strengths['fast_learner'] = 0.8;
    }

    return strengths;
  }

  /**
   * Build weaknesses object from assessment
   */
  private buildWeaknessesObject(assessment: AdaptiveAssessment, analysis: any): any {
    const weaknesses: any = {};

    // Add identified weaknesses with scores
    if (assessment.identifiedWeaknesses) {
      for (const weakness of assessment.identifiedWeaknesses) {
        weaknesses[weakness] = 0.3; // Needs improvement
      }
    }

    // Add pattern-based weaknesses
    if (analysis.attentionSpan === 'very_short') {
      weaknesses['sustained_attention'] = 0.25;
    }

    if (analysis.errorPatterns.includes('rushing_through_questions')) {
      weaknesses['time_management'] = 0.4;
    }

    return weaknesses;
  }

  /**
   * Estimate optimal study duration
   */
  private estimateOptimalDuration(analysis: any): number {
    if (analysis.attentionSpan === 'very_short') return 15;
    if (analysis.attentionSpan === 'short') return 25;
    if (analysis.attentionSpan === 'moderate') return 45;
    return 60; // long
  }

  /**
   * Suggest content types based on analysis
   */
  private suggestContentTypes(analysis: any): string[] {
    const contentTypes: string[] = [];

    if (analysis.learningPace === 'fast') {
      contentTypes.push('interactive');
      contentTypes.push('practice_problems');
    }

    if (analysis.comprehensionLevel === 'high') {
      contentTypes.push('text');
      contentTypes.push('advanced_topics');
    } else {
      contentTypes.push('video');
      contentTypes.push('visual_aids');
    }

    return contentTypes;
  }

  /**
   * Estimate motivation level from attempts
   */
  private estimateMotivationLevel(attempts: StudentAssessmentAttempt[]): string {
    const highEngagement = attempts.filter(a => a.engagementLevel === 'high').length;
    const ratio = attempts.length > 0 ? highEngagement / attempts.length : 0.5;

    return ratio.toFixed(2);
  }
}

export const studentProfileGenerator = new StudentProfileGenerator();
