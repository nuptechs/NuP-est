import {
  users,
  knowledgeAreas,
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
  knowledgeChunks,
  assessmentResults,
  learningHistory,
  type User,
  type UpsertUser,
  type KnowledgeArea,
  type InsertKnowledgeArea,
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
  type KnowledgeChunk,
  type InsertKnowledgeChunk,
  type AssessmentResult,
  type InsertAssessmentResult,
  type LearningHistory,
  type InsertLearningHistory,
  processingJobs,
  type ProcessingJob,
  type InsertProcessingJob,
  editais,
  type Edital,
  type InsertEdital,
  learningDifficultiesCatalog,
  userLearningDifficulties,
  profileLearningDifficulties,
  studentLearningProfiles,
  personalizedAssistants,
  teachingStrategies,
  studentStrategies,
  adaptiveAssessments,
  assessmentQuestions,
  studentAssessmentAttempts,
  interactionLogs,
  assistantMemory,
  chatMessages,
  type LearningDifficultyCatalog,
  type InsertLearningDifficultyCatalog,
  type UserLearningDifficulty,
  type InsertUserLearningDifficulty,
  type ProfileLearningDifficulty,
  type InsertProfileLearningDifficulty,
  type StudentLearningProfile,
  type InsertStudentLearningProfile,
  type PersonalizedAssistant,
  type InsertPersonalizedAssistant,
  type TeachingStrategy,
  type InsertTeachingStrategy,
  type StudentStrategy,
  type InsertStudentStrategy,
  type AdaptiveAssessment,
  type InsertAdaptiveAssessment,
  type AssessmentQuestion,
  type InsertAssessmentQuestion,
  type StudentAssessmentAttempt,
  type InsertStudentAssessmentAttempt,
  type InteractionLog,
  type InsertInteractionLog,
  type AssistantMemory,
  type InsertAssistantMemory,
  type ChatMessage,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte, or, isNotNull, gt, inArray } from "drizzle-orm";
