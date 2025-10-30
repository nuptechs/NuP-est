import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums para estruturar melhor os dados
export const learningDifficultyEnum = pgEnum("learning_difficulty", [
  "none", "adhd", "dyslexia", "autism", "dyscalculia", "attention_deficit", 
  "reading_comprehension", "math_difficulty", "memory_issues", "processing_speed", "other"
]);

export const knowledgeLevelEnum = pgEnum("knowledge_level", [
  "beginner", "basic", "intermediate", "advanced", "expert"
]);

export const learningStyleEnum = pgEnum("learning_style", [
  "visual", "auditory", "kinesthetic", "reading_writing", "mixed"
]);

// User storage table (mandatory for Replit Auth) - EXPANDIDO
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // ===== PERFIL BÁSICO =====
  age: integer("age"),
  studyProfile: varchar("study_profile").default("average"), // disciplined, undisciplined, average
  
  // ===== DIFICULDADES DE APRENDIZADO (deprecated - migrated to relational tables) =====
  customDifficulties: text("custom_difficulties"), // dificuldades personalizadas não categorizadas
  
  // ===== OBJETIVOS E CONTEXTO =====
  studyObjective: text("study_objective"), // concurso, vestibular, ENEM, etc.
  studyDeadline: timestamp("study_deadline"), // prazo para o objetivo
  dailyStudyHours: decimal("daily_study_hours", { precision: 3, scale: 1 }), // horas disponíveis por dia
  preferredStudyTime: varchar("preferred_study_time"), // manhã, tarde, noite
  
  // ===== PREFERÊNCIAS DE APRENDIZADO =====
  learningStyle: learningStyleEnum("learning_style").default("mixed"),
  preferredExplanationStyle: varchar("explanation_style").default("balanced"), // simple, detailed, practical, theoretical
  needsMotivation: boolean("needs_motivation").default(false),
  prefersExamples: boolean("prefers_examples").default(true),
  
  // ===== ONBOARDING =====
  onboardingCompleted: boolean("onboarding_completed").default(false),
  initialAssessmentCompleted: boolean("initial_assessment_completed").default(false),
  
  // ===== CONFIGURAÇÕES ADMINISTRATIVAS =====
  autoRefreshInterval: integer("auto_refresh_interval").default(60000), // Intervalo de atualização automática em ms (padrão: 60 segundos)
  isAdmin: boolean("is_admin").default(false), // TEMPORÁRIO: será substituído pelo sistema central NuPtechs
  
  // ===== TIMESTAMPS =====
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ===== CONHECIMENTO POR MATÉRIA =====
export const subjectKnowledge = pgTable("subject_knowledge", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectName: varchar("subject_name").notNull(), // Nome da matéria avaliada
  subjectCategory: varchar("subject_category").notNull(), // exatas, humanas, biologicas
  
  // === AVALIAÇÃO INICIAL ===
  initialLevel: knowledgeLevelEnum("initial_level"),
  initialScore: decimal("initial_score", { precision: 5, scale: 2 }), // 0-100%
  assessmentDate: timestamp("assessment_date").defaultNow(),
  
  // === EVOLUÇÃO ===
  currentLevel: knowledgeLevelEnum("current_level"),
  currentScore: decimal("current_score", { precision: 5, scale: 2 }),
  
  // === ESTATÍSTICAS ===
  totalQuestions: integer("total_questions").default(0),
  correctAnswers: integer("correct_answers").default(0),
  studyHours: decimal("study_hours", { precision: 8, scale: 2 }).default("0"),
  
  // === PADRÕES IDENTIFICADOS ===
  strongTopics: text("strong_topics").array().default(sql`'{}'::text[]`),
  weakTopics: text("weak_topics").array().default(sql`'{}'::text[]`),
  recommendedActions: text("recommended_actions"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ===== HISTÓRICO DE EVOLUÇÃO =====
export const learningHistory = pgTable("learning_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  
  // === EVENTO ===
  eventType: varchar("event_type").notNull(), // question_answered, material_studied, session_completed, level_up
  eventData: jsonb("event_data"), // dados específicos do evento
  
  // === PERFORMANCE ===
  previousScore: decimal("previous_score", { precision: 5, scale: 2 }),
  newScore: decimal("new_score", { precision: 5, scale: 2 }),
  scoreDelta: decimal("score_delta", { precision: 5, scale: 2 }),
  
  // === CONTEXTO ===
  sessionDuration: integer("session_duration"), // em minutos
  difficulty: varchar("difficulty"), // easy, medium, hard
  topics: text("topics").array().default(sql`'{}'::text[]`),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== RESULTADOS DE TESTES INICIAL =====
export const assessmentResults = pgTable("assessment_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // === TESTE ===
  assessmentType: varchar("assessment_type").notNull(), // initial_assessment, periodic_review
  subjectName: varchar("subject_name").notNull(),
  
  // === QUESTÕES E RESPOSTAS ===
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  timeSpent: integer("time_spent"), // em segundos
  
  // === ANÁLISE ===
  finalScore: decimal("final_score", { precision: 5, scale: 2 }).notNull(),
  determinedLevel: knowledgeLevelEnum("determined_level").notNull(),
  strengths: text("strengths").array().default(sql`'{}'::text[]`),
  weaknesses: text("weaknesses").array().default(sql`'{}'::text[]`),
  
  // === DETALHES ===
  questionsData: jsonb("questions_data"), // perguntas, respostas e análise
  recommendations: text("recommendations"),
  
  completedAt: timestamp("completed_at").defaultNow(),
});

// Knowledge Areas
export const knowledgeAreas = pgTable("knowledge_areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: varchar("color").default("#3b82f6"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_knowledge_areas_user_id").on(table.userId),
]);

// Study subjects
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  areaId: varchar("area_id").notNull().references(() => knowledgeAreas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // exatas, humanas, biologicas
  priority: varchar("priority").default("medium"), // high, medium, low
  color: varchar("color").default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subjects_user_area").on(table.userId, table.areaId),
]);

// Topics within subjects
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Processed files (shared across users for deduplication and efficiency)
export const processedFiles = pgTable("processed_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileHash: varchar("file_hash", { length: 64 }).notNull().unique(), // SHA-256 hash
  filePath: text("file_path").notNull(), // Physical file location
  fileName: text("file_name").notNull(), // Original filename
  fileType: varchar("file_type").notNull(), // pdf, document, spreadsheet, etc.
  fileSize: integer("file_size"), // Size in bytes
  pageCount: integer("page_count"), // Number of pages (for PDFs/documents)
  
  // Extracted content (shared processing result)
  extractedContent: text("extracted_content"),
  
  // AI-generated metadata (suggestions, user can override in materials)
  aiGeneratedTitle: text("ai_generated_title"),
  aiGeneratedDescription: text("ai_generated_description"),
  
  // Reference counting for safe deletion
  referenceCount: integer("reference_count").notNull().default(1),
  
  // Processing metadata
  processedAt: timestamp("processed_at").defaultNow(),
  processingStatus: varchar("processing_status").default("completed"), // pending, processing, completed, failed
  processingError: text("processing_error"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_processed_files_hash").on(table.fileHash),
  index("idx_processed_files_status").on(table.processingStatus),
]);

// Study materials (user's personal organization of content)
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  topicId: varchar("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  
  // User-customizable metadata
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // pdf, document, spreadsheet, video, text, link, etc.
  
  // Reference to shared processed file (if file-based material)
  processedFileId: varchar("processed_file_id").references(() => processedFiles.id, { onDelete: "set null" }),
  
  // For non-file materials (links, manual text entries)
  url: text("url"),
  content: text("content"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_materials_user_subject").on(table.userId, table.subjectId),
  index("idx_materials_processed_file").on(table.processedFileId),
]);

// ========== FASE 1: ARQUITETURA ESTRUTURADA PARA PROFESSOR ROBÔ + ML/DW ==========

// Content sources (professors, institutions, platforms) - CRITICAL FOR ANALYTICS
export const contentSources = pgTable("content_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source identification
  name: text("name").notNull(), // "Fábio Dutra", "Estratégia Concursos", etc.
  type: varchar("type").notNull(), // "professor", "institution", "platform", "author"
  specialty: text("specialty"), // "Direito Tributário", "Matemática", etc.
  
  // For professors
  institution: text("institution"), // Which institution they teach at
  
  // Analytics fields (computed from telemetry)
  ratingAverage: decimal("rating_average", { precision: 3, scale: 2 }), // 0.00-5.00
  totalMaterials: integer("total_materials").default(0),
  totalStudents: integer("total_students").default(0),
  
  // Extensible metadata (for future attributes)
  metadata: jsonb("metadata"), // {bio, website, social_media, etc.}
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_content_sources_type").on(table.type),
  index("idx_content_sources_name").on(table.name),
]);

