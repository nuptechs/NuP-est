import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import FormData from "form-data";
import OpenAI from "openai";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/ai";
import { ragService } from "./services/rag";
import { setupRAGRoutes } from "./routes/rag";
import { externalProcessingRouter } from "./routes/externalProcessing";
import { 
  insertKnowledgeAreaSchema,
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
  insertKnowledgeBaseSchema,
  generateQuestionRequestSchema,
  generateHintRequestSchema,
  generateExplanationRequestSchema,
  chatRequestSchema,
  updateProfileInteractionRequestSchema,
  submitAnswerRequestSchema
} from "@shared/schema";
import { embeddingsService } from "./services/embeddings";
import { knowledgeChunks, materials, processedFiles } from "@shared/schema";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { UploadConfig } from "./config/uploadConfig";
import { fileDeduplicationService } from "./services/FileDeduplicationService";
import { processedFileService } from "./services/ProcessedFileService";

// Sistema de IA com injeção de dependência
import { aiAnalyze, getAIManager } from './services/ai/index';

// Serviços personalizados de AI
import { AdaptiveContentDelivery } from './services/personalized-assistant/AdaptiveContentDelivery';
import { PersonalizedAssistantCore } from './services/personalized-assistant/PersonalizedAssistantCore';
import { ContinuousDiscoveryService } from './services/personalized-assistant/ContinuousDiscoveryService';
import { AdaptiveAssessmentService } from './services/personalized-assistant/AdaptiveAssessmentService';
import { StudentProfileGenerator } from './services/personalized-assistant/StudentProfileGenerator';
import { DailyStudyPlannerService } from './services/study-planner/DailyStudyPlannerService';

