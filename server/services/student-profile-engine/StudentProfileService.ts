/**
 * StudentProfileService - Orquestrador principal do Student Profile Engine
 * 
 * Responsabilidades:
 * - Coordenar ProfileAnalyzer e ConversationTracker
 * - Manter perfil enriquecido sempre atualizado
 * - Fornecer interface única para acesso ao perfil
 * - Processar dados em background (assíncrono)
 * 
 * Design: Serviço encapsulado e reutilizável
 */

import { db } from '../../db.js';
import { 
  studentProfilesEnriched, 
  users,
  type InsertStudentProfileEnriched,
  type StudentProfileEnriched 
} from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { ProfileAnalyzer } from './ProfileAnalyzer.js';
import { ConversationTracker } from './ConversationTracker.js';
import type { EnrichedProfile } from './types.js';

export class StudentProfileService {
  private profileAnalyzer: ProfileAnalyzer;
  private conversationTracker: ConversationTracker;

  constructor(openaiApiKey: string) {
    this.profileAnalyzer = new ProfileAnalyzer();
    this.conversationTracker = new ConversationTracker(openaiApiKey);
  }

  /**
   * Busca perfil enriquecido do aluno (leitura rápida)
   * Esta é a função principal chamada pelo Professor IA
   */
  async getEnrichedProfile(userId: string): Promise<EnrichedProfile | null> {
    try {
      // Buscar perfil enriquecido do banco (snapshot já processado)
      const enrichedProfile = await db.query.studentProfilesEnriched.findFirst({
        where: eq(studentProfilesEnriched.userId, userId),
      });

      if (!enrichedProfile) {
        // Se não existe, criar um novo
        return await this.createInitialProfile(userId);
      }

      // Buscar conversas recentes
      const recentConversations = await this.conversationTracker.getRecentConversations(userId, 5);

      // Montar perfil enriquecido
      return {
        userId: enrichedProfile.userId,
        name: enrichedProfile.name,
        age: enrichedProfile.age || undefined,
        studyObjective: enrichedProfile.studyObjective || undefined,
        studyProfile: enrichedProfile.studyProfile || undefined,
        learningStyle: enrichedProfile.learningStyle || undefined,
        learningDifficulties: enrichedProfile.learningDifficulties || [],
        
        metrics: {
          overallAccuracy: Number(enrichedProfile.overallAccuracy),
          totalStudyHours: Number(enrichedProfile.totalStudyHours),
          totalQuestions: enrichedProfile.totalQuestions || 0,
          correctAnswers: enrichedProfile.correctAnswers || 0,
          weeklyProgress: Number(enrichedProfile.weeklyProgress),
          monthlyProgress: Number(enrichedProfile.monthlyProgress),
          improvementTrend: (enrichedProfile.improvementTrend as any) || 'stable',
          strongSubjects: enrichedProfile.strongSubjects || [],
          weakSubjects: enrichedProfile.weakSubjects || [],
          currentFocus: enrichedProfile.currentFocus || [],
        },
        
        behavior: {
          studyStreak: enrichedProfile.studyStreak || 0,
          avgSessionDuration: enrichedProfile.avgSessionDuration || 0,
          preferredStudyTime: enrichedProfile.preferredStudyTime || undefined,
          engagementLevel: (enrichedProfile.engagementLevel as any) || 'medium',
        },
        
        recentConversations,
        lastConversationDate: enrichedProfile.lastConversationDate || undefined,
        totalConversations: enrichedProfile.totalConversations || 0,
        
        recommendedActions: enrichedProfile.recommendedActions || [],
        nextTopicsToStudy: enrichedProfile.nextTopicsToStudy || [],
        motivationalMessage: enrichedProfile.motivationalMessage || undefined,
      };
    } catch (error) {
      console.error('[StudentProfileService] Erro ao buscar perfil:', error);
      return null;
    }
  }

  /**
   * Busca todos os perfis enriquecidos existentes
   */
  async getAllEnrichedProfiles(): Promise<StudentProfileEnriched[]> {
    try {
      const profiles = await db.select().from(studentProfilesEnriched);
      return profiles;
    } catch (error) {
      console.error('[StudentProfileService] Erro ao buscar todos os perfis:', error);
      return [];
    }
  }