// Material content segments (categorized: metadata, clean_content, irrelevant) - CORE OF PHASE 1
export const materialContentSegments = pgTable("material_content_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Links to material and processed file
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  processedFileId: varchar("processed_file_id").references(() => processedFiles.id, { onDelete: "cascade" }),
  
  // Content source (professor/institution that created this content)
  contentSourceId: varchar("content_source_id").references(() => contentSources.id, { onDelete: "set null" }),
  
  // === CATEGORIZED CONTENT (AI-processed) ===
  // Pedagogical metadata (professor info, course info, stats) - JSON for analytics
  pedagogicalMetadata: jsonb("pedagogical_metadata"), // {professor, institution, pages, exercises, etc.}
  
  // Clean content (pure pedagogical text) - USED BY ALL AI TOOLS
  cleanContent: text("clean_content"), // Concepts, definitions, theories - NO fluff
  
  // Irrelevant content (discarded from AI generation, kept for reference)
  irrelevantContent: text("irrelevant_content"), // Greetings, repeated intros, admin info
  
  // Segment metadata
  segmentType: varchar("segment_type").default("full"), // "full", "chapter", "section", "slide"
  segmentOrder: integer("segment_order").default(0), // Order within material
  contentHash: varchar("content_hash", { length: 64 }), // Hash for incremental updates
  
  // Processing info
  categorizationModel: varchar("categorization_model"), // Which AI model did categorization
  categorizationConfidence: decimal("categorization_confidence", { precision: 3, scale: 2 }), // 0.00-1.00
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_segments_material").on(table.materialId),
  index("idx_segments_content_source").on(table.contentSourceId),
  index("idx_segments_processed_file").on(table.processedFileId),
]);

// Segment topics (normalized topics for cross-material correlation) - ENABLES ML CORRELATIONS
export const segmentTopics = pgTable("segment_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  segmentId: varchar("segment_id").notNull().references(() => materialContentSegments.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(), // Normalized topic: "ICMS", "Princípio da Legalidade", etc.
  
  // Topic metadata
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // AI confidence in topic extraction
  isPrimary: boolean("is_primary").default(false), // Is this a primary topic of the segment?
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_segment_topics_segment").on(table.segmentId),
  index("idx_segment_topics_topic").on(table.topic),
  uniqueIndex("idx_segment_topics_unique").on(table.segmentId, table.topic), // No duplicate topics per segment
]);

// Study material events (telemetry for ML/analytics) - CANNOT BE RETROCOLLECTED
export const studyMaterialEvents = pgTable("study_material_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").references(() => materials.id, { onDelete: "cascade" }),
  segmentId: varchar("segment_id").references(() => materialContentSegments.id, { onDelete: "cascade" }),
  contentSourceId: varchar("content_source_id").references(() => contentSources.id, { onDelete: "set null" }),
  
  // Event type
  eventType: varchar("event_type").notNull(), // "start", "pause", "resume", "complete", "review"
  
  // Telemetry data
  durationSeconds: integer("duration_seconds"), // Time spent in this event
  difficultyPerceived: integer("difficulty_perceived"), // 1-5 scale, user-reported
  
  // Context
  sessionId: varchar("session_id").references(() => studySessions.id, { onDelete: "set null" }),
  deviceType: varchar("device_type"), // "desktop", "mobile", "tablet"
  
  // Extensible metadata
  eventMetadata: jsonb("event_metadata"), // {scroll_depth, highlights_count, notes_count, etc.}
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_study_events_user").on(table.userId),
  index("idx_study_events_segment").on(table.segmentId),
  index("idx_study_events_content_source").on(table.contentSourceId),
  index("idx_study_events_type").on(table.eventType),
  index("idx_study_events_created").on(table.createdAt),
]);

// Student profile traits (cognitive profile for personalization) - CRITICAL FOR PROFESSOR ROBÔ
export const studentProfileTraits = pgTable("student_profile_traits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Trait information
  traitType: varchar("trait_type").notNull(), // "TDAH", "dyslexia", "visual_learner", "fast_paced", etc.
  severity: varchar("severity"), // "mild", "moderate", "severe" (for learning difficulties)
  
  // Source of trait
  source: varchar("source").default("self_reported"), // "self_reported", "ai_detected", "professional_diagnosed"
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00-1.00 (for AI-detected)
  
  // Additional context
  notes: text("notes"), // User or AI notes about the trait
  metadata: jsonb("metadata"), // Extensible data
  
  // Status
  isActive: boolean("is_active").default(true), // Can be deactivated without deletion
  
  diagnosedAt: timestamp("diagnosed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_profile_traits_user").on(table.userId),
  index("idx_profile_traits_type").on(table.traitType),
  index("idx_profile_traits_active").on(table.isActive),
]);

// ========== END FASE 1 TABLES ==========

// Goals (macro objectives)
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Targets (micro goals)
export const targets = pgTable("targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: decimal("target_value", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }).default("0"),
  unit: varchar("unit"), // hours, questions, materials, etc
  deadline: timestamp("deadline"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Study sessions
export const studySessions = pgTable("study_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  topicId: varchar("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // theory, practice, ai_questions, review
  duration: integer("duration"), // in minutes
  questionsCorrect: integer("questions_correct").default(0),
  questionsTotal: integer("questions_total").default(0),
  score: decimal("score", { precision: 5, scale: 2 }),
  completed: boolean("completed").default(false),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// AI generated questions
export const aiQuestions = pgTable("ai_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  topicId: varchar("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").references(() => materials.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options"), // array of options for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  difficulty: varchar("difficulty").default("medium"), // easy, medium, hard
  studyProfile: varchar("study_profile"), // which profile this was generated for
  createdAt: timestamp("created_at").defaultNow(),
});

// Question attempts
export const questionAttempts = pgTable("question_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => aiQuestions.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => studySessions.id, { onDelete: "cascade" }),
  
  // FASE 1: Link to content source and segment for analytics
  contentSourceId: varchar("content_source_id").references(() => contentSources.id, { onDelete: "set null" }),
  segmentId: varchar("segment_id").references(() => materialContentSegments.id, { onDelete: "set null" }),
  
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: integer("time_spent"), // in seconds
  attemptedAt: timestamp("attempted_at").defaultNow(),
}, (table) => [
  index("idx_question_attempts_content_source").on(table.contentSourceId),
  index("idx_question_attempts_segment").on(table.segmentId),
]);

// Flashcard decks
export const flashcardDecks = pgTable("flashcard_decks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").references(() => materials.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  totalCards: integer("total_cards").default(0),
  studiedCards: integer("studied_cards").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual flashcards
export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deckId: varchar("deck_id").notNull().references(() => flashcardDecks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  front: text("front").notNull(), // pergunta
  back: text("back").notNull(), // resposta
  imageUrl: text("image_url"), // URL da imagem/screenshot associada ao flashcard
  order: integer("order").default(0),
  easeFactor: decimal("ease_factor", { precision: 3, scale: 2 }).default("2.5"), // spaced repetition
  interval: integer("interval").default(0), // days until next review
  repetitions: integer("repetitions").default(0),
  nextReview: timestamp("next_review").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flashcard review history
export const flashcardReviews = pgTable("flashcard_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flashcardId: varchar("flashcard_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quality: integer("quality").notNull(), // 0-5 difficulty rating
  previousEaseFactor: decimal("previous_ease_factor", { precision: 3, scale: 2 }),
  newEaseFactor: decimal("new_ease_factor", { precision: 3, scale: 2 }),
  previousInterval: integer("previous_interval"),
  newInterval: integer("new_interval"),
  timeSpent: integer("time_spent"), // seconds spent reviewing
  reviewedAt: timestamp("reviewed_at").defaultNow(),
});

// Knowledge base documents
export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category").notNull().default("Geral"), // base de conhecimento nomeada
  title: text("title").notNull(),
  description: text("description"),
  filename: text("filename").notNull(),
  fileSize: integer("file_size"),
  content: text("content"), // extracted text content
  chunks: jsonb("chunks"), // text chunks for search
  tags: jsonb("tags"), // array of tags for categorization
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge base chunks with embeddings
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding"), // OpenAI embedding vector
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== CONFIGURAÇÕES ADMINISTRATIVAS =====

// Enum para tipos de busca
export const searchTypeEnum = pgEnum("search_type", [
  "concurso_publico", "vestibular", "escola", "faculdade", "desenvolvimento_profissional", "outras"
]);

// Sites de busca configuráveis
export const searchSites = pgTable("search_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nome amigável do site (ex: "Cebraspe")
  url: text("url").notNull(), // URL base do site (ex: "https://www.cebraspe.org.br")
  description: text("description"), // Descrição opcional
  isActive: boolean("is_active").default(true), // Se o site está ativo para buscas
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Configuração de quais tipos de busca cada site suporta
export const siteSearchTypes = pgTable("site_search_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().references(() => searchSites.id, { onDelete: "cascade" }),
  searchType: searchTypeEnum("search_type").notNull(),
  isEnabled: boolean("is_enabled").default(true), // Se este tipo está habilitado para o site
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Índice único para evitar duplicatas de site + tipo de busca
  uniqueSiteSearchType: index("idx_unique_site_search_type").on(table.siteId, table.searchType),
}));

