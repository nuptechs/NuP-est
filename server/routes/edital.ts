import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { editalService } from '../services/edital';
import { editalAutomaticoService } from '../services/editalAutomatico';
import { queueService } from '../services/queue';
import { storage as dbStorage } from '../storage';

const router = Router();

// Configurar multer para upload de PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/editais';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limite para prevenir problemas de memória
  }
});

// Schemas de validação
const processarEditalSchema = z.object({
  concursoNome: z.string().min(1, 'Nome do concurso é obrigatório')
});

const consultarEditalSchema = z.object({
  concursoNome: z.string().min(1, 'Nome do concurso é obrigatório'),
  query: z.string().min(1, 'Pergunta é obrigatória')
});

const processarAutomaticoSchema = z.object({
  concursoNome: z.string().min(1, 'Nome do concurso é obrigatório')
});

// Endpoint para upload e enfileiramento de processamento de edital
router.post('/upload', upload.single('edital'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo PDF é obrigatório'
      });
    }

    const { concursoNome } = processarEditalSchema.parse(req.body);
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }
    
    console.log(`📤 Upload recebido: ${req.file.originalname} para concurso ${concursoNome}`);
    
    // Verificar se Redis está disponível
    const redisConnected = await queueService.isRedisConnected();
    if (!redisConnected) {
      // Limpar arquivo
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(503).json({
        success: false,
        error: 'Sistema de processamento indisponível',
        message: 'O serviço de processamento de arquivos está temporariamente indisponível. Tente novamente em alguns minutos.',
        details: 'Redis (sistema de filas) não está conectado. Entre em contato com o suporte se o problema persistir.',
        supportInfo: {
          errorCode: 'REDIS_UNAVAILABLE',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Criar registro do job no banco
    const processingJob = await dbStorage.createProcessingJob({
      userId,
      type: 'edital_processing',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      metadata: {
        concursoNome,
        type: 'edital_processing'
      }
    });

    // Enfileirar job para processamento assíncrono
    try {
      await queueService.addPDFProcessingJob({
        jobId: processingJob.id,
        userId,
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        metadata: {
          concursoNome,
          type: 'edital_processing'
        }
      });

      console.log(`✅ Job ${processingJob.id} enfileirado com sucesso`);
      
      res.json({
        success: true,
        job: {
          id: processingJob.id,
          status: processingJob.status,
          fileName: processingJob.fileName,
          concursoNome,
          createdAt: processingJob.createdAt
        },
        message: 'Upload realizado com sucesso. O processamento será feito em segundo plano.',
        instructions: [
          'O arquivo está sendo processado automaticamente',
          'Use o endpoint GET /api/edital/status/{jobId} para acompanhar o progresso',
          'Você receberá uma notificação quando o processamento for concluído'
        ]
      });
      
    } catch (queueError) {
      console.error('❌ Erro ao enfileirar job:', queueError);
      
      // Marcar job como falha no banco
      await dbStorage.updateProcessingJob(processingJob.id, {
        status: 'failed',
        errorMessage: 'Falha ao enfileirar processamento: ' + (queueError as Error).message
      });
      
      // Limpar arquivo
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(503).json({
        success: false,
        error: 'Falha ao enfileirar processamento',
        message: 'Não foi possível adicionar o arquivo à fila de processamento. Tente novamente.',
        details: 'Sistema de filas apresentou erro. Se o problema persistir, entre em contato com o suporte.',
        supportInfo: {
          errorCode: 'QUEUE_ERROR',
          jobId: processingJob.id,
          timestamp: new Date().toISOString()
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar upload:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        message: 'Os dados enviados são inválidos. Verifique os campos obrigatórios.',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro interno ao processar o upload. Tente novamente em alguns minutos.',
      supportInfo: {
        errorCode: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Endpoint para consultar informações do edital processado
router.post('/consultar', async (req, res) => {
  try {
    const { concursoNome, query } = consultarEditalSchema.parse(req.body);
    
    console.log(`🔍 Consultando edital ${concursoNome}: "${query}"`);
    
    const resposta = await editalService.buscarInformacaoEdital(concursoNome, query);
    
    res.json({
      success: true,
      concurso: concursoNome,
      pergunta: query,
      resposta: resposta
    });
    
  } catch (error) {
    console.error('❌ Erro ao consultar edital:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno ao consultar edital'
    });
  }
});

// Endpoint para processamento automático completo
router.post('/processar-automatico', async (req, res) => {
  try {
    const { concursoNome } = processarAutomaticoSchema.parse(req.body);
    
    console.log(`🤖 Iniciando processamento automático para: ${concursoNome}`);
    
    const resultado = await editalAutomaticoService.processarEditalAutomaticamente(concursoNome);
    
    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        error: resultado.error,
        message: resultado.message,
        requiresManualUpload: resultado.requiresManualUpload,
        editalUrl: resultado.editalUrl
      });
    }
    
    res.json({
      success: true,
      concurso: concursoNome,
      editalUrl: resultado.editalUrl,
      cargos: resultado.cargos,
      message: 'Edital processado automaticamente com sucesso!'
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento automático:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno no processamento automático'
    });
  }
});

// Endpoint para download de edital (simulação)
router.post('/download', async (req, res) => {
  try {
    const { concursoNome, url } = z.object({
      concursoNome: z.string().min(1),
      url: z.string().url()
    }).parse(req.body);
    
    console.log(`⬇️ Simulando download de edital para: ${concursoNome}`);
    
    // Aqui normalmente faria o download real do PDF
    // Por enquanto, vamos simular retornando informações
    
    res.json({
      success: true,
      message: 'Download simulado. Use o endpoint /upload para enviar o PDF manualmente.',
      concurso: concursoNome,
      url: url,
      instructions: [
        '1. Baixe o edital manualmente do link fornecido',
        '2. Use o endpoint POST /api/edital/upload com o arquivo',
        '3. O sistema processará automaticamente o conteúdo'
      ]
    });
    
  } catch (error) {
    console.error('❌ Erro no download:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno no download'
    });
  }
});

// Endpoint para consultar status de um job
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // Buscar job no banco
    const job = await dbStorage.getProcessingJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job não encontrado'
      });
    }

    if (job.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado ao job'
      });
    }

    // Buscar status na fila se ainda estiver processando
    let queueStatus = null;
    if (job.status === 'processing' || job.status === 'pending') {
      queueStatus = await queueService.getJobStatus(jobId);
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        fileName: job.fileName,
        fileSize: job.fileSize,
        metadata: job.metadata,
        result: job.result,
        errorMessage: job.errorMessage,
        processingLogs: job.processingLogs,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        queueStatus: queueStatus
      }
    });

  } catch (error) {
    console.error('❌ Erro ao consultar status do job:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao consultar status'
    });
  }
});

