/**
 * Function calling: Buscar contexto do aluno
 * Permite que o Professor IA acesse perfil, matéria atual, nível, etc
 */

import type { AssistantFunction, StudentContext } from '../types.js';
import { db } from '../../../db.js';
import { users, subjects, subjectKnowledge } from '../../../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

/**
 * Função para buscar contexto completo do aluno
 */
export const getStudentContextFunction: AssistantFunction = {
  name: 'get_student_context',
  description: 'Busca informações detalhadas do aluno incluindo perfil, dificuldades, matéria atual, nível de conhecimento e preferências de aprendizado. Use esta função quando precisar personalizar a explicação ou adaptar seu tom.',
  parameters: {
    type: 'object',
    properties: {
      include_subject_details: {
        type: 'boolean',
        description: 'Se deve incluir detalhes da matéria sendo estudada (tópicos fracos, fortes, nível)',
      },
    },
    required: [],
  },
  handler: async (args, context) => {
    try {
      const { userId } = context;

      // Buscar usuário
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return { error: 'Aluno não encontrado' };
      }

      // Construir contexto básico
      const studentContext: Partial<StudentContext> = {
        userId: user.id,
        name: user.firstName || 'Aluno',
        age: user.age || undefined,
        studyProfile: user.studyProfile as any || 'average',
        learningStyle: user.learningStyle as any || 'mixed',
        learningDifficulties: [],
        studyObjective: user.studyObjective || undefined,
        dailyStudyHours: user.dailyStudyHours ? Number(user.dailyStudyHours) : undefined,
        needsMotivation: user.needsMotivation || false,
        prefersExamples: user.prefersExamples !== false,
        preferredExplanationStyle: user.preferredExplanationStyle as any || 'balanced',
      };

      // Buscar dificuldades de aprendizado
      // TODO: Implementar quando tiver tabela de dificuldades
      if (user.customDifficulties) {
        studentContext.learningDifficulties = [user.customDifficulties];
      }

      // Se solicitado, buscar detalhes da matéria
      if (args.include_subject_details) {
        // Buscar matéria mais recente do aluno
        const recentSubject = await db.query.subjects.findFirst({
          where: eq(subjects.userId, userId),
          orderBy: [desc(subjects.updatedAt)],
        });

        if (recentSubject) {
          // Buscar conhecimento dessa matéria
          const knowledge = await db.query.subjectKnowledge.findFirst({
            where: eq(subjectKnowledge.subjectName, recentSubject.name),
          });

          studentContext.currentSubject = {
            name: recentSubject.name,
            category: recentSubject.category as any,
            level: knowledge?.currentLevel as any || 'intermediate',
            weakTopics: knowledge?.weakTopics || [],
            strongTopics: knowledge?.strongTopics || [],
          };
        }
      }

      return studentContext;

    } catch (error) {
      console.error('[getStudentContext] Erro:', error);
      return { error: 'Erro ao buscar contexto do aluno' };
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