// ===== SISTEMA DE JOBS =====
export const jobStatusEnum = pgEnum("job_status", [
  "pending", "processing", "completed", "failed", "cancelled"
]);

export const jobTypeEnum = pgEnum("job_type", [
  "pdf_processing", "edital_processing", "document_analysis", "file_processing", "large_document_processing"
]);

export const fileTypeEnum = pgEnum("file_type", [
  "pdf", "docx", "doc", "xlsx", "xls", "json", "csv", "txt", "png", "jpg", "jpeg", "tiff", "tif"
]);

export const editalStatusEnum = pgEnum("edital_status", [
  "uploaded", "processing", "chunked", "indexed", "analyzed", "summary_generated", "completed", "failed"
]);

export const processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").default("pending").notNull(),
  
  // Dados do arquivo
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size"), // em bytes
  
  // Metadados específicos do job
  metadata: jsonb("metadata"), // dados flexíveis como concursoNome, etc
  
  // Controle de processamento
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  
  // Resultados e logs
  result: jsonb("result"), // resultado do processamento
  errorMessage: text("error_message"),
  processingLogs: text("processing_logs"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_processing_jobs_user").on(table.userId),
  index("idx_processing_jobs_status").on(table.status),
  index("idx_processing_jobs_type").on(table.type),
]);

// Parts for large document processing jobs
export const processingJobParts = pgTable("processing_job_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => processingJobs.id, { onDelete: "cascade" }),
  
  // Part information
  partNumber: integer("part_number").notNull(), // 1, 2, 3...
  totalParts: integer("total_parts").notNull(), // Total number of parts for context
  
  // Document section being processed
  sectionTitle: text("section_title"), // E.g., "Capítulos 1-5: Direito Constitucional"
  startPage: integer("start_page"),
  endPage: integer("end_page"),
  startIndex: integer("start_index"), // Character position in original text
  endIndex: integer("end_index"),
  
  // Processing status
  status: jobStatusEnum("status").default("pending").notNull(),
  attempts: integer("attempts").default(0),
  
  // Results
  chunksGenerated: integer("chunks_generated").default(0),
  errorMessage: text("error_message"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_job_parts_job").on(table.jobId),
  index("idx_job_parts_status").on(table.status),
]);

// ===== EDITAIS =====
export const editais = pgTable("editais", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Informações do arquivo
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size"),
  fileType: fileTypeEnum("file_type").notNull(),
  
  // Metadados do concurso
  concursoNome: varchar("concurso_nome").notNull(),
  status: editalStatusEnum("status").default("uploaded").notNull(),
  
  // Conteúdo e processamento
  rawContent: text("raw_content"), // Texto extraído do arquivo
  pineconeIndexed: boolean("pinecone_indexed").default(false),
  
  // Novo sistema: Sumário baseado em títulos
  titleChunks: jsonb("title_chunks"), // Chunks organizados por títulos
  smartSummary: jsonb("smart_summary"), // Sumário inteligente gerado pela IA
  documentStructure: jsonb("document_structure"), // Estrutura hierárquica do documento
  
  // Controle de processamento
  externalFileId: varchar("external_file_id"), // ID retornado pela aplicação externa (job_id)
  processingLogs: text("processing_logs"),
  errorMessage: text("error_message"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ===== SISTEMA DE ASSISTENTES PERSONALIZADOS =====

// Catálogo dinâmico de dificuldades de aprendizado (não enum-based)
export const learningDifficultiesCatalog = pgTable("learning_difficulties_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(), // e.g., "ADHD", "Dyslexia", "Autism"
  displayName: varchar("display_name").notNull(), // Nome amigável
  description: text("description"), // Descrição detalhada
  category: varchar("category").notNull(), // neurological, cognitive, sensory, emotional
  commonStrategies: text("common_strategies").array().default(sql`'{}'::text[]`), // Estratégias comuns
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de junção: dificuldades de aprendizado dos usuários
export const userLearningDifficulties = pgTable("user_learning_difficulties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  difficultyId: varchar("difficulty_id").notNull().references(() => learningDifficultiesCatalog.id, { onDelete: "cascade" }),
  severity: varchar("severity").default("moderate"), // "mild", "moderate", "severe"
  diagnosedBy: varchar("diagnosed_by"), // "professional", "self_reported", "system_detected"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_difficulties").on(table.userId, table.difficultyId),
  uniqueIndex("unique_user_difficulty").on(table.userId, table.difficultyId),
]);

// Tabela de junção: dificuldades de aprendizado dos perfis
export const profileLearningDifficulties = pgTable("profile_learning_difficulties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => studentLearningProfiles.id, { onDelete: "cascade" }),
  difficultyId: varchar("difficulty_id").notNull().references(() => learningDifficultiesCatalog.id, { onDelete: "cascade" }),
  impactLevel: decimal("impact_level", { precision: 3, scale: 2 }), // 0-1: quanto esta dificuldade afeta este perfil
  adaptationsApplied: jsonb("adaptations_applied"), // Quais adaptações estão sendo usadas
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_profile_difficulties").on(table.profileId, table.difficultyId),
  uniqueIndex("unique_profile_difficulty").on(table.profileId, table.difficultyId),
]);

// Perfis de aprendizado dos estudantes com versionamento
export const studentLearningProfiles = pgTable("student_learning_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1), // Versionamento do perfil
  isActive: boolean("is_active").default(true), // Apenas um perfil ativo por vez
  
  // Dificuldades de aprendizado (gerenciadas via tabela de junção profile_learning_difficulties)
  customDifficulties: text("custom_difficulties"), // Dificuldades personalizadas não no catálogo
  
  // Forças e fraquezas descobertas
  strengths: jsonb("strengths"), // { "visual_learning": 0.9, "pattern_recognition": 0.85, ... }
  weaknesses: jsonb("weaknesses"), // { "sustained_attention": 0.3, "working_memory": 0.4, ... }
  
  // Padrões de estudo descobertos
  optimalStudyDuration: integer("optimal_study_duration"), // minutos ideais de estudo
  bestStudyTimes: text("best_study_times").array().default(sql`'{}'::text[]`), // ["morning", "evening"]
  preferredContentTypes: text("preferred_content_types").array().default(sql`'{}'::text[]`), // ["video", "text", "interactive"]
  
  // Objetivos e contexto
  primaryGoal: text("primary_goal").notNull(), // "Concurso Público", "Vestibular", "ENEM"
  secondaryGoals: text("secondary_goals").array().default(sql`'{}'::text[]`),
  targetDate: timestamp("target_date"),
  availableHoursPerDay: decimal("available_hours_per_day", { precision: 3, scale: 1 }),
  
  // Motivação e preferências emocionais
  motivationLevel: decimal("motivation_level", { precision: 3, scale: 2 }), // 0-1
  needsEncouragement: boolean("needs_encouragement").default(false),
  respondsToGamification: boolean("responds_to_gamification").default(false),
  prefersStructuredPlan: boolean("prefers_structured_plan").default(true),
  
  // Metadados de descoberta
  discoverySource: varchar("discovery_source").notNull(), // "initial_assessment", "continuous_observation", "teacher_input"
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }), // Quão confiável é este perfil
  totalInteractions: integer("total_interactions").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assistentes personalizados de ensino