  /**
   * Atualiza perfil completo (processamento em background)
   * Deve ser chamado após sessões de estudo, conversas, etc
   */
  async updateProfile(userId: string): Promise<void> {
    try {
      console.log(`[StudentProfileService] Atualizando perfil: ${userId}`);

      // Buscar dados básicos do usuário
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        console.warn(`[StudentProfileService] Usuário não encontrado: ${userId}`);
        return;
      }

      // Processar análises em paralelo
      const [analysis, recommendations, recentConversations] = await Promise.all([
        this.profileAnalyzer.analyzeProfile(userId),
        this.profileAnalyzer.generateRecommendations(userId),
        this.conversationTracker.getRecentConversations(userId, 10),
      ]);

      // Preparar dados para atualização
      const profileData: Partial<InsertStudentProfileEnriched> = {
        userId,
        name: user.firstName || 'Aluno',
        age: user.age || undefined,
        studyObjective: user.studyObjective || undefined,
        studyProfile: user.studyProfile || undefined,
        learningStyle: user.learningStyle || undefined,
        learningDifficulties: user.customDifficulties ? [user.customDifficulties] : [],
        
        // Métricas processadas
        totalStudyHours: analysis.metrics.totalStudyHours.toString(),
        totalQuestions: analysis.metrics.totalQuestions || 0,
        correctAnswers: analysis.metrics.correctAnswers || 0,
        overallAccuracy: analysis.metrics.overallAccuracy.toString(),
        weeklyProgress: analysis.metrics.weeklyProgress.toString(),
        monthlyProgress: analysis.metrics.monthlyProgress.toString(),
        improvementTrend: analysis.metrics.improvementTrend,
        
        strongSubjects: analysis.metrics.strongSubjects,
        weakSubjects: analysis.metrics.weakSubjects,
        currentFocus: analysis.metrics.currentFocus,
        
        // Comportamento
        studyStreak: analysis.behavior.studyStreak,
        avgSessionDuration: analysis.behavior.avgSessionDuration,
        preferredStudyTime: analysis.behavior.preferredStudyTime,
        engagementLevel: analysis.behavior.engagementLevel,
        
        // Conversas
        recentConversationsSummary: JSON.stringify(recentConversations.slice(0, 5)),
        lastConversationDate: recentConversations[0] ? new Date() : undefined,
        totalConversations: recentConversations.length,
        
        // Recomendações
        recommendedActions: recommendations.recommendedActions,
        nextTopicsToStudy: recommendations.nextTopicsToStudy,
        motivationalMessage: recommendations.motivationalMessage,
      };

      // Upsert no banco (criar ou atualizar)
      await db
        .insert(studentProfilesEnriched)
        .values(profileData as any)
        .onConflictDoUpdate({
          target: studentProfilesEnriched.userId,
          set: {
            ...profileData,
            updatedAt: new Date(),
          },
        });

      console.log(`[StudentProfileService] Perfil atualizado com sucesso: ${userId}`);
    } catch (error) {
      console.error('[StudentProfileService] Erro ao atualizar perfil:', error);
    }
  }

  /**
   * Registra uma conversa e atualiza o perfil
   */
  async trackConversation(
    userId: string,
    sessionId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
    startedAt: Date,
    endedAt?: Date
  ): Promise<void> {
    try {
      // Salvar conversa
      await this.conversationTracker.trackConversation(userId, sessionId, messages, startedAt, endedAt);

      // Atualizar perfil em background (não bloqueia)
      this.updateProfile(userId).catch(err => {
        console.error('[StudentProfileService] Erro ao atualizar perfil após conversa:', err);
      });

      console.log(`[StudentProfileService] Conversa rastreada e perfil atualizado: ${userId}`);
    } catch (error) {
      console.error('[StudentProfileService] Erro ao rastrear conversa:', error);
    }
  }

  /**
   * Cria perfil inicial para novo usuário
   */
  private async createInitialProfile(userId: string): Promise<EnrichedProfile | null> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) return null;

      // Criar perfil básico
      const basicProfile: InsertStudentProfileEnriched = {
        userId,
        name: user.firstName || 'Aluno',
        age: user.age || undefined,
        studyObjective: user.studyObjective || undefined,
        studyProfile: user.studyProfile || undefined,
        learningStyle: user.learningStyle || undefined,
        learningDifficulties: user.customDifficulties ? [user.customDifficulties] : [],
        totalStudyHours: '0',
        totalQuestions: 0,
        correctAnswers: 0,
        overallAccuracy: '0',
        weeklyProgress: '0',
        monthlyProgress: '0',
        improvementTrend: 'stable',
        strongSubjects: [],
        weakSubjects: [],
        currentFocus: [],
        studyStreak: 0,
        avgSessionDuration: 0,
        engagementLevel: 'medium',
        recentConversationsSummary: JSON.stringify([]),
        totalConversations: 0,
        recommendedActions: ['Complete o onboarding para começar'],
        nextTopicsToStudy: [],
      };

      await db.insert(studentProfilesEnriched).values(basicProfile);

      // Processar perfil em background
      this.updateProfile(userId).catch(err => {
        console.error('[StudentProfileService] Erro ao processar perfil inicial:', err);
      });

      return {
        userId,
        name: basicProfile.name,
        age: basicProfile.age || undefined,
        studyObjective: basicProfile.studyObjective || undefined,
        studyProfile: basicProfile.studyProfile || undefined,
        learningStyle: basicProfile.learningStyle || undefined,
        learningDifficulties: basicProfile.learningDifficulties || [],
        metrics: {
          overallAccuracy: 0,
          totalStudyHours: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          weeklyProgress: 0,
          monthlyProgress: 0,
          improvementTrend: 'stable',
          strongSubjects: [],
          weakSubjects: [],
          currentFocus: [],
        },
        behavior: {
          studyStreak: 0,
          avgSessionDuration: 0,
          preferredStudyTime: undefined,
          engagementLevel: 'medium',
        },
        recentConversations: [],
        totalConversations: 0,
        recommendedActions: basicProfile.recommendedActions || [],
        nextTopicsToStudy: [],
      };
    } catch (error) {
      console.error('[StudentProfileService] Erro ao criar perfil inicial:', error);
      return null;
    }
  }
}
