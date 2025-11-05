/**
 * Rotas para Voz Conversacional
 * Deepgram STT + OpenAI + Deepgram TTS
 */

import type { Application } from 'express';
import type { Server } from 'http';
import expressWs from 'express-ws';
import WebSocket from 'ws';
import { ConversationalVoiceService } from '../services/conversational-voice/index.js';

// Singleton para gerenciar todas as sessões
let voiceService: ConversationalVoiceService | null = null;

function getVoiceService(): ConversationalVoiceService {
  if (!voiceService) {
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!deepgramKey) {
      throw new Error('DEEPGRAM_API_KEY não configurada');
    }
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    voiceService = new ConversationalVoiceService(deepgramKey, openaiKey);

    // Cleanup de sessões inativas a cada 5 minutos
    setInterval(() => {
      voiceService?.cleanupInactiveSessions(30);
    }, 5 * 60 * 1000);

    console.log('[ConversationalVoice] Serviço inicializado');
  }
  return voiceService;
}

export function setupConversationalVoiceRoutes(
  app: Application,
  server: Server
): void {
  // Não precisamos chamar expressWs novamente - já foi chamado em voiceAgent.ts
  
  /**
   * WebSocket: /api/conversational-voice
   * Conexão para voz conversacional
   */
  (app as any).ws('/api/conversational-voice', async (ws: WebSocket, req: any) => {
    console.log('[ConversationalVoice] Nova conexão WebSocket');

    try {
      const service = getVoiceService();

      // Obter userId (da sessão ou query param para teste)
      const userId = req.user?.id || req.query.userId || 'guest';

      // Criar sessão
      const sessionId = await service.createSession({
        userId,
        clientWs: ws,
      });

      console.log(`[ConversationalVoice] Sessão ${sessionId} criada para usuário ${userId}`);

    } catch (error) {
      console.error('[ConversationalVoice] Erro ao criar sessão:', error);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: 'Erro ao iniciar serviço de voz',
          })
        );
        ws.close();
      }
    }
  });

  console.log('[ConversationalVoice] Rotas WebSocket configuradas em /api/conversational-voice');
}