// Endpoint para listar jobs do usuário
router.get('/jobs', async (req, res) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const jobs = await dbStorage.getUserProcessingJobs(userId, status as string);
    
    res.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        fileName: job.fileName,
        fileSize: job.fileSize,
        metadata: job.metadata,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        hasResult: !!job.result,
        hasError: !!job.errorMessage
      })),
      total: jobs.length
    });

  } catch (error) {
    console.error('❌ Erro ao listar jobs do usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao listar jobs'
    });
  }
});

// Endpoint para estatísticas da fila
router.get('/queue/stats', async (req, res) => {
  try {
    const redisConnected = await queueService.isRedisConnected();
    
    if (!redisConnected) {
      return res.status(503).json({
        success: false,
        error: 'Sistema de filas indisponível',
        message: 'O Redis não está conectado. Não é possível obter estatísticas das filas.',
        stats: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0,
          redisConnected: false
        },
        supportInfo: {
          errorCode: 'REDIS_UNAVAILABLE',
          timestamp: new Date().toISOString()
        }
      });
    }

    const stats = await queueService.getQueueStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        redisConnected: true
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas da fila:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro ao obter estatísticas da fila. Tente novamente em alguns minutos.',
      supportInfo: {
        errorCode: 'STATS_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export { router as editalRouter };