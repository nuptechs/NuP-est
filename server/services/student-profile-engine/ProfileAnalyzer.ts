/**
 * ProfileAnalyzer - Módulo encapsulado para processar métricas e evolução do aluno
 * 
 * Responsabilidades:
 * - Calcular métricas agregadas (precisão, horas de estudo, etc)
 * - Detectar tendências de melhoria
 * - Identificar matérias fortes e fracas
 * - Gerar padrões comportamentais
 */

import { db } from '../../db.js';
import { users, subjectKnowledge, learningHistory, questionAttempts, studySessions } from '../../../shared/schema.js';
import { eq, desc, and, gte } from 'drizzle-orm';
import type { ProfileAnalysis, BehaviorPatterns } from './types.js';

export class ProfileAnalyzer {
  /**
   * Analisa perfil completo do aluno
   */
  async analyzeProfile(userId: string): Promise<{
    metrics: ProfileAnalysis;
    behavior: BehaviorPatterns;
  }> {
    const [metrics, behavior] = await Promise.all([
      this.calculateMetrics(userId),
      this.analyzeBehavior(userId),
    ]);

    return { metrics, behavior };
  }

  /**
   * Calcula métricas agregadas do aluno
   */
  private async calculateMetrics(userId: string): Promise<ProfileAnalysis> {
    // Buscar todas as questões do aluno
    const attempts = await db.query.questionAttempts.findMany({
      where: eq(questionAttempts.userId, userId),
    });

    const totalQuestions = attempts.length;
    const correctAnswers = attempts.filter(a => a.isCorrect).length;
    const overallAccuracy = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100) 
      : 0;

    // Buscar sessões de estudo
    const sessions = await db.query.studySessions.findMany({
      where: eq(studySessions.userId, userId),
    });

    const totalStudyHours = sessions.reduce((sum, s) => {
      return sum + (s.duration ? Number(s.duration) / 60 : 0);
    }, 0);

    // Calcular progresso semanal e mensal
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyAttempts = attempts.filter(a => a.attemptedAt && new Date(a.attemptedAt) >= weekAgo);
    const monthlyAttempts = attempts.filter(a => a.attemptedAt && new Date(a.attemptedAt) >= monthAgo);

    const weeklyAccuracy = weeklyAttempts.length > 0
      ? (weeklyAttempts.filter(a => a.isCorrect).length / weeklyAttempts.length) * 100
      : 0;

    const monthlyAccuracy = monthlyAttempts.length > 0
      ? (monthlyAttempts.filter(a => a.isCorrect).length / monthlyAttempts.length) * 100
      : 0;

    const weeklyProgress = Math.round(weeklyAccuracy - overallAccuracy);
    const monthlyProgress = Math.round(monthlyAccuracy - overallAccuracy);

    // Determinar tendência
    let improvementTrend: 'ascending' | 'stable' | 'declining' = 'stable';
    if (weeklyProgress > 5) improvementTrend = 'ascending';
    else if (weeklyProgress < -5) improvementTrend = 'declining';

    // Identificar matérias fortes e fracas
    const knowledge = await db.query.subjectKnowledge.findMany({
      where: eq(subjectKnowledge.userId, userId),
    });

    const strongSubjects = knowledge
      .filter(k => Number(k.currentScore) >= 70)
      .map(k => k.subjectName)
      .slice(0, 5);

    const weakSubjects = knowledge
      .filter(k => Number(k.currentScore) < 50)
      .map(k => k.subjectName)
      .slice(0, 5);

    const currentFocus = knowledge
      .filter(k => {
        if (!k.updatedAt) return false;
        const updated = new Date(k.updatedAt);
        return updated >= weekAgo;
      })
      .map(k => k.subjectName)
      .slice(0, 3);

