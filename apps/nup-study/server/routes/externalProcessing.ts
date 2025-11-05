import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { externalProcessingService } from '../services/externalProcessingService';

const router = Router();

/**
 * Endpoint para testar conectividade com aplicação externa
 */
router.post('/test-connection', async (req, res) => {
  try {
    const result = await externalProcessingService.testConnection();
    
    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint para verificar status de um job de processamento
 */
router.get('/status/:jobId', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await externalProcessingService.getJobStatus(jobId);
    
    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export { router as externalProcessingRouter };