/**
 * DEEPGRAM VOICE AGENT
 * 
 * Serviço de conversação em tempo real usando Deepgram Voice Agent API.
 * 
 * FEATURES:
 * - Conversação bidirecional em tempo real (WebSocket)
 * - STT (Speech-to-Text) com Deepgram Nova-3
 * - LLM orchestration com OpenAI GPT-4o-mini
 * - TTS (Text-to-Speech) configurável
 * - Function calling support
 * - Gerenciamento automático de sessões
 * - Keep-alive automático
 * 
 * CUSTO: ~$4.50/hora (75% mais barato que OpenAI Realtime)
 * 
 * USO:
 * ```typescript
 * const agent = new DeepgramVoiceAgent(apiKey);
 * const session = await agent.createSession({
 *   userId: '123',
 *   instructions: 'Você é um assistente amigável',
 * });
 * 
 * session.on('transcription', (text) => console.log(text));
 * session.on('audioData', (audio) => sendToClient(audio));
 * 
 * session.sendAudio(audioBuffer);
 * ```
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type {
  VoiceAgentConfig,
  VoiceAgentSession,
  CreateSessionOptions,
  SettingsMessage,
  VoiceAgentEvents,
} from './types';
import {
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_THINK_CONFIG,
  DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS,
  DEEPGRAM_VOICE_AGENT_URL,
  TIMEOUTS,
  LIMITS,
  STT_MODELS,
} from './config';

export class DeepgramVoiceAgent extends EventEmitter {
  private apiKey: string;
  private sessions: Map<string, VoiceAgentSession> = new Map();
  private keepAliveIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  /**
   * Cria uma nova sessão de voz
   */
  async createSession(
    clientWs: WebSocket,
    options: CreateSessionOptions
  ): Promise<string> {
    const sessionId = this.generateSessionId();

    // Verificar limite de sessões por usuário
    const userSessions = Array.from(this.sessions.values()).filter(
      (s) => s.userId === options.userId
    );

    if (userSessions.length >= LIMITS.MAX_SESSIONS_PER_USER) {
      throw new Error(
        `Limite de ${LIMITS.MAX_SESSIONS_PER_USER} sessões simultâneas atingido`
      );
    }

    // Configuração do agent
    const config: VoiceAgentConfig = {
      audio: DEFAULT_AUDIO_CONFIG,
      agent: {
        listen: {
          model: STT_MODELS.NOVA_3,
          language: 'pt-BR',
        },
        think: {
          ...DEFAULT_THINK_CONFIG,
          instructions:
            options.instructions || DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS,
          functions: options.functions,
        },
      },
      context: options.context,
    };

    // Criar sessão
    const session: VoiceAgentSession = {
      id: sessionId,
      userId: options.userId,
      ws: clientWs,
      dgWs: null,
      config,
      isConnected: false,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);

    // Conectar ao Deepgram
    await this.connectToDeepgram(sessionId);

    console.log(
      `[VoiceAgent] Sessão ${sessionId} criada para usuário ${options.userId}`
    );

    return sessionId;
  }

  /**
   * Conecta ao WebSocket do Deepgram Voice Agent
   */
  private async connectToDeepgram(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    return new Promise((resolve, reject) => {
      const url = `${DEEPGRAM_VOICE_AGENT_URL}?api_key=${this.apiKey}`;
      const dgWs = new WebSocket(url);

      let connectionTimeout = setTimeout(() => {
        dgWs.close();
        reject(new Error('Timeout ao conectar ao Deepgram'));
      }, TIMEOUTS.CONNECTION_TIMEOUT);

      dgWs.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log(`[VoiceAgent] Conectado ao Deepgram (sessão ${sessionId})`);

        session.dgWs = dgWs;
        session.isConnected = true;

        // Enviar configurações
        const settings: SettingsMessage = {
          type: 'SettingsConfiguration',
          ...session.config,
        };

        dgWs.send(JSON.stringify(settings));

        // Iniciar keep-alive
        this.startKeepAlive(sessionId);

        resolve();
      });

      dgWs.on('message', (data: WebSocket.Data) => {
        this.handleDeepgramMessage(sessionId, data);
      });

      dgWs.on('error', (error) => {
        console.error(`[VoiceAgent] Erro Deepgram (${sessionId}):`, error);
        this.emit('error', sessionId, error);
        session.ws.send(
          JSON.stringify({
            type: 'error',
            error: error.message,
          })
        );
      });

      dgWs.on('close', () => {
        console.log(`[VoiceAgent] Deepgram desconectado (${sessionId})`);
        this.cleanupSession(sessionId);
      });
    });
  }

  /**
   * Processa mensagens recebidas do Deepgram
   */
  private handleDeepgramMessage(sessionId: string, data: WebSocket.Data): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.lastActivity = new Date();

    try {
      // Mensagens podem ser texto (JSON) ou binário (áudio)
      if (Buffer.isBuffer(data)) {
        // Áudio recebido do assistente
        session.ws.send(
          JSON.stringify({
            type: 'audio',
            audio: data.toString('base64'),
          })
        );
        return;
      }

      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'UserStartedSpeaking':
          session.ws.send(JSON.stringify({ type: 'userStartedSpeaking' }));
          break;

        case 'UserStoppedSpeaking':
          session.ws.send(JSON.stringify({ type: 'userStoppedSpeaking' }));
          break;

        case 'AgentStartedSpeaking':
          session.ws.send(JSON.stringify({ type: 'agentStartedSpeaking' }));
          break;

        case 'AgentStoppedSpeaking':
          session.ws.send(JSON.stringify({ type: 'agentStoppedSpeaking' }));
          break;

        case 'Transcript':
          session.ws.send(
            JSON.stringify({
              type: 'transcription',
              text: message.transcript,
              isFinal: message.is_final,
            })
          );
          break;

        case 'FunctionCall':
          session.ws.send(
            JSON.stringify({
              type: 'functionCall',
              name: message.function_name,
              args: message.arguments,
            })
          );
          break;

        case 'Error':
          console.error(`[VoiceAgent] Erro do Deepgram:`, message);
          session.ws.send(
            JSON.stringify({
              type: 'error',
              error: message.error,
            })
          );
          break;

        default:
          // Log mensagens desconhecidas para debug
          console.log(`[VoiceAgent] Mensagem desconhecida:`, message.type);
      }
    } catch (error) {
      console.error(`[VoiceAgent] Erro ao processar mensagem:`, error);
    }
  }

  /**
   * Envia áudio do cliente para o Deepgram
   */
  sendAudio(sessionId: string, audioData: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.dgWs || !session.isConnected) {
      console.warn(`[VoiceAgent] Sessão ${sessionId} não está conectada`);
      return;
    }

    // Validar tamanho do chunk
    if (audioData.length > LIMITS.MAX_AUDIO_CHUNK_SIZE) {
      console.warn(
        `[VoiceAgent] Chunk de áudio muito grande: ${audioData.length} bytes`
      );
      return;
    }

    session.dgWs.send(audioData);
    session.lastActivity = new Date();
  }

  /**
   * Inicia keep-alive para manter a conexão ativa
   */
  private startKeepAlive(sessionId: string): void {
    const interval = setInterval(() => {
      const session = this.sessions.get(sessionId);
      if (!session || !session.dgWs || !session.isConnected) {
        clearInterval(interval);
        return;
      }

      // Enviar mensagem de keep-alive (ping vazio)
      session.dgWs.send(JSON.stringify({ type: 'KeepAlive' }));
    }, TIMEOUTS.KEEP_ALIVE_INTERVAL);

    this.keepAliveIntervals.set(sessionId, interval);
  }

  /**
   * Limpa recursos da sessão
   */
  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Parar keep-alive
    const interval = this.keepAliveIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(sessionId);
    }

    // Fechar conexão Deepgram
    if (session.dgWs) {
      session.dgWs.close();
    }

    // Remover sessão
    this.sessions.delete(sessionId);

    console.log(`[VoiceAgent] Sessão ${sessionId} encerrada`);
  }

  /**
   * Encerra uma sessão
   */
  endSession(sessionId: string): void {
    this.cleanupSession(sessionId);
  }

  /**
   * Retorna sessão ativa
   */
  getSession(sessionId: string): VoiceAgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Lista sessões ativas de um usuário
   */
  getUserSessions(userId: string): VoiceAgentSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId
    );
  }

  /**
   * Gera ID único para sessão
   */
  private generateSessionId(): string {
    return `va_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Limpa todas as sessões (útil para shutdown)
   */
  cleanup(): void {
    for (const sessionId of this.sessions.keys()) {
      this.cleanupSession(sessionId);
    }
  }
}