import { embeddingsService } from "./services/embeddings";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Knowledge Area operations
  getKnowledgeAreas(userId: string): Promise<KnowledgeArea[]>;
  getKnowledgeArea(id: string): Promise<KnowledgeArea | undefined>;
  createKnowledgeArea(area: InsertKnowledgeArea): Promise<KnowledgeArea>;
  updateKnowledgeArea(id: string, userId: string, updates: Partial<InsertKnowledgeArea>): Promise<KnowledgeArea>;
  deleteKnowledgeArea(id: string, userId: string): Promise<void>;

  // Subject operations
  getSubjects(userId: string, areaId?: string): Promise<Subject[]>;
  getSubject(id: string): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: string, userId: string, updates: Partial<InsertSubject>): Promise<Subject>;
  deleteSubject(id: string, userId: string): Promise<void>;

  // Topic operations
  getTopics(subjectId: string): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, updates: Partial<InsertTopic>): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;

  // Material operations
  getMaterials(userId: string, subjectId?: string): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, userId: string, updates: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: string, userId: string): Promise<void>;

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
  getKnowledgeBase(userId: string, category?: string): Promise<KnowledgeBase[]>;
  getKnowledgeCategories(userId: string): Promise<{category: string; count: number}[]>;
  getKnowledgeDocument(id: string): Promise<KnowledgeBase | undefined>;
  createKnowledgeDocument(document: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeDocument(id: string, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase>;
  deleteKnowledgeDocument(id: string): Promise<void>;
  
  // Knowledge chunks
  createKnowledgeChunks(chunks: InsertKnowledgeChunk[]): Promise<KnowledgeChunk[]>;
  deleteKnowledgeChunks(knowledgeBaseId: string): Promise<void>;
  
  searchKnowledgeBase(userId: string, query: string, category?: string): Promise<string>;
  searchKnowledgeBaseWithEmbeddings(userId: string, queryEmbedding: number[], limit?: number, category?: string): Promise<{ content: string; similarity: number; title: string; }[]>;
  
  // === QUIZ & ASSESSMENT OPERATIONS ===
  createAssessmentResult(result: InsertAssessmentResult): Promise<AssessmentResult>;
  createLearningHistory(history: InsertLearningHistory): Promise<LearningHistory>;

  // Processing jobs operations
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: string): Promise<ProcessingJob | undefined>;
  getUserProcessingJobs(userId: string, status?: string): Promise<ProcessingJob[]>;
  updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob>;
  deleteProcessingJob(id: string): Promise<void>;

  // Edital operations
  createEdital(edital: InsertEdital): Promise<Edital>;
  getEdital(id: string): Promise<Edital | undefined>;
  getUserEditais(userId: string, status?: string): Promise<Edital[]>;
  updateEdital(id: string, updates: Partial<Edital>): Promise<Edital>;
  deleteEdital(id: string): Promise<void>;
  getEditalByFilename(userId: string, fileName: string): Promise<Edital | undefined>;

  // === PERSONALIZED ASSISTANT SYSTEM OPERATIONS ===
  
  // Learning Difficulties Catalog operations
  getLearningDifficultiesCatalog(): Promise<LearningDifficultyCatalog[]>;
  getLearningDifficulty(id: string): Promise<LearningDifficultyCatalog | undefined>;
  createLearningDifficulty(difficulty: InsertLearningDifficultyCatalog): Promise<LearningDifficultyCatalog>;
  updateLearningDifficulty(id: string, updates: Partial<InsertLearningDifficultyCatalog>): Promise<LearningDifficultyCatalog>;
  deleteLearningDifficulty(id: string): Promise<void>;
  
  // User Learning Difficulties operations (junction table)
  getUserLearningDifficulties(userId: string): Promise<UserLearningDifficulty[]>;
  addUserLearningDifficulty(difficulty: InsertUserLearningDifficulty): Promise<UserLearningDifficulty>;
  updateUserLearningDifficulty(id: string, updates: Partial<InsertUserLearningDifficulty>): Promise<UserLearningDifficulty>;
  removeUserLearningDifficulty(id: string): Promise<void>;
  
  // Student Learning Profiles operations
  getStudentProfiles(userId: string): Promise<StudentLearningProfile[]>;
  getActiveStudentProfile(userId: string): Promise<StudentLearningProfile | undefined>;
  getStudentProfile(id: string): Promise<StudentLearningProfile | undefined>;
  createStudentProfile(profile: InsertStudentLearningProfile): Promise<StudentLearningProfile>;
  updateStudentProfile(id: string, updates: Partial<InsertStudentLearningProfile>): Promise<StudentLearningProfile>;
  deleteStudentProfile(id: string): Promise<void>;
  
  // Profile Learning Difficulties operations (junction table)
  getProfileLearningDifficulties(profileId: string): Promise<ProfileLearningDifficulty[]>;
  addProfileLearningDifficulty(difficulty: InsertProfileLearningDifficulty): Promise<ProfileLearningDifficulty>;
  updateProfileLearningDifficulty(id: string, updates: Partial<InsertProfileLearningDifficulty>): Promise<ProfileLearningDifficulty>;
  removeProfileLearningDifficulty(id: string): Promise<void>;
  
  // Personalized Assistant operations
  getPersonalizedAssistants(userId: string): Promise<PersonalizedAssistant[]>;
  getActiveAssistant(userId: string): Promise<PersonalizedAssistant | undefined>;
  getPersonalizedAssistant(id: string): Promise<PersonalizedAssistant | undefined>;
  createPersonalizedAssistant(assistant: InsertPersonalizedAssistant): Promise<PersonalizedAssistant>;
  updatePersonalizedAssistant(id: string, updates: Partial<InsertPersonalizedAssistant>): Promise<PersonalizedAssistant>;
  deletePersonalizedAssistant(id: string): Promise<void>;
  
  // Teaching Strategies operations
  getTeachingStrategies(): Promise<TeachingStrategy[]>;
  getTeachingStrategy(id: string): Promise<TeachingStrategy | undefined>;
  createTeachingStrategy(strategy: InsertTeachingStrategy): Promise<TeachingStrategy>;
  updateTeachingStrategy(id: string, updates: Partial<InsertTeachingStrategy>): Promise<TeachingStrategy>;
  deleteTeachingStrategy(id: string): Promise<void>;
  
  // Student Strategies operations (junction table)
  getStudentStrategies(userId: string): Promise<StudentStrategy[]>;
  addStudentStrategy(strategy: InsertStudentStrategy): Promise<StudentStrategy>;
  updateStudentStrategy(id: string, updates: Partial<InsertStudentStrategy>): Promise<StudentStrategy>;
  removeStudentStrategy(id: string): Promise<void>;
  
  // Adaptive Assessment operations
  getAdaptiveAssessments(userId: string, profileId?: string): Promise<AdaptiveAssessment[]>;
  getAdaptiveAssessment(id: string): Promise<AdaptiveAssessment | undefined>;
  createAdaptiveAssessment(assessment: InsertAdaptiveAssessment): Promise<AdaptiveAssessment>;
  updateAdaptiveAssessment(id: string, updates: Partial<InsertAdaptiveAssessment>): Promise<AdaptiveAssessment>;
  deleteAdaptiveAssessment(id: string): Promise<void>;
  
  // Assessment Questions operations
  getAssessmentQuestions(assessmentId?: string, difficulty?: string): Promise<AssessmentQuestion[]>;
  getAssessmentQuestion(id: string): Promise<AssessmentQuestion | undefined>;
  createAssessmentQuestion(question: InsertAssessmentQuestion): Promise<AssessmentQuestion>;
  updateAssessmentQuestion(id: string, updates: Partial<InsertAssessmentQuestion>): Promise<AssessmentQuestion>;
  deleteAssessmentQuestion(id: string): Promise<void>;
  
  // Student Assessment Attempts operations
  getStudentAssessmentAttempts(userId: string, assessmentId?: string): Promise<StudentAssessmentAttempt[]>;
  createStudentAssessmentAttempt(attempt: InsertStudentAssessmentAttempt): Promise<StudentAssessmentAttempt>;
  updateStudentAssessmentAttempt(id: string, updates: Partial<InsertStudentAssessmentAttempt>): Promise<StudentAssessmentAttempt>;
  
  // Interaction Logs operations
  getInteractionLogs(userId: string, assistantId?: string, limit?: number): Promise<InteractionLog[]>;
  createInteractionLog(log: InsertInteractionLog): Promise<InteractionLog>;
  
  // Assistant Memory operations
  getAssistantMemory(assistantId: string, memoryType?: string): Promise<AssistantMemory[]>;
  getAssistantMemoryItem(id: string): Promise<AssistantMemory | undefined>;
  createAssistantMemory(memory: InsertAssistantMemory): Promise<AssistantMemory>;
  updateAssistantMemory(id: string, updates: Partial<InsertAssistantMemory>): Promise<AssistantMemory>;
  deleteAssistantMemory(id: string): Promise<void>;
  
  // Chat Messages operations
  getChatMessages(assistantId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessage(messageId: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // First try to update by ID if user exists
      if (userData.id) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, userData.id));
        
        if (existingUser) {
          // Update existing user by ID
          const [updatedUser] = await db
            .update(users)
            .set({ ...userData, updatedAt: new Date() })
            .where(eq(users.id, userData.id))
            .returning();
          return updatedUser;
        }
      }

      // If user doesn't exist by ID, try upsert with conflict resolution
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id, // Use ID as primary conflict target
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error in upsertUser:', error);
      
      // Fallback: try to find and update by email
      if (userData.email) {
        try {
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, userData.email));
          
          if (existingUser) {
            // Update existing user by email
            const [updatedUser] = await db
              .update(users)
              .set({ ...userData, updatedAt: new Date() })
              .where(eq(users.email, userData.email))
              .returning();
            return updatedUser;
          }
        } catch (findError) {
          console.error('Error finding existing user by email:', findError);
        }
      }
      
      throw error; // Re-throw if all attempts fail
    }
  }

  // Knowledge Area operations
  async getKnowledgeAreas(userId: string): Promise<KnowledgeArea[]> {
    return await db
      .select()
      .from(knowledgeAreas)
      .where(eq(knowledgeAreas.userId, userId))
      .orderBy(knowledgeAreas.displayOrder, desc(knowledgeAreas.updatedAt));
  }

  async getKnowledgeArea(id: string): Promise<KnowledgeArea | undefined> {
    const [area] = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.id, id));
    return area;
  }

  async createKnowledgeArea(area: InsertKnowledgeArea): Promise<KnowledgeArea> {
    const [newArea] = await db.insert(knowledgeAreas).values(area).returning();
    return newArea;
  }

  async updateKnowledgeArea(id: string, userId: string, updates: Partial<InsertKnowledgeArea>): Promise<KnowledgeArea> {
    const [updatedArea] = await db
      .update(knowledgeAreas)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(knowledgeAreas.id, id), eq(knowledgeAreas.userId, userId)))
      .returning();
    
    if (!updatedArea) {
      throw new Error('Knowledge area not found or access denied');
    }
    
    return updatedArea;
  }

  async deleteKnowledgeArea(id: string, userId: string): Promise<void> {
    const result = await db
      .delete(knowledgeAreas)
      .where(and(eq(knowledgeAreas.id, id), eq(knowledgeAreas.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Knowledge area not found or access denied');
    }
  }

  // Subject operations
  async getSubjects(userId: string, areaId?: string): Promise<Subject[]> {
    const whereConditions = [eq(subjects.userId, userId)];
    if (areaId) {
      whereConditions.push(eq(subjects.areaId, areaId));
    }
    
    return await db
      .select()
      .from(subjects)
      .where(and(...whereConditions))
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

  async updateSubject(id: string, userId: string, updates: Partial<InsertSubject>): Promise<Subject> {
    const [updatedSubject] = await db
      .update(subjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
      .returning();
    if (!updatedSubject) {
      throw new Error("Subject not found or access denied");
    }
    return updatedSubject;
  }

  async deleteSubject(id: string, userId: string): Promise<void> {
    const result = await db
      .delete(subjects)
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
      .returning({ id: subjects.id });
    if (result.length === 0) {
      throw new Error("Subject not found or access denied");
    }
  }

  // Topic operations
  async getTopics(subjectId: string): Promise<Topic[]> {
    return await db
      .select()
      .from(topics)
      .where(eq(topics.subjectId, subjectId))
      .orderBy(topics.order);
  }

  async getTopic(id: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    return topic;
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

  async updateMaterial(id: string, userId: string, updates: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await db
      .update(materials)
      .set(updates)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning();
    if (!updatedMaterial) {
      throw new Error("Material not found or access denied");
    }
    return updatedMaterial;
  }

  async deleteMaterial(id: string, userId: string): Promise<void> {
    const result = await db
      .delete(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning({ id: materials.id });
    if (result.length === 0) {
      throw new Error("Material not found or access denied");
    }
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
  async getKnowledgeBase(userId: string, category?: string): Promise<KnowledgeBase[]> {
    const conditions = [eq(knowledgeBase.userId, userId), eq(knowledgeBase.isActive, true)];
    
    if (category) {
      conditions.push(eq(knowledgeBase.category, category));
    }
    
    return await db
      .select()
      .from(knowledgeBase)
      .where(and(...conditions))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeCategories(userId: string): Promise<{category: string; count: number}[]> {
    const result = await db
      .select({
        category: knowledgeBase.category,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.userId, userId), eq(knowledgeBase.isActive, true)))
      .groupBy(knowledgeBase.category)
      .orderBy(knowledgeBase.category);
    
    return result;
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

  async searchKnowledgeBase(userId: string, query: string, category?: string): Promise<string> {
    // Busca melhorada com palavras-chave
    
    // Extrair palavras-chave da pergunta (remover palavras comuns)
    const stopWords = ['me', 'fale', 'sobre', 'o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'sem', 'que', 'qual', 'como', 'quando', 'onde'];
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Usar no máximo 5 palavras-chave
    
    let documents: any[] = [];
    
    if (keywords.length > 0) {
      // Buscar por qualquer uma das palavras-chave
      const keywordConditions = keywords.map(keyword => 
        sql`${knowledgeBase.content} ILIKE ${'%' + keyword + '%'}`
      );
      
      const baseConditions = [
        eq(knowledgeBase.userId, userId),
        eq(knowledgeBase.isActive, true),
        or(...keywordConditions)
      ];
      
      if (category) {
        baseConditions.push(eq(knowledgeBase.category, category));
      }
      
      documents = await db
        .select()
        .from(knowledgeBase)
        .where(and(...baseConditions))
        .limit(3);
    }
    
    // Se não encontrou nada com palavras-chave, buscar pela query original
    if (documents.length === 0) {
      documents = await db
        .select()
        .from(knowledgeBase)
        .where(and(
          eq(knowledgeBase.userId, userId),
          eq(knowledgeBase.isActive, true),
          sql`${knowledgeBase.content} ILIKE ${'%' + query + '%'}`
        ))
        .limit(3);
    }

    if (documents.length === 0) {
      return "";
    }

    // Retorna o contexto relevante dos documentos encontrados
    return documents
      .map(doc => `[${doc.title}]\n${doc.content?.substring(0, 1000)}...`)
      .join('\n\n');
  }

  // Knowledge chunks operations
  async createKnowledgeChunks(chunks: InsertKnowledgeChunk[]): Promise<KnowledgeChunk[]> {
    return await db
      .insert(knowledgeChunks)
      .values(chunks)
      .returning();
  }

  async deleteKnowledgeChunks(knowledgeBaseId: string): Promise<void> {
    await db
      .delete(knowledgeChunks)
      .where(eq(knowledgeChunks.knowledgeBaseId, knowledgeBaseId));
  }

  async searchKnowledgeBaseWithEmbeddings(
    userId: string, 
    queryEmbedding: number[], 
    limit: number = 3,
    category?: string
  ): Promise<{ content: string; similarity: number; title: string; }[]> {
    // Buscar documentos do usuário
    const conditions = [
      eq(knowledgeBase.userId, userId),
      eq(knowledgeBase.isActive, true)
    ];
    
    if (category) {
      conditions.push(eq(knowledgeBase.category, category));
    }
    
    const userDocuments = await db
      .select({
        id: knowledgeBase.id,
        title: knowledgeBase.title,
      })
      .from(knowledgeBase)
      .where(and(...conditions));

    if (userDocuments.length === 0) {
      return [];
    }

    const documentIds = userDocuments.map(doc => doc.id);

    // Buscar todos os chunks dos documentos do usuário
    const chunks = await db
      .select({
        id: knowledgeChunks.id,
        content: knowledgeChunks.content,
        embedding: knowledgeChunks.embedding,
        knowledgeBaseId: knowledgeChunks.knowledgeBaseId,
      })
      .from(knowledgeChunks)
      .innerJoin(knowledgeBase, eq(knowledgeChunks.knowledgeBaseId, knowledgeBase.id))
      .where(and(
        eq(knowledgeBase.userId, userId),
        eq(knowledgeBase.isActive, true),
        isNotNull(knowledgeChunks.embedding)
      ));

    // Calcular similaridade com cada chunk
    const similarities = chunks
      .filter(chunk => chunk.embedding) // Apenas chunks com embedding
      .map(chunk => {
        const chunkEmbedding = chunk.embedding as number[];
        const similarity = embeddingsService.calculateCosineSimilarity(queryEmbedding, chunkEmbedding);
        const document = userDocuments.find(doc => doc.id === chunk.knowledgeBaseId);
        
        return {
          content: chunk.content,
          similarity,
          title: document?.title || 'Documento',
        };
      })
      .sort((a, b) => b.similarity - a.similarity) // Ordenar por similaridade descendente
      .slice(0, limit); // Limitar resultados

    return similarities;
  }

  // === QUIZ & ASSESSMENT OPERATIONS ===
  async createAssessmentResult(result: InsertAssessmentResult): Promise<AssessmentResult> {
    const [assessmentResult] = await db
      .insert(assessmentResults)
      .values(result)
      .returning();
    return assessmentResult;
  }

  async createLearningHistory(history: InsertLearningHistory): Promise<LearningHistory> {
    const [learningHistoryEntry] = await db
      .insert(learningHistory)
      .values(history)
      .returning();
    return learningHistoryEntry;
  }

  // Processing jobs operations
  async createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob> {
    const [processingJob] = await db
      .insert(processingJobs)
      .values(job)
      .returning();
    return processingJob;
  }

  async getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
    const job = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, id))
      .limit(1);
    return job[0];
  }

  async getUserProcessingJobs(userId: string, status?: string): Promise<ProcessingJob[]> {
    const conditions = [eq(processingJobs.userId, userId)];
    
    if (status) {
      conditions.push(eq(processingJobs.status, status as any));
    }

    return await db
      .select()
      .from(processingJobs)
      .where(and(...conditions))
      .orderBy(desc(processingJobs.createdAt));
  }

  async updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob> {
    const [updatedJob] = await db
      .update(processingJobs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(processingJobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteProcessingJob(id: string): Promise<void> {
    await db
      .delete(processingJobs)
      .where(eq(processingJobs.id, id));
  }

  // Edital operations
  async createEdital(edital: InsertEdital): Promise<Edital> {
    const [newEdital] = await db
      .insert(editais)
      .values(edital)
      .returning();
    return newEdital;
  }

  async getEdital(id: string): Promise<Edital | undefined> {
    const [edital] = await db
      .select()
      .from(editais)
      .where(eq(editais.id, id))
      .limit(1);
    return edital;
  }

  async getUserEditais(userId: string, status?: string): Promise<Edital[]> {
    const conditions = [eq(editais.userId, userId)];
    
    if (status) {
      conditions.push(eq(editais.status, status as any));
    }

    return await db
      .select()
      .from(editais)
      .where(and(...conditions))
      .orderBy(desc(editais.createdAt));
  }

  async updateEdital(id: string, updates: Partial<Edital>): Promise<Edital> {
    const [updatedEdital] = await db
      .update(editais)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(editais.id, id))
      .returning();
    return updatedEdital;
  }

  async deleteEdital(id: string): Promise<void> {
    await db
      .delete(editais)
      .where(eq(editais.id, id));
  }

  async getEditalByFilename(userId: string, fileName: string): Promise<Edital | undefined> {
    const [edital] = await db
      .select()
      .from(editais)
      .where(and(
        eq(editais.userId, userId),
        eq(editais.fileName, fileName)
      ))
      .limit(1);
    return edital;
  }

  // === PERSONALIZED ASSISTANT SYSTEM IMPLEMENTATIONS ===
  
  // Learning Difficulties Catalog
  async getLearningDifficultiesCatalog(): Promise<LearningDifficultyCatalog[]> {
    return await db
      .select()
      .from(learningDifficultiesCatalog)
      .orderBy(learningDifficultiesCatalog.category, learningDifficultiesCatalog.name);
  }

  async getLearningDifficulty(id: string): Promise<LearningDifficultyCatalog | undefined> {
    const [difficulty] = await db
      .select()
      .from(learningDifficultiesCatalog)
      .where(eq(learningDifficultiesCatalog.id, id))
      .limit(1);
    return difficulty;
  }

  async createLearningDifficulty(difficulty: InsertLearningDifficultyCatalog): Promise<LearningDifficultyCatalog> {
    const [newDifficulty] = await db
      .insert(learningDifficultiesCatalog)
      .values(difficulty)
      .returning();
    return newDifficulty;
  }

  async updateLearningDifficulty(id: string, updates: Partial<InsertLearningDifficultyCatalog>): Promise<LearningDifficultyCatalog> {
    const [updated] = await db
      .update(learningDifficultiesCatalog)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(learningDifficultiesCatalog.id, id))
      .returning();
    return updated;
  }

  async deleteLearningDifficulty(id: string): Promise<void> {
    await db
      .delete(learningDifficultiesCatalog)
      .where(eq(learningDifficultiesCatalog.id, id));
  }

  // User Learning Difficulties (junction table)
  async getUserLearningDifficulties(userId: string): Promise<UserLearningDifficulty[]> {
    return await db
      .select()
      .from(userLearningDifficulties)
      .where(eq(userLearningDifficulties.userId, userId))
      .orderBy(desc(userLearningDifficulties.createdAt));
  }

  async addUserLearningDifficulty(difficulty: InsertUserLearningDifficulty): Promise<UserLearningDifficulty> {
    const [newDifficulty] = await db
      .insert(userLearningDifficulties)
      .values(difficulty)
      .returning();
    return newDifficulty;
  }

  async updateUserLearningDifficulty(id: string, updates: Partial<InsertUserLearningDifficulty>): Promise<UserLearningDifficulty> {
    const [updated] = await db
      .update(userLearningDifficulties)
      .set(updates)
      .where(eq(userLearningDifficulties.id, id))
      .returning();
    return updated;
  }

  async removeUserLearningDifficulty(id: string): Promise<void> {
    await db
      .delete(userLearningDifficulties)
      .where(eq(userLearningDifficulties.id, id));
  }

  // Student Learning Profiles
  async getStudentProfiles(userId: string): Promise<StudentLearningProfile[]> {
    return await db
      .select()
      .from(studentLearningProfiles)
      .where(eq(studentLearningProfiles.userId, userId))
      .orderBy(desc(studentLearningProfiles.version));
  }

  async getActiveStudentProfile(userId: string): Promise<StudentLearningProfile | undefined> {
    const [profile] = await db
      .select()
      .from(studentLearningProfiles)
      .where(and(
        eq(studentLearningProfiles.userId, userId),
        eq(studentLearningProfiles.isActive, true)
      ))
      .limit(1);
    return profile;
  }

  async getStudentProfile(id: string): Promise<StudentLearningProfile | undefined> {
    const [profile] = await db
      .select()
      .from(studentLearningProfiles)
      .where(eq(studentLearningProfiles.id, id))
      .limit(1);
    return profile;
  }

  async createStudentProfile(profile: InsertStudentLearningProfile): Promise<StudentLearningProfile> {
    const [newProfile] = await db
      .insert(studentLearningProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateStudentProfile(id: string, updates: Partial<InsertStudentLearningProfile>): Promise<StudentLearningProfile> {
    const [updated] = await db
      .update(studentLearningProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studentLearningProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteStudentProfile(id: string): Promise<void> {
    await db
      .delete(studentLearningProfiles)
      .where(eq(studentLearningProfiles.id, id));
  }

  // Profile Learning Difficulties (junction table)
  async getProfileLearningDifficulties(profileId: string): Promise<ProfileLearningDifficulty[]> {
    return await db
      .select()
      .from(profileLearningDifficulties)
      .where(eq(profileLearningDifficulties.profileId, profileId))
      .orderBy(desc(profileLearningDifficulties.impactLevel));
  }

  async addProfileLearningDifficulty(difficulty: InsertProfileLearningDifficulty): Promise<ProfileLearningDifficulty> {
    const [newDifficulty] = await db
      .insert(profileLearningDifficulties)
      .values(difficulty)
      .returning();
    return newDifficulty;
  }

  async updateProfileLearningDifficulty(id: string, updates: Partial<InsertProfileLearningDifficulty>): Promise<ProfileLearningDifficulty> {
    const [updated] = await db
      .update(profileLearningDifficulties)
      .set(updates)
      .where(eq(profileLearningDifficulties.id, id))
      .returning();
    return updated;
  }

  async removeProfileLearningDifficulty(id: string): Promise<void> {
    await db
      .delete(profileLearningDifficulties)
      .where(eq(profileLearningDifficulties.id, id));
  }

  // Personalized Assistants
  async getPersonalizedAssistants(userId: string): Promise<PersonalizedAssistant[]> {
    return await db
      .select()
      .from(personalizedAssistants)
      .where(eq(personalizedAssistants.userId, userId))
      .orderBy(desc(personalizedAssistants.createdAt));
  }

  async getActiveAssistant(userId: string): Promise<PersonalizedAssistant | undefined> {
    const [assistant] = await db
      .select()
      .from(personalizedAssistants)
      .where(and(
        eq(personalizedAssistants.userId, userId),
        eq(personalizedAssistants.isActive, true)
      ))
      .limit(1);
    return assistant;
  }

  async getPersonalizedAssistant(id: string): Promise<PersonalizedAssistant | undefined> {
    const [assistant] = await db
      .select()
      .from(personalizedAssistants)
      .where(eq(personalizedAssistants.id, id))
      .limit(1);
    return assistant;
  }

  async createPersonalizedAssistant(assistant: InsertPersonalizedAssistant): Promise<PersonalizedAssistant> {
    const [newAssistant] = await db
      .insert(personalizedAssistants)
      .values(assistant)
      .returning();
    return newAssistant;
  }

  async updatePersonalizedAssistant(id: string, updates: Partial<InsertPersonalizedAssistant>): Promise<PersonalizedAssistant> {
    const [updated] = await db
      .update(personalizedAssistants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(personalizedAssistants.id, id))
      .returning();
    return updated;
  }

  async deletePersonalizedAssistant(id: string): Promise<void> {
    await db
      .delete(personalizedAssistants)
      .where(eq(personalizedAssistants.id, id));
  }

  // Teaching Strategies
  async getTeachingStrategies(): Promise<TeachingStrategy[]> {
    return await db
      .select()
      .from(teachingStrategies)
      .orderBy(teachingStrategies.category, teachingStrategies.name);
  }

  async getTeachingStrategy(id: string): Promise<TeachingStrategy | undefined> {
    const [strategy] = await db
      .select()
      .from(teachingStrategies)
      .where(eq(teachingStrategies.id, id))
      .limit(1);
    return strategy;
  }

  async createTeachingStrategy(strategy: InsertTeachingStrategy): Promise<TeachingStrategy> {
    const [newStrategy] = await db
      .insert(teachingStrategies)
      .values(strategy)
      .returning();
    return newStrategy;
  }

  async updateTeachingStrategy(id: string, updates: Partial<InsertTeachingStrategy>): Promise<TeachingStrategy> {
    const [updated] = await db
      .update(teachingStrategies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teachingStrategies.id, id))
      .returning();
    return updated;
  }

  async deleteTeachingStrategy(id: string): Promise<void> {
    await db
      .delete(teachingStrategies)
      .where(eq(teachingStrategies.id, id));
  }

  // Student Strategies (junction table)
  async getStudentStrategies(userId: string): Promise<StudentStrategy[]> {
    return await db
      .select()
      .from(studentStrategies)
      .where(eq(studentStrategies.userId, userId))
      .orderBy(desc(studentStrategies.effectivenessScore));
  }

  async addStudentStrategy(strategy: InsertStudentStrategy): Promise<StudentStrategy> {
    const [newStrategy] = await db
      .insert(studentStrategies)
      .values(strategy)
      .returning();
    return newStrategy;
  }

  async updateStudentStrategy(id: string, updates: Partial<InsertStudentStrategy>): Promise<StudentStrategy> {
    const [updated] = await db
      .update(studentStrategies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studentStrategies.id, id))
      .returning();
    return updated;
  }

  async removeStudentStrategy(id: string): Promise<void> {
    await db
      .delete(studentStrategies)
      .where(eq(studentStrategies.id, id));
  }

  // Adaptive Assessments
  async getAdaptiveAssessments(userId: string, profileId?: string): Promise<AdaptiveAssessment[]> {
    const conditions = [eq(adaptiveAssessments.userId, userId)];
    
    if (profileId) {
      conditions.push(eq(adaptiveAssessments.profileId, profileId));
    }

    return await db
      .select()
      .from(adaptiveAssessments)
      .where(and(...conditions))
      .orderBy(desc(adaptiveAssessments.startedAt));
  }

  async getAdaptiveAssessment(id: string): Promise<AdaptiveAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(adaptiveAssessments)
      .where(eq(adaptiveAssessments.id, id))
      .limit(1);
    return assessment;
  }

  async createAdaptiveAssessment(assessment: InsertAdaptiveAssessment): Promise<AdaptiveAssessment> {
    const [newAssessment] = await db
      .insert(adaptiveAssessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async updateAdaptiveAssessment(id: string, updates: Partial<InsertAdaptiveAssessment>): Promise<AdaptiveAssessment> {
    const [updated] = await db
      .update(adaptiveAssessments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adaptiveAssessments.id, id))
      .returning();
    return updated;
  }

  async deleteAdaptiveAssessment(id: string): Promise<void> {
    await db
      .delete(adaptiveAssessments)
      .where(eq(adaptiveAssessments.id, id));
  }

  // Assessment Questions
  async getAssessmentQuestions(assessmentId?: string, difficulty?: string): Promise<AssessmentQuestion[]> {
    const conditions = [];
    
    // Note: assessmentQuestions don't have assessmentId - they're independent
    // Questions are linked to assessments via studentAssessmentAttempts
    
    if (difficulty) {
      conditions.push(eq(assessmentQuestions.difficulty, difficulty));
    }

    const query = db
      .select()
      .from(assessmentQuestions);

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  }

  async getAssessmentQuestion(id: string): Promise<AssessmentQuestion | undefined> {
    const [question] = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.id, id))
      .limit(1);
    return question;
  }

  async createAssessmentQuestion(question: InsertAssessmentQuestion): Promise<AssessmentQuestion> {
    const [newQuestion] = await db
      .insert(assessmentQuestions)
      .values(question)
      .returning();
    return newQuestion;
  }

  async updateAssessmentQuestion(id: string, updates: Partial<InsertAssessmentQuestion>): Promise<AssessmentQuestion> {
    const [updated] = await db
      .update(assessmentQuestions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assessmentQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteAssessmentQuestion(id: string): Promise<void> {
    await db
      .delete(assessmentQuestions)
      .where(eq(assessmentQuestions.id, id));
  }

  // Student Assessment Attempts
  async getStudentAssessmentAttempts(userId: string, assessmentId?: string): Promise<StudentAssessmentAttempt[]> {
    const conditions = [eq(studentAssessmentAttempts.userId, userId)];
    
    if (assessmentId) {
      conditions.push(eq(studentAssessmentAttempts.assessmentId, assessmentId));
    }

    return await db
      .select()
      .from(studentAssessmentAttempts)
      .where(and(...conditions))
      .orderBy(desc(studentAssessmentAttempts.attemptedAt));
  }

  async createStudentAssessmentAttempt(attempt: InsertStudentAssessmentAttempt): Promise<StudentAssessmentAttempt> {
    const [newAttempt] = await db
      .insert(studentAssessmentAttempts)
      .values(attempt)
      .returning();
    return newAttempt;
  }

  async updateStudentAssessmentAttempt(id: string, updates: Partial<InsertStudentAssessmentAttempt>): Promise<StudentAssessmentAttempt> {
    const [updated] = await db
      .update(studentAssessmentAttempts)
      .set(updates)
      .where(eq(studentAssessmentAttempts.id, id))
      .returning();
    return updated;
  }

  // Interaction Logs
  async getInteractionLogs(userId: string, assistantId?: string, limit: number = 100): Promise<InteractionLog[]> {
    const conditions = [eq(interactionLogs.userId, userId)];
    
    if (assistantId) {
      conditions.push(eq(interactionLogs.assistantId, assistantId));
    }

    return await db
      .select()
      .from(interactionLogs)
      .where(and(...conditions))
      .orderBy(desc(interactionLogs.createdAt))
      .limit(limit);
  }

  async createInteractionLog(log: InsertInteractionLog): Promise<InteractionLog> {
    const [newLog] = await db
      .insert(interactionLogs)
      .values(log)
      .returning();
    return newLog;
  }

  // Assistant Memory
  async getAssistantMemory(assistantId: string, memoryType?: string): Promise<AssistantMemory[]> {
    const conditions = [eq(assistantMemory.assistantId, assistantId)];
    
    if (memoryType) {
      conditions.push(eq(assistantMemory.memoryType, memoryType));
    }

    return await db
      .select()
      .from(assistantMemory)
      .where(and(...conditions))
      .orderBy(desc(assistantMemory.lastAccessed));
  }

  async getAssistantMemoryItem(id: string): Promise<AssistantMemory | undefined> {
    const [memory] = await db
      .select()
      .from(assistantMemory)
      .where(eq(assistantMemory.id, id))
      .limit(1);
    return memory;
  }

  async createAssistantMemory(memory: InsertAssistantMemory): Promise<AssistantMemory> {
    const [newMemory] = await db
      .insert(assistantMemory)
      .values(memory)
      .returning();
    return newMemory;
  }

  async updateAssistantMemory(id: string, updates: Partial<InsertAssistantMemory>): Promise<AssistantMemory> {
    const [updated] = await db
      .update(assistantMemory)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assistantMemory.id, id))
      .returning();
    return updated;
  }

  async deleteAssistantMemory(id: string): Promise<void> {
    await db
      .delete(assistantMemory)
      .where(eq(assistantMemory.id, id));
  }

  // Chat Messages
  async getChatMessages(assistantId: string, limit: number = 100): Promise<ChatMessage[]> {
    // Order DESC to get most recent messages, then reverse to return chronological order
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.assistantId, assistantId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    
    // Reverse to return in chronological order (oldest first)
    return messages.reverse();
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async deleteChatMessage(messageId: string, userId: string): Promise<void> {
    // Get the message to verify ownership and get details
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId));

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own messages");
    }

    // If it's a user message, also delete the assistant's response (next message with role=assistant)
    if (message.role === "user") {
      // Find the assistant's response (next message with role=assistant after this timestamp)
      const assistantResponses = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.assistantId, message.assistantId),
            eq(chatMessages.role, "assistant"),
            gt(chatMessages.createdAt, message.createdAt)
          )
        )
        .orderBy(chatMessages.createdAt)
        .limit(1);

      // Delete both the user message and the assistant's response
      const idsToDelete = [messageId];
      if (assistantResponses.length > 0) {
        idsToDelete.push(assistantResponses[0].id);
      }

      await db
        .delete(chatMessages)
        .where(
          inArray(chatMessages.id, idsToDelete)
        );
    } else {
      // If it's an assistant message, just delete it
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.id, messageId));
    }
  }
}

export const storage = new DatabaseStorage();