export const personalizedAssistants = pgTable("personalized_assistants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => studentLearningProfiles.id, { onDelete: "cascade" }),
  
  // Configuração do assistente
  name: varchar("name").notNull(), // Nome do assistente
  personality: varchar("personality").notNull(), // "encouraging", "professional", "friendly", "strict"
  communicationStyle: varchar("communication_style").notNull(), // "simple", "detailed", "visual", "step_by_step"
  
  // Sistema de memória
  shortTermMemory: jsonb("short_term_memory"), // Últimas interações e contexto imediato
  longTermMemory: jsonb("long_term_memory"), // Padrões e insights de longo prazo
  
  // Adaptações ativas
  currentAdaptations: jsonb("current_adaptations"), // Adaptações aplicadas baseadas no perfil
  
  // Estado do assistente
  isActive: boolean("is_active").default(true),
  lastInteraction: timestamp("last_interaction"),
  totalInteractions: integer("total_interactions").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Estratégias de ensino disponíveis
export const teachingStrategies = pgTable("teaching_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // "content_delivery", "assessment", "motivation", "organization"
  
  // Compatibilidade com dificuldades
  effectiveFor: varchar("effective_for").array().default(sql`'{}'::varchar[]`), // IDs de dificuldades
  notRecommendedFor: varchar("not_recommended_for").array().default(sql`'{}'::varchar[]`),
  
  // Configuração da estratégia
  implementationGuide: text("implementation_guide"), // Como implementar esta estratégia
  parameters: jsonb("parameters"), // Parâmetros configuráveis
  
  // Metadados
  evidenceLevel: varchar("evidence_level").default("research_based"), // "research_based", "expert_opinion", "experimental"
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Estratégias aplicadas a estudantes específicos
export const studentStrategies = pgTable("student_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => studentLearningProfiles.id, { onDelete: "cascade" }),
  strategyId: varchar("strategy_id").notNull().references(() => teachingStrategies.id, { onDelete: "cascade" }),
  
  // Status da aplicação
  status: varchar("status").notNull().default("active"), // "active", "testing", "paused", "discontinued"
  
  // Configuração personalizada
  customParameters: jsonb("custom_parameters"), // Parâmetros ajustados para este estudante
  
  // Efetividade
  effectivenessScore: decimal("effectiveness_score", { precision: 3, scale: 2 }), // 0-1
  totalApplications: integer("total_applications").default(0),
  successfulApplications: integer("successful_applications").default(0),
  
  // Observações
  observations: text("observations"), // Notas sobre como está funcionando
  
  startedAt: timestamp("started_at").defaultNow(),
  lastApplied: timestamp("last_applied"),
  discontinuedAt: timestamp("discontinued_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Avaliações adaptativas (sessões de avaliação)
export const adaptiveAssessments = pgTable("adaptive_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").references(() => studentLearningProfiles.id, { onDelete: "set null" }),
  assistantId: varchar("assistant_id").references(() => personalizedAssistants.id, { onDelete: "set null" }),
  
  // Tipo de avaliação
  assessmentType: varchar("assessment_type").notNull(), // "initial_mapping", "subject_diagnostic", "progress_check", "continuous"
  subjectArea: varchar("subject_area"), // Área sendo avaliada
  
  // Configuração adaptativa
  initialDifficulty: varchar("initial_difficulty").default("medium"), // "easy", "medium", "hard"
  adaptiveAlgorithm: varchar("adaptive_algorithm").default("irt"), // "irt", "cat", "simple"
  
  // Progresso
  expectedTotalQuestions: integer("expected_total_questions").default(10), // Número esperado de questões (backend-controlled)
  totalQuestions: integer("total_questions").default(0), // Questões respondidas até agora
  currentQuestion: integer("current_question").default(0),
  isComplete: boolean("is_complete").default(false),
  
  // Resultados
  estimatedAbility: decimal("estimated_ability", { precision: 5, scale: 2 }), // Habilidade estimada (IRT)
  confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }), // Confiança na estimativa
  identifiedStrengths: text("identified_strengths").array().default(sql`'{}'::text[]`),
  identifiedWeaknesses: text("identified_weaknesses").array().default(sql`'{}'::text[]`),
  
  // Descobertas
  discoveries: jsonb("discoveries"), // Insights sobre o estudante
  recommendedStrategies: varchar("recommended_strategies").array().default(sql`'{}'::varchar[]`), // IDs de estratégias
  
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Questões de avaliação adaptativa
export const assessmentQuestions = pgTable("assessment_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Conteúdo da questão
  question: text("question").notNull(),
  questionType: varchar("question_type").notNull(), // "multiple_choice", "true_false", "open_ended", "practical"
  options: jsonb("options"), // Para múltipla escolha
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  
  // Classificação
  subjectArea: varchar("subject_area").notNull(),
  topic: varchar("topic"),
  subtopic: varchar("subtopic"),
  
  // Parâmetros IRT (Item Response Theory)
  difficulty: decimal("difficulty", { precision: 5, scale: 2 }), // Parâmetro b (dificuldade)
  discrimination: decimal("discrimination", { precision: 5, scale: 2 }), // Parâmetro a (discriminação)
  guessing: decimal("guessing", { precision: 3, scale: 2 }), // Parâmetro c (acerto ao acaso)
  
  // Metadados adaptativos
  skillsTested: text("skills_tested").array().default(sql`'{}'::text[]`), // Habilidades testadas
  prerequisiteKnowledge: text("prerequisite_knowledge").array().default(sql`'{}'::text[]`),
  
  // Adaptações para dificuldades
  adaptationsAvailable: jsonb("adaptations_available"), // { "dyslexia": {...}, "adhd": {...} }
  
  // Qualidade
  timesUsed: integer("times_used").default(0),
  averageTimeSpent: integer("average_time_spent"), // segundos
  successRate: decimal("success_rate", { precision: 3, scale: 2 }),
  
  // Status
  isActive: boolean("is_active").default(true),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }), // 0-1
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tentativas de questões em avaliações adaptativas
export const studentAssessmentAttempts = pgTable("student_assessment_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => adaptiveAssessments.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => assessmentQuestions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Resposta
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: integer("time_spent"), // segundos
  
  // Adaptações aplicadas nesta questão
  adaptationsUsed: jsonb("adaptations_used"), // Quais adaptações foram aplicadas
  
  // Análise da tentativa
  difficultyPresentedAt: decimal("difficulty_presented_at", { precision: 5, scale: 2 }), // Dificuldade da questão no momento
  abilityEstimateAfter: decimal("ability_estimate_after", { precision: 5, scale: 2 }), // Habilidade estimada após esta resposta
  confidenceAfter: decimal("confidence_after", { precision: 3, scale: 2 }),
  
  // Observações comportamentais
  hintsRequested: integer("hints_requested").default(0),
  attemptChanges: integer("attempt_changes").default(0), // Quantas vezes mudou a resposta
  engagementLevel: varchar("engagement_level"), // "high", "medium", "low", "frustrated"
  
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

// Logs de interação para descoberta contínua
export const interactionLogs = pgTable("interaction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: varchar("assistant_id").references(() => personalizedAssistants.id, { onDelete: "set null" }),
  profileId: varchar("profile_id").references(() => studentLearningProfiles.id, { onDelete: "set null" }),
  
  // Tipo de interação
  interactionType: varchar("interaction_type").notNull(), // "question", "teaching", "assessment", "chat", "hint_request"
  context: varchar("context"), // "study_session", "quiz", "chat", "onboarding"
  
  // Conteúdo
  userInput: text("user_input"),
  assistantResponse: text("assistant_response"),
  
  // Análise comportamental
  emotionalState: varchar("emotional_state"), // "confident", "frustrated", "confused", "engaged", "bored"
  engagementLevel: decimal("engagement_level", { precision: 3, scale: 2 }), // 0-1
  comprehensionLevel: decimal("comprehension_level", { precision: 3, scale: 2 }), // 0-1 estimado
  
  // Descobertas desta interação
  discoveries: jsonb("discoveries"), // Novos insights sobre o estudante
  patternsDetected: text("patterns_detected").array().default(sql`'{}'::text[]`),
  
  // Metadados
  sessionDuration: integer("session_duration"), // duração da sessão em segundos
  deviceType: varchar("device_type"), // "mobile", "desktop", "tablet"
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Memória contextual do assistente
export const assistantMemory = pgTable("assistant_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assistantId: varchar("assistant_id").notNull().references(() => personalizedAssistants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Tipo de memória
  memoryType: varchar("memory_type").notNull(), // "fact", "preference", "pattern", "milestone", "concern"
  category: varchar("category").notNull(), // "learning", "behavior", "progress", "personal"
  
  // Conteúdo
  key: varchar("key").notNull(), // Chave da memória (e.g., "preferred_explanation_style")
  value: jsonb("value").notNull(), // Valor da memória
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // Confiança nesta memória
  
  // Contexto temporal
  isRecent: boolean("is_recent").default(true), // Se é memória recente (short-term)
  importance: decimal("importance", { precision: 3, scale: 2 }), // Importância desta memória
  
  // Rastreamento de uso
  timesAccessed: integer("times_accessed").default(0),
  lastAccessed: timestamp("last_accessed"),
  
  // Fonte e validade
  source: varchar("source").notNull(), // "observation", "assessment", "direct_input", "inference"
  validUntil: timestamp("valid_until"), // Quando esta memória expira
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_assistant_memory_lookup").on(table.assistantId, table.key),
]);

// Mensagens de chat do assistente (histórico de conversação)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assistantId: varchar("assistant_id").notNull().references(() => personalizedAssistants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Identificação da mensagem
  role: varchar("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  
  // Contexto da conversa
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  topicId: varchar("topic_id").references(() => topics.id, { onDelete: "set null" }),
  
  // Metadata
  tokenCount: integer("token_count"), // Tokens usados nesta mensagem
  model: varchar("model"), // Modelo de IA usado (se role = assistant)
  processingTime: integer("processing_time"), // Tempo de processamento em ms
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_assistant").on(table.assistantId, table.createdAt),
  index("idx_chat_messages_user").on(table.userId, table.createdAt),
]);

// ========== STUDENT PROFILE ENGINE ==========
// Perfil enriquecido do aluno (snapshot processado e sempre atualizado)
export const studentProfilesEnriched = pgTable("student_profiles_enriched", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  // === PERFIL BÁSICO (snapshot otimizado) ===
  name: varchar("name").notNull(),
  age: integer("age"),
  studyObjective: text("study_objective"),
  studyProfile: varchar("study_profile"),
  learningStyle: varchar("learning_style"),
  learningDifficulties: text("learning_difficulties").array().default(sql`'{}'::text[]`),
  
  // === MÉTRICAS AGREGADAS (processadas em background) ===
  totalStudyHours: decimal("total_study_hours", { precision: 10, scale: 2 }).default("0"),
  totalQuestions: integer("total_questions").default(0),
  correctAnswers: integer("correct_answers").default(0),
  overallAccuracy: decimal("overall_accuracy", { precision: 5, scale: 2 }).default("0"), // %
  
  // === EVOLUÇÃO (calculada periodicamente) ===
  weeklyProgress: decimal("weekly_progress", { precision: 5, scale: 2 }).default("0"), // % de melhoria
  monthlyProgress: decimal("monthly_progress", { precision: 5, scale: 2 }).default("0"),
  improvementTrend: varchar("improvement_trend"), // "ascending", "stable", "declining"
  
  // === TÓPICOS E MATÉRIAS ===
  strongSubjects: text("strong_subjects").array().default(sql`'{}'::text[]`),
  weakSubjects: text("weak_subjects").array().default(sql`'{}'::text[]`),
  currentFocus: text("current_focus").array().default(sql`'{}'::text[]`), // matérias em estudo ativo
  
  // === PADRÕES DE COMPORTAMENTO ===
  studyStreak: integer("study_streak").default(0), // dias consecutivos estudando
  avgSessionDuration: integer("avg_session_duration"), // minutos
  preferredStudyTime: varchar("preferred_study_time"), // detectado automaticamente
  engagementLevel: varchar("engagement_level"), // "high", "medium", "low"
  
  // === HISTÓRICO DE CONVERSAS (últimas N conversas resumidas) ===
  recentConversationsSummary: jsonb("recent_conversations_summary"), // últimas 5-10 conversas resumidas
  lastConversationDate: timestamp("last_conversation_date"),
  totalConversations: integer("total_conversations").default(0),
  
  // === RECOMENDAÇÕES ATUAIS (geradas por IA) ===
  recommendedActions: text("recommended_actions").array().default(sql`'{}'::text[]`),
  nextTopicsToStudy: text("next_topics_to_study").array().default(sql`'{}'::text[]`),
  motivationalMessage: text("motivational_message"),
  
  // === TIMESTAMPS ===
  lastProcessedAt: timestamp("last_processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_student_profiles_enriched_user").on(table.userId),
]);

