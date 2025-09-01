import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
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

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  studyProfile: varchar("study_profile").default("average"), // disciplined, undisciplined, average
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Study subjects
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // exatas, humanas, biologicas
  priority: varchar("priority").default("medium"), // high, medium, low
  color: varchar("color").default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Topics within subjects
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Study materials
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  topicId: varchar("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // pdf, video, text, link
  filePath: text("file_path"),
  url: text("url"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: integer("time_spent"), // in seconds
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, {
    fields: [subjects.userId],
    references: [users.id],
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
  flashcardDecks: many(flashcardDecks),
}));

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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
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

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
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

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
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
