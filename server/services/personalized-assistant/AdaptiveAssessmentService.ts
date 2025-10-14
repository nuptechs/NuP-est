import { storage } from '../../storage';
import type {
  InsertAdaptiveAssessment,
  InsertAssessmentQuestion,
  InsertStudentAssessmentAttempt,
  AdaptiveAssessment,
  AssessmentQuestion,
  StudentAssessmentAttempt,
} from '@shared/schema';

/**
 * Item Response Theory (IRT) calculations for adaptive assessment
 * Uses 3-parameter logistic model (3PL)
 */
class IRTCalculator {
  /**
   * Calculate probability of correct response using 3PL IRT model
   * P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))
   * 
   * @param ability - Student's ability level (theta)
   * @param difficulty - Item difficulty (b parameter)
   * @param discrimination - Item discrimination (a parameter)
   * @param guessing - Guessing parameter (c parameter)
   */
  probabilityOfCorrect(
    ability: number,
    difficulty: number,
    discrimination: number = 1.0,
    guessing: number = 0.0
  ): number {
    const exponent = -discrimination * (ability - difficulty);
    return guessing + (1 - guessing) / (1 + Math.exp(exponent));
  }

  /**
   * Estimate ability using Maximum Likelihood Estimation (MLE)
   * Simplified implementation - iterates to find theta that maximizes likelihood
   */
  estimateAbility(
    responses: Array<{
      isCorrect: boolean;
      difficulty: number;
      discrimination: number;
      guessing: number;
    }>
  ): { ability: number; confidence: number } {
    let theta = 0; // Start with average ability
    const maxIterations = 50;
    const tolerance = 0.001;

    for (let i = 0; i < maxIterations; i++) {
      let firstDerivative = 0;
      let secondDerivative = 0;

      for (const response of responses) {
        const p = this.probabilityOfCorrect(
          theta,
          response.difficulty,
          response.discrimination,
          response.guessing
        );

        const q = 1 - p;
        const w = (response.isCorrect ? 1 : 0) - p;

        firstDerivative += response.discrimination * w;
        secondDerivative -= response.discrimination * response.discrimination * p * q;
      }

      // Newton-Raphson update
      const delta = -firstDerivative / secondDerivative;
      theta += delta;

      if (Math.abs(delta) < tolerance) break;
    }

    // Calculate confidence using Fisher Information
    const information = responses.reduce((sum, response) => {
      const p = this.probabilityOfCorrect(
        theta,
        response.difficulty,
        response.discrimination,
        response.guessing
      );
      const q = 1 - p;
      return sum + response.discrimination * response.discrimination * p * q;
    }, 0);

    const standardError = information > 0 ? 1 / Math.sqrt(information) : 1;
    const confidence = Math.max(0, Math.min(1, 1 - standardError));

    return { ability: theta, confidence };
  }