// Resumos de conversas com Professor IA
export const conversationSummaries = pgTable("conversation_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull(), // ID da sessão do Professor IA
  
  // === METADATA DA CONVERSA ===
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // segundos
  
  // === CONTEÚDO DA CONVERSA ===
  subject: varchar("subject"), // matéria principal discutida
  topics: text("topics").array().default(sql`'{}'::text[]`), // tópicos abordados
  
  // === RESUMO GERADO POR IA ===
  summary: text("summary"), // resumo automático da conversa
  keyPoints: text("key_points").array().default(sql`'{}'::text[]`), // pontos principais
  questionsAsked: integer("questions_asked").default(0),
  conceptsExplained: text("concepts_explained").array().default(sql`'{}'::text[]`),
  
  // === ANÁLISE DE COMPREENSÃO ===
  studentUnderstanding: varchar("student_understanding"), // "excellent", "good", "partial", "struggling"
  difficultConcepts: text("difficult_concepts").array().default(sql`'{}'::text[]`),
  masteredConcepts: text("mastered_concepts").array().default(sql`'{}'::text[]`),
  
  // === SENTIMENTO E ENGAJAMENTO ===
  studentSentiment: varchar("student_sentiment"), // "motivated", "neutral", "frustrated"
  engagementScore: decimal("engagement_score", { precision: 3, scale: 2 }), // 0-5
  
  // === TRANSCRIÇÃO COMPLETA (opcional) ===
  fullTranscript: text("full_transcript"), // transcrição completa se necessário
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_conversation_summaries_user").on(table.userId, table.startedAt),
  index("idx_conversation_summaries_session").on(table.sessionId),
]);

// Métricas detalhadas de performance (calculadas periodicamente)
export const profileMetrics = pgTable("profile_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // === PERÍODO DE MEDIÇÃO ===
  metricType: varchar("metric_type").notNull(), // "daily", "weekly", "monthly"
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // === MÉTRICAS DE ESTUDO ===
  studyHours: decimal("study_hours", { precision: 6, scale: 2 }).default("0"),
  sessionsCount: integer("sessions_count").default(0),
  avgSessionDuration: integer("avg_session_duration"), // minutos
  
  // === MÉTRICAS DE PERFORMANCE ===
  questionsAnswered: integer("questions_answered").default(0),
  correctAnswers: integer("correct_answers").default(0),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }).default("0"), // %
  
  // === MÉTRICAS DE CONVERSAS ===
  conversationsCount: integer("conversations_count").default(0),
  avgConversationDuration: integer("avg_conversation_duration"), // segundos
  topicsDiscussed: text("topics_discussed").array().default(sql`'{}'::text[]`),
  
  // === COMPARAÇÃO COM PERÍODO ANTERIOR ===
  accuracyChange: decimal("accuracy_change", { precision: 5, scale: 2 }), // % de mudança
  studyHoursChange: decimal("study_hours_change", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_profile_metrics_user_period").on(table.userId, table.metricType, table.periodStart),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  knowledgeAreas: many(knowledgeAreas),
  subjects: many(subjects),
  materials: many(materials),
  goals: many(goals),
  targets: many(targets),
  studySessions: many(studySessions),
  aiQuestions: many(aiQuestions),
  questionAttempts: many(questionAttempts),
  flashcardDecks: many(flashcardDecks),
  flashcards: many(flashcards),
  flashcardReviews: many(flashcardReviews),
  knowledgeBase: many(knowledgeBase),
  knowledgeChunks: many(knowledgeChunks),
  // === NOVAS RELAÇÕES PARA PERFIL AVANÇADO ===
  subjectKnowledge: many(subjectKnowledge),
  learningHistory: many(learningHistory),
  assessmentResults: many(assessmentResults),
  editais: many(editais),
  // === RELAÇÕES DO SISTEMA DE ASSISTENTES PERSONALIZADOS ===
  userLearningDifficulties: many(userLearningDifficulties),
  learningProfiles: many(studentLearningProfiles),
  personalizedAssistants: many(personalizedAssistants),
  studentStrategies: many(studentStrategies),
  adaptiveAssessments: many(adaptiveAssessments),
  assessmentAttempts: many(studentAssessmentAttempts),
  interactionLogs: many(interactionLogs),
  assistantMemories: many(assistantMemory),
  chatMessages: many(chatMessages),
  // === RELAÇÕES DO STUDENT PROFILE ENGINE ===
  enrichedProfile: many(studentProfilesEnriched),
  conversationSummaries: many(conversationSummaries),
  profileMetrics: many(profileMetrics),
}));

