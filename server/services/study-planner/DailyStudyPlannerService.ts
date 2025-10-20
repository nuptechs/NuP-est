import { eq, and, desc, sql } from 'drizzle-orm';
import type { IStorage } from '../../storage';
import { db } from '../../db';
import { 
  users, 
  subjects, 
  materials, 
  learningHistory, 
  subjectKnowledge,
  studySessions 
} from '@shared/schema';

interface StudyTask {
  id: string;
  type: 'material' | 'practice' | 'review' | 'assessment';
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  topicId?: string;
  materialId?: string;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  difficulty?: string;
}

interface DailyPlan {
  date: string;
  userId: string;
  totalMinutes: number;
  availableMinutes: number;
  tasks: StudyTask[];
  motivationalMessage: string;
  focusAreas: string[];
  completionRate?: number;
}

export class DailyStudyPlannerService {
  constructor(private storage: IStorage) {}

  async generateDailyPlan(userId: string): Promise<DailyPlan> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const availableMinutes = this.calculateAvailableMinutes(user);
    const userSubjects = await this.getUserSubjects(userId);
    const weakAreas = await this.identifyWeakAreas(userId);
    const recentActivity = await this.getRecentActivity(userId);
    
    const tasks = await this.generateTasks(
      userId,
      user,
      userSubjects,
      weakAreas,
      recentActivity,
      availableMinutes
    );

    const focusAreas = this.determineFocusAreas(tasks, weakAreas);
    const motivationalMessage = this.generateMotivationalMessage(user, tasks);

