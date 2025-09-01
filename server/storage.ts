import {
  users,
  subjects,
  topics,
  materials,
  goals,
  targets,
  studySessions,
  aiQuestions,
  questionAttempts,
  flashcardDecks,
  flashcards,
  flashcardReviews,
  knowledgeBase,
  type User,
  type UpsertUser,
  type Subject,
  type InsertSubject,
  type Topic,
  type InsertTopic,
  type Material,
  type InsertMaterial,
  type Goal,
  type InsertGoal,
  type Target,
  type InsertTarget,
  type StudySession,
  type InsertStudySession,
  type AiQuestion,
  type InsertAiQuestion,
  type QuestionAttempt,
  type InsertQuestionAttempt,
  type FlashcardDeck,
  type InsertFlashcardDeck,
  type Flashcard,
  type InsertFlashcard,
  type FlashcardReview,
  type InsertFlashcardReview,
  type KnowledgeBase,
  type InsertKnowledgeBase,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Subject operations
  getSubjects(userId: string): Promise<Subject[]>;
  getSubject(id: string): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: string, updates: Partial<InsertSubject>): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;

  // Topic operations
  getTopics(subjectId: string): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, updates: Partial<InsertTopic>): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;

  // Material operations
  getMaterials(userId: string, subjectId?: string): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, updates: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: string): Promise<void>;

  // Goal operations
  getGoals(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, updates: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: string): Promise<void>;

  // Target operations
  getTargets(userId: string, goalId?: string): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: string, updates: Partial<InsertTarget>): Promise<Target>;
  deleteTarget(id: string): Promise<void>;

  // Study session operations
  getStudySessions(userId: string, limit?: number): Promise<StudySession[]>;
  createStudySession(session: InsertStudySession): Promise<StudySession>;
  updateStudySession(id: string, updates: Partial<InsertStudySession>): Promise<StudySession>;
  completeStudySession(id: string, score?: number): Promise<StudySession>;

  // AI Question operations
  getAiQuestions(userId: string, subjectId?: string, topicId?: string): Promise<AiQuestion[]>;
  createAiQuestion(question: InsertAiQuestion): Promise<AiQuestion>;
  deleteAiQuestion(id: string): Promise<void>;

  // Question attempt operations
  createQuestionAttempt(attempt: InsertQuestionAttempt): Promise<QuestionAttempt>;
  getQuestionAttempts(userId: string, sessionId?: string): Promise<QuestionAttempt[]>;

  // Analytics operations
  getUserStats(userId: string): Promise<any>;
  getSubjectProgress(userId: string): Promise<any>;
  getWeeklyProgress(userId: string): Promise<any>;

  // Flashcard operations
  getFlashcardDecks(userId: string, subjectId?: string): Promise<FlashcardDeck[]>;
  getFlashcardDeck(id: string): Promise<FlashcardDeck | undefined>;
  createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck>;
  updateFlashcardDeck(id: string, updates: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck>;
  deleteFlashcardDeck(id: string): Promise<void>;

  getFlashcards(deckId: string): Promise<Flashcard[]>;
  getFlashcard(id: string): Promise<Flashcard | undefined>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  updateFlashcard(id: string, updates: Partial<InsertFlashcard>): Promise<Flashcard>;
  deleteFlashcard(id: string): Promise<void>;

  // Flashcard review operations
  createFlashcardReview(review: InsertFlashcardReview): Promise<FlashcardReview>;
  getFlashcardReviews(userId: string, flashcardId?: string): Promise<FlashcardReview[]>;
  getFlashcardsForReview(userId: string, deckId?: string): Promise<Flashcard[]>;

  // Knowledge base operations
  getKnowledgeBase(userId: string): Promise<KnowledgeBase[]>;
  getKnowledgeDocument(id: string): Promise<KnowledgeBase | undefined>;
  createKnowledgeDocument(document: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeDocument(id: string, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase>;
  deleteKnowledgeDocument(id: string): Promise<void>;
  searchKnowledgeBase(userId: string, query: string): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Subject operations
  async getSubjects(userId: string): Promise<Subject[]> {
    return await db
      .select()
      .from(subjects)
      .where(eq(subjects.userId, userId))
      .orderBy(desc(subjects.updatedAt));
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [newSubject] = await db.insert(subjects).values(subject).returning();
    return newSubject;
  }

  async updateSubject(id: string, updates: Partial<InsertSubject>): Promise<Subject> {
    const [updatedSubject] = await db
      .update(subjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subjects.id, id))
      .returning();
    return updatedSubject;
  }

  async deleteSubject(id: string): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  // Topic operations
  async getTopics(subjectId: string): Promise<Topic[]> {
    return await db
      .select()
      .from(topics)
      .where(eq(topics.subjectId, subjectId))
      .orderBy(topics.order);
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [newTopic] = await db.insert(topics).values(topic).returning();
    return newTopic;
  }

  async updateTopic(id: string, updates: Partial<InsertTopic>): Promise<Topic> {
    const [updatedTopic] = await db
      .update(topics)
      .set(updates)
      .where(eq(topics.id, id))
      .returning();
    return updatedTopic;
  }

  async deleteTopic(id: string): Promise<void> {
    await db.delete(topics).where(eq(topics.id, id));
  }

  // Material operations
  async getMaterials(userId: string, subjectId?: string): Promise<Material[]> {
    if (subjectId) {
      return await db
        .select()
        .from(materials)
        .where(and(
          eq(materials.userId, userId),
          eq(materials.subjectId, subjectId)
        ))
        .orderBy(desc(materials.createdAt));
    }
    
    return await db
      .select()
      .from(materials)
      .where(eq(materials.userId, userId))
      .orderBy(desc(materials.createdAt));
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db.insert(materials).values(material).returning();
    return newMaterial;
  }

  async updateMaterial(id: string, updates: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await db
      .update(materials)
      .set(updates)
      .where(eq(materials.id, id))
      .returning();
    return updatedMaterial;
  }

  async deleteMaterial(id: string): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  // Goal operations
  async getGoals(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async updateGoal(id: string, updates: Partial<InsertGoal>): Promise<Goal> {
    const [updatedGoal] = await db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: string): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  // Target operations
  async getTargets(userId: string, goalId?: string): Promise<Target[]> {
    if (goalId) {
      return await db
        .select()
        .from(targets)
        .where(and(
          eq(targets.userId, userId),
          eq(targets.goalId, goalId)
        ))
        .orderBy(desc(targets.createdAt));
    }
    
    return await db
      .select()
      .from(targets)
      .where(eq(targets.userId, userId))
      .orderBy(desc(targets.createdAt));
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const [newTarget] = await db.insert(targets).values(target).returning();
    return newTarget;
  }

  async updateTarget(id: string, updates: Partial<InsertTarget>): Promise<Target> {
    const [updatedTarget] = await db
      .update(targets)
      .set(updates)
      .where(eq(targets.id, id))
      .returning();
    return updatedTarget;
  }

  async deleteTarget(id: string): Promise<void> {
    await db.delete(targets).where(eq(targets.id, id));
  }

  // Study session operations
  async getStudySessions(userId: string, limit = 10): Promise<StudySession[]> {
    return await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.userId, userId))
      .orderBy(desc(studySessions.startedAt))
      .limit(limit);
  }

  async createStudySession(session: InsertStudySession): Promise<StudySession> {
    const [newSession] = await db.insert(studySessions).values(session).returning();
    return newSession;
  }

  async updateStudySession(id: string, updates: Partial<InsertStudySession>): Promise<StudySession> {
    const [updatedSession] = await db
      .update(studySessions)
      .set(updates)
      .where(eq(studySessions.id, id))
      .returning();
    return updatedSession;
  }

  async completeStudySession(id: string, score?: number): Promise<StudySession> {
    const [completedSession] = await db
      .update(studySessions)
      .set({
        completed: true,
        completedAt: new Date(),
        ...(score !== undefined && { score: score.toString() }),
      })
      .where(eq(studySessions.id, id))
      .returning();
    return completedSession;
  }

  // AI Question operations
  async getAiQuestions(userId: string, subjectId?: string, topicId?: string): Promise<AiQuestion[]> {
    const conditions = [eq(aiQuestions.userId, userId)];
    
    if (subjectId) {
      conditions.push(eq(aiQuestions.subjectId, subjectId));
    }
    
    if (topicId) {
      conditions.push(eq(aiQuestions.topicId, topicId));
    }
    
    return await db
      .select()
      .from(aiQuestions)
      .where(and(...conditions))
      .orderBy(desc(aiQuestions.createdAt));
  }

  async createAiQuestion(question: InsertAiQuestion): Promise<AiQuestion> {
    const [newQuestion] = await db.insert(aiQuestions).values(question).returning();
    return newQuestion;
  }

  async deleteAiQuestion(id: string): Promise<void> {
    await db.delete(aiQuestions).where(eq(aiQuestions.id, id));
  }

  // Question attempt operations
  async createQuestionAttempt(attempt: InsertQuestionAttempt): Promise<QuestionAttempt> {
    const [newAttempt] = await db.insert(questionAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getQuestionAttempts(userId: string, sessionId?: string): Promise<QuestionAttempt[]> {
    const conditions = [eq(questionAttempts.userId, userId)];
    
    if (sessionId) {
      conditions.push(eq(questionAttempts.sessionId, sessionId));
    }
    
    return await db
      .select()
      .from(questionAttempts)
      .where(and(...conditions))
      .orderBy(desc(questionAttempts.attemptedAt));
  }

  // Analytics operations
  async getUserStats(userId: string): Promise<any> {
    const subjectCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(eq(subjects.userId, userId));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStudyTime = await db
      .select({ 
        total: sql<number>`sum(${studySessions.duration})` 
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(studySessions.startedAt, today),
          lte(studySessions.startedAt, tomorrow)
        )
      );

    const questionsGenerated = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiQuestions)
      .where(eq(aiQuestions.userId, userId));

    const completedTargets = await db
      .select({ count: sql<number>`count(*)` })
      .from(targets)
      .where(and(
        eq(targets.userId, userId),
        eq(targets.completed, true)
      ));

    const totalTargets = await db
      .select({ count: sql<number>`count(*)` })
      .from(targets)
      .where(eq(targets.userId, userId));

    return {
      subjects: subjectCount[0]?.count || 0,
      todayHours: Math.round((todayStudyTime[0]?.total || 0) / 60 * 100) / 100,
      questionsGenerated: questionsGenerated[0]?.count || 0,
      goalProgress: totalTargets[0]?.count > 0 
        ? Math.round((completedTargets[0]?.count || 0) / totalTargets[0].count * 100)
        : 0,
    };
  }

  async getSubjectProgress(userId: string): Promise<any> {
    const subjectsWithStats = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        category: subjects.category,
        color: subjects.color,
      })
      .from(subjects)
      .where(eq(subjects.userId, userId));

    const results = [];
    for (const subject of subjectsWithStats) {
      const materialCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(materials)
        .where(eq(materials.subjectId, subject.id));

      const questionCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiQuestions)
        .where(eq(aiQuestions.subjectId, subject.id));

      const totalTime = await db
        .select({ total: sql<number>`sum(${studySessions.duration})` })
        .from(studySessions)
        .where(eq(studySessions.subjectId, subject.id));

      results.push({
        ...subject,
        materials: materialCount[0]?.count || 0,
        questions: questionCount[0]?.count || 0,
        totalHours: Math.round((totalTime[0]?.total || 0) / 60 * 100) / 100,
        progress: Math.min(((materialCount[0]?.count || 0) * 10 + (questionCount[0]?.count || 0)), 100),
      });
    }

    return results;
  }

  async getWeeklyProgress(userId: string): Promise<any> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyTargets = await db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.userId, userId),
          gte(targets.createdAt, oneWeekAgo)
        )
      );

    return weeklyTargets.map(target => ({
      id: target.id,
      name: target.title,
      progress: `${target.currentValue}/${target.targetValue}${target.unit || ''}`,
      percentage: target.targetValue ? 
        Math.round((parseFloat(target.currentValue || '0') / parseFloat(target.targetValue || '1')) * 100) : 0,
    }));
  }

  // Flashcard operations
  async getFlashcardDecks(userId: string, subjectId?: string): Promise<FlashcardDeck[]> {
    const whereCondition = subjectId
      ? and(eq(flashcardDecks.userId, userId), eq(flashcardDecks.subjectId, subjectId))
      : eq(flashcardDecks.userId, userId);

    return await db
      .select()
      .from(flashcardDecks)
      .where(whereCondition)
      .orderBy(desc(flashcardDecks.updatedAt));
  }

  async getFlashcardDeck(id: string): Promise<FlashcardDeck | undefined> {
    const [deck] = await db.select().from(flashcardDecks).where(eq(flashcardDecks.id, id));
    return deck;
  }

  async createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    const [created] = await db
      .insert(flashcardDecks)
      .values(deck)
      .returning();
    return created;
  }

  async updateFlashcardDeck(id: string, updates: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck> {
    const [updated] = await db
      .update(flashcardDecks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(flashcardDecks.id, id))
      .returning();
    return updated;
  }

  async deleteFlashcardDeck(id: string): Promise<void> {
    await db.delete(flashcardDecks).where(eq(flashcardDecks.id, id));
  }

  async getFlashcards(deckId: string): Promise<Flashcard[]> {
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deckId))
      .orderBy(flashcards.order);
  }

  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    const [flashcard] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    return flashcard;
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [created] = await db
      .insert(flashcards)
      .values(flashcard)
      .returning();
    return created;
  }

  async updateFlashcard(id: string, updates: Partial<InsertFlashcard>): Promise<Flashcard> {
    const [updated] = await db
      .update(flashcards)
      .set(updates)
      .where(eq(flashcards.id, id))
      .returning();
    return updated;
  }

  async deleteFlashcard(id: string): Promise<void> {
    await db.delete(flashcards).where(eq(flashcards.id, id));
  }

  async createFlashcardReview(review: InsertFlashcardReview): Promise<FlashcardReview> {
    const [created] = await db
      .insert(flashcardReviews)
      .values(review)
      .returning();
    return created;
  }

  async getFlashcardReviews(userId: string, flashcardId?: string): Promise<FlashcardReview[]> {
    const whereCondition = flashcardId
      ? and(eq(flashcardReviews.userId, userId), eq(flashcardReviews.flashcardId, flashcardId))
      : eq(flashcardReviews.userId, userId);

    return await db
      .select()
      .from(flashcardReviews)
      .where(whereCondition)
      .orderBy(desc(flashcardReviews.reviewedAt));
  }

  async getFlashcardsForReview(userId: string, deckId?: string): Promise<Flashcard[]> {
    const now = new Date();
    const whereCondition = deckId
      ? and(
          eq(flashcards.userId, userId),
          eq(flashcards.deckId, deckId),
          lte(flashcards.nextReview, now)
        )
      : and(eq(flashcards.userId, userId), lte(flashcards.nextReview, now));

    return await db
      .select()
      .from(flashcards)
      .where(whereCondition)
      .orderBy(flashcards.nextReview);
  }
  // Knowledge base operations
  async getKnowledgeBase(userId: string): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.userId, userId), eq(knowledgeBase.isActive, true)))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeDocument(id: string): Promise<KnowledgeBase | undefined> {
    const [document] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    return document;
  }

  async createKnowledgeDocument(document: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [newDocument] = await db.insert(knowledgeBase).values(document).returning();
    return newDocument;
  }

  async updateKnowledgeDocument(id: string, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase> {
    const [updatedDocument] = await db
      .update(knowledgeBase)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteKnowledgeDocument(id: string): Promise<void> {
    await db.update(knowledgeBase)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id));
  }

  async searchKnowledgeBase(userId: string, query: string): Promise<string> {
    // Busca melhorada com palavras-chave
    console.log(`🔍 DEBUG Storage: Buscando para userId=${userId}, query="${query}"`);
    
    // Primeiro vamos ver todos os documentos do usuário
    const allUserDocs = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.userId, userId));
    
    console.log(`📋 DEBUG: Usuário tem ${allUserDocs.length} documentos no total`);
    
    // Mostrar uma amostra do conteúdo dos documentos
    allUserDocs.forEach((doc, index) => {
      console.log(`📄 DEBUG Documento ${index + 1}: "${doc.title}"`);
      console.log(`   - Ativo: ${doc.isActive}`);
      console.log(`   - Tamanho do conteúdo: ${doc.content?.length || 0} caracteres`);
      if (doc.content) {
        console.log(`   - Amostra: "${doc.content.substring(0, 200)}..."`);
      }
    });
    
    // Extrair palavras-chave da pergunta (remover palavras comuns)
    const stopWords = ['me', 'fale', 'sobre', 'o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'sem', 'que', 'qual', 'como', 'quando', 'onde'];
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Usar no máximo 5 palavras-chave
    
    console.log(`🔍 DEBUG: Palavras-chave extraídas:`, keywords);
    
    let documents: any[] = [];
    
    if (keywords.length > 0) {
      // Buscar por qualquer uma das palavras-chave
      const keywordConditions = keywords.map(keyword => 
        sql`${knowledgeBase.content} ILIKE ${'%' + keyword + '%'}`
      );
      
      documents = await db
        .select()
        .from(knowledgeBase)
        .where(and(
          eq(knowledgeBase.userId, userId),
          eq(knowledgeBase.isActive, true),
          or(...keywordConditions)
        ))
        .limit(3);
        
      console.log(`🔍 DEBUG: Busca por palavras-chave encontrou ${documents.length} documentos`);
    }
    
    // Se não encontrou nada com palavras-chave, buscar pela query original
    if (documents.length === 0) {
      console.log(`🔍 DEBUG: Tentando busca pela query original: "${query}"`);
      documents = await db
        .select()
        .from(knowledgeBase)
        .where(and(
          eq(knowledgeBase.userId, userId),
          eq(knowledgeBase.isActive, true),
          sql`${knowledgeBase.content} ILIKE ${'%' + query + '%'}`
        ))
        .limit(3);
      console.log(`🔍 DEBUG: Busca original encontrou ${documents.length} documentos`);
    }
      
    console.log(`📋 DEBUG: Encontrados ${documents.length} documentos relevantes para a busca`);

    if (documents.length === 0) {
      return "";
    }

    // Retorna o contexto relevante dos documentos encontrados
    return documents
      .map(doc => `[${doc.title}]\n${doc.content?.substring(0, 1000)}...`)
      .join('\n\n');
  }
}

export const storage = new DatabaseStorage();