export const knowledgeAreasRelations = relations(knowledgeAreas, ({ one, many }) => ({
  user: one(users, {
    fields: [knowledgeAreas.userId],
    references: [users.id],
  }),
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, {
    fields: [subjects.userId],
    references: [users.id],
  }),
  area: one(knowledgeAreas, {
    fields: [subjects.areaId],
    references: [knowledgeAreas.id],
  }),
  topics: many(topics),
  materials: many(materials),
  studySessions: many(studySessions),
  aiQuestions: many(aiQuestions),
  flashcardDecks: many(flashcardDecks),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [topics.subjectId],
    references: [subjects.id],
  }),
  materials: many(materials),
  studySessions: many(studySessions),
  aiQuestions: many(aiQuestions),
}));

export const processedFilesRelations = relations(processedFiles, ({ many }) => ({
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  user: one(users, {
    fields: [materials.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [materials.subjectId],
    references: [subjects.id],
  }),
  topic: one(topics, {
    fields: [materials.topicId],
    references: [topics.id],
  }),
  processedFile: one(processedFiles, {
    fields: [materials.processedFileId],
    references: [processedFiles.id],
  }),
  flashcardDecks: many(flashcardDecks),
  contentSegments: many(materialContentSegments),
  studyEvents: many(studyMaterialEvents),
}));

// ========== FASE 1: RELATIONS ==========

export const contentSourcesRelations = relations(contentSources, ({ many }) => ({
  segments: many(materialContentSegments),
  studyEvents: many(studyMaterialEvents),
  questionAttempts: many(questionAttempts),
}));

export const materialContentSegmentsRelations = relations(materialContentSegments, ({ one, many }) => ({
  material: one(materials, {
    fields: [materialContentSegments.materialId],
    references: [materials.id],
  }),
  processedFile: one(processedFiles, {
    fields: [materialContentSegments.processedFileId],
    references: [processedFiles.id],
  }),
  contentSource: one(contentSources, {
    fields: [materialContentSegments.contentSourceId],
    references: [contentSources.id],
  }),
  topics: many(segmentTopics),
  studyEvents: many(studyMaterialEvents),
  questionAttempts: many(questionAttempts),
}));

export const segmentTopicsRelations = relations(segmentTopics, ({ one }) => ({
  segment: one(materialContentSegments, {
    fields: [segmentTopics.segmentId],
    references: [materialContentSegments.id],
  }),
}));

export const studyMaterialEventsRelations = relations(studyMaterialEvents, ({ one }) => ({
  user: one(users, {
    fields: [studyMaterialEvents.userId],
    references: [users.id],
  }),
  material: one(materials, {
    fields: [studyMaterialEvents.materialId],
    references: [materials.id],
  }),
  segment: one(materialContentSegments, {
    fields: [studyMaterialEvents.segmentId],
    references: [materialContentSegments.id],
  }),
  contentSource: one(contentSources, {
    fields: [studyMaterialEvents.contentSourceId],
    references: [contentSources.id],
  }),
  session: one(studySessions, {
    fields: [studyMaterialEvents.sessionId],
    references: [studySessions.id],
  }),
}));

export const studentProfileTraitsRelations = relations(studentProfileTraits, ({ one }) => ({
  user: one(users, {
    fields: [studentProfileTraits.userId],
    references: [users.id],
  }),
}));

// ========== END FASE 1 RELATIONS ==========

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  targets: many(targets),
}));

export const targetsRelations = relations(targets, ({ one }) => ({
  user: one(users, {
    fields: [targets.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [targets.goalId],
    references: [goals.id],
  }),
}));

export const studySessionsRelations = relations(studySessions, ({ one, many }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [studySessions.subjectId],
    references: [subjects.id],
  }),
  topic: one(topics, {
    fields: [studySessions.topicId],
    references: [topics.id],
  }),
  questionAttempts: many(questionAttempts),
}));

export const aiQuestionsRelations = relations(aiQuestions, ({ one, many }) => ({
  user: one(users, {
    fields: [aiQuestions.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [aiQuestions.subjectId],
    references: [subjects.id],
  }),
  topic: one(topics, {
    fields: [aiQuestions.topicId],
    references: [topics.id],
  }),
  material: one(materials, {
    fields: [aiQuestions.materialId],
    references: [materials.id],
  }),
  attempts: many(questionAttempts),
}));

export const questionAttemptsRelations = relations(questionAttempts, ({ one }) => ({
  user: one(users, {
    fields: [questionAttempts.userId],
    references: [users.id],
  }),
  question: one(aiQuestions, {
    fields: [questionAttempts.questionId],
    references: [aiQuestions.id],
  }),
  session: one(studySessions, {
    fields: [questionAttempts.sessionId],
    references: [studySessions.id],
  }),
  contentSource: one(contentSources, {
    fields: [questionAttempts.contentSourceId],
    references: [contentSources.id],
  }),
  segment: one(materialContentSegments, {
    fields: [questionAttempts.segmentId],
    references: [materialContentSegments.id],
  }),
}));

export const flashcardDecksRelations = relations(flashcardDecks, ({ one, many }) => ({
  user: one(users, {
    fields: [flashcardDecks.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [flashcardDecks.subjectId],
    references: [subjects.id],
  }),
  material: one(materials, {
    fields: [flashcardDecks.materialId],
    references: [materials.id],
  }),
  flashcards: many(flashcards),
}));

export const flashcardsRelations = relations(flashcards, ({ one, many }) => ({
  deck: one(flashcardDecks, {
    fields: [flashcards.deckId],
    references: [flashcardDecks.id],
  }),
  user: one(users, {
    fields: [flashcards.userId],
    references: [users.id],
  }),
  reviews: many(flashcardReviews),
}));

export const flashcardReviewsRelations = relations(flashcardReviews, ({ one }) => ({
  flashcard: one(flashcards, {
    fields: [flashcardReviews.flashcardId],
    references: [flashcards.id],
  }),
  user: one(users, {
    fields: [flashcardReviews.userId],
    references: [users.id],
  }),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one, many }) => ({
  user: one(users, {
    fields: [knowledgeBase.userId],
    references: [users.id],
  }),
  chunks: many(knowledgeChunks),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  knowledgeBase: one(knowledgeBase, {
    fields: [knowledgeChunks.knowledgeBaseId],
    references: [knowledgeBase.id],
  }),
}));

// === RELAÇÕES DAS CONFIGURAÇÕES ADMINISTRATIVAS ===
export const searchSitesRelations = relations(searchSites, ({ many }) => ({
  searchTypes: many(siteSearchTypes),
}));

export const siteSearchTypesRelations = relations(siteSearchTypes, ({ one }) => ({
  site: one(searchSites, {
    fields: [siteSearchTypes.siteId],
    references: [searchSites.id],
  }),
}));

// === RELAÇÕES DAS NOVAS TABELAS ===
export const subjectKnowledgeRelations = relations(subjectKnowledge, ({ one }) => ({
  user: one(users, {
    fields: [subjectKnowledge.userId],
    references: [users.id],
  }),
}));

export const learningHistoryRelations = relations(learningHistory, ({ one }) => ({
  user: one(users, {
    fields: [learningHistory.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [learningHistory.subjectId],
    references: [subjects.id],
  }),
}));

export const assessmentResultsRelations = relations(assessmentResults, ({ one }) => ({
  user: one(users, {
    fields: [assessmentResults.userId],
    references: [users.id],
  }),
}));

export const editaisRelations = relations(editais, ({ one }) => ({
  user: one(users, {
    fields: [editais.userId],
    references: [users.id],
  }),
}));

// === RELAÇÕES DO SISTEMA DE ASSISTENTES PERSONALIZADOS ===
export const learningDifficultiesCatalogRelations = relations(learningDifficultiesCatalog, ({ many }) => ({
  userDifficulties: many(userLearningDifficulties),
  profileDifficulties: many(profileLearningDifficulties),
}));

export const userLearningDifficultiesRelations = relations(userLearningDifficulties, ({ one }) => ({
  user: one(users, {
    fields: [userLearningDifficulties.userId],
    references: [users.id],
  }),
  difficulty: one(learningDifficultiesCatalog, {
    fields: [userLearningDifficulties.difficultyId],
    references: [learningDifficultiesCatalog.id],
  }),
}));

export const profileLearningDifficultiesRelations = relations(profileLearningDifficulties, ({ one }) => ({
  profile: one(studentLearningProfiles, {
    fields: [profileLearningDifficulties.profileId],
    references: [studentLearningProfiles.id],
  }),
  difficulty: one(learningDifficultiesCatalog, {
    fields: [profileLearningDifficulties.difficultyId],
    references: [learningDifficultiesCatalog.id],
  }),
}));

export const studentLearningProfilesRelations = relations(studentLearningProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [studentLearningProfiles.userId],
    references: [users.id],
  }),
  learningDifficulties: many(profileLearningDifficulties),
  assistants: many(personalizedAssistants),
  strategies: many(studentStrategies),
  assessments: many(adaptiveAssessments),
}));