    return {
      overallAccuracy,
      totalStudyHours: Math.round(totalStudyHours * 100) / 100,
      totalQuestions,
      correctAnswers,
      weeklyProgress,
      monthlyProgress,
      improvementTrend,
      strongSubjects,
      weakSubjects,
      currentFocus,
    };
  }

  /**
   * Analisa padrões comportamentais do aluno
   */
  private async analyzeBehavior(userId: string): Promise<BehaviorPatterns> {
    // Buscar sessões de estudo
    const sessions = await db.query.studySessions.findMany({
      where: eq(studySessions.userId, userId),
      orderBy: [desc(studySessions.startedAt)],
      limit: 30,
    });

    // Calcular study streak (dias consecutivos)
    let studyStreak = 0;
    if (sessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sessionDates = sessions
        .filter(s => s.startedAt)
        .map(s => {
          const date = new Date(s.startedAt!);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        });

      const uniqueDates = Array.from(new Set(sessionDates)).sort((a, b) => b - a);
      
      let currentDate = today.getTime();
      for (const sessionDate of uniqueDates) {
        if (sessionDate === currentDate || sessionDate === currentDate - 24 * 60 * 60 * 1000) {
          studyStreak++;
          currentDate = sessionDate - 24 * 60 * 60 * 1000;
        } else {
          break;
        }
      }
    }

    // Calcular duração média de sessão
    const avgSessionDuration = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length)
      : 0;

    // Detectar horário preferido de estudo
    const hourCounts: Record<string, number> = {};
    sessions.forEach(s => {
      if (!s.startedAt) return;
      const hour = new Date(s.startedAt).getHours();
      let period = 'morning';
      if (hour >= 12 && hour < 18) period = 'afternoon';
      else if (hour >= 18) period = 'night';
      
      hourCounts[period] = (hourCounts[period] || 0) + 1;
    });

    const preferredStudyTime = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    // Calcular nível de engajamento
    const recentSessions = sessions.filter(s => {
      if (!s.startedAt) return false;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(s.startedAt) >= weekAgo;
    });

    let engagementLevel: 'high' | 'medium' | 'low' = 'low';
    if (recentSessions.length >= 5) engagementLevel = 'high';
    else if (recentSessions.length >= 2) engagementLevel = 'medium';

    return {
      studyStreak,
      avgSessionDuration,
      preferredStudyTime,
      engagementLevel,
    };
  }

  /**
   * Gera recomendações baseadas na análise
   */
  async generateRecommendations(userId: string): Promise<{
    recommendedActions: string[];
    nextTopicsToStudy: string[];
    motivationalMessage: string;
  }> {
    const { metrics, behavior } = await this.analyzeProfile(userId);

    const recommendedActions: string[] = [];
    const nextTopicsToStudy: string[] = [];

    // Recomendações baseadas em precisão
    if (metrics.overallAccuracy < 50) {
      recommendedActions.push('Revisar conceitos básicos antes de avançar');
      recommendedActions.push('Fazer questões mais fáceis para consolidar base');
    } else if (metrics.overallAccuracy >= 80) {
      recommendedActions.push('Pronto para avançar para tópicos mais complexos');
      recommendedActions.push('Considere questões de nível difícil');
    }

    // Recomendações baseadas em tendência
    if (metrics.improvementTrend === 'declining') {
      recommendedActions.push('Revise os últimos tópicos estudados');
      recommendedActions.push('Considere fazer uma pausa para assimilação');
    }

    // Recomendações baseadas em engajamento
    if (behavior.engagementLevel === 'low') {
      recommendedActions.push('Tente estabelecer uma rotina de estudos diária');
      recommendedActions.push('Comece com sessões curtas de 20-30 minutos');
    }

    // Próximos tópicos
    if (metrics.weakSubjects.length > 0) {
      nextTopicsToStudy.push(...metrics.weakSubjects.slice(0, 3));
    } else if (metrics.currentFocus.length > 0) {
      nextTopicsToStudy.push(...metrics.currentFocus);
    }

    // Mensagem motivacional
    let motivationalMessage = 'Continue firme nos estudos!';
    if (behavior.studyStreak >= 7) {
      motivationalMessage = `Parabéns! Você está há ${behavior.studyStreak} dias consecutivos estudando! 🔥`;
    } else if (metrics.weeklyProgress > 10) {
      motivationalMessage = `Excelente progresso esta semana (+${metrics.weeklyProgress}%)! Continue assim! 🚀`;
    } else if (metrics.improvementTrend === 'ascending') {
      motivationalMessage = 'Você está melhorando consistentemente. Ótimo trabalho! 📈';
    }

    return {
      recommendedActions,
      nextTopicsToStudy,
      motivationalMessage,
    };
  }
}
