import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/ai";
import { ragService } from "./services/rag";
import { setupRAGRoutes } from "./routes/rag";
import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { 
  insertSubjectSchema, 
  insertTopicSchema, 
  insertMaterialSchema,
  insertGoalSchema,
  insertTargetSchema,
  insertStudySessionSchema,
  insertQuestionAttemptSchema,
  insertFlashcardDeckSchema,
  insertFlashcardSchema,
  insertFlashcardReviewSchema,
  insertKnowledgeBaseSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pdfService } from "./services/pdf";
import { embeddingsService } from "./services/embeddings";
import { knowledgeChunks } from "@shared/schema";
import { db } from "./db";

// Configure OpenAI for quiz generation
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      // Preservar a extensão original do arquivo
      const ext = path.extname(file.originalname);
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and MD files are allowed.'));
    }
  }
});

// Multer específico para PDFs da base de conhecimento
const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      // Preservar a extensão original do arquivo
      const ext = path.extname(file.originalname);
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for PDFs
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos para a base de conhecimento.'));
    }
  }
});

// Spaced Repetition Algorithm (SuperMemo 2)
function calculateSpacedRepetition(
  quality: number, // 0-5 rating
  easeFactor: string | number,
  interval: number,
  repetitions: number
) {
  const ef = typeof easeFactor === 'string' ? parseFloat(easeFactor) : easeFactor;
  let newEaseFactor = ef;
  let newInterval = interval;
  
  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
  } else {
    // Incorrect response - reset
    newInterval = 1;
  }
  
  // Update ease factor
  newEaseFactor = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  
  return {
    newEaseFactor: newEaseFactor.toString(),
    newInterval,
    nextReview
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      // TEMPORARIAMENTE remover TODOS os campos de timestamp
      const sanitizedUpdates = { ...updates };
      
      // Lista de TODOS os campos timestamp possíveis
      const timestampFields = [
        'createdAt', 'updatedAt', 'studyDeadline', 
        'assessmentDate', 'initialAssessmentCompleted'
      ];
      
      timestampFields.forEach(field => {
        delete sanitizedUpdates[field];
      });
      
      // Remover campos vazios
      Object.keys(sanitizedUpdates).forEach(key => {
        if (sanitizedUpdates[key] === undefined || sanitizedUpdates[key] === null || sanitizedUpdates[key] === '') {
          delete sanitizedUpdates[key];
        }
      });
      
      console.log("Final sanitized updates:", JSON.stringify(sanitizedUpdates, null, 2));
      
      const user = await storage.upsertUser({
        id: userId,
        ...sanitizedUpdates
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Subject routes
  app.get('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subjects = await storage.getSubjects(userId);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.post('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSubjectSchema.parse({
        ...req.body,
        userId
      });
      
      const subject = await storage.createSubject(validatedData);
      res.json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(400).json({ message: "Failed to create subject" });
    }
  });

  app.patch('/api/subjects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const subject = await storage.updateSubject(id, updates);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete('/api/subjects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubject(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // Topic routes
  app.get('/api/subjects/:subjectId/topics', isAuthenticated, async (req: any, res) => {
    try {
      const { subjectId } = req.params;
      const topics = await storage.getTopics(subjectId);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.post('/api/topics', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTopicSchema.parse(req.body);
      const topic = await storage.createTopic(validatedData);
      res.json(topic);
    } catch (error) {
      console.error("Error creating topic:", error);
      res.status(400).json({ message: "Failed to create topic" });
    }
  });

  // Material routes
  app.get('/api/materials', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId } = req.query;
      const materials = await storage.getMaterials(userId, subjectId as string);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.post('/api/materials', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let materialData = {
        ...req.body,
        userId
      };

      // If file was uploaded, process it
      if (req.file) {
        const filePath = req.file.path;
        materialData.filePath = filePath;
        materialData.type = path.extname(req.file.originalname).toLowerCase().substring(1);
        
        // Extract content from various file types for RAG
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        try {
          if (['.txt', '.md'].includes(fileExt)) {
            materialData.content = fs.readFileSync(filePath, 'utf-8');
          } else if (['.pdf', '.docx'].includes(fileExt)) {
            // Extract content for RAG migration
            materialData.content = await aiService.extractTextFromFile(filePath);
            console.log(`📝 Conteúdo extraído para RAG: ${materialData.content.length} caracteres`);
          }
        } catch (err) {
          console.error("Error extracting file content for RAG:", err);
        }
      }

      const validatedData = insertMaterialSchema.parse(materialData);
      const material = await storage.createMaterial(validatedData);
      
      // NOVO: Migrar automaticamente para RAG quando material é criado
      try {
        if (material.content) {
          await aiService.migrateToRAG(material, userId);
        }
      } catch (error) {
        console.log('⚠️ Falha na migração automática para RAG:', error);
        // Não falhar a criação do material por causa disso
      }
      
      res.json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(400).json({ message: "Failed to create material" });
    }
  });

  app.delete('/api/materials/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get material to delete file if exists
      const material = await storage.getMaterial(id);
      if (material?.filePath && fs.existsSync(material.filePath)) {
        fs.unlinkSync(material.filePath);
      }
      
      await storage.deleteMaterial(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ message: "Failed to delete material" });
    }
  });

  // Goal routes
  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertGoalSchema.parse({
        ...req.body,
        userId
      });
      
      const goal = await storage.createGoal(validatedData);
      res.json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(400).json({ message: "Failed to create goal" });
    }
  });

  // Target routes
  app.get('/api/targets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goalId } = req.query;
      const targets = await storage.getTargets(userId, goalId as string);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching targets:", error);
      res.status(500).json({ message: "Failed to fetch targets" });
    }
  });

  app.post('/api/targets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTargetSchema.parse({
        ...req.body,
        userId
      });
      
      const target = await storage.createTarget(validatedData);
      res.json(target);
    } catch (error) {
      console.error("Error creating target:", error);
      res.status(400).json({ message: "Failed to create target" });
    }
  });

  app.patch('/api/targets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const target = await storage.updateTarget(id, updates);
      res.json(target);
    } catch (error) {
      console.error("Error updating target:", error);
      res.status(400).json({ message: "Failed to update target" });
    }
  });

  // Study session routes
  app.get('/api/study-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit } = req.query;
      const sessions = await storage.getStudySessions(userId, limit ? parseInt(limit as string) : undefined);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching study sessions:", error);
      res.status(500).json({ message: "Failed to fetch study sessions" });
    }
  });

  app.post('/api/study-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertStudySessionSchema.parse({
        ...req.body,
        userId
      });
      
      const session = await storage.createStudySession(validatedData);
      res.json(session);
    } catch (error) {
      console.error("Error creating study session:", error);
      res.status(400).json({ message: "Failed to create study session" });
    }
  });

  app.patch('/api/study-sessions/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { score } = req.body;
      
      const session = await storage.completeStudySession(id, score);
      res.json(session);
    } catch (error) {
      console.error("Error completing study session:", error);
      res.status(400).json({ message: "Failed to complete study session" });
    }
  });

  // AI routes
  app.post('/api/ai/generate-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId, topicId, difficulty = "medium", questionCount = 5 } = req.body;

      // Get user profile
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get subject
      const subject = await storage.getSubject(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Get topic if specified
      let topic = undefined;
      if (topicId) {
        const topics = await storage.getTopics(subjectId);
        topic = topics.find(t => t.id === topicId);
      }

      // Get materials for context
      const materials = await storage.getMaterials(userId, subjectId);
      if (materials.length === 0) {
        return res.status(400).json({ message: "No materials found for this subject. Please upload study materials first." });
      }

      // Generate questions using AI
      const questions = await aiService.generateQuestions({
        subject,
        topic,
        materials,
        studyProfile: user.studyProfile || "average",
        difficulty,
        questionCount
      });

      // Save questions to database
      const savedQuestions = [];
      for (const q of questions) {
        const aiQuestion = await storage.createAiQuestion({
          userId,
          subjectId,
          topicId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          studyProfile: user.studyProfile || "average"
        });
        savedQuestions.push(aiQuestion);
      }

      res.json(savedQuestions);
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Failed to generate questions: " + (error as Error).message });
    }
  });

  app.post('/api/ai/recommendation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const user = await storage.getUser(userId);
      const subjects = await storage.getSubjects(userId);
      const recentSessions = await storage.getStudySessions(userId, 5);
      
      const recommendation = await aiService.generateStudyRecommendation(
        user?.studyProfile || "average",
        subjects,
        recentSessions
      );
      
      res.json({ recommendation });
    } catch (error) {
      console.error("Error generating recommendation:", error);
      res.status(500).json({ message: "Failed to generate recommendation" });
    }
  });

  app.post('/api/ai/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { question, selectedGoal, selectedKnowledgeCategory } = req.body;
      
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ message: "Pergunta é obrigatória" });
      }
      
      const user = await storage.getUser(userId);
      const subjects = await storage.getSubjects(userId);
      
      const response = await aiService.chatWithAI(
        question.trim(), 
        user?.studyProfile || "average", 
        subjects,
        selectedGoal,
        userId,
        selectedKnowledgeCategory
      );
      
      // Ensure we always return a valid response
      if (!response || response.trim().length === 0) {
        return res.json({ response: "Desculpe, não consegui processar sua pergunta no momento. Tente novamente." });
      }
      
      res.json({ response: response.trim() });
    } catch (error) {
      console.error("Error in AI chat:", error);
      
      // Return user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return res.status(429).json({ message: "Limite de uso da IA atingido. Tente novamente em alguns minutos." });
      }
      
      res.status(500).json({ message: "Erro temporário no assistente. Tente novamente." });
    }
  });

  // Question attempt routes
  app.post('/api/question-attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertQuestionAttemptSchema.parse({
        ...req.body,
        userId
      });
      
      const attempt = await storage.createQuestionAttempt(validatedData);
      res.json(attempt);
    } catch (error) {
      console.error("Error creating question attempt:", error);
      res.status(400).json({ message: "Failed to create question attempt" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get('/api/analytics/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getSubjectProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching subject progress:", error);
      res.status(500).json({ message: "Failed to fetch subject progress" });
    }
  });

  app.get('/api/analytics/weekly', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getWeeklyProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching weekly progress:", error);
      res.status(500).json({ message: "Failed to fetch weekly progress" });
    }
  });

  // Flashcard Deck routes
  app.get('/api/flashcard-decks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId } = req.query;
      const decks = await storage.getFlashcardDecks(userId, subjectId as string);
      res.json(decks);
    } catch (error) {
      console.error("Error fetching flashcard decks:", error);
      res.status(500).json({ message: "Failed to fetch flashcard decks" });
    }
  });

  app.post('/api/flashcard-decks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deckData = insertFlashcardDeckSchema.parse({ ...req.body, userId });
      const deck = await storage.createFlashcardDeck(deckData);
      res.json(deck);
    } catch (error) {
      console.error("Error creating flashcard deck:", error);
      res.status(400).json({ message: "Failed to create flashcard deck" });
    }
  });

  app.get('/api/flashcard-decks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deck = await storage.getFlashcardDeck(req.params.id);
      if (!deck) {
        return res.status(404).json({ message: "Flashcard deck not found" });
      }
      res.json(deck);
    } catch (error) {
      console.error("Error fetching flashcard deck:", error);
      res.status(500).json({ message: "Failed to fetch flashcard deck" });
    }
  });

  app.patch('/api/flashcard-decks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updates = req.body;
      const deck = await storage.updateFlashcardDeck(req.params.id, updates);
      res.json(deck);
    } catch (error) {
      console.error("Error updating flashcard deck:", error);
      res.status(400).json({ message: "Failed to update flashcard deck" });
    }
  });

  app.delete('/api/flashcard-decks/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteFlashcardDeck(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting flashcard deck:", error);
      res.status(500).json({ message: "Failed to delete flashcard deck" });
    }
  });

  // Flashcard routes
  app.get('/api/flashcard-decks/:deckId/flashcards', isAuthenticated, async (req: any, res) => {
    try {
      const flashcards = await storage.getFlashcards(req.params.deckId);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  app.post('/api/flashcard-decks/:deckId/flashcards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const flashcardData = insertFlashcardSchema.parse({ 
        ...req.body, 
        userId, 
        deckId: req.params.deckId 
      });
      const flashcard = await storage.createFlashcard(flashcardData);
      res.json(flashcard);
    } catch (error) {
      console.error("Error creating flashcard:", error);
      res.status(400).json({ message: "Failed to create flashcard" });
    }
  });

  app.patch('/api/flashcards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updates = req.body;
      const flashcard = await storage.updateFlashcard(req.params.id, updates);
      res.json(flashcard);
    } catch (error) {
      console.error("Error updating flashcard:", error);
      res.status(400).json({ message: "Failed to update flashcard" });
    }
  });

  app.delete('/api/flashcards/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteFlashcard(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      res.status(500).json({ message: "Failed to delete flashcard" });
    }
  });

  // Flashcard Review routes
  app.get('/api/flashcards/review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { deckId } = req.query;
      const flashcards = await storage.getFlashcardsForReview(userId, deckId as string);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards for review:", error);
      res.status(500).json({ message: "Failed to fetch flashcards for review" });
    }
  });

  app.post('/api/flashcards/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const flashcardId = req.params.id;
      const { quality, timeSpent } = req.body;

      // Get current flashcard
      const flashcard = await storage.getFlashcard(flashcardId);
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }

      // Calculate new spaced repetition values
      const { newEaseFactor, newInterval, nextReview } = calculateSpacedRepetition(
        quality,
        flashcard.easeFactor || "2.5",
        flashcard.interval || 0,
        flashcard.repetitions || 0
      );

      // Create review record
      const reviewData = insertFlashcardReviewSchema.parse({
        flashcardId,
        userId,
        quality,
        previousEaseFactor: flashcard.easeFactor,
        newEaseFactor,
        previousInterval: flashcard.interval,
        newInterval,
        timeSpent
      });
      
      await storage.createFlashcardReview(reviewData);

      // Update flashcard with new values
      const updatedFlashcard = await storage.updateFlashcard(flashcardId, {
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: (flashcard.repetitions || 0) + 1,
        nextReview
      });

      res.json(updatedFlashcard);
    } catch (error) {
      console.error("Error recording flashcard review:", error);
      res.status(400).json({ message: "Failed to record flashcard review" });
    }
  });

  // AI Flashcard Generation route
  app.post('/api/ai/generate-flashcards', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, subjectId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "File is required" });
      }

      // Extract text from uploaded file
      const fileContent = await aiService.extractTextFromFile(file.path);
      console.log(`📄 Arquivo processado: ${file.originalname}`);
      console.log(`📝 Conteúdo extraído (${fileContent.length} caracteres):`, fileContent.substring(0, 200) + '...');
      
      // Verificar se o conteúdo foi extraído corretamente
      if (!fileContent || fileContent.length < 20) {
        return res.status(400).json({ 
          message: "Não foi possível extrair conteúdo suficiente do arquivo. Verifique se é um arquivo de texto válido." 
        });
      }

      // Get user profile for personalized flashcards
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // **NOVO**: Criar material permanente para armazenamento
      const materialData = insertMaterialSchema.parse({
        userId,
        subjectId: subjectId || null,
        title: title || `Material - ${file.originalname}`,
        description: description || `Material criado a partir do arquivo: ${file.originalname}`,
        type: path.extname(file.originalname).toLowerCase().substring(1),
        filePath: file.path,
        content: fileContent
      });

      const createdMaterial = await storage.createMaterial(materialData);

      // **NOVO**: Gerar embeddings do conteúdo
      try {
        console.log('🔄 Gerando embeddings para o material...');
        const preparedText = embeddingsService.prepareTextForEmbedding(fileContent);
        const embedding = await embeddingsService.generateEmbedding(preparedText);
        
        // Armazenar embedding no material (adicionaremos campo embedding na schema)
        console.log('✅ Embeddings gerados com sucesso!');
      } catch (embeddingError) {
        console.error('❌ Erro ao gerar embeddings (continuando sem eles):', embeddingError);
      }

      // **MELHORADO**: Análise inteligente do conteúdo antes de gerar flashcards
      const contentAnalysis = await aiService.analyzeStudyMaterial(fileContent, subjectId || "Geral");
      
      // Generate flashcards using AI com análise aprimorada
      const count = req.body.count ? parseInt(req.body.count) : 10;
      const flashcardCount = Math.min(Math.max(count, 1), 50); // Entre 1 e 50
      
      const generatedFlashcards = await aiService.generateFlashcards({
        content: fileContent,
        studyProfile: user.studyProfile || "average",
        subject: subjectId,
        count: flashcardCount
      });

      // Create flashcard deck
      const deckData = insertFlashcardDeckSchema.parse({
        userId,
        subjectId: subjectId || null,
        title: title || `Flashcards - ${file.originalname}`,
        description: description || `Flashcards gerados automaticamente do arquivo: ${file.originalname}`,
        totalCards: generatedFlashcards.length,
        studiedCards: 0
      });

      const deck = await storage.createFlashcardDeck(deckData);

      // Create individual flashcards
      const savedFlashcards = [];
      for (let i = 0; i < generatedFlashcards.length; i++) {
        const fc = generatedFlashcards[i];
        const flashcardData = insertFlashcardSchema.parse({
          deckId: deck.id,
          userId,
          front: fc.front,
          back: fc.back,
          order: i,
          easeFactor: "2.5",
          interval: 0,
          repetitions: 0,
          nextReview: new Date()
        });
        
        const savedFlashcard = await storage.createFlashcard(flashcardData);
        savedFlashcards.push(savedFlashcard);
      }

      // **ALTERADO**: Não deletar arquivo pois foi salvo como material permanente
      // fs.unlinkSync(file.path); // Mantemos o arquivo para o material

      res.json({
        deck,
        flashcards: savedFlashcards
      });
    } catch (error) {
      console.error("Error generating flashcards:", error);
      res.status(500).json({ message: "Failed to generate flashcards: " + (error as Error).message });
    }
  });

  // Generate flashcards from existing materials
  app.post('/api/ai/generate-flashcards-from-material', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { materialId, title, description, subjectId, count } = req.body;

      if (!materialId) {
        return res.status(400).json({ message: "Material ID is required" });
      }

      // Get the material
      const material = await storage.getMaterial(materialId);
      if (!material || material.userId !== userId) {
        return res.status(404).json({ message: "Material not found" });
      }

      // Get material content
      let content = material.content || "";
      if (material.filePath && !content) {
        // Extract content from file if not already stored
        content = await aiService.extractTextFromFile(material.filePath);
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Material has no readable content" });
      }

      // Get user profile for personalized flashcards
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate and set flashcard count
      const flashcardCount = Math.min(Math.max(count || 10, 1), 50);

      // Generate flashcards using AI
      const generatedFlashcards = await aiService.generateFlashcards({
        content,
        studyProfile: user.studyProfile || "average",
        subject: subjectId || material.subjectId,
        count: flashcardCount
      });

      // Create flashcard deck
      const deckData = insertFlashcardDeckSchema.parse({
        userId,
        subjectId: subjectId || material.subjectId || null,
        title: title || `Flashcards - ${material.title}`,
        description: description || `Flashcards gerados do material: ${material.title}`,
        totalCards: generatedFlashcards.length,
        studiedCards: 0
      });

      const deck = await storage.createFlashcardDeck(deckData);

      // Create individual flashcards
      const savedFlashcards = [];
      for (let i = 0; i < generatedFlashcards.length; i++) {
        const fc = generatedFlashcards[i];
        const flashcardData = insertFlashcardSchema.parse({
          deckId: deck.id,
          userId,
          front: fc.front,
          back: fc.back,
          order: i,
          easeFactor: "2.5",
          interval: 0,
          repetitions: 0,
          nextReview: new Date()
        });
        
        const savedFlashcard = await storage.createFlashcard(flashcardData);
        savedFlashcards.push(savedFlashcard);
      }

      res.json({
        deck,
        flashcards: savedFlashcards
      });
    } catch (error) {
      console.error("Error generating flashcards from material:", error);
      res.status(500).json({ message: "Failed to generate flashcards from material: " + (error as Error).message });
    }
  });

  // Knowledge Base routes
  // Get knowledge base categories
  app.get('/api/knowledge-base/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categories = await storage.getKnowledgeCategories(userId);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching knowledge base categories:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge base categories' });
    }
  });

  app.get('/api/knowledge-base', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.query;
      const documents = await storage.getKnowledgeBase(userId, category as string);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge base' });
    }
  });

  app.get('/api/knowledge-base/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categories = await storage.getKnowledgeCategories(userId);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching knowledge categories:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge categories' });
    }
  });

  app.post('/api/knowledge-base', isAuthenticated, pdfUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, tags, category } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: 'Arquivo PDF é obrigatório' });
      }

      if (!title) {
        return res.status(400).json({ message: 'Título é obrigatório' });
      }

      // Processar o PDF
      const pdfResult = await pdfService.processPDF(req.file.path);
      
      // Criar entrada na base de conhecimento
      const documentData = {
        userId,
        title,
        description: description || '',
        category: category || 'Geral',
        filename: req.file.originalname,
        fileSize: req.file.size,
        content: pdfResult.text,
        chunks: pdfResult.chunks,
        tags: tags ? JSON.parse(tags) : []
      };

      const validatedData = insertKnowledgeBaseSchema.parse(documentData);
      const document = await storage.createKnowledgeDocument(validatedData);

      // Gerar embeddings para os chunks
      if (pdfResult.chunks && pdfResult.chunks.length > 0) {
        try {
          console.log(`🔄 Gerando embeddings para ${pdfResult.chunks.length} chunks...`);
          const embeddings = await embeddingsService.generateEmbeddings(pdfResult.chunks);
          
          const chunksWithEmbeddings = pdfResult.chunks.map((content, index) => ({
            knowledgeBaseId: document.id,
            chunkIndex: index,
            content: content,
            embedding: embeddings[index],
          }));

          await storage.createKnowledgeChunks(chunksWithEmbeddings);
          console.log(`✅ Embeddings gerados para o documento: ${title}`);
        } catch (error) {
          console.error("❌ Erro ao gerar embeddings:", error);
          // Não falha o upload, apenas logs o erro
        }
      }

      // NOVO: Migrar automaticamente para RAG/Pinecone
      try {
        if (document.content) {
          console.log(`🚀 Migrando "${document.title}" para RAG/Pinecone...`);
          await aiService.migrateToRAG(document, userId);
        }
      } catch (error) {
        console.log('⚠️ Falha na migração automática para RAG:', error);
      }

      // Limpar arquivo temporário
      pdfService.cleanupFile(req.file.path);

      res.status(201).json(document);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      
      // Limpar arquivo em caso de erro
      if (req.file) {
        pdfService.cleanupFile(req.file.path);
      }

      if (error instanceof Error && error.message.includes('PDF')) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: 'Falha ao processar arquivo PDF' });
    }
  });

  app.put('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, tags, isActive } = req.body;
      
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (tags !== undefined) updates.tags = tags;
      if (isActive !== undefined) updates.isActive = isActive;

      const document = await storage.updateKnowledgeDocument(id, updates);
      res.json(document);
    } catch (error) {
      console.error('Error updating knowledge document:', error);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  app.patch('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { category } = req.body;
      
      if (!category) {
        return res.status(400).json({ message: 'Categoria é obrigatória' });
      }
      
      const updatedDocument = await storage.updateKnowledgeDocument(id, { category });
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating knowledge document:', error);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  app.delete('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteKnowledgeDocument(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting knowledge document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // Endpoint para reprocessar documentos sem embeddings
  app.post('/api/knowledge-base/reprocess-embeddings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Buscar documentos do usuário
      const documents = await storage.getKnowledgeBase(userId);
      let processedCount = 0;
      let errorCount = 0;
      
      console.log(`🔄 Iniciando reprocessamento de ${documents.length} documentos...`);
      
      for (const document of documents) {
        try {
          // Verificar se já tem embeddings
          const existingChunks = await db
            .select()
            .from(knowledgeChunks)
            .where(eq(knowledgeChunks.knowledgeBaseId, document.id));
            
          if (existingChunks.length > 0) {
            console.log(`📋 "${document.title}" já tem embeddings, pulando...`);
            continue;
          }
          
          // Gerar embeddings para os chunks existentes
          if (document.chunks && Array.isArray(document.chunks) && document.chunks.length > 0) {
            console.log(`🔄 Processando "${document.title}" (${document.chunks.length} chunks)...`);
            
            const embeddings = await embeddingsService.generateEmbeddings(document.chunks);
            
            const chunksWithEmbeddings = document.chunks.map((content, index) => ({
              knowledgeBaseId: document.id,
              chunkIndex: index,
              content: content,
              embedding: embeddings[index],
            }));

            await storage.createKnowledgeChunks(chunksWithEmbeddings);
            console.log(`✅ Embeddings gerados para "${document.title}"`);
            processedCount++;
          }
        } catch (error) {
          console.error(`❌ Erro ao processar "${document.title}":`, error);
          errorCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Processamento concluído: ${processedCount} documentos processados, ${errorCount} erros.`,
        processed: processedCount,
        errors: errorCount,
        total: documents.length
      });
    } catch (error) {
      console.error('Error reprocessing embeddings:', error);
      res.status(500).json({ message: 'Failed to reprocess embeddings' });
    }
  });

  // === QUIZ ROUTES ===
  // Gerar quiz
  app.post('/api/quiz/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId, topicId, difficulty, questionCount } = req.body;

      // Buscar a matéria para contexto
      const subject = await storage.getSubject(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Buscar o perfil do usuário para personalização
      const user = await storage.getUser(userId);
      
      // Adaptar prompt baseado no perfil do usuário
      const profilePrompts = {
        disciplined: "Crie questões analíticas e desafiadoras que exigem pensamento crítico e aplicação profunda dos conceitos.",
        undisciplined: "Crie questões práticas e envolventes com exemplos do mundo real para manter o interesse e motivação.",
        average: "Crie questões equilibradas entre teoria e prática com explicações claras para reforçar o aprendizado."
      };
      
      const profileStrategy = profilePrompts[user?.studyProfile as keyof typeof profilePrompts] || profilePrompts.average;
      
      // Gerar questões usando IA com prompt avançado
      const prompt = `Você é um especialista em educação criando questões personalizadas de alta qualidade.

CONTEXTO DO ESTUDANTE:
- Perfil: ${user?.studyProfile || 'average'}
- Estratégia: ${profileStrategy}
- Matéria: ${subject.name} - ${subject.description || 'Sem descrição'}
- Nível: ${difficulty === "mixed" ? "variado (fácil, médio, difícil)" : difficulty}

INSTRUÇÕES PARA GERAR ${questionCount} QUESTÕES:

1. **QUALIDADE DAS QUESTÕES:**
   - Base cada questão em conceitos fundamentais da matéria
   - Evite pegadinhas desnecessárias
   - Use linguagem clara e precisa
   - Teste conhecimento aplicado, não apenas memorização

2. **OPÇÕES DE RESPOSTA:**
   - 4 alternativas plausíveis e bem elaboradas
   - Distratores inteligentes (baseados em erros comuns)
   - Uma resposta claramente correta
   - Evite opções absurdas ou óbvias

3. **EXPLICAÇÕES EDUCATIVAS:**
   - Explique por que a resposta correta está certa
   - Mencione por que cada alternativa incorreta está errada
   - Adicione dicas para fixar o conceito
   - Use exemplos práticos quando possível

4. **NÍVEIS DE DIFICULDADE:**
   - Fácil: Conceitos básicos, definições e reconhecimento
   - Médio: Aplicação de conceitos, análise e compreensão
   - Difícil: Síntese, avaliação crítica e resolução de problemas complexos

FORMATO JSON (retorne APENAS o JSON válido, sem texto adicional):
[
  {
    "question": "Questão formulada de forma clara e específica",
    "options": ["A) Primeira opção detalhada", "B) Segunda opção detalhada", "C) Terceira opção detalhada", "D) Quarta opção detalhada"],
    "correctAnswer": 0,
    "explanation": "RESPOSTA CORRETA: A) ... [explicação] | POR QUE AS OUTRAS ESTÃO ERRADAS: B) ... C) ... D) ... | DICA PARA LEMBRAR: ...",
    "difficulty": "${difficulty === "mixed" ? "easy" : difficulty}",
    "topic": "${subject.name}",
    "points": ${difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30}
  }
]

IMPORTANTE: Gere questões de qualidade acadêmica que realmente testem o conhecimento do estudante!`;

      // Fazer chamada direta à API de IA
      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || "";

      let questions;
      try {
        // Tentar extrair JSON da resposta
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          questions = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return res.status(500).json({ message: "Failed to generate valid quiz questions" });
      }

      // Validar e enriquecer questões
      const validatedQuestions = questions.map((q: any, index: number) => ({
        id: `${subjectId}-${Date.now()}-${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || (difficulty === "mixed" ? ["easy", "medium", "hard"][index % 3] : difficulty),
        topic: q.topic || subject.name,
        subject: subject.name,
        points: q.points || (q.difficulty === "hard" ? 30 : q.difficulty === "medium" ? 20 : 10),
      }));

      res.json(validatedQuestions);
    } catch (error) {
      console.error('Error generating quiz:', error);
      res.status(500).json({ message: 'Failed to generate quiz' });
    }
  });

  // Gerar dica para questão
  app.post('/api/quiz/hint', isAuthenticated, async (req: any, res) => {
    try {
      const { question, options, subject } = req.body;
      
      const hintPrompt = `Você é um tutor educacional experiente. Para a seguinte questão, forneça uma dica útil que ajude o estudante a raciocinar sobre a resposta, MAS SEM revelar a resposta diretamente.

QUESTÃO: ${question}

OPÇÕES:
${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n')}

MATÉRIA: ${subject}

Crie uma dica que:
- Direcione o pensamento do estudante
- Destaque conceitos-chave relevantes
- Elimine 1-2 opções claramente incorretas
- Mantenha o desafio educativo
- Use linguagem encorajadora

Responda APENAS com o texto da dica, sem formatação especial.`;

      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [{ role: "user", content: hintPrompt }],
        max_tokens: 300,
        temperature: 0.8,
      });

      const hint = response.choices[0]?.message?.content || "Pense nos conceitos fundamentais desta matéria e elimine as opções que claramente não se encaixam.";
      
      res.json({ hint });
    } catch (error) {
      console.error('Error generating hint:', error);
      res.status(500).json({ message: 'Failed to generate hint' });
    }
  });

  // Gerar feedback personalizado pós-quiz
  app.post('/api/quiz/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        correctAnswers, 
        totalQuestions, 
        difficulty, 
        subject, 
        hintsUsed, 
        timeSpent,
        weakAreas 
      } = req.body;

      const user = await storage.getUser(userId);
      const accuracy = (correctAnswers / totalQuestions) * 100;

      const feedbackPrompt = `Você é um tutor educacional experiente. Analise o desempenho do estudante e forneça feedback personalizado construtivo.

PERFIL DO ESTUDANTE:
- Tipo: ${user?.studyProfile || 'average'}
- Matéria: ${subject}

PERFORMANCE NO QUIZ:
- Acertos: ${correctAnswers}/${totalQuestions} (${accuracy.toFixed(1)}%)
- Dificuldade: ${difficulty}
- Dicas usadas: ${hintsUsed}
- Tempo gasto: ${Math.round(timeSpent / 60)} minutos
- Áreas problemáticas: ${weakAreas?.join(', ') || 'Nenhuma identificada'}

Forneça um feedback que inclua:
1. **RECONHECIMENTO**: Parabenize os pontos fortes
2. **ANÁLISE**: Identifique padrões e áreas de melhoria
3. **PLANO DE AÇÃO**: 3-4 sugestões específicas para melhorar
4. **MOTIVAÇÃO**: Mensagem encorajadora adequada ao perfil do estudante

Responda em JSON no formato:
{
  "performance_level": "excelente|bom|regular|precisa_melhorar",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvement_areas": ["área 1", "área 2"],
  "recommendations": [
    {
      "action": "ação específica",
      "reason": "por que é importante",
      "priority": "alta|média|baixa"
    }
  ],
  "motivational_message": "mensagem personalizada encorajadora",
  "next_difficulty": "easy|medium|hard",
  "study_time_suggestion": "sugestão de tempo de estudo"
}`;

      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1",
        messages: [{ role: "user", content: feedbackPrompt }],
        max_tokens: 800,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      
      let feedback;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          feedback = JSON.parse(jsonMatch[0]);
        } else {
          feedback = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        // Fallback feedback
        feedback = {
          performance_level: accuracy >= 80 ? "bom" : accuracy >= 60 ? "regular" : "precisa_melhorar",
          strengths: ["Completou o quiz", "Demonstrou interesse em aprender"],
          improvement_areas: ["Revisar conceitos básicos", "Praticar mais questões"],
          recommendations: [
            {
              action: "Revisar os tópicos com mais erros",
              reason: "Para fortalecer a base de conhecimento",
              priority: "alta"
            }
          ],
          motivational_message: "Continue praticando! O aprendizado é uma jornada contínua.",
          next_difficulty: accuracy >= 70 ? "medium" : "easy",
          study_time_suggestion: "15-30 minutos por dia"
        };
      }

      res.json({ feedback });
    } catch (error) {
      console.error('Error generating feedback:', error);
      res.status(500).json({ message: 'Failed to generate feedback' });
    }
  });

  // Salvar resultado do quiz
  app.post('/api/quiz/result', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const {
        subjectId,
        topicId,
        totalQuestions,
        correctAnswers,
        score,
        duration,
        difficulty,
        answers,
        questions
      } = req.body;

      // Calcular performance
      const accuracy = (correctAnswers / totalQuestions) * 100;
      const scorePercentage = score / (totalQuestions * 30) * 100; // máximo possível seria 30 pontos por questão

      // Buscar nome da matéria
      const subject = await storage.getSubject(subjectId);
      const subjectName = subject?.name || "Matéria";
      
      // Determinar nível baseado na accuracy
      const determinedLevel = accuracy >= 90 ? "expert" :
                             accuracy >= 80 ? "advanced" : 
                             accuracy >= 60 ? "intermediate" :
                             accuracy >= 40 ? "basic" : "beginner";

      // Criar registro de avaliação
      const assessmentResult = await storage.createAssessmentResult({
        userId,
        assessmentType: "quiz",
        subjectName,
        totalQuestions,
        correctAnswers,
        timeSpent: duration,
        finalScore: score.toString(),
        determinedLevel,
        strengths: accuracy >= 60 ? ["Bom desempenho geral"] : [],
        weaknesses: accuracy < 60 ? ["Necessita revisão"] : [],
        questionsData: JSON.stringify({
          answers,
          questions,
          accuracy,
          difficulty
        }),
        recommendations: JSON.stringify([
          accuracy >= 80 ? "Excelente desempenho! Continue praticando." :
          accuracy >= 60 ? "Bom desempenho. Revise os tópicos com erros." :
          "Recomenda-se revisar o conteúdo antes de tentar novamente."
        ]),
      });

      // Atualizar histórico de aprendizado
      await storage.createLearningHistory({
        userId,
        subjectId,
        eventType: "quiz_completion",
        eventData: JSON.stringify({
          score,
          accuracy,
          difficulty,
          questionsAnswered: totalQuestions,
          timePerQuestion: Math.round(duration / totalQuestions),
        }),
        previousScore: null,
        newScore: score.toString(),
        scoreDelta: null,
        sessionDuration: Math.round(duration / 60), // converter para minutos
        difficulty,
        topics: [],
      });

      res.json({
        success: true,
        assessmentId: assessmentResult.id,
        performance: {
          accuracy,
          scorePercentage,
          timePerQuestion: Math.round(duration / totalQuestions),
        },
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
      res.status(500).json({ message: 'Failed to save quiz result' });
    }
  });

  // Setup RAG routes
  setupRAGRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