// Usar configurações centralizadas
const upload = UploadConfig.createMaterialUpload();
const pdfUpload = UploadConfig.createKnowledgeBaseUpload();
const flashcardImageUpload = UploadConfig.createFlashcardImageUpload();
const audioUpload = UploadConfig.createAudioUpload();

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

  // Knowledge Area routes
  app.get('/api/areas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const areas = await storage.getKnowledgeAreas(userId);
      res.json(areas);
    } catch (error) {
      console.error("Error fetching knowledge areas:", error);
      res.status(500).json({ message: "Failed to fetch knowledge areas" });
    }
  });

  app.post('/api/areas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertKnowledgeAreaSchema.parse({
        ...req.body,
        userId
      });
      
      const area = await storage.createKnowledgeArea(validatedData);
      res.json(area);
    } catch (error) {
      console.error("Error creating knowledge area:", error);
      res.status(400).json({ message: "Failed to create knowledge area" });
    }
  });

  app.patch('/api/areas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Sanitize updates to exclude protected fields
      const { userId: _, createdAt, updatedAt, id: __, ...allowedUpdates } = req.body;
      
      // Validate allowed fields only
      const parseResult = insertKnowledgeAreaSchema.partial().safeParse({
        ...allowedUpdates,
        userId, // Add userId for validation but don't include in updates
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid input data",
          errors: parseResult.error.issues
        });
      }
      
      // Remove userId from final updates
      const { userId: ___, ...finalUpdates } = parseResult.data;
      
      const area = await storage.updateKnowledgeArea(id, userId, finalUpdates);
      res.json(area);
    } catch (error: any) {
      console.error("Error updating knowledge area:", error);
      if (error?.message === 'Knowledge area not found or access denied') {
        res.status(404).json({ message: "Knowledge area not found" });
      } else {
        res.status(400).json({ message: "Failed to update knowledge area" });
      }
    }
  });

  app.delete('/api/areas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      await storage.deleteKnowledgeArea(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting knowledge area:", error);
      if (error?.message === 'Knowledge area not found or access denied') {
        res.status(404).json({ message: "Knowledge area not found" });
      } else {
        res.status(500).json({ message: "Failed to delete knowledge area" });
      }
    }
  });

  // Subject routes
  app.get('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const areaId = req.query.areaId as string | undefined;
      const subjects = await storage.getSubjects(userId, areaId);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Suggest category for a subject (intelligent auto-categorization)
  app.post('/api/subjects/suggest-category', isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Subject name is required" });
      }
      
      const { suggestSubjectCategory } = await import('./services/subject-categorization.js');
      const suggestion = await suggestSubjectCategory(name);
      
      res.json(suggestion);
    } catch (error) {
      console.error("Error suggesting category:", error);
      res.status(500).json({ 
        message: "Failed to suggest category",
        // Fallback seguro
        category: 'humanas',
        confidence: 0.3,
        source: 'fallback'
      });
    }
  });

  app.post('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSubjectSchema.parse({
        ...req.body,
        userId
      });
      
      // If areaId is provided, verify it belongs to the user
      if (validatedData.areaId) {
        const area = await storage.getKnowledgeArea(validatedData.areaId);
        if (!area || area.userId !== userId) {
          return res.status(400).json({ message: "Invalid knowledge area" });
        }
      }
      
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
      const userId = req.user.claims.sub;
      
      // Sanitize updates - remove protected fields
      const sanitizedUpdates = { ...updates };
      delete sanitizedUpdates.userId;
      delete sanitizedUpdates.createdAt;
      delete sanitizedUpdates.updatedAt;
      delete sanitizedUpdates.id;
      
      // Validate FK ownership - if updating areaId, verify area belongs to user
      if (sanitizedUpdates.areaId) {
        const area = await storage.getKnowledgeArea(sanitizedUpdates.areaId);
        if (!area || area.userId !== userId) {
          return res.status(400).json({ message: "Invalid area reference" });
        }
      }
      
      const subject = await storage.updateSubject(id, userId, sanitizedUpdates);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete('/api/subjects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      await storage.deleteSubject(id, userId);
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

  app.patch('/api/topics/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      // Verify ownership: topic must belong to a subject owned by the user
      const topic = await storage.getTopic(id);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      const subject = await storage.getSubject(topic.subjectId);
      if (!subject || subject.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You don't own this topic" });
      }
      
      // If subjectId is being changed, verify the new subject also belongs to the user
      if (updates.subjectId && updates.subjectId !== topic.subjectId) {
        const newSubject = await storage.getSubject(updates.subjectId);
        if (!newSubject || newSubject.userId !== userId) {
          return res.status(403).json({ message: "Forbidden: Target subject doesn't belong to you" });
        }
      }
      
      const updatedTopic = await storage.updateTopic(id, updates);
      res.json(updatedTopic);
    } catch (error) {
      console.error("Error updating topic:", error);
      res.status(400).json({ message: "Failed to update topic" });
    }
  });

  app.delete('/api/topics/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership: topic must belong to a subject owned by the user
      const topic = await storage.getTopic(id);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      const subject = await storage.getSubject(topic.subjectId);
      if (!subject || subject.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You don't own this topic" });
      }
      
      await storage.deleteTopic(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting topic:", error);
      res.status(500).json({ message: "Failed to delete topic" });
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

  // Smart upload with AI-powered semantic title generation
  app.post('/api/materials/smart-upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filePath = req.file.path;
      const originalFilename = req.file.originalname;
      const fileExt = path.extname(originalFilename).toLowerCase();
      const fileSize = req.file.size;

      console.log(`📤 Smart upload iniciado: ${originalFilename}`);

      // Generate file hash
      console.log(`🔐 Gerando hash do arquivo...`);
      const fileHash = await fileDeduplicationService.generateFileHash(filePath);

      // Detect file type
      const FILE_TYPE_MAP: Record<string, string> = {
        '.pdf': 'pdf',
        '.doc': 'document',
        '.docx': 'document',
        '.txt': 'text',
        '.md': 'text',
        '.xls': 'spreadsheet',
        '.xlsx': 'spreadsheet',
        '.csv': 'spreadsheet',
        '.jpg': 'image',
        '.jpeg': 'image',
        '.png': 'image',
        '.gif': 'image',
        '.webp': 'image',
        '.svg': 'image',
        '.mp4': 'video',
        '.avi': 'video',
        '.mov': 'video',
        '.wmv': 'video',
        '.mkv': 'video',
        '.webm': 'video',
        '.css': 'code',
        '.js': 'code',
        '.ts': 'code',
        '.html': 'code',
      };

      const detectedType = FILE_TYPE_MAP[fileExt] || 'file';
      console.log(`🔍 Tipo detectado: ${detectedType} (${fileExt})`);

      // Check if file was already processed
      const existingProcessedFile = await processedFileService.findByHash(fileHash);
      
      let processedFile;
      let extractedContent = '';
      let pageCount = 0;
      let aiTitle = '';
      let aiDescription = '';
      let isReusedFile = false;

      if (existingProcessedFile) {
        // File already processed - reuse it!
        console.log(`♻️ Arquivo já processado anteriormente! Reutilizando processamento...`);
        console.log(`   Arquivo original: ${existingProcessedFile.fileName}`);
        console.log(`   Processado em: ${existingProcessedFile.createdAt}`);
        
        processedFile = existingProcessedFile;
        extractedContent = existingProcessedFile.extractedContent || '';
        pageCount = existingProcessedFile.pageCount || 0;
        aiTitle = existingProcessedFile.aiGeneratedTitle || originalFilename;
        aiDescription = existingProcessedFile.aiGeneratedDescription || '';
        isReusedFile = true;

        // Delete the newly uploaded file since we already have it
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Arquivo duplicado removido (já existe em: ${existingProcessedFile.filePath})`);
        } catch (err) {
          console.error('Erro ao remover arquivo duplicado:', err);
        }

        // NOTE: Reference count increment will happen AFTER material is successfully created
      } else {
        // New file - process it
        console.log(`🆕 Arquivo novo - processando...`);

        // Extract content when possible
        try {
          if (['.txt', '.md', '.css', '.js', '.ts', '.html'].includes(fileExt)) {
            extractedContent = fs.readFileSync(filePath, 'utf-8');
            console.log(`📝 Conteúdo texto extraído: ${extractedContent.length} caracteres`);
          } else if (['.pdf', '.docx'].includes(fileExt)) {
            // Use fileProcessor to get both text and pageCount
            const { fileProcessorService } = await import('./services/fileProcessor');
            const result = await fileProcessorService.processFile(filePath, originalFilename);
            extractedContent = result.text;
            pageCount = result.metadata?.pageCount || 0;
            console.log(`📝 Conteúdo extraído: ${extractedContent.length} caracteres, ${pageCount} páginas`);
          } else if (fileExt === '.doc') {
            console.log('⚠️ Arquivos .DOC têm suporte limitado');
            extractedContent = '';
          } else {
            console.log(`ℹ️ Extração de texto não suportada para ${fileExt}`);
          }
        } catch (err) {
          console.error("Error extracting file content:", err);
          extractedContent = '';
        }

        // Generate semantic title and description using AI
        console.log(`✨ Gerando título semântico com IA...`);
        const aiMetadata = await aiService.generateSemanticMetadata(
          originalFilename,
          extractedContent,
          detectedType
        );
        
        aiTitle = aiMetadata.title;
        aiDescription = aiMetadata.description;

        console.log(`✅ Arquivo processado (aguardando criação no banco)`);
      }

      // Prepare material data and validate BEFORE transaction
      const materialData = {
        userId,
        title: aiTitle,
        description: aiDescription,
        type: detectedType,
        processedFileId: processedFile?.id, // Will be set inside transaction for new files
        subjectId: req.body.subjectId || undefined,
      };
      
      // Validate data OUTSIDE transaction to avoid leaving orphaned rows on validation errors
      const validatedData = insertMaterialSchema.parse(materialData);
      
      // Create material and processed file atomically in a transaction
      let material;
      try {
        material = await db.transaction(async (tx) => {
          // For new files, create processed file first (within transaction)
          if (!isReusedFile) {
            const processedFileData = {
              fileHash,
              filePath,
              fileName: originalFilename,
              fileType: detectedType,
              fileSize,
              extractedContent,
              pageCount,
              aiGeneratedTitle: aiTitle,
              aiGeneratedDescription: aiDescription,
              referenceCount: 1,
              processingStatus: 'completed' as const,
            };
            
            const [newProcessedFile] = await tx.insert(processedFiles).values(processedFileData).returning();
            processedFile = newProcessedFile;
            validatedData.processedFileId = newProcessedFile.id;
          }
          
          // Create material
          const [newMaterial] = await tx.insert(materials).values(validatedData).returning();
          
          // Increment reference count if reusing file (atomically with material creation)
          if (isReusedFile && processedFile) {
            await tx
              .update(processedFiles)
              .set({ referenceCount: sql`${processedFiles.referenceCount} + 1` })
              .where(eq(processedFiles.id, processedFile.id));
          }
          
          return newMaterial;
        });
      } catch (txError) {
        // Transaction failed - cleanup uploaded file if it's a new file
        if (!isReusedFile && filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Arquivo temporário removido após erro na transação`);
          } catch (cleanupErr) {
            console.error('Erro ao limpar arquivo após falha:', cleanupErr);
          }
        }
        throw txError;
      }

      // Check if this is a large document requiring async processing
      const requiresAsyncProcessing = pageCount > 250;
      
      if (requiresAsyncProcessing) {
        console.log(`📦 Documento grande detectado (${pageCount} páginas) - processamento assíncrono recomendado`);
      } else {
        // Migrate to RAG if content is available (only for new files and small documents)
        if (!isReusedFile && extractedContent) {
          try {
            // Create a temporary material object for RAG with content
            const materialForRAG = { ...material, content: extractedContent };
            await aiService.migrateToRAG(materialForRAG, userId);
            console.log(`📚 Material migrado para RAG: ${material.title}`);
          } catch (error) {
            console.log('⚠️ Falha na migração automática para RAG:', error);
          }
        } else if (isReusedFile) {
          console.log(`📚 Conteúdo já está no RAG (arquivo reutilizado)`);
        }
      }

      // FASE 1: Process content categorization if file has text content
      if (processedFile && extractedContent && extractedContent.length > 100) {
        try {
          console.log(`🔍 Starting FASE 1 content categorization...`);
          const categorizationResult = await processedFileService.processCategorization(
            processedFile.id,
            material.id,
            originalFilename,
            material.title
          );
          console.log(`✅ FASE 1 categorization complete: segment=${categorizationResult.segmentId}, topics=${categorizationResult.topicIds.length}`);
        } catch (catError) {
          console.error('⚠️ FASE 1 categorization failed (non-blocking):', catError);
          // Continue even if categorization fails - it's not critical for material creation
        }
      }

      console.log(`✅ Upload concluído: "${material.title}"`);
      res.json({
        ...material,
        wasReused: isReusedFile,
        processingTime: isReusedFile ? 'instantâneo (reutilizado)' : 'processado agora',
        requiresAsyncProcessing,
        pageCount,
      });
    } catch (error) {
      console.error("Error in smart upload:", error);
      res.status(400).json({ message: "Failed to upload material: " + (error as Error).message });
    }
  });

  app.post('/api/materials', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let materialData: any = {
        ...req.body,
        userId
      };

      // If file was uploaded, process it
      let fileUploadData: any = null;
      if (req.file) {
        const filePath = req.file.path;
        const originalFilename = req.file.originalname;
        const fileExt = path.extname(originalFilename).toLowerCase();
        const fileSize = req.file.size;
        
        // Generate file hash
        const fileHash = await fileDeduplicationService.generateFileHash(filePath);
        
        // Detect file type
        const detectedType = fileExt.substring(1);
        
        // Check if file was already processed
        const existingProcessedFile = await processedFileService.findByHash(fileHash);
        
        if (existingProcessedFile) {
          // Delete uploaded file since we already have it
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Arquivo duplicado removido (reutilizando: ${existingProcessedFile.filePath})`);
          } catch (err) {
            console.error('Erro ao remover arquivo duplicado:', err);
          }
          
          fileUploadData = {
            processedFileId: existingProcessedFile.id,
            type: detectedType,
            isReused: true,
          };
        } else {
          // New file - will be created in transaction
          fileUploadData = {
            isReused: false,
            type: detectedType,
            processedFileData: {
              fileHash,
              filePath,
              fileName: originalFilename,
              fileType: detectedType,
              fileSize,
              referenceCount: 1,
              processingStatus: 'completed' as const,
            }
          };
        }
        
        materialData.type = detectedType;
      }

      // Set processedFileId if reusing
      if (fileUploadData && fileUploadData.isReused) {
        materialData.processedFileId = fileUploadData.processedFileId;
      }
      
      // Validate data OUTSIDE transaction to avoid leaving orphaned rows on validation errors
      const validatedData = insertMaterialSchema.parse(materialData);
      
      // Create material and processed file atomically in a transaction
      let material;
      let tempFilePath = fileUploadData && !fileUploadData.isReused ? fileUploadData.processedFileData.filePath : null;
      
      try {
        material = await db.transaction(async (tx) => {
          // For new files, create processed file first (within transaction)
          if (fileUploadData && !fileUploadData.isReused) {
            const [newProcessedFile] = await tx.insert(processedFiles).values(fileUploadData.processedFileData).returning();
            validatedData.processedFileId = newProcessedFile.id;
          }
          
          // Create material
          const [newMaterial] = await tx.insert(materials).values(validatedData).returning();
          
          // Increment reference count if reusing file (atomically with material creation)
          if (fileUploadData && fileUploadData.isReused) {
            await tx
              .update(processedFiles)
              .set({ referenceCount: sql`${processedFiles.referenceCount} + 1` })
              .where(eq(processedFiles.id, fileUploadData.processedFileId));
          }
          
          return newMaterial;
        });
      } catch (txError) {
        // Transaction failed - cleanup uploaded file if it's a new file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log(`🗑️ Arquivo temporário removido após erro na transação`);
          } catch (cleanupErr) {
            console.error('Erro ao limpar arquivo após falha:', cleanupErr);
          }
        }
        throw txError;
      }
      
      res.json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(400).json({ message: "Failed to create material" });
    }
  });

  app.patch('/api/materials/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user.claims.sub;
      
      // Sanitize updates - remove protected fields
      const sanitizedUpdates = { ...updates };
      delete sanitizedUpdates.userId;
      delete sanitizedUpdates.createdAt;
      delete sanitizedUpdates.updatedAt;
      delete sanitizedUpdates.id;
      delete sanitizedUpdates.filePath; // Don't allow changing file path via API
      
      // Validate FK ownership - if updating subjectId, verify subject belongs to user
      if (sanitizedUpdates.subjectId) {
        const subject = await storage.getSubject(sanitizedUpdates.subjectId);
        if (!subject || subject.userId !== userId) {
          return res.status(400).json({ message: "Invalid subject reference" });
        }
      }
      
      const material = await storage.updateMaterial(id, userId, sanitizedUpdates);
      res.json(material);
    } catch (error) {
      console.error("Error updating material:", error);
      res.status(400).json({ message: "Failed to update material" });
    }
  });

  app.delete('/api/materials/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get material and verify ownership
      const material = await storage.getMaterial(id);
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      if (material.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const processedFileId = material.processedFileId;
      
      // Delete material from database
      await storage.deleteMaterial(id, userId);
      console.log(`🗑️ Material deletado: ${material.title}`);
      
      // Decrement reference count on processed file (will auto-delete if no more references)
      if (processedFileId) {
        const wasDeleted = await processedFileService.decrementReference(processedFileId);
        if (wasDeleted) {
          console.log(`🗑️ Arquivo físico deletado (sem mais referências)`);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ message: "Failed to delete material" });
    }
  });

  // Large document processing routes
  app.post('/api/materials/:id/large-process', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get material and verify ownership
      const material = await storage.getMaterial(id);
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      if (material.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get processed file
      if (!material.processedFileId) {
        return res.status(400).json({ message: "Material has no file" });
      }
      
      const [processedFile] = await db
        .select()
        .from(processedFiles)
        .where(eq(processedFiles.id, material.processedFileId))
        .limit(1);
        
      if (!processedFile) {
        return res.status(404).json({ message: "Processed file not found" });
      }
      
      // Validate file exists
      if (!fs.existsSync(processedFile.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }
      
      // Import large document processing service
      const { largeMaterialProcessor } = await import('./services/large-document-processing');
      const { fileProcessorService } = await import('./services/fileProcessor');
      
      // Extract text from file
      const result = await fileProcessorService.processFile(
        processedFile.filePath,
        processedFile.fileName
      );
      const text = result.text;
      const pageCount = result.metadata?.pageCount || processedFile.pageCount || 0;
      
      // Validate this is indeed a large document
      if (!pageCount || pageCount < 250) {
        return res.status(400).json({ 
          message: "Document is not large enough for async processing. Use regular upload instead.",
          pageCount 
        });
      }
      
      // Initiate processing
      console.log(`🚀 Iniciando processamento assíncrono de documento: ${material.title}`);
      const jobId = await largeMaterialProcessor.initiateProcessing(
        userId,
        material.id,
        processedFile.filePath,
        processedFile.fileName,
        text,
        {
          fileName: processedFile.fileName,
          fileSize: processedFile.fileSize,
          pageCount,
        }
      );
      
      res.json({
        success: true,
        jobId,
        message: "Background processing initiated",
        estimatedTime: Math.ceil((pageCount / 250) + 5), // minutes: 1min per 250 pages + 5min base
      });
    } catch (error) {
      console.error("Error initiating large document processing:", error);
      res.status(500).json({ 
        message: "Failed to initiate processing: " + (error as Error).message 
      });
    }
  });
  
  app.get('/api/jobs/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Import job queue
      const { jobQueue } = await import('./services/large-document-processing');
      
      // Get job
      const job = await jobQueue.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Verify ownership
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get detailed status
      const status = await jobQueue.getJobStatus(id);
      
      res.json(status);
    } catch (error) {
      console.error("Error fetching job status:", error);
      res.status(500).json({ 
        message: "Failed to fetch job status: " + (error as Error).message 
      });
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

  app.patch('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Validar dados com schema parcial (permite campos opcionais)
      const validatedUpdates = insertGoalSchema.omit({ userId: true }).partial().parse(req.body);
      
      const goal = await storage.updateGoal(id, validatedUpdates);
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(400).json({ message: "Failed to update goal" });
    }
  });

  app.delete('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
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
      
      // Validar dados com schema parcial (permite campos opcionais)
      const validatedUpdates = insertTargetSchema.omit({ userId: true }).partial().parse(req.body);
      
      const target = await storage.updateTarget(id, validatedUpdates);
      res.json(target);
    } catch (error) {
      console.error("Error updating target:", error);
      res.status(400).json({ message: "Failed to update target" });
    }
  });

  app.delete('/api/targets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTarget(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting target:", error);
      res.status(500).json({ message: "Failed to delete target" });
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

  // AI routes - Using new modular architecture
  app.post('/api/ai/generate-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId, topicId, difficulty = "medium", questionCount = 5 } = req.body;

      console.log(`[API] Generate questions request: subject=${subjectId}, difficulty=${difficulty}, count=${questionCount}`);

      // Import modular adaptive learning system
      const { StudyContextBuilder, QuestionGeneratorTool } = await import('./services/adaptive-learning/index.js');

      // STAGE 1: Build comprehensive study context
      const contextBuilder = new StudyContextBuilder(storage);
      const context = await contextBuilder.build(userId, {
        subjectId,
        includeRAG: true, // Enable RAG enrichment
      });

      if (!context.subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      console.log(`[API] Context built: category=${context.subject.category}, priority=${context.subject.priority}`);

      // STAGE 2: Get topic name
      let topicName = 'Geral';
      if (topicId) {
        const topics = await storage.getTopics(subjectId);
        const topic = topics.find(t => t.id === topicId);
        if (topic) {
          topicName = topic.name;
        }
      }

      // STAGE 3: Map difficulty string to number (0.5-3.0)
      const difficultyMap: Record<string, number> = {
        'very_easy': 0.5,
        'easy': 1.0,
        'medium': 1.5,
        'hard': 2.0,
        'very_hard': 2.5,
        'extreme': 3.0,
      };
      const numericDifficulty = difficultyMap[difficulty] || 1.5;

      // STAGE 4: Initialize question generator tool
      const aiManagerInstance = getAIManager();
      const questionTool = new QuestionGeneratorTool(aiManagerInstance, storage);

      // Check if tool should execute
      if (!questionTool.shouldExecute(context)) {
        return res.status(400).json({ 
          message: "Cannot generate questions with current context. Please check subject configuration." 
        });
      }

      // STAGE 5: Execute question generation
      const result = await questionTool.execute(context, {
        topic: topicName,
        difficulty: numericDifficulty,
        count: questionCount,
      });

      if (!result.success) {
        console.error('[API] Question generation failed:', result.error);
        return res.status(500).json({ 
          message: result.error?.message || "Failed to generate questions" 
        });
      }

      console.log(`[API] Successfully generated ${result.data.questions.length} questions`);
      console.log(`[API] Metadata: category=${result.data.metadata.categoryUsed}, quality=${result.data.metadata.averageQuality.toFixed(2)}`);

      // STAGE 6: Return generated questions
      // Questions are already saved to DB by QuestionGeneratorTool
      // Fetch the most recent questions for this user/subject
      const savedQuestions = await storage.getAiQuestions(userId);
      const relevantQuestions = savedQuestions
        .filter(q => q.subjectId === subjectId)
        .slice(0, questionCount);

      res.json(relevantQuestions);

    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ 
        message: "Failed to generate questions: " + (error as Error).message 
      });
    }
  });

  // AI Hint Generation - Using modular architecture
  app.post('/api/ai/hint', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId, question, correctAnswer, studentAnswer, hintLevel = 1 } = req.body;

      console.log(`[API] Generate hint request: level=${hintLevel}`);

      // Validate hint level
      if (hintLevel < 1 || hintLevel > 3) {
        return res.status(400).json({ message: "Hint level must be between 1 and 3" });
      }

      // Import modular adaptive learning system
      const { StudyContextBuilder, HintGeneratorTool } = await import('./services/adaptive-learning/index.js');

      // Build study context
      const contextBuilder = new StudyContextBuilder(storage);
      const context = await contextBuilder.build(userId, {
        subjectId,
      });

      if (!context.subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Initialize hint generator tool
      const aiManagerInstance = getAIManager();
      const hintTool = new HintGeneratorTool(aiManagerInstance);

      // Execute hint generation
      const result = await hintTool.execute(context, {
        question,
        correctAnswer,
        studentAnswer,
        hintLevel: hintLevel as 1 | 2 | 3,
      });

      if (!result.success) {
        console.error('[API] Hint generation failed:', result.error);
        return res.status(500).json({ 
          message: result.error?.message || "Failed to generate hint" 
        });
      }

      console.log(`[API] Hint generated successfully using ${result.data.metadata.strategyName} strategy`);

      res.json({
        hint: result.data.hint,
        hintLevel: result.data.hintLevel,
        shouldRevealMore: result.data.shouldRevealMore,
        metadata: result.data.metadata,
      });

    } catch (error) {
      console.error("Error generating hint:", error);
      res.status(500).json({ 
        message: "Failed to generate hint: " + (error as Error).message 
      });
    }
  });

  // AI Explanation Generation - Using modular architecture
  app.post('/api/ai/explanation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId, question, correctAnswer, studentAnswer, wasCorrect } = req.body;

      console.log(`[API] Generate explanation request: ${wasCorrect ? 'correct' : 'incorrect'} answer`);

      // Import modular adaptive learning system
      const { StudyContextBuilder, ExplanationGeneratorTool } = await import('./services/adaptive-learning/index.js');

      // Build study context
      const contextBuilder = new StudyContextBuilder(storage);
      const context = await contextBuilder.build(userId, {
        subjectId,
      });

      if (!context.subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Initialize explanation generator tool
      const aiManagerInstance = getAIManager();
      const explanationTool = new ExplanationGeneratorTool(aiManagerInstance);

      // Execute explanation generation
      const result = await explanationTool.execute(context, {
        question,
        correctAnswer,
        studentAnswer,
        wasCorrect: wasCorrect === true || wasCorrect === 'true',
      });

      if (!result.success) {
        console.error('[API] Explanation generation failed:', result.error);
        return res.status(500).json({ 
          message: result.error?.message || "Failed to generate explanation" 
        });
      }

      console.log(`[API] Explanation generated successfully using ${result.data.metadata.strategyName} strategy`);

      res.json({
        explanation: result.data.explanation,
        wasCorrect: result.data.wasCorrect,
        keyLearnings: result.data.keyLearnings,
        suggestedTopicsToReview: result.data.suggestedTopicsToReview,
        metadata: result.data.metadata,
      });

    } catch (error) {
      console.error("Error generating explanation:", error);
      res.status(500).json({ 
        message: "Failed to generate explanation: " + (error as Error).message 
      });
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
      const { flashcards: flashcardsData, ...deckInfo } = req.body;
      
      // Create deck
      const deckData = insertFlashcardDeckSchema.parse({ 
        ...deckInfo, 
        userId,
        totalCards: flashcardsData?.length || 0,
        studiedCards: 0
      });
      const deck = await storage.createFlashcardDeck(deckData);

      // If flashcards provided, create them
      if (flashcardsData && Array.isArray(flashcardsData) && flashcardsData.length > 0) {
        for (let i = 0; i < flashcardsData.length; i++) {
          const flashcardData = insertFlashcardSchema.parse({
            ...flashcardsData[i],
            userId,
            deckId: deck.id,
            order: i
          });
          await storage.createFlashcard(flashcardData);
        }
      }

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

  // DEPRECATED: Redundant endpoints removed (October 2025)
  // Previously: app.post('/api/flashcard-decks/generate-from-material') - now use /api/ai/generate-flashcards-from-material
  // Previously: app.post('/api/flashcard-decks/generate-from-file') - now use /api/ai/generate-flashcards (more complete with embeddings)

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

  // Upload flashcard image
  app.post('/api/flashcards/upload-image', isAuthenticated, flashcardImageUpload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem enviada" });
      }

      // Return the URL path to access the uploaded image
      const imageUrl = `/uploads/flashcards/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading flashcard image:", error);
      res.status(500).json({ message: "Falha ao fazer upload da imagem" });
    }
  });

  // Polish flashcard text with AI (grammar and organization)
  app.post('/api/flashcards/polish-text', isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      const prompt = `Você é um assistente que melhora textos de flashcards mantendo a ideia original.

Tarefa: Corrija erros de português, organize melhor as ideias e torne o texto mais claro, MAS mantenha o significado e conteúdo originais.

Regras:
- Corrija gramática e ortografia
- Melhore a estrutura das frases
- Mantenha o tom e conteúdo original
- Não adicione informações novas
- Seja conciso
- Retorne APENAS o texto melhorado, sem explicações

Texto original:
${text}`;

      const { aiChat } = await import('./services/ai/index');
      const response = await aiChat(prompt, 'user');

      res.json({ polished: response.trim() });
    } catch (error) {
      console.error("Error polishing text:", error);
      res.status(500).json({ message: "Failed to polish text" });
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

      console.log(`🎯 Flashcards gerados: ${generatedFlashcards.length}/${flashcardCount}`);

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
      const { materialId, title, description, subjectId, count, includeMetadata } = req.body;

      if (!materialId) {
        return res.status(400).json({ message: "Material ID is required" });
      }

      // Get the material
      const material = await storage.getMaterial(materialId);
      if (!material || material.userId !== userId) {
        return res.status(404).json({ message: "Material not found" });
      }

      // FASE 1: Get clean content from segment
      let content = "";
      const segments = await storage.getSegmentsByMaterial(materialId);
      
      if (segments && segments.length > 0) {
        // Use cleanContent from segment (FASE 1 categorization)
        const segment = segments[0]; // For now, use first segment (most materials have 1 full segment)
        content = segment.cleanContent || "";
        
        // Optionally include pedagogical metadata if requested
        if (includeMetadata && segment.pedagogicalMetadata) {
          const metadataStr = JSON.stringify(segment.pedagogicalMetadata, null, 2);
          content = `METADATA:\n${metadataStr}\n\nCONTENT:\n${content}`;
        }
        
        console.log(`📚 Using FASE 1 cleanContent from segment (${content.length} chars)`);
      } else {
        // Fallback to legacy content extraction
        console.log(`⚠️ No segment found for material ${materialId}, using legacy content`);
        content = material.content || "";
        if (material.processedFileId && !content) {
          const processedFile = await db.select().from(processedFiles).where(eq(processedFiles.id, material.processedFileId)).limit(1);
          if (processedFile[0]?.extractedContent) {
            content = processedFile[0].extractedContent;
          }
        }
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

      console.log(`🎯 Flashcards gerados: ${generatedFlashcards.length}/${flashcardCount}`);

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

      // TODO: Implementar processamento de documento quando necessário
      const textChunks: string[] = [];
      const fullText = '';
      
      // Criar entrada na base de conhecimento
      const documentData = {
        userId,
        title,
        description: description || '',
        category: category || 'Geral',
        filename: req.file.originalname,
        fileSize: req.file.size,
        content: fullText,
        chunks: textChunks,
        tags: tags ? JSON.parse(tags) : []
      };

      const validatedData = insertKnowledgeBaseSchema.parse(documentData);
      const document = await storage.createKnowledgeDocument(validatedData);

      // Gerar embeddings para os chunks
      if (textChunks && textChunks.length > 0) {
        try {
          console.log(`🔄 Gerando embeddings para ${textChunks.length} chunks hierárquicos...`);
          const embeddings = await embeddingsService.generateEmbeddings(textChunks);
          
          const chunksWithEmbeddings = textChunks.map((content: any, index: number) => ({
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
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        console.error('Erro ao limpar arquivo temporário:', cleanupError);
      }

      res.status(201).json(document);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      
      // Limpar arquivo em caso de erro
      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          console.error('Erro ao limpar arquivo temporário:', cleanupError);
        }
      }

      if (error instanceof Error && error.message.includes('PDF')) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: 'Falha ao processar arquivo PDF' });
    }
  });

  // DEPRECATED: PUT endpoint removed - use PATCH instead (RESTful best practice)
  // Previously: app.put('/api/knowledge-base/:id') - redundant with PATCH below
  
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

      // Usar sistema de injeção de dependência para análise COM TOKENS ADEQUADOS
      const result = await aiAnalyze<{ questions?: any[] } | any[]>(
        prompt,
        `Você é um gerador de questões educacionais especializado. Gere questões de múltipla escolha conforme especificado.`,
        {
          temperature: 0.7,
          maxTokens: 8000  // ✅ AUMENTADO para garantir resposta completa
        }
      );

      // Extrair questões do resultado (pode vir como {questions: []} ou [])
      let questions: any[] = [];
      if (Array.isArray(result)) {
        questions = result;
      } else if (result && Array.isArray(result.questions)) {
        questions = result.questions;
      } else {
        console.error('❌ Formato inesperado da resposta:', result);
        throw new Error('Formato de resposta inválido - questões não encontradas');
      }

      // Validar se temos questões
      if (!questions || questions.length === 0) {
        throw new Error('Nenhuma questão foi gerada pela IA');
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

      // Usar sistema de injeção de dependência para chat
      const aiManager = getAIManager();
      const aiResponse = await aiManager.request({
        messages: [{ role: "user", content: hintPrompt }],
        maxTokens: 300,
        temperature: 0.8
      });
      
      const hint = aiResponse.content || "Pense nos conceitos fundamentais desta matéria e elimine as opções que claramente não se encaixam.";
      
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

      // Usar sistema de injeção de dependência para análise
      let feedback;
      try {
        feedback = await aiAnalyze<any>(
          feedbackPrompt,
          `Você é um tutor educacional experiente. Analise o desempenho e forneça feedback estruturado em JSON.`,
          {
            temperature: 0.7,
            maxTokens: 800
          }
        );
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

  // ===== PERSONALIZED AI ASSISTANT ROUTES =====
  
  // Endpoint: Generate adaptive question
  app.post('/api/assistant/question', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = generateQuestionRequestSchema.parse(req.body);
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(validatedData.assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Initialize service
      const aiManager = getAIManager();
      const contentDelivery = new AdaptiveContentDelivery(storage, aiManager);
      
      // Use topicId if available, otherwise use subjectId
      const targetId = validatedData.topicId || validatedData.subjectId;
      
      // Generate question
      const question = await contentDelivery.generateQuestion(
        validatedData.assistantId,
        targetId,
        validatedData.difficulty
      );
      
      // Save question to database for hint/explanation tracking
      const savedQuestion = await storage.createAssessmentQuestion({
        question: question.question,
        questionType: "open_ended", // Default type, could be enhanced later
        options: question.options ? { options: question.options } : null,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        subjectArea: targetId,
        topic: targetId,
        difficulty: validatedData.difficulty ? String(validatedData.difficulty) : "0.5",
        discrimination: "1.0",
        guessing: "0.25",
        isActive: true,
      });
      
      // Return question with database ID for tracking
      res.json({
        questionId: savedQuestion.id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        difficulty: savedQuestion.difficulty,
        questionType: savedQuestion.questionType,
      });
    } catch (error: any) {
      console.error("Error generating question:", error);
      res.status(500).json({ message: "Failed to generate question: " + error.message });
    }
  });
  
  // Endpoint: Generate progressive hint
  app.post('/api/assistant/hint', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = generateHintRequestSchema.parse(req.body);
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(validatedData.assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get question
      const question = await storage.getAssessmentQuestion(validatedData.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Initialize service
      const aiManager = getAIManager();
      const contentDelivery = new AdaptiveContentDelivery(storage, aiManager);
      
      // Generate hint (calculate previousHints from hintLevel)
      // TODO: Store and retrieve actual hint history from assistant_memory or interaction_logs
      // Currently using placeholders which limits progressive hint effectiveness
      const previousHints: string[] = [];
      for (let i = 0; i < validatedData.hintLevel - 1; i++) {
        previousHints.push(`Hint ${i + 1}`); // Placeholder - should be actual previous hints
      }
      
      const hint = await contentDelivery.generateHints(
        validatedData.assistantId,
        question.question,
        question.correctAnswer,
        validatedData.currentAnswer,
        previousHints
      );
      
      res.json(hint);
    } catch (error: any) {
      console.error("Error generating hint:", error);
      res.status(500).json({ message: "Failed to generate hint: " + error.message });
    }
  });
  
  // Endpoint: Generate personalized explanation
  app.post('/api/assistant/explanation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = generateExplanationRequestSchema.parse(req.body);
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(validatedData.assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Initialize service
      const aiManager = getAIManager();
      const contentDelivery = new AdaptiveContentDelivery(storage, aiManager);
      
      // Generate explanation
      const explanation = await contentDelivery.generateExplanation(
        validatedData.assistantId,
        validatedData.concept,
        validatedData.context
      );
      
      res.json(explanation);
    } catch (error: any) {
      console.error("Error generating explanation:", error);
      res.status(500).json({ message: "Failed to generate explanation: " + error.message });
    }
  });
  
  // Endpoint: Get chat message history
  app.get('/api/assistant/:assistantId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assistantId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      console.log(`[Chat Messages] GET request - assistantId: ${assistantId}, userId: ${userId}, limit: ${limit}`);
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(assistantId);
      if (!assistant) {
        console.log(`[Chat Messages] Assistant not found: ${assistantId}`);
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        console.log(`[Chat Messages] Unauthorized - assistant.userId: ${assistant.userId}, request.userId: ${userId}`);
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get chat messages
      const messages = await storage.getChatMessages(assistantId, limit);
      console.log(`[Chat Messages] Found ${messages.length} messages for assistant ${assistantId}`);
      if (messages.length > 0) {
        console.log(`[Chat Messages] First message: ${messages[0].role} - ${messages[0].content.substring(0, 50)}...`);
      }
      
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch messages: " + error.message });
    }
  });
  
  // Endpoint: Delete chat message (and associated AI response if user message)
  app.delete('/api/assistant/messages/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId } = req.params;
      
      console.log(`[Chat Messages] DELETE request - messageId: ${messageId}, userId: ${userId}`);
      
      // Delete message and associated response (if applicable)
      await storage.deleteChatMessage(messageId, userId);
      
      console.log(`[Chat Messages] Successfully deleted message ${messageId}`);
      res.json({ success: true, message: "Message deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting chat message:", error);
      
      // Handle specific errors
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to delete message: " + error.message });
    }
  });
  
  // Endpoint: Get conversation topics (semantic analysis)
  app.get('/api/assistant/:assistantId/conversation-topics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assistantId } = req.params;
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get all chat messages
      const messages = await storage.getChatMessages(assistantId, 200); // Analyze last 200 messages
      
      // Use singleton analyzer to persist cache across requests
      const { getConversationAnalyzer } = await import('./services/chat/index');
      const analyzer = getConversationAnalyzer();
      
      // Analyze and group conversations with persistent caching
      const cacheKey = `${assistantId}-${messages.length}`;
      const topics = await analyzer.analyzeConversations(messages, cacheKey);
      
      res.json({ topics });
    } catch (error: any) {
      console.error("Error analyzing conversation topics:", error);
      res.status(500).json({ message: "Failed to analyze conversations: " + error.message });
    }
  });
  
  // Endpoint: Chat with personalized assistant  
  app.post('/api/assistant/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = chatRequestSchema.parse(req.body);
      const startTime = Date.now();
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(validatedData.assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Save user message
      const userMessage = await storage.createChatMessage({
        assistantId: validatedData.assistantId,
        userId,
        role: "user",
        content: validatedData.message,
        subjectId: validatedData.subjectId || null,
        topicId: validatedData.topicId || null,
      });
      console.log(`[Chat] User message saved - assistantId: ${validatedData.assistantId}, messageId: ${userMessage.id}`);
      
      // Initialize services
      const assistantCore = new PersonalizedAssistantCore(storage);
      const aiManager = getAIManager();
      
      // Build conversation context with recent messages
      const context = await assistantCore.buildConversationContext(validatedData.assistantId);
      
      // Get recent chat history for AI context
      const recentMessages = await storage.getChatMessages(validatedData.assistantId, 10);
      const conversationHistory = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Build system message with context
      const systemMessage = `Você é um assistente de estudos personalizado com a seguinte personalidade: ${assistant.personality}.
${assistant.name ? `Nome: ${assistant.name}` : ''}
${context.recentContext ? `Contexto recente: ${context.recentContext}` : ''}`;

      // Build messages array for AI
      const messages = [
        { role: 'system' as const, content: systemMessage },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user' as const, content: validatedData.message }
      ];

      // Generate AI response with realistic token limit for academic answers
      // GPT-4o-mini max output: ~4096 tokens. Using 3800 to stay within limits.
      // For longer responses, consider switching to deepseek-r1 (15000 tokens)
      const aiResponse = await aiManager.request({
        messages,
        temperature: 0.7,
        maxTokens: 3800, // Realistic limit for GPT-4o-mini academic responses
      });
      
      const processingTime = Date.now() - startTime;
      
      // Monitor for potential truncation (response length near token limit)
      const responseLength = aiResponse.content.length;
      const estimatedTokens = Math.ceil(responseLength / 4);
      const lastChar = aiResponse.content.trim().slice(-1);
      const endsWithPunctuation = ['.', '!', '?', ':', ';'].includes(lastChar);
      
      // Warn if response is long and doesn't end with proper punctuation (likely truncated)
      if (estimatedTokens > 3000 && !endsWithPunctuation) {
        console.warn(`⚠️ [Chat] POSSIBLE TRUNCATION detected (${estimatedTokens} tokens, ends with '${lastChar}')`);
      } else if (estimatedTokens > 3000) {
        console.log(`✅ [Chat] Long response (${estimatedTokens} tokens) appears complete.`);
      }
      
      // Save assistant response
      const savedMessage = await storage.createChatMessage({
        assistantId: validatedData.assistantId,
        userId,
        role: "assistant",
        content: aiResponse.content,
        subjectId: validatedData.subjectId || null,
        topicId: validatedData.topicId || null,
        model: aiResponse.model || undefined,
        processingTime,
      });
      console.log(`[Chat] Assistant message saved - assistantId: ${validatedData.assistantId}, messageId: ${savedMessage.id}, length: ${responseLength} chars (~${estimatedTokens} tokens), preview: "${aiResponse.content.substring(0, 50)}..."`);
      
      res.json({ 
        message: savedMessage,
        response: aiResponse.content
      });
    } catch (error: any) {
      console.error("Error in assistant chat:", error);
      res.status(500).json({ message: "Failed to process chat: " + error.message });
    }
  });
  
  // Helper: Convert string level to decimal value
  const levelToDecimal = (level?: string): string | null => {
    if (!level) return null;
    const mapping: Record<string, string> = {
      'high': '1.0',
      'medium': '0.5',
      'low': '0.25',
    };
    return mapping[level.toLowerCase()] || null;
  };
  
  // Endpoint: Update profile based on interaction
  app.post('/api/profile/interaction', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateProfileInteractionRequestSchema.parse(req.body);
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(validatedData.assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Convert string levels to decimal values
      const engagement = levelToDecimal(validatedData.engagement);
      const comprehension = levelToDecimal(validatedData.comprehension);
      
      // Log interaction
      const interaction = await storage.createInteractionLog({
        userId,
        assistantId: validatedData.assistantId,
        interactionType: validatedData.interactionType,
        discoveries: validatedData.interactionData,
        engagementLevel: engagement,
        comprehensionLevel: comprehension,
      });
      
      // Initialize service with StudentProfileGenerator
      const profileGenerator = new StudentProfileGenerator();
      const discoveryService = new ContinuousDiscoveryService(storage, profileGenerator);
      
      // Log interaction with proper structure
      const result = await discoveryService.logInteraction(
        userId,
        validatedData.assistantId,
        {
          interactionType: validatedData.interactionType,
          discoveries: validatedData.interactionData,
          engagementLevel: engagement ? parseFloat(engagement) : undefined,
          comprehensionLevel: comprehension ? parseFloat(comprehension) : undefined,
        }
      );
      
      res.json({ 
        success: true,
        interaction
      });
    } catch (error: any) {
      console.error("Error updating profile from interaction:", error);
      res.status(500).json({ message: "Failed to update profile: " + error.message });
    }
  });
  
  // Endpoint: Get user's personalized assistant
  app.get('/api/assistant/my-assistant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get or create assistant for user
      let assistant = await storage.getActiveAssistant(userId);
      
      if (!assistant) {
        // Get or create default profile first
        const profiles = await storage.getStudentProfiles(userId);
        let profile = profiles.length > 0 ? profiles[0] : null;
        
        if (!profile) {
          profile = await storage.createStudentProfile({
            userId,
            version: 1,
            primaryGoal: "Estudos Gerais",
            strengths: {},
            weaknesses: {},
            discoverySource: "system_generated",
          });
        }
        
        // Create default assistant linked to profile
        assistant = await storage.createPersonalizedAssistant({
          userId,
          profileId: profile.id,
          name: "Meu Assistente IA",
          personality: "friendly",
          communicationStyle: "simple",
          isActive: true,
        });
      }
      
      // Get profile
      const profile = assistant.profileId 
        ? await storage.getStudentProfile(assistant.profileId)
        : null;
      
      res.json({ assistant, profile });
    } catch (error: any) {
      console.error("Error getting assistant:", error);
      res.status(500).json({ message: "Failed to get assistant: " + error.message });
    }
  });

  // Endpoint: Create personalized assistant
  app.post('/api/assistant/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, personality, communicationStyle } = req.body;
      
      // Get or create profile
      const profiles = await storage.getStudentProfiles(userId);
      let profile = profiles.length > 0 ? profiles[0] : null;
      
      if (!profile) {
        profile = await storage.createStudentProfile({
          userId,
          version: 1,
          primaryGoal: "Estudos Gerais",
          strengths: {},
          weaknesses: {},
          discoverySource: "system_generated",
        });
      }
      
      const assistant = await storage.createPersonalizedAssistant({
        userId,
        profileId: profile.id,
        name: name || "Meu Assistente IA",
        personality: personality || "friendly",
        communicationStyle: communicationStyle || "simple",
        isActive: true,
      });
      
      res.json(assistant);
    } catch (error: any) {
      console.error("Error creating assistant:", error);
      res.status(500).json({ message: "Failed to create assistant: " + error.message });
    }
  });

  // Endpoint: Update assistant configuration
  app.patch('/api/assistant/configure', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assistantId, name, personality, communicationStyle } = req.body;
      
      if (!assistantId) {
        return res.status(400).json({ message: "assistantId is required" });
      }
      
      // Verify ownership
      const assistant = await storage.getPersonalizedAssistant(assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updates: any = {};
      if (name) updates.name = name;
      if (personality) updates.personality = personality;
      if (communicationStyle) updates.communicationStyle = communicationStyle;
      
      const updated = await storage.updatePersonalizedAssistant(assistantId, updates);
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating assistant:", error);
      res.status(500).json({ message: "Failed to update assistant: " + error.message });
    }
  });

  // ========== DAILY STUDY PLANNER ENDPOINTS ==========
  
  // Get today's study plan
  app.get('/api/study-planner/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const plannerService = new DailyStudyPlannerService(storage);
      const dailyPlan = await plannerService.generateDailyPlan(userId);
      
      res.json(dailyPlan);
    } catch (error: any) {
      console.error("Error generating daily plan:", error);
      res.status(500).json({ message: "Failed to generate daily plan: " + error.message });
    }
  });
  
  // Complete a study task
  app.post('/api/study-planner/complete-task', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId, timeSpent, notes } = req.body;
      
      if (!taskId || timeSpent === undefined) {
        return res.status(400).json({ message: "taskId and timeSpent are required" });
      }
      
      const plannerService = new DailyStudyPlannerService(storage);
      await plannerService.completeTask(userId, taskId, timeSpent, notes);
      
      res.json({ message: "Task completed successfully" });
    } catch (error: any) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task: " + error.message });
    }
  });

  // ========== ADAPTIVE ASSESSMENT ENDPOINTS ==========
  
  // Endpoint: Start adaptive assessment
  app.post('/api/assessment/adaptive', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assistantId, subjectId, topicId, totalQuestions } = req.body;
      
      if (!assistantId || !subjectId) {
        return res.status(400).json({ message: "assistantId and subjectId are required" });
      }
      
      // Get assistant and verify ownership
      const assistant = await storage.getPersonalizedAssistant(assistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }
      if (assistant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Backend-controlled expected total questions (use client value or default to 10)
      const expectedTotalQuestions = typeof totalQuestions === 'number' && totalQuestions > 0 
        ? Math.min(totalQuestions, 50) // Cap at 50 for safety
        : 10;
      
      // Create adaptive assessment
      const assessment = await storage.createAdaptiveAssessment({
        userId,
        assessmentType: 'adaptive',
        subjectArea: subjectId, // Store subjectId as subjectArea
        profileId: assistant.profileId,
        assistantId,
        initialDifficulty: 'medium',
        expectedTotalQuestions, // Store expected total (backend-controlled)
        totalQuestions: 0, // Start at 0 answered questions
        currentQuestion: 0,
        isComplete: false,
      });
      
      // Initialize service
      const assessmentService = new AdaptiveAssessmentService();
      
      // Get next question for the assessment
      const questionResult = await assessmentService.getNextQuestion(
        assessment.id,
        userId
      );
      
      res.json({ 
        assessment: questionResult.assessment,
        nextQuestion: questionResult.question,
        message: questionResult.question ? 
          "Assessment started successfully" : 
          "No questions available for this assessment"
      });
    } catch (error: any) {
      console.error("Error creating adaptive assessment:", error);
      res.status(500).json({ message: "Failed to create assessment: " + error.message });
    }
  });
  
  // Endpoint: Submit answer to adaptive assessment
  app.post('/api/assessment/submit-answer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request with Zod
      const validatedData = submitAnswerRequestSchema.parse(req.body);
      const { assessmentId, questionId, answer, timeSpent, hintsRequested } = validatedData;
      
      // Verify assessment ownership
      const assessment = await storage.getAdaptiveAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      if (assessment.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Verify question exists and get its details for validation
      const question = await storage.getAssessmentQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Defense in depth: Verify question belongs to the same subject area as assessment
      if (assessment.subjectArea && question.subjectArea !== assessment.subjectArea) {
        return res.status(400).json({ 
          message: "Question does not belong to this assessment's subject area" 
        });
      }
      
      // Initialize service
      const assessmentService = new AdaptiveAssessmentService();
      
      // Submit answer and get attempt result
      const attempt = await assessmentService.submitAnswer({
        assessmentId,
        questionId,
        userId,
        userAnswer: answer,
        timeSpent,
        hintsRequested,
      });
      
      // Get next question or complete assessment
      const updatedAssessment = await storage.getAdaptiveAssessment(assessmentId);
      if (!updatedAssessment) {
        return res.status(404).json({ message: "Assessment not found after update" });
      }
      
      const currentQuestions = updatedAssessment.totalQuestions || 0;
      const expectedTotal = updatedAssessment.expectedTotalQuestions || 10; // Backend-controlled
      
      let nextQuestion = null;
      let result = null;
      
      if (currentQuestions >= expectedTotal) {
        // Assessment complete - generate results
        const completionResult = await assessmentService.completeAssessment(assessmentId, userId);
        const attempts = await storage.getStudentAssessmentAttempts(userId, assessmentId);
        result = {
          finalAbility: completionResult.finalAbility,
          confidence: completionResult.confidence,
          strengths: completionResult.strengths,
          weaknesses: completionResult.weaknesses,
          totalQuestions: currentQuestions,
          correctCount: attempts.filter(a => a.isCorrect).length,
        };
      } else {
        // Get next question
        const questionResult = await assessmentService.getNextQuestion(assessmentId, userId);
        nextQuestion = questionResult.question;
      }
      
      res.json({
        isCorrect: attempt.isCorrect,
        abilityEstimate: parseFloat(attempt.abilityEstimateAfter || '0'),
        confidence: parseFloat(attempt.confidenceAfter || '0'),
        nextQuestion,
        result,
      });
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer: " + error.message });
    }
  });

  // ========== VOICE API ROUTES (PREMIUM FEATURE) ==========
  
  /**
   * POST /api/voice/transcribe
   * Transcreve áudio para texto usando OpenAI Whisper
   * Requer: Plano Premium (verificação futura)
   */
  app.post('/api/voice/transcribe', isAuthenticated, audioUpload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Arquivo de áudio não enviado" });
      }

      const language = req.body.language || 'pt';
      const userId = req.user.claims.sub;

      // TODO: Verificar se usuário tem plano premium
      // const user = await storage.getUser(userId);
      // if (!user.isPremium) {
      //   return res.status(403).json({ message: "Recurso disponível apenas para usuários premium" });
      // }

      // Configurar OpenAI
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Ler arquivo de áudio
      const audioFile = fs.createReadStream(req.file.path);

      console.log(`[Voice/Whisper] Transcrevendo áudio: ${req.file.originalname}, tamanho: ${req.file.size} bytes`);

      // Transcrever com Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language,
        response_format: 'verbose_json', // Retorna timestamps e confiança
      });

      // Limpar arquivo temporário
      fs.unlinkSync(req.file.path);

      console.log(`[Voice/Whisper] Transcrição concluída: "${transcription.text.substring(0, 50)}..."`);

      res.json({
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        confidence: 1.0, // Whisper não retorna confiança diretamente
      });
    } catch (error: any) {
      console.error("[Voice/Whisper] Erro na transcrição:", error);
      
      // Limpar arquivo se existir
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ 
        message: "Erro ao transcrever áudio: " + error.message 
      });
    }
  });

  /**
   * POST /api/voice/synthesize
   * Converte texto em áudio usando OpenAI TTS
   * Requer: Plano Premium (verificação futura)
   */
  app.post('/api/voice/synthesize', isAuthenticated, async (req: any, res) => {
    try {
      const { text, voice = 'alloy' } = req.body;
      const userId = req.user.claims.sub;

      if (!text) {
        return res.status(400).json({ message: "Texto não fornecido" });
      }

      // Limitar tamanho do texto (4096 caracteres é o limite do OpenAI)
      if (text.length > 4096) {
        return res.status(400).json({ 
          message: "Texto muito longo. Máximo: 4096 caracteres" 
        });
      }

      // TODO: Verificar plano premium
      // const user = await storage.getUser(userId);
      // if (!user.isPremium) {
      //   return res.status(403).json({ message: "Recurso disponível apenas para usuários premium" });
      // }

      // Configurar OpenAI
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      console.log(`[Voice/TTS] Sintetizando ${text.length} caracteres com voz: ${voice}`);

      // Gerar áudio
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1', // ou 'tts-1-hd' para qualidade superior
        voice: voice as any, // alloy, echo, fable, onyx, nova, shimmer
        input: text,
      });

      // Converter para buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());

      // Converter para base64 para enviar ao frontend
      const base64Audio = buffer.toString('base64');

      console.log(`[Voice/TTS] Áudio gerado: ${buffer.length} bytes`);

      res.json({
        audio: base64Audio,
        duration: undefined, // TTS não retorna duração
        voice,
      });
    } catch (error: any) {
      console.error("[Voice/TTS] Erro na síntese:", error);
      res.status(500).json({ 
        message: "Erro ao sintetizar voz: " + error.message 
      });
    }
  });

  /**
   * POST /api/voice/transcribe-deepgram
   * Transcreve áudio para texto usando Deepgram SDK
   */
  app.post('/api/voice/transcribe-deepgram', isAuthenticated, audioUpload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo de áudio não enviado" });
      }

      const apiKey = process.env.DEEPGRAM_API_KEY;

      if (!apiKey) {
        console.warn('[Deepgram/STT] DEEPGRAM_API_KEY não configurada');
        return res.status(503).json({ error: "Serviço Deepgram indisponível" });
      }

      console.log(`[Deepgram/STT] Transcrevendo áudio: ${req.file.originalname}`);

      const { createClient } = await import('@deepgram/sdk');
      const deepgram = createClient(apiKey);

      const audioBuffer = fs.readFileSync(req.file.path);

      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-3',
          language: 'pt-BR',
          smart_format: true,
          punctuate: true,
        }
      );

      fs.unlinkSync(req.file.path);

      if (error) {
        console.error('[Deepgram/STT] Erro:', error);
        return res.status(500).json({ error: 'Erro ao transcrever áudio' });
      }

      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

      console.log(`[Deepgram/STT] Transcrição: "${transcript.substring(0, 100)}..."`);

      res.json({
        transcript,
        confidence,
      });
    } catch (error: any) {
      console.error("[Deepgram/STT] Erro:", error);
      
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/voice/synthesize-deepgram
   * Converte texto em áudio usando Deepgram SDK (Aura TTS)
   * Suporta textos longos com chunking automático
   */
  app.post('/api/voice/synthesize-deepgram', isAuthenticated, async (req: any, res) => {
    try {
      const { text, voice = 'aura-asteria-pt' } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Texto não fornecido" });
      }

      const apiKey = process.env.DEEPGRAM_API_KEY;

      if (!apiKey) {
        console.warn('[Deepgram/TTS] DEEPGRAM_API_KEY não configurada');
        return res.status(503).json({ error: "Serviço Deepgram indisponível" });
      }

      const { createClient } = await import('@deepgram/sdk');
      const { TextChunker } = await import('./services/chunking/TextChunker');
      const deepgram = createClient(apiKey);

      // Verificar se precisa chunking
      const needsChunking = text.length > 2000;
      
      if (needsChunking) {
        console.log(`[Deepgram/TTS] Texto longo detectado (${text.length} chars), usando chunking...`);
        
        // Dividir texto em chunks de 2000 caracteres
        const textChunks = await TextChunker.chunkTexts(text, 'tts-deepgram');
        console.log(`[Deepgram/TTS] Dividido em ${textChunks.length} chunks`);
        
        // Processar cada chunk e coletar áudios
        const audioBuffers: Buffer[] = [];
        
        for (let i = 0; i < textChunks.length; i++) {
          const chunk = textChunks[i];
          console.log(`[Deepgram/TTS] Processando chunk ${i + 1}/${textChunks.length} (${chunk.length} chars)`);
          
          const response = await deepgram.speak.request(
            { text: chunk },
            {
              model: voice,
              encoding: 'mp3',
            }
          );

          const stream = await response.getStream();
          
          if (!stream) {
            throw new Error(`Erro ao obter stream de áudio para chunk ${i + 1}`);
          }

          const streamChunks: Uint8Array[] = [];
          const reader = stream.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) streamChunks.push(value);
            }
          } finally {
            reader.releaseLock();
          }

          const chunkAudioBuffer = Buffer.concat(streamChunks);
          audioBuffers.push(chunkAudioBuffer);
        }
        
        // Concatenar todos os áudios
        const finalAudioBuffer = Buffer.concat(audioBuffers);
        const base64Audio = finalAudioBuffer.toString('base64');
        
        console.log(`[Deepgram/TTS] ${textChunks.length} chunks concatenados: ${finalAudioBuffer.length} bytes`);

        res.json({
          audio: base64Audio,
          voice,
          chunked: true,
          chunkCount: textChunks.length,
        });
        
      } else {
        // Texto curto, processamento direto
        console.log(`[Deepgram/TTS] Sintetizando ${text.length} caracteres com voz: ${voice}`);

        const response = await deepgram.speak.request(
          { text },
          {
            model: voice,
            encoding: 'mp3',
          }
        );

        const stream = await response.getStream();
        
        if (!stream) {
          throw new Error('Erro ao obter stream de áudio');
        }

        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        const audioBuffer = Buffer.concat(chunks);
        const base64Audio = audioBuffer.toString('base64');

        console.log(`[Deepgram/TTS] Áudio gerado: ${audioBuffer.length} bytes`);

        res.json({
          audio: base64Audio,
          voice,
          chunked: false,
        });
      }
    } catch (error: any) {
      console.error("[Deepgram/TTS] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Setup RAG routes
  setupRAGRoutes(app);
  
  // Setup External Processing routes
  app.use("/api/external-processing", externalProcessingRouter);
  
  // Setup Admin routes
  const adminRouter = (await import("./routes/admin")).default;
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  
  // Setup Voice Agent WebSocket routes
  const { setupVoiceAgentRoutes } = await import("./routes/voiceAgent");
  setupVoiceAgentRoutes(app, httpServer);

  // Setup Conversational Voice WebSocket routes (Deepgram STT + OpenAI + TTS)
  const { setupConversationalVoiceRoutes } = await import("./routes/conversationalVoice");
  setupConversationalVoiceRoutes(app, httpServer);

  // Setup Realtime Voice routes (Professor IA com OpenAI Realtime API - baixa latência)
  const { setupRealtimeVoiceRoutes } = await import("./routes/realtimeVoice.js");
  setupRealtimeVoiceRoutes(app);
  
  return httpServer;
}
