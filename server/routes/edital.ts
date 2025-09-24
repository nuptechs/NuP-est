import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { newEditalService } from '../services/newEditalService';
import { fileProcessorService } from '../services/fileProcessor';
import { UploadConfig } from '../config/uploadConfig';
import { storage } from '../storage';

const router = Router();

// Usar configuração centralizada para editais
const upload = UploadConfig.createEditalUpload();

// Schemas de validação
const uploadEditalSchema = z.object({
  concursoNome: z.string().min(1, 'Nome do concurso é obrigatório')
});

const consultarEditalSchema = z.object({
  editalId: z.string().min(1, 'ID do edital é obrigatório'),
  query: z.string().min(1, 'Pergunta é obrigatória')
});

// ===== NOVA ARQUITETURA DE UPLOAD =====
// Endpoint principal para upload e processamento direto
router.post('/upload', upload.single('edital'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo é obrigatório',
        message: 'Nenhum arquivo foi enviado. Por favor, selecione um arquivo.',
        supportedFormats: fileProcessorService.getSupportedFileTypes()
      });
    }

    const { concursoNome } = uploadEditalSchema.parse(req.body);
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      // Limpar arquivo se usuário não autenticado
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        message: 'Faça login para enviar arquivos.'
      });
    }
    
    console.log(`📤 Upload recebido: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) para concurso ${concursoNome}`);
    
    // Validar arquivo usando o novo serviço
    const validation = newEditalService.validateFile(req.file.originalname, req.file.size);
    if (!validation.valid) {
      // Limpar arquivo inválido
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        error: validation.error,
        message: 'Arquivo não atende aos requisitos de formato ou tamanho.',
        supportedFormats: fileProcessorService.getSupportedFileTypes()
      });
    }
    
    // Processar arquivo diretamente com a nova arquitetura
    console.log(`🚀 Iniciando processamento síncrono com DeepSeek R1...`);
    
    const result = await newEditalService.processEdital({
      userId,
      filePath: req.file.path,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      concursoNome
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Falha no processamento',
        message: result.message,
        details: {
          fileName: req.file.originalname,
          concurso: concursoNome,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    console.log(`✅ Edital processado com sucesso: ${result.edital.id}`);
    
    res.json({
      success: true,
      edital: {
        id: result.edital.id,
        fileName: result.edital.originalName,
        fileType: result.edital.fileType,
        concursoNome: result.edital.concursoNome,
        status: result.edital.status,
        hasSingleCargo: result.edital.hasSingleCargo,
        cargoName: result.edital.cargoName,
        cargos: result.edital.cargos,
        smartSummary: result.edital.smartSummary || null,
        createdAt: result.edital.createdAt,
        processedAt: result.edital.processedAt
      },
      message: result.message,
      details: result.details,
      instructions: [
        'Documento processado e analisado automaticamente via RAG',
        'Cargos e conhecimentos identificados pelos embeddings',
        'Use POST /api/edital-rag/buscar-cargos para detalhes das vagas',
        'Use POST /api/edital-rag/buscar-conhecimentos para disciplinas organizadas',
        'Use POST /api/edital-rag/buscar-personalizada para consultas específicas'
      ]
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento do edital:', error);
    
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
      message: 'Ocorreu um erro interno ao processar o arquivo. Tente novamente.',
      supportInfo: {
        errorCode: 'PROCESSING_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ENDPOINT REMOVIDO - Use os endpoints RAG específicos:
// POST /api/edital-rag/buscar-cargos
// POST /api/edital-rag/buscar-conteudo-programatico
// POST /api/edital-rag/buscar-personalizada

// Endpoint para listar editais do usuário
router.get('/lista', async (req, res) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const editais = await newEditalService.listEditals(userId);
    
    res.json({
      success: true,
      editais: editais.map((edital: any) => ({
        id: edital.id,
        fileName: edital.originalName,
        fileType: edital.fileType,
        fileSize: edital.fileSize,
        concursoNome: edital.concursoNome,
        status: edital.status,
        createdAt: edital.createdAt,
        processedAt: edital.processedAt,
        hasError: !!edital.errorMessage
      })),
      total: editais.length,
      supportedFormats: fileProcessorService.getSupportedFileTypes()
    });

  } catch (error) {
    console.error('❌ Erro ao listar editais do usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao listar editais'
    });
  }
});

// Endpoint para obter detalhes de um edital específico
router.get('/:editalId', async (req, res) => {
  try {
    const { editalId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const edital = await newEditalService.getEdital(editalId);
    
    if (!edital) {
      return res.status(404).json({
        success: false,
        error: 'Edital não encontrado'
      });
    }

    if (edital.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado ao edital'
      });
    }

    res.json({
      success: true,
      edital: {
        id: edital.id,
        fileName: edital.originalName,
        fileType: edital.fileType,
        fileSize: edital.fileSize,
        concursoNome: edital.concursoNome,
        status: edital.status,
        smartSummary: edital.smartSummary || null,
        errorMessage: edital.errorMessage,
        createdAt: edital.createdAt,
        processedAt: edital.processedAt,
        updatedAt: edital.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter detalhes do edital:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao obter detalhes'
    });
  }
});

// Endpoint para remover um edital
router.delete('/:editalId', async (req, res) => {
  try {
    const { editalId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // Verificar se o edital existe e pertence ao usuário
    const edital = await newEditalService.getEdital(editalId);
    if (!edital) {
      return res.status(404).json({
        success: false,
        error: 'Edital não encontrado'
      });
    }

    if (edital.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado ao edital'
      });
    }

    // Implementar remoção real
    await storage.deleteEdital(editalId);
    console.log(`✅ Edital removido do banco de dados: ${editalId}`);
    
    res.status(204).json({
      success: true,
      message: 'Edital removido com sucesso',
      deletedEdital: {
        id: edital.id,
        fileName: edital.originalName,
        concursoNome: edital.concursoNome
      }
    });

  } catch (error) {
    console.error('❌ Erro ao remover edital:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao remover edital'
    });
  }
});

// Endpoint para informações sobre formatos suportados
router.get('/info/formatos', (req, res) => {
  try {
    const supportedFormats = fileProcessorService.getSupportedFileTypes();
    
    res.json({
      success: true,
      formatosSuportados: supportedFormats,
      limites: {
        tamanhoMaximo: '50MB',
        tiposAceitos: supportedFormats.map(f => f.extension).join(', ')
      },
      observacoes: [
        'Todos os formatos são processados usando inteligência artificial',
        'Chunks são gerados automaticamente pelo DeepSeek R1',
        'Conteúdo é indexado para busca semântica',
        'Análise de cargos é feita automaticamente'
      ]
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter informações de formatos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno'
    });
  }
});

export { router as editalRouter };