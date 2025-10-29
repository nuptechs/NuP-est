/**
 * Rotas WebSocket para Professor IA com Voz em Tempo Real
 * Arquitetura modular: suporta múltiplos providers (OpenAI, Deepgram, etc)
 */

import type { Express } from 'express';
import expressWs from 'express-ws';
import { RealtimeVoiceService } from '../services/realtime-voice/RealtimeVoiceService.js';

export function setupRealtimeVoiceRoutes(app: Express): void {
  const expressWsApp = expressWs(app);

  // Verificar chaves de API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn('[RealtimeVoice] ⚠️  OPENAI_API_KEY não configurada - rotas desabilitadas');
    return;
  }

  // Criar serviço (usa OpenAI por padrão, pode trocar para 'deepgram')
  const voiceService = new RealtimeVoiceService(openaiKey, 'openai');

  console.log(`[RealtimeVoice] ✅ Rotas configuradas (provider: ${voiceService.getProviderName()})`);

  /**
   * WebSocket endpoint para voz em tempo real
   */
  expressWsApp.app.ws('/api/realtime-voice', async (ws, req) => {
    console.log('[RealtimeVoice] Nova conexão WebSocket');

    // Obter usuário autenticado (WebSocket não suporta middleware, verificar manualmente)
    const user = (req as any).user;
    if (!user || !user.claims || !user.claims.sub) {
      console.error('[RealtimeVoice] Usuário não autenticado ou sem claims');
      ws.send(JSON.stringify({ type: 'error', error: 'Não autenticado. Por favor, faça login.' }));
      ws.close();
      return;
    }

    const userId = user.claims.sub;

    try {
      // Criar sessão de voz
      const sessionId = await voiceService.createSession(userId, ws);

      console.log(`[RealtimeVoice] Sessão criada para usuário ${userId}: ${sessionId}`);

    } catch (error: any) {
      console.error('[RealtimeVoice] Erro ao criar sessão:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message || 'Erro ao iniciar sessão de voz',
      }));
      ws.close();
    }
  });

  /**
   * Endpoint de status (HTTP)
   */
  app.get('/api/realtime-voice/status', (req, res) => {
    res.json({
      provider: voiceService.getProviderName(),
      activeSessions: voiceService.getActiveSessionsCount(),
      status: 'ok',
    });
  });

  /**
   * Endpoint para obter configurações (HTTP)
   */
  app.get('/api/realtime-voice/config', (req, res) => {
    res.json({
      maxResponseTime: voiceService.getMaxResponseTime(),
      provider: voiceService.getProviderName(),
    });
  });

  /**
   * Endpoint para atualizar configurações (HTTP)
   */
  app.post('/api/realtime-voice/config', (req, res) => {
    try {
      const { maxResponseTime } = req.body;
      
      if (maxResponseTime !== undefined) {
        voiceService.setMaxResponseTime(maxResponseTime);
      }
      
      res.json({
        success: true,
        maxResponseTime: voiceService.getMaxResponseTime(),
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });
}