export const personalizedAssistantsRelations = relations(personalizedAssistants, ({ one, many }) => ({
  user: one(users, {
    fields: [personalizedAssistants.userId],
    references: [users.id],
  }),
  profile: one(studentLearningProfiles, {
    fields: [personalizedAssistants.profileId],
    references: [studentLearningProfiles.id],
  }),
  assessments: many(adaptiveAssessments),
  interactionLogs: many(interactionLogs),
  memories: many(assistantMemory),
  chatMessages: many(chatMessages),
}));

export const teachingStrategiesRelations = relations(teachingStrategies, ({ many }) => ({
  studentStrategies: many(studentStrategies),
}));

export const studentStrategiesRelations = relations(studentStrategies, ({ one }) => ({
  user: one(users, {
    fields: [studentStrategies.userId],
    references: [users.id],
  }),
  profile: one(studentLearningProfiles, {
    fields: [studentStrategies.profileId],
    references: [studentLearningProfiles.id],
  }),
  strategy: one(teachingStrategies, {
    fields: [studentStrategies.strategyId],
    references: [teachingStrategies.id],
  }),
}));

export const adaptiveAssessmentsRelations = relations(adaptiveAssessments, ({ one, many }) => ({
  user: one(users, {
    fields: [adaptiveAssessments.userId],
    references: [users.id],
  }),
  profile: one(studentLearningProfiles, {
    fields: [adaptiveAssessments.profileId],
    references: [studentLearningProfiles.id],
  }),
  assistant: one(personalizedAssistants, {
    fields: [adaptiveAssessments.assistantId],
    references: [personalizedAssistants.id],
  }),
  attempts: many(studentAssessmentAttempts),
}));

export const assessmentQuestionsRelations = relations(assessmentQuestions, ({ many }) => ({
  attempts: many(studentAssessmentAttempts),
}));

export const studentAssessmentAttemptsRelations = relations(studentAssessmentAttempts, ({ one }) => ({
  user: one(users, {
    fields: [studentAssessmentAttempts.userId],
    references: [users.id],
  }),
  assessment: one(adaptiveAssessments, {
    fields: [studentAssessmentAttempts.assessmentId],
    references: [adaptiveAssessments.id],
  }),
  question: one(assessmentQuestions, {
    fields: [studentAssessmentAttempts.questionId],
    references: [assessmentQuestions.id],
  }),
}));

export const interactionLogsRelations = relations(interactionLogs, ({ one }) => ({
  user: one(users, {
    fields: [interactionLogs.userId],
    references: [users.id],
  }),
  assistant: one(personalizedAssistants, {
    fields: [interactionLogs.assistantId],
    references: [personalizedAssistants.id],
  }),
  profile: one(studentLearningProfiles, {
    fields: [interactionLogs.profileId],
    references: [studentLearningProfiles.id],
  }),
}));

