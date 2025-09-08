import express from 'express';
import { z } from 'zod';
import { editalRAGService } from '../services/editalRAG';
import { isAuthenticated } from '../replitAuth';

const router = express.Router();

// Schemas de validação
const ragQuerySchema = z.object({
  query: z.string().min(1, 'Consulta é obrigatória').max(500, 'Consulta muito longa'),
  topK: z.number().min(1).max(20).optional().default(10) // Limitar resultados
});

/**
 * POST /api/edital-rag/buscar-cargos
 * Busca informações sobre cargos nos editais processados
 */
router.post('/buscar-cargos', isAuthenticated, async (req: any, res) => {
  try {
    const { query, topK } = ragQuerySchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    console.log(`🎯 Iniciando busca por cargos para usuário ${userId}`);

    const resultado = await editalRAGService.buscarCargos(
      userId, 
      query || "cargos vagas concurso"
      // Note: topK pode ser adicionado futuramente como parâmetro adicional
    );

    res.json({
      success: true,
      data: resultado
    });

  } catch (error: any) {
    console.error('❌ Erro na busca por cargos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao buscar cargos'
    });
  }
});

/**
 * POST /api/edital-rag/buscar-conteudo-programatico
 * Busca e organiza conhecimentos dos editais processados
 */
router.post('/buscar-conteudo-programatico', isAuthenticated, async (req: any, res) => {
  try {
    const { query, topK } = ragQuerySchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    console.log(`📚 Iniciando busca por conhecimentos para usuário ${userId}`);

    const resultado = await editalRAGService.buscarConteudoProgramatico(
      userId,
      query || "conhecimentos"
    );

    res.json({
      success: true,
      data: resultado
    });

  } catch (error: any) {
    console.error('❌ Erro na busca por conhecimentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao buscar conhecimentos'
    });
  }
});

/**
 * POST /api/edital-rag/buscar-personalizada
 * Busca personalizada usando RAG para qualquer aspecto do edital
 */
router.post('/buscar-personalizada', isAuthenticated, async (req: any, res) => {
  try {
    const { query, topK } = ragQuerySchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query é obrigatória para busca personalizada'
      });
    }

    console.log(`🔍 Iniciando busca personalizada para usuário ${userId}: "${query.substring(0, 100)}..."`);

    const resultado = await editalRAGService.buscarInformacaoPersonalizada(
      userId,
      query.trim()
    );

    res.json({
      success: true,
      data: resultado
    });

  } catch (error: any) {
    console.error('❌ Erro na busca personalizada:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor na busca personalizada'
    });
  }
});

/**
 * GET /api/edital-rag/status
 * Verifica se há documentos indexados para o usuário
 */
router.get('/status', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // Fazer uma busca simples para verificar se existem documentos
    const testSearch = await editalRAGService.buscarInformacaoPersonalizada(
      userId,
      "teste documentos indexados"
    );

    const temDocumentos = testSearch.temContexto && testSearch.fontes.length > 0;

    res.json({
      success: true,
      data: {
        temDocumentosIndexados: temDocumentos,
        totalFontes: testSearch.fontes.length,
        fontes: testSearch.fontes
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao verificar status'
    });
  }
});

export default router;