  /**
   * Select next question based on current ability estimate
   * Chooses question with maximum information at current theta
   */
  selectNextQuestion(
    currentAbility: number,
    availableQuestions: AssessmentQuestion[]
  ): AssessmentQuestion | null {
    if (availableQuestions.length === 0) return null;

    let bestQuestion: AssessmentQuestion | null = null;
    let maxInformation = -1;

    for (const question of availableQuestions) {
      const difficulty = parseFloat(question.difficulty || '0');
      const discrimination = parseFloat(question.discrimination || '1');
      const guessing = parseFloat(question.guessing || '0');

      const p = this.probabilityOfCorrect(currentAbility, difficulty, discrimination, guessing);
      const q = 1 - p;
      const information = discrimination * discrimination * p * q;

      if (information > maxInformation) {
        maxInformation = information;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }
}

/**
 * Adaptive Assessment Service
 * Manages adaptive assessments using IRT for optimal question selection
 */
export class AdaptiveAssessmentService {
  private irtCalculator: IRTCalculator;

  constructor() {
    this.irtCalculator = new IRTCalculator();
  }

  /**
   * Start a new adaptive assessment
   */
  async startAssessment(data: {
    userId: string;
    profileId?: string;
    assistantId?: string;
    assessmentType: string;
    subjectArea?: string;
    initialDifficulty?: string;
  }): Promise<AdaptiveAssessment> {
    const assessmentData: InsertAdaptiveAssessment = {
      userId: data.userId,
      profileId: data.profileId,
      assistantId: data.assistantId,
      assessmentType: data.assessmentType,
      subjectArea: data.subjectArea,
      initialDifficulty: data.initialDifficulty || 'medium',
      adaptiveAlgorithm: 'irt',
      totalQuestions: 0,
      currentQuestion: 0,
      isComplete: false,
    };

    return await storage.createAdaptiveAssessment(assessmentData);
  }

  /**
   * Get next question for assessment
   * Uses IRT to select most informative question
   */
  async getNextQuestion(
    assessmentId: string,
    userId: string
  ): Promise<{ question: AssessmentQuestion | null; assessment: AdaptiveAssessment }> {
    const assessment = await storage.getAdaptiveAssessment(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (assessment.isComplete) {
      return { question: null, assessment };
    }

    // Get previous attempts to estimate current ability
    const attempts = await storage.getStudentAssessmentAttempts(userId, assessmentId);
    
    let currentAbility = 0; // Default to average ability
    let confidence = 0;

    if (attempts.length > 0) {
      const responses = attempts.map(attempt => ({
        isCorrect: attempt.isCorrect,
        difficulty: parseFloat(attempt.difficultyPresentedAt || '0'),
        discrimination: 1.0, // Could be stored in attempt
        guessing: 0.25, // Default for multiple choice
      }));

      const estimate = this.irtCalculator.estimateAbility(responses);
      currentAbility = estimate.ability;
      confidence = estimate.confidence;
    }

    // Get available questions for this subject area
    const allQuestions = await storage.getAssessmentQuestions();
    const subjectQuestions = assessment.subjectArea
      ? allQuestions.filter((q: AssessmentQuestion) => q.subjectArea === assessment.subjectArea)
      : allQuestions;

    // Filter out already answered questions
    const answeredQuestionIds = new Set(attempts.map((a: StudentAssessmentAttempt) => a.questionId));
    const availableQuestions = subjectQuestions.filter((q: AssessmentQuestion) => !answeredQuestionIds.has(q.id));

    // Select best question using IRT
    const nextQuestion = this.irtCalculator.selectNextQuestion(currentAbility, availableQuestions);

    // Update assessment progress
    const updatedAssessment = await storage.updateAdaptiveAssessment(assessmentId, {
      currentQuestion: attempts.length + 1,
      estimatedAbility: currentAbility.toString(),
      confidenceLevel: confidence.toString(),
    });

    return { question: nextQuestion, assessment: updatedAssessment };
  }

  /**
   * Submit answer to a question
   */
  async submitAnswer(data: {
    assessmentId: string;
    questionId: string;
    userId: string;
    userAnswer: string;
    timeSpent?: number;
    hintsRequested?: number;
    adaptationsUsed?: any;
  }): Promise<StudentAssessmentAttempt> {
    // Get question to check correctness
    const question = await storage.getAssessmentQuestion(data.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = this.checkAnswer(data.userAnswer, question.correctAnswer);

    // Get current ability estimate
    const assessment = await storage.getAdaptiveAssessment(data.assessmentId);
    const attempts = await storage.getStudentAssessmentAttempts(data.userId, data.assessmentId);

    // Calculate new ability estimate including this response
    const allResponses = [
      ...attempts.map((a: StudentAssessmentAttempt) => ({
        isCorrect: a.isCorrect,
        difficulty: parseFloat(a.difficultyPresentedAt || '0'),
        discrimination: 1.0,
        guessing: 0.25,
      })),
      {
        isCorrect,
        difficulty: parseFloat(question.difficulty || '0'),
        discrimination: parseFloat(question.discrimination || '1'),
        guessing: parseFloat(question.guessing || '0.25'),
      },
    ];

    const newEstimate = this.irtCalculator.estimateAbility(allResponses);

    // Determine engagement level based on time spent and hints
    const engagementLevel = this.assessEngagement(data.timeSpent, data.hintsRequested);

    // Create attempt record
    const attemptData: InsertStudentAssessmentAttempt = {
      assessmentId: data.assessmentId,
      questionId: data.questionId,
      userId: data.userId,
      userAnswer: data.userAnswer,
      isCorrect,
      timeSpent: data.timeSpent,
      hintsRequested: data.hintsRequested || 0,
      adaptationsUsed: data.adaptationsUsed,
      difficultyPresentedAt: question.difficulty,
      abilityEstimateAfter: newEstimate.ability.toString(),
      confidenceAfter: newEstimate.confidence.toString(),
      engagementLevel,
    };

    const attempt = await storage.createStudentAssessmentAttempt(attemptData);

    // Update assessment with new ability estimate
    await storage.updateAdaptiveAssessment(data.assessmentId, {
      estimatedAbility: newEstimate.ability.toString(),
      confidenceLevel: newEstimate.confidence.toString(),
      totalQuestions: attempts.length + 1,
    });

    return attempt;
  }

  /**
   * Complete assessment and generate final results
   */
  async completeAssessment(
    assessmentId: string,
    userId: string
  ): Promise<{
    assessment: AdaptiveAssessment;
    finalAbility: number;
    confidence: number;
    strengths: string[];
    weaknesses: string[];
  }> {
    const assessment = await storage.getAdaptiveAssessment(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const attempts = await storage.getStudentAssessmentAttempts(userId, assessmentId);

    // Analyze performance by topic/skill
    const topicPerformance = await this.analyzeTopicPerformance(attempts);
    const strengths = topicPerformance.filter(t => t.score >= 0.7).map(t => t.topic);
    const weaknesses = topicPerformance.filter(t => t.score < 0.5).map(t => t.topic);

    // Get final ability estimate
    const finalAbility = parseFloat(assessment.estimatedAbility || '0');
    const confidence = parseFloat(assessment.confidenceLevel || '0');

    // Detect patterns and generate discoveries
    const discoveries = await this.detectPatterns(attempts);

    // Update assessment as complete
    const completedAssessment = await storage.updateAdaptiveAssessment(assessmentId, {
      isComplete: true,
      completedAt: new Date(),
      identifiedStrengths: strengths,
      identifiedWeaknesses: weaknesses,
      discoveries,
    });

    return {
      assessment: completedAssessment,
      finalAbility,
      confidence,
      strengths,
      weaknesses,
    };
  }

  /**
   * Check if answer is correct
   */
  private checkAnswer(userAnswer: string, correctAnswer: string): boolean {
    // Normalize answers for comparison
    const normalize = (str: string) => str.trim().toLowerCase();
    return normalize(userAnswer) === normalize(correctAnswer);
  }

  /**
   * Assess engagement level based on behavior
   */
  private assessEngagement(timeSpent?: number, hintsRequested?: number): string {
    if (!timeSpent) return 'medium';

    if (hintsRequested && hintsRequested > 2) return 'frustrated';
    if (timeSpent < 10) return 'low'; // Too fast, possibly guessing
    if (timeSpent > 300) return 'frustrated'; // Too slow, possibly stuck
    if (timeSpent >= 30 && timeSpent <= 120) return 'high'; // Optimal time

    return 'medium';
  }

  /**
   * Analyze performance by topic
   */
  private async analyzeTopicPerformance(
    attempts: StudentAssessmentAttempt[]
  ): Promise<Array<{ topic: string; score: number; count: number }>> {
    const topicStats = new Map<string, { correct: number; total: number }>();

    for (const attempt of attempts) {
      const question = await storage.getAssessmentQuestion(attempt.questionId);
      if (!question || !question.topic) continue;

      const topic = question.topic;
      const stats = topicStats.get(topic) || { correct: 0, total: 0 };
      
      stats.total++;
      if (attempt.isCorrect) stats.correct++;
      
      topicStats.set(topic, stats);
    }

    return Array.from(topicStats.entries()).map(([topic, stats]: [string, { correct: number; total: number }]) => ({
      topic,
      score: stats.total > 0 ? stats.correct / stats.total : 0,
      count: stats.total,
    }));
  }

  /**
   * Detect behavioral patterns
   */
  private async detectPatterns(attempts: StudentAssessmentAttempt[]): Promise<any> {
    const patterns: any = {
      timeManagement: 'average',
      hintDependency: 'low',
      consistencyLevel: 'stable',
      difficultyPreference: 'balanced',
    };

    if (attempts.length < 3) return patterns;

    // Analyze time patterns
    const avgTime = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / attempts.length;
    if (avgTime < 20) patterns.timeManagement = 'rushed';
    else if (avgTime > 120) patterns.timeManagement = 'methodical';

    // Analyze hint usage
    const avgHints = attempts.reduce((sum, a) => sum + (a.hintsRequested || 0), 0) / attempts.length;
    if (avgHints > 1.5) patterns.hintDependency = 'high';
    else if (avgHints > 0.5) patterns.hintDependency = 'medium';

    // Analyze consistency
    const correctStreak = this.findLongestStreak(attempts.map(a => a.isCorrect));
    if (correctStreak.longest > 5) patterns.consistencyLevel = 'very_stable';
    else if (correctStreak.longest < 2) patterns.consistencyLevel = 'inconsistent';

    return patterns;
  }

  /**
   * Find longest streak in boolean array
   */
  private findLongestStreak(values: boolean[]): { longest: number; current: number } {
    let longest = 0;
    let current = 0;

    for (const value of values) {
      if (value) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }

    return { longest, current };
  }
}

export const adaptiveAssessmentService = new AdaptiveAssessmentService();
