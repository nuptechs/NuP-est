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

    // Obter usuário autenticado
    const user = (req as any).user;
    if (!user) {
      ws.send(JSON.stringify({ type: 'error', error: 'Não autenticado' }));
      ws.close();
      return;
    }

    const userId = user.id;

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
}
