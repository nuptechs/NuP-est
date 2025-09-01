import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/ai";
import { 
  insertSubjectSchema, 
  insertTopicSchema, 
  insertMaterialSchema,
  insertGoalSchema,
  insertTargetSchema,
  insertStudySessionSchema,
  insertQuestionAttemptSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
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
      
      const user = await storage.upsertUser({
        id: userId,
        ...updates
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
        
        // For text files, read content
        if (['.txt', '.md'].includes(path.extname(req.file.originalname).toLowerCase())) {
          try {
            materialData.content = fs.readFileSync(filePath, 'utf-8');
          } catch (err) {
            console.error("Error reading file content:", err);
          }
        }
      }

      const validatedData = insertMaterialSchema.parse(materialData);
      const material = await storage.createMaterial(validatedData);
      
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
      let topic = null;
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

  const httpServer = createServer(app);
  return httpServer;
}
