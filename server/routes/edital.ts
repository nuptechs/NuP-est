import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { editalService } from '../services/edital';
import { editalAutomaticoService } from '../services/editalAutomatico';

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
    fileSize: 10 * 1024 * 1024 // 10MB limite
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

// Endpoint para upload e processamento de edital
router.post('/upload', upload.single('edital'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo PDF é obrigatório'
      });
    }

    const { concursoNome } = processarEditalSchema.parse(req.body);
    
    console.log(`📤 Upload recebido: ${req.file.originalname} para concurso ${concursoNome}`);
    
    // Processar o edital
    const editalInfo = await editalService.processarEdital(
      concursoNome,
      req.file.path,
      req.file.originalname
    );
    
    console.log(`✅ Edital processado: ${editalInfo.id}`);
    
    res.json({
      success: true,
      edital: {
        id: editalInfo.id,
        concursoNome: editalInfo.concursoNome,
        fileName: editalInfo.fileName,
        hasSingleCargo: editalInfo.hasSingleCargo,
        cargoName: editalInfo.cargoName,
        conteudoProgramatico: editalInfo.conteudoProgramatico,
        processedAt: editalInfo.processedAt
      },
      message: 'Edital processado e indexado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar edital:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar edital'
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

export { router as editalRouter };