    return {
      date: new Date().toISOString().split('T')[0],
      userId,
      totalMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
      availableMinutes,
      tasks,
      motivationalMessage,
      focusAreas,
      completionRate: 0
    };
  }

  private calculateAvailableMinutes(user: any): number {
    const dailyHours = user.dailyStudyHours ? Number(user.dailyStudyHours) : 2;
    return dailyHours * 60;
  }

  private async getUserSubjects(userId: string) {
    return await db
      .select()
      .from(subjects)
      .where(eq(subjects.userId, userId))
      .orderBy(desc(subjects.createdAt));
  }

  private async identifyWeakAreas(userId: string) {
    const knowledge = await db
      .select()
      .from(subjectKnowledge)
      .where(eq(subjectKnowledge.userId, userId));

    return knowledge
      .filter((k: any) => k.weakTopics && k.weakTopics.length > 0)
      .map((k: any) => ({
        subjectName: k.subjectName,
        weakTopics: k.weakTopics,
        currentScore: k.currentScore ? Number(k.currentScore) : 0
      }));
  }

  private async getRecentActivity(userId: string) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    return await db
      .select()
      .from(learningHistory)
      .where(
        and(
          eq(learningHistory.userId, userId),
          sql`${learningHistory.createdAt} >= ${twoDaysAgo}`
        )
      )
      .orderBy(desc(learningHistory.createdAt))
      .limit(20);
  }

  private async generateTasks(
    userId: string,
    user: any,
    userSubjects: any[],
    weakAreas: any[],
    recentActivity: any[],
    availableMinutes: number
  ): Promise<StudyTask[]> {
    const tasks: StudyTask[] = [];
    let remainingMinutes = availableMinutes;

    if (userSubjects.length === 0) {
      return [{
        id: 'setup-subjects',
        type: 'material',
        title: 'Configure suas matérias de estudo',
        description: 'Adicione as matérias que você está estudando para receber um plano personalizado',
        subjectId: '',
        subjectName: 'Configuração Inicial',
        estimatedMinutes: 10,
        priority: 'high',
        reason: 'Precisamos saber o que você está estudando para criar seu plano'
      }];
    }

    const subjectsToStudy = this.prioritizeSubjects(userSubjects, weakAreas, recentActivity);

    for (const subject of subjectsToStudy.slice(0, 3)) {
      if (remainingMinutes <= 0) break;

      const subjectMaterials = await db
        .select()
        .from(materials)
        .where(eq(materials.subjectId, subject.id))
        .limit(5);

      const weakArea = weakAreas.find(w => w.subjectName === subject.name);
      const hasWeakTopics = weakArea && weakArea.weakTopics.length > 0;

      if (hasWeakTopics && remainingMinutes >= 30) {
        tasks.push({
          id: `practice-${subject.id}`,
          type: 'practice',
          title: `Praticar ${subject.name}`,
          description: `Foco em: ${weakArea.weakTopics.slice(0, 2).join(', ')}`,
          subjectId: subject.id,
          subjectName: subject.name,
          estimatedMinutes: 30,
          priority: 'high',
          reason: 'Você teve dificuldade nestes tópicos recentemente',
          difficulty: 'medium'
        });
        remainingMinutes -= 30;
      }

      if (subjectMaterials.length > 0 && remainingMinutes >= 25) {
        const material = subjectMaterials[0];
        tasks.push({
          id: `material-${material.id}`,
          type: 'material',
          title: `Estudar: ${material.title}`,
          description: material.description || `Material de ${subject.name}`,
          subjectId: subject.id,
          subjectName: subject.name,
          materialId: material.id,
          topicId: material.topicId || undefined,
          estimatedMinutes: 25,
          priority: 'medium',
          reason: 'Material disponível na sua biblioteca'
        });
        remainingMinutes -= 25;
      }

      if (remainingMinutes >= 15) {
        tasks.push({
          id: `review-${subject.id}`,
          type: 'review',
          title: `Revisão de ${subject.name}`,
          description: 'Revisão dos conceitos estudados anteriormente',
          subjectId: subject.id,
          subjectName: subject.name,
          estimatedMinutes: 15,
          priority: 'low',
          reason: 'Consolidar o aprendizado'
        });
        remainingMinutes -= 15;
      }
    }

    if (tasks.length === 0) {
      const firstSubject = userSubjects[0];
      tasks.push({
        id: `explore-${firstSubject.id}`,
        type: 'material',
        title: `Explorar ${firstSubject.name}`,
        description: 'Comece adicionando materiais de estudo para esta matéria',
        subjectId: firstSubject.id,
        subjectName: firstSubject.name,
        estimatedMinutes: 20,
        priority: 'high',
        reason: 'Hora de começar seus estudos!'
      });
    }

    return this.sortTasksByPriority(tasks);
  }

  private prioritizeSubjects(subjects: any[], weakAreas: any[], recentActivity: any[]): any[] {
    const recentSubjectIds = new Set(
      recentActivity
        .filter(a => a.subjectId)
        .map(a => a.subjectId)
    );

    return subjects.sort((a, b) => {
      const aHasWeakness = weakAreas.some(w => w.subjectName === a.name);
      const bHasWeakness = weakAreas.some(w => w.subjectName === b.name);
      
      if (aHasWeakness && !bHasWeakness) return -1;
      if (!aHasWeakness && bHasWeakness) return 1;

      const aRecentlyStudied = recentSubjectIds.has(a.id);
      const bRecentlyStudied = recentSubjectIds.has(b.id);
      
      if (!aRecentlyStudied && bRecentlyStudied) return -1;
      if (aRecentlyStudied && !bRecentlyStudied) return 1;

      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;

      return 0;
    });
  }

  private sortTasksByPriority(tasks: StudyTask[]): StudyTask[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private determineFocusAreas(tasks: StudyTask[], weakAreas: any[]): string[] {
    const areas = new Set<string>();
    
    tasks.forEach(task => {
      if (task.priority === 'high') {
        areas.add(task.subjectName);
      }
    });

    weakAreas.forEach(weak => {
      if (weak.currentScore < 60) {
        areas.add(weak.subjectName);
      }
    });

    return Array.from(areas).slice(0, 3);
  }

  private generateMotivationalMessage(user: any, tasks: StudyTask[]): string {
    const needsMotivation = user.needsMotivation;
    const hasChallenges = tasks.some(t => t.priority === 'high');
    const objective = user.studyObjective || 'seu objetivo';

    if (needsMotivation && hasChallenges) {
      return `Você está no caminho certo para ${objective}! Hoje vamos fortalecer seus pontos fracos. Lembre-se: cada minuto de estudo te aproxima do seu sonho! 💪`;
    }

    if (needsMotivation) {
      return `Ótimo trabalho! Seu plano de hoje está equilibrado e vai te deixar ainda mais preparado para ${objective}. Vamos juntos! 🚀`;
    }

    if (hasChallenges) {
      return `Plano focado em suas áreas de melhoria. Concentre-se e você verá resultados em ${objective}.`;
    }

    return `Seu plano de estudo para hoje está pronto. Mantenha o foco e a consistência para alcançar ${objective}.`;
  }

  async completeTask(userId: string, taskId: string, timeSpent: number, notes?: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) return;

    await db.insert(learningHistory).values({
      userId,
      subjectId: task.subjectId || undefined,
      eventType: `task_completed_${task.type}`,
      eventData: {
        taskId,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: timeSpent,
        notes
      },
      sessionDuration: timeSpent,
      difficulty: task.difficulty,
      topics: task.description ? [task.description] : []
    });
  }

  private async getTaskById(taskId: string): Promise<StudyTask | null> {
    return null;
  }
}
