/**
 * Function calling: Buscar contexto do aluno
 * Permite que o Professor IA acesse perfil enriquecido, métricas, conversas, etc
 * 
 * IMPORTANTE: Usa Student Profile Engine para dados sempre atualizados e processados
 */

import type { AssistantFunction, StudentContext } from '../types.js';
import { StudentProfileService } from '../../student-profile-engine/index.js';
import { db } from '../../../db.js';
import { subjectKnowledge } from '../../../../shared/schema.js';
import { eq } from 'drizzle-orm';

// Inicializar Student Profile Service (singleton)
const profileService = new StudentProfileService(process.env.OPENAI_API_KEY || '');

/**
 * Função para buscar contexto completo e enriquecido do aluno
 * Agora usa Student Profile Engine para dados processados e sempre atualizados
 */
export const getStudentContextFunction: AssistantFunction = {
  name: 'get_student_context',
  description: 'Busca perfil completo do aluno incluindo métricas de performance, evolução temporal, dificuldades identificadas, histórico de conversas, padrões de comportamento e recomendações personalizadas. Os dados são processados em background e sempre atualizados. Use esta função quando precisar personalizar a explicação, adaptar seu tom ou entender o progresso do aluno.',
  parameters: {
    type: 'object',
    properties: {
      include_metrics: {
        type: 'boolean',
        description: 'Se deve incluir métricas detalhadas (precisão, horas de estudo, evolução)',
        default: true,
      },
      include_conversations: {
        type: 'boolean',
        description: 'Se deve incluir resumo das últimas conversas',
        default: true,
      },
    },
    required: [],
  },
  handler: async (args, context) => {
    try {
      const { userId } = context;

      // Buscar perfil enriquecido (dados já processados, leitura rápida)
      const enrichedProfile = await profileService.getEnrichedProfile(userId);

      if (!enrichedProfile) {
        return { error: 'Perfil do aluno não disponível' };
      }

      // Montar resposta completa
      const response: any = {
        userId: enrichedProfile.userId,
        name: enrichedProfile.name,
        age: enrichedProfile.age,
        studyObjective: enrichedProfile.studyObjective,
        studyProfile: enrichedProfile.studyProfile,
        learningStyle: enrichedProfile.learningStyle,
        learningDifficulties: enrichedProfile.learningDifficulties,
        
        // Padrões de comportamento
        studyStreak: enrichedProfile.behavior.studyStreak,
        preferredStudyTime: enrichedProfile.behavior.preferredStudyTime,
        engagementLevel: enrichedProfile.behavior.engagementLevel,
        avgSessionDuration: enrichedProfile.behavior.avgSessionDuration,
        
        // Recomendações atuais
        recommendedActions: enrichedProfile.recommendedActions,
        nextTopicsToStudy: enrichedProfile.nextTopicsToStudy,
        motivationalMessage: enrichedProfile.motivationalMessage,
      };

      // Incluir métricas detalhadas se solicitado
      if (args.include_metrics !== false) {
        response.metrics = {
          overallAccuracy: enrichedProfile.metrics.overallAccuracy,
          totalStudyHours: enrichedProfile.metrics.totalStudyHours,
          totalQuestions: enrichedProfile.metrics.totalQuestions,
          correctAnswers: enrichedProfile.metrics.correctAnswers,
          weeklyProgress: enrichedProfile.metrics.weeklyProgress,
          monthlyProgress: enrichedProfile.metrics.monthlyProgress,
          improvementTrend: enrichedProfile.metrics.improvementTrend,
          strongSubjects: enrichedProfile.metrics.strongSubjects,
          weakSubjects: enrichedProfile.metrics.weakSubjects,
          currentFocus: enrichedProfile.metrics.currentFocus,
        };
      }

      // Incluir conversas recentes se solicitado
      if (args.include_conversations !== false && enrichedProfile.recentConversations.length > 0) {
        response.recentConversations = enrichedProfile.recentConversations.map(c => ({
          summary: c.summary,
          subject: c.subject,
          topics: c.topics,
          conceptsExplained: c.conceptsExplained,
          difficultConcepts: c.difficultConcepts,
          masteredConcepts: c.masteredConcepts,
        }));
      }

      return response;

    } catch (error) {
      console.error('[getStudentContext] Erro:', error);
      return { error: 'Erro ao buscar perfil do aluno' };
    }
  },
};

/**
 * Função para buscar conhecimento de uma matéria específica
 */
export const getSubjectKnowledgeFunction: AssistantFunction = {
  name: 'get_subject_knowledge',
  description: 'Busca o nível de conhecimento e desempenho do aluno em uma matéria específica, incluindo tópicos fracos e fortes.',
  parameters: {
    type: 'object',
    properties: {
      subject_name: {
        type: 'string',
        description: 'Nome da matéria (ex: "Matemática", "Física", "História")',
      },
    },
    required: ['subject_name'],
  },
  handler: async (args, context) => {
    try {
      const { userId } = context;
      const { subject_name } = args;

      // Buscar conhecimento da matéria
      const knowledge = await db.query.subjectKnowledge.findFirst({
        where: eq(subjectKnowledge.userId, userId),
        // TODO: Adicionar filtro por subjectName quando resolver schema
      });

      if (!knowledge) {
        return {
          subject: subject_name,
          level: 'unknown',
          message: 'Ainda não temos avaliação dessa matéria',
        };
      }

      return {
        subject: subject_name,
        currentLevel: knowledge.currentLevel,
        currentScore: Number(knowledge.currentScore) || 0,
        totalQuestions: knowledge.totalQuestions || 0,
        correctAnswers: knowledge.correctAnswers || 0,
        weakTopics: knowledge.weakTopics || [],
        strongTopics: knowledge.strongTopics || [],
        studyHours: Number(knowledge.studyHours) || 0,
        recommendedActions: knowledge.recommendedActions,
      };

    } catch (error) {
      console.error('[getSubjectKnowledge] Erro:', error);
      return { error: 'Erro ao buscar conhecimento da matéria' };
    }
  },
};
