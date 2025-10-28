/**
 * VOICE AGENT ROUTES
 * 
 * Rotas WebSocket para conversação em tempo real com Deepgram Voice Agent.
 * 
 * ENDPOINTS:
 * - WS /api/voice-agent: Inicia sessão de conversação bidirecional
 * 
 * PROTOCOLO:
 * 
 * Cliente → Servidor:
 * - { type: 'audio', audio: base64 } - Envia chunk de áudio
 * - { type: 'end' } - Encerra sessão
 * 
 * Servidor → Cliente:
 * - { type: 'connected', sessionId: string } - Sessão criada
 * - { type: 'audio', audio: base64 } - Áudio do assistente
 * - { type: 'transcription', text: string, isFinal: boolean } - Transcrição
 * - { type: 'userStartedSpeaking' } - Usuário começou a falar
 * - { type: 'userStoppedSpeaking' } - Usuário parou de falar
 * - { type: 'agentStartedSpeaking' } - Assistente começou a falar
 * - { type: 'agentStoppedSpeaking' } - Assistente parou de falar
 * - { type: 'functionCall', name: string, args: any } - Chamada de função
 * - { type: 'error', error: string } - Erro
 */

import type { Application } from 'express';
import type { Server } from 'http';
import expressWs from 'express-ws';
import { DeepgramVoiceAgent, DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS } from '../services/voice-agent';

// Singleton para gerenciar todas as sessões
let voiceAgent: DeepgramVoiceAgent | null = null;

function getVoiceAgent(): DeepgramVoiceAgent {
  if (!voiceAgent) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY não configurada');
    }
    voiceAgent = new DeepgramVoiceAgent(apiKey);
  }
  return voiceAgent;
}

export function setupVoiceAgentRoutes(app: Application, server: Server): void {
  // Habilitar WebSocket no Express
  const wsInstance = expressWs(app, server);

  /**
   * WebSocket para conversação em tempo real
   * 
   * IMPORTANTE: Este endpoint requer autenticação.
   * O middleware isAuthenticated deve ser adaptado para WebSocket.
   */
  (app as any).ws('/api/voice-agent', async (ws: any, req: any) => {
    let sessionId: string | null = null;

    try {
      // NOTA: Para produção, adicione autenticação aqui
      // Exemplo: const userId = req.user?.claims?.sub;
      // if (!userId) {
      //   ws.send(JSON.stringify({ type: 'error', error: 'Não autenticado' }));
      //   ws.close();
      //   return;
      // }

      // Para desenvolvimento, usar ID temporário
      const userId = req.user?.claims?.sub || `temp_${Date.now()}`;

      console.log(`[VoiceAgent] Nova conexão do usuário ${userId}`);

      const agent = getVoiceAgent();

      // Criar sessão
      sessionId = await agent.createSession(ws, {
        userId,
        instructions: DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS,
      });

      // Notificar cliente que sessão foi criada
      ws.send(
        JSON.stringify({
          type: 'connected',
          sessionId,
        })
      );

      // Handler para mensagens do cliente
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);

          switch (message.type) {
            case 'audio':
              // Cliente enviou áudio
              const audioBuffer = Buffer.from(message.audio, 'base64');
              if (sessionId) {
                agent.sendAudio(sessionId, audioBuffer);
              }
              break;

            case 'end':
              // Cliente solicitou encerramento
              if (sessionId) {
                agent.endSession(sessionId);
                ws.close();
              }
              break;

            default:
              console.warn(`[VoiceAgent] Tipo de mensagem desconhecido: ${message.type}`);
          }
        } catch (error) {
          console.error('[VoiceAgent] Erro ao processar mensagem:', error);
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'Erro ao processar mensagem',
            })
          );
        }
      });

      // Handler para fechamento da conexão
      ws.on('close', () => {
        console.log(`[VoiceAgent] Conexão fechada (sessão ${sessionId})`);
        if (sessionId) {
          agent.endSession(sessionId);
        }
      });

      // Handler para erros
      ws.on('error', (error: Error) => {
        console.error(`[VoiceAgent] Erro na conexão:`, error);
        if (sessionId) {
          agent.endSession(sessionId);
        }
      });
    } catch (error: any) {
      console.error('[VoiceAgent] Erro ao criar sessão:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: error.message || 'Erro ao iniciar sessão',
        })
      );
      ws.close();
    }
  });

  console.log('[VoiceAgent] Rotas WebSocket configuradas em /api/voice-agent');
}

/**
 * Função para cleanup no shutdown do servidor
 */
export function cleanupVoiceAgent(): void {
  if (voiceAgent) {
    voiceAgent.cleanup();
    voiceAgent = null;
  }
}