export const assistantMemoryRelations = relations(assistantMemory, ({ one }) => ({
  user: one(users, {
    fields: [assistantMemory.userId],
    references: [users.id],
  }),
  assistant: one(personalizedAssistants, {
    fields: [assistantMemory.assistantId],
    references: [personalizedAssistants.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  assistant: one(personalizedAssistants, {
    fields: [chatMessages.assistantId],
    references: [personalizedAssistants.id],
  }),
  subject: one(subjects, {
    fields: [chatMessages.subjectId],
    references: [subjects.id],
  }),
  topic: one(topics, {
    fields: [chatMessages.topicId],
    references: [topics.id],
  }),
}));

// Student Profile Engine Relations
export const studentProfilesEnrichedRelations = relations(studentProfilesEnriched, ({ one }) => ({
  user: one(users, {
    fields: [studentProfilesEnriched.userId],
    references: [users.id],
  }),
}));

export const conversationSummariesRelations = relations(conversationSummaries, ({ one }) => ({
  user: one(users, {
    fields: [conversationSummaries.userId],
    references: [users.id],
  }),
}));

export const profileMetricsRelations = relations(profileMetrics, ({ one }) => ({
  user: one(users, {
    fields: [profileMetrics.userId],
    references: [users.id],
  }),
}));

// Processing Jobs Relations
export const processingJobsRelations = relations(processingJobs, ({ one, many }) => ({
  user: one(users, {
    fields: [processingJobs.userId],
    references: [users.id],
  }),
  parts: many(processingJobParts),
}));

export const processingJobPartsRelations = relations(processingJobParts, ({ one }) => ({
  job: one(processingJobs, {
    fields: [processingJobParts.jobId],
    references: [processingJobs.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeAreaSchema = createInsertSchema(knowledgeAreas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

export const insertProcessedFileSchema = createInsertSchema(processedFiles).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

// ========== FASE 1: INSERT SCHEMAS ==========

export const insertContentSourceSchema = createInsertSchema(contentSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialContentSegmentSchema = createInsertSchema(materialContentSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSegmentTopicSchema = createInsertSchema(segmentTopics).omit({
  id: true,
  createdAt: true,
});

export const insertStudyMaterialEventSchema = createInsertSchema(studyMaterialEvents).omit({
  id: true,
  createdAt: true,
});

export const insertStudentProfileTraitSchema = createInsertSchema(studentProfileTraits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========== END FASE 1 INSERT SCHEMAS ==========

export const insertGoalSchema = createInsertSchema(goals, {
  targetDate: z.string().datetime().nullable().optional().transform((val) => 
    val ? new Date(val) : null
  ),
}).omit({
  id: true,
  createdAt: true,
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
}).extend({
  targetValue: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => 
    val === null || val === undefined ? null : val.toString()
  ),
  currentValue: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => 
    val === null || val === undefined ? "0" : val.toString()
  ),
  deadline: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => 
    val === null || val === undefined ? null : typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertStudySessionSchema = createInsertSchema(studySessions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertAiQuestionSchema = createInsertSchema(aiQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionAttemptSchema = createInsertSchema(questionAttempts).omit({
  id: true,
  attemptedAt: true,
});

export const insertFlashcardDeckSchema = createInsertSchema(flashcardDecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export const insertFlashcardReviewSchema = createInsertSchema(flashcardReviews).omit({
  id: true,
  reviewedAt: true,
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSearchSiteSchema = createInsertSchema(searchSites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSiteSearchTypeSchema = createInsertSchema(siteSearchTypes).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({
  id: true,
  createdAt: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertProcessingJobPartSchema = createInsertSchema(processingJobParts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
});

// === INSERT SCHEMAS PARA NOVAS TABELAS ===
export const insertSubjectKnowledgeSchema = createInsertSchema(subjectKnowledge).omit({
  id: true,
  assessmentDate: true,
  updatedAt: true,
});

export const insertLearningHistorySchema = createInsertSchema(learningHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAssessmentResultSchema = createInsertSchema(assessmentResults).omit({
  id: true,
  completedAt: true,
});

export const insertEditalSchema = createInsertSchema(editais).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

// === INSERT SCHEMAS DO SISTEMA DE ASSISTENTES PERSONALIZADOS ===
export const insertLearningDifficultyCatalogSchema = createInsertSchema(learningDifficultiesCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserLearningDifficultySchema = createInsertSchema(userLearningDifficulties).omit({
  id: true,
  createdAt: true,
});

export const insertProfileLearningDifficultySchema = createInsertSchema(profileLearningDifficulties).omit({
  id: true,
  createdAt: true,
});

export const insertStudentLearningProfileSchema = createInsertSchema(studentLearningProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonalizedAssistantSchema = createInsertSchema(personalizedAssistants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeachingStrategySchema = createInsertSchema(teachingStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentStrategySchema = createInsertSchema(studentStrategies).omit({
  id: true,
  startedAt: true,
  updatedAt: true,
});

export const insertAdaptiveAssessmentSchema = createInsertSchema(adaptiveAssessments).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  updatedAt: true,
});

export const insertAssessmentQuestionSchema = createInsertSchema(assessmentQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentAssessmentAttemptSchema = createInsertSchema(studentAssessmentAttempts).omit({
  id: true,
  attemptedAt: true,
});

export const insertInteractionLogSchema = createInsertSchema(interactionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAssistantMemorySchema = createInsertSchema(assistantMemory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Student Profile Engine Insert Schemas
export const insertStudentProfileEnrichedSchema = createInsertSchema(studentProfilesEnriched).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastProcessedAt: true,
});

export const insertConversationSummarySchema = createInsertSchema(conversationSummaries).omit({
  id: true,
  createdAt: true,
});

export const insertProfileMetricSchema = createInsertSchema(profileMetrics).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type KnowledgeArea = typeof knowledgeAreas.$inferSelect;
export type InsertKnowledgeArea = z.infer<typeof insertKnowledgeAreaSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type ProcessedFile = typeof processedFiles.$inferSelect;
export type InsertProcessedFile = z.infer<typeof insertProcessedFileSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

// ========== FASE 1: TYPES ==========
export type ContentSource = typeof contentSources.$inferSelect;
export type InsertContentSource = z.infer<typeof insertContentSourceSchema>;
export type MaterialContentSegment = typeof materialContentSegments.$inferSelect;
export type InsertMaterialContentSegment = z.infer<typeof insertMaterialContentSegmentSchema>;
export type SegmentTopic = typeof segmentTopics.$inferSelect;
export type InsertSegmentTopic = z.infer<typeof insertSegmentTopicSchema>;
export type StudyMaterialEvent = typeof studyMaterialEvents.$inferSelect;
export type InsertStudyMaterialEvent = z.infer<typeof insertStudyMaterialEventSchema>;
export type StudentProfileTrait = typeof studentProfileTraits.$inferSelect;
export type InsertStudentProfileTrait = z.infer<typeof insertStudentProfileTraitSchema>;
// ========== END FASE 1 TYPES ==========

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type StudySession = typeof studySessions.$inferSelect;
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type AiQuestion = typeof aiQuestions.$inferSelect;
export type InsertAiQuestion = z.infer<typeof insertAiQuestionSchema>;
export type QuestionAttempt = typeof questionAttempts.$inferSelect;
export type InsertQuestionAttempt = z.infer<typeof insertQuestionAttemptSchema>;
export type FlashcardDeck = typeof flashcardDecks.$inferSelect;
export type InsertFlashcardDeck = z.infer<typeof insertFlashcardDeckSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type FlashcardReview = typeof flashcardReviews.$inferSelect;
export type InsertFlashcardReview = z.infer<typeof insertFlashcardReviewSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type Edital = typeof editais.$inferSelect;
export type InsertEdital = z.infer<typeof insertEditalSchema>;

// === TIPOS PARA NOVAS TABELAS ===
export type SubjectKnowledge = typeof subjectKnowledge.$inferSelect;
export type InsertSubjectKnowledge = z.infer<typeof insertSubjectKnowledgeSchema>;
export type LearningHistory = typeof learningHistory.$inferSelect;
export type InsertLearningHistory = z.infer<typeof insertLearningHistorySchema>;
export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type InsertAssessmentResult = z.infer<typeof insertAssessmentResultSchema>;
export type SearchSite = typeof searchSites.$inferSelect;
export type InsertSearchSite = z.infer<typeof insertSearchSiteSchema>;
export type SiteSearchType = typeof siteSearchTypes.$inferSelect;
export type InsertSiteSearchType = z.infer<typeof insertSiteSearchTypeSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type ProcessingJobPart = typeof processingJobParts.$inferSelect;
export type InsertProcessingJobPart = z.infer<typeof insertProcessingJobPartSchema>;

// === TIPOS DO SISTEMA DE ASSISTENTES PERSONALIZADOS ===
export type LearningDifficultyCatalog = typeof learningDifficultiesCatalog.$inferSelect;
export type InsertLearningDifficultyCatalog = z.infer<typeof insertLearningDifficultyCatalogSchema>;
export type UserLearningDifficulty = typeof userLearningDifficulties.$inferSelect;
export type InsertUserLearningDifficulty = z.infer<typeof insertUserLearningDifficultySchema>;
export type ProfileLearningDifficulty = typeof profileLearningDifficulties.$inferSelect;
export type InsertProfileLearningDifficulty = z.infer<typeof insertProfileLearningDifficultySchema>;
export type StudentLearningProfile = typeof studentLearningProfiles.$inferSelect;
export type InsertStudentLearningProfile = z.infer<typeof insertStudentLearningProfileSchema>;
export type PersonalizedAssistant = typeof personalizedAssistants.$inferSelect;
export type InsertPersonalizedAssistant = z.infer<typeof insertPersonalizedAssistantSchema>;
export type TeachingStrategy = typeof teachingStrategies.$inferSelect;
export type InsertTeachingStrategy = z.infer<typeof insertTeachingStrategySchema>;
export type StudentStrategy = typeof studentStrategies.$inferSelect;
export type InsertStudentStrategy = z.infer<typeof insertStudentStrategySchema>;
export type AdaptiveAssessment = typeof adaptiveAssessments.$inferSelect;
export type InsertAdaptiveAssessment = z.infer<typeof insertAdaptiveAssessmentSchema>;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type InsertAssessmentQuestion = z.infer<typeof insertAssessmentQuestionSchema>;
export type StudentAssessmentAttempt = typeof studentAssessmentAttempts.$inferSelect;
export type InsertStudentAssessmentAttempt = z.infer<typeof insertStudentAssessmentAttemptSchema>;
export type InteractionLog = typeof interactionLogs.$inferSelect;
export type InsertInteractionLog = z.infer<typeof insertInteractionLogSchema>;
export type AssistantMemory = typeof assistantMemory.$inferSelect;
export type InsertAssistantMemory = z.infer<typeof insertAssistantMemorySchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Student Profile Engine Types
export type StudentProfileEnriched = typeof studentProfilesEnriched.$inferSelect;
export type InsertStudentProfileEnriched = z.infer<typeof insertStudentProfileEnrichedSchema>;
export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type InsertConversationSummary = z.infer<typeof insertConversationSummarySchema>;
export type ProfileMetric = typeof profileMetrics.$inferSelect;
export type InsertProfileMetric = z.infer<typeof insertProfileMetricSchema>;

// === API REQUEST VALIDATION SCHEMAS ===
export const generateQuestionRequestSchema = z.object({
  assistantId: z.string(),
  subjectId: z.string(),
  topicId: z.string().optional(),
  difficulty: z.union([
    z.number().min(-3).max(3),
    z.enum(['easy', 'medium', 'hard', 'difficult'])
  ]).optional().default(0),
});

export const generateHintRequestSchema = z.object({
  assistantId: z.string(),
  questionId: z.string(),
  currentAnswer: z.string().optional(),
  hintLevel: z.number().min(1).max(4),
});

export const generateExplanationRequestSchema = z.object({
  assistantId: z.string(),
  concept: z.string().optional(),
  questionContent: z.string().optional(),
  userAnswer: z.string().optional(),
  correctAnswer: z.string().optional(),
  wasCorrect: z.boolean().optional(),
  context: z.string().optional(),
});

export const chatRequestSchema = z.object({
  assistantId: z.string(),
  message: z.string(),
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  context: z.object({
    currentTopic: z.string().optional(),
    recentQuestions: z.array(z.string()).optional(),
  }).optional(),
});

export const updateProfileInteractionRequestSchema = z.object({
  assistantId: z.string(),
  interactionType: z.enum(['question', 'teaching', 'assessment', 'chat', 'hint_request']),
  interactionData: z.record(z.any()),
  engagement: z.string().optional(), // "high", "medium", "low"
  comprehension: z.string().optional(), // "high", "medium", "low"
});

export const submitAnswerRequestSchema = z.object({
  assessmentId: z.string(),
  questionId: z.string(),
  answer: z.string(),
  timeSpent: z.number().optional(),
  hintsRequested: z.number().optional(),
});
