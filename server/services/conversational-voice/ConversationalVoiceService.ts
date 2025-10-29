/**
 * Serviço de Voz Conversacional
 * Implementação usando Deepgram STT + OpenAI + Deepgram TTS
 */

import WebSocket from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import OpenAI from 'openai';
import type {
  ConversationSession,
  CreateSessionOptions,
  ClientMessage,
  ServerMessage,
  AudioConfig,
  AssistantConfig,
} from './types.js';
import {
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_ASSISTANT_CONFIG,
} from './types.js';

export class ConversationalVoiceService {
  private sessions: Map<string, ConversationSession> = new Map();
  private deepgramApiKey: string;
  private openaiClient: OpenAI;

  constructor(deepgramApiKey: string, openaiApiKey: string) {
    this.deepgramApiKey = deepgramApiKey;
    this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
  }

  /**
   * Cria uma nova sessão de conversa
   */
  async createSession(options: CreateSessionOptions): Promise<string> {
    const sessionId = `cv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const audioConfig: AudioConfig = {
      ...DEFAULT_AUDIO_CONFIG,
      ...options.audioConfig,
    };

    const assistantConfig: AssistantConfig = {
      ...DEFAULT_ASSISTANT_CONFIG,
      ...options.assistantConfig,
    };

    const session: ConversationSession = {
      id: sessionId,
      userId: options.userId,
      clientWs: options.clientWs,
      sttWs: null,
      audioConfig,
      assistantConfig,
      conversationHistory: [],
      isListening: false,
      isListeningReady: false,
      isSpeaking: false,
      currentTranscript: '',
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);

    // Configurar handlers do cliente
    this.setupClientHandlers(sessionId);

    // Notificar cliente que está pronto
    this.sendToClient(sessionId, { type: 'ready' });

    console.log(`[ConversationalVoice] Sessão ${sessionId} criada para usuário ${options.userId}`);

    return sessionId;
  }

  /**
   * Configura handlers de mensagens do cliente
   */
  private setupClientHandlers(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.clientWs.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        await this.handleClientMessage(sessionId, message);
      } catch (error) {
        console.error(`[ConversationalVoice] Erro ao processar mensagem:`, error);
      }
    });

    session.clientWs.on('close', () => {
      this.closeSession(sessionId);
    });

    session.clientWs.on('error', (error) => {
      console.error(`[ConversationalVoice] Erro WebSocket:`, error);
      this.closeSession(sessionId);
    });
  }

  /**
   * Processa mensagens do cliente
   */
  private async handleClientMessage(sessionId: string, message: ClientMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.lastActivity = new Date();

    switch (message.type) {
      case 'start_listening':
        await this.startListening(sessionId);
        break;

      case 'stop_listening':
        await this.stopListening(sessionId);
        break;

      case 'audio':
        await this.processAudio(sessionId, message.data);
        break;

      case 'interrupt':
        await this.handleInterrupt(sessionId);
        break;

      case 'reset':
        await this.resetConversation(sessionId);
        break;
    }
  }

  /**
   * Inicia escuta de áudio
   */
  private async startListening(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.isListening) return;

    try {
      const deepgram = createClient(this.deepgramApiKey);
      
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: session.assistantConfig.language,
        encoding: 'opus',
        sample_rate: 48000,
        channels: 1,
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500,
        vad_events: true,
      });

      // Evento: transcrição recebida
      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0]?.transcript;
        if (!transcript) return;

        const isFinal = data.is_final;

        if (isFinal) {
          session.currentTranscript = transcript;
          this.sendToClient(sessionId, {
            type: 'transcript',
            text: transcript,
            isFinal: true,
          });

          // Processar com OpenAI
          this.processWithAI(sessionId, transcript);
        } else {
          this.sendToClient(sessionId, {
            type: 'transcript',
            text: transcript,
            isFinal: false,
          });
        }
      });

      // Evento: erro
      connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error(`[ConversationalVoice] Erro STT:`, error);
        this.sendToClient(sessionId, {
          type: 'error',
          error: 'Erro na transcrição de áudio',
        });
      });

      // Evento: conexão aberta
      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log(`[ConversationalVoice] STT conectado (${sessionId})`);
        session.sttWs = connection as any;
        session.isListening = true;
        session.isListeningReady = true;
        this.sendToClient(sessionId, { type: 'listening' });
      });

      // Evento: conexão fechada
      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log(`[ConversationalVoice] STT desconectado (${sessionId})`);
        session.sttWs = null;
        session.isListening = false;
      });

    } catch (error) {
      console.error(`[ConversationalVoice] Erro ao iniciar STT:`, error);
      this.sendToClient(sessionId, {
        type: 'error',
        error: 'Erro ao iniciar escuta',
      });
    }
  }

  /**
   * Para escuta de áudio
   */
  private async stopListening(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.sttWs) return;

    try {
      (session.sttWs as any).finish?.();
      session.sttWs = null;
      session.isListening = false;
      session.isListeningReady = false;
    } catch (error) {
      console.error(`[ConversationalVoice] Erro ao parar STT:`, error);
    }
  }

  /**
   * Processa áudio recebido
   */
  private async processAudio(sessionId: string, audioData: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.sttWs) return;

    // Aguardar até que o STT esteja pronto para receber áudio
    if (!session.isListeningReady) {
      console.warn(`[ConversationalVoice] STT não está pronto, descartando chunk de áudio`);
      return;
    }

    try {
      // Converter base64 para buffer
      const buffer = Buffer.from(audioData, 'base64');
      
      // Enviar para Deepgram STT
      session.sttWs.send(buffer);
    } catch (error) {
      console.error(`[ConversationalVoice] Erro ao processar áudio:`, error);
    }
  }

  /**
   * Processa texto com OpenAI
   */
  private async processWithAI(sessionId: string, userMessage: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      this.sendToClient(sessionId, { type: 'thinking' });

      // Adicionar mensagem do usuário ao histórico
      session.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Criar mensagens para OpenAI
      const messages = [
        { role: 'system', content: session.assistantConfig.systemPrompt },
        ...session.conversationHistory,
      ] as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

      // Chamar OpenAI
      const response = await this.openaiClient.chat.completions.create({
        model: session.assistantConfig.model,
        messages,
        temperature: session.assistantConfig.temperature,
        max_tokens: session.assistantConfig.maxTokens,
      });

      const assistantMessage = response.choices[0]?.message?.content || 'Desculpe, não entendi.';

      // Adicionar resposta ao histórico
      session.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      // Gerar áudio da resposta
      await this.speakText(sessionId, assistantMessage);

    } catch (error) {
      console.error(`[ConversationalVoice] Erro ao processar com AI:`, error);
      this.sendToClient(sessionId, {
        type: 'error',
        error: 'Erro ao processar sua mensagem',
      });
    }
  }

  /**
   * Converte texto em áudio e envia para cliente
   */
  private async speakText(sessionId: string, text: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.isSpeaking = true;
      this.sendToClient(sessionId, { type: 'speaking', text });

      const deepgram = createClient(this.deepgramApiKey);

      const response = await deepgram.speak.request(
        { text },
        {
          model: 'aura-asteria-pt',
          encoding: 'linear16',
          sample_rate: 24000,
        }
      );

      const stream = await response.getStream();
      if (!stream) {
        throw new Error('Erro ao obter stream de áudio');
      }

      // Processar chunks de áudio
      const chunks: Buffer[] = [];
      const reader = stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }

      // Combinar chunks e enviar
      const audioBuffer = Buffer.concat(chunks);
      const base64Audio = audioBuffer.toString('base64');

      this.sendToClient(sessionId, {
        type: 'audio',
        data: base64Audio,
      });

      session.isSpeaking = false;
      this.sendToClient(sessionId, { type: 'done' });

    } catch (error) {
      console.error(`[ConversationalVoice] Erro ao gerar áudio:`, error);
      session.isSpeaking = false;
      this.sendToClient(sessionId, {
        type: 'error',
        error: 'Erro ao gerar resposta em áudio',
      });
    }
  }

  /**
   * Trata interrupção do usuário
   */
  private async handleInterrupt(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isSpeaking = false;
    console.log(`[ConversationalVoice] Interrupção detectada (${sessionId})`);
  }

  /**
   * Reseta conversa
   */
  private async resetConversation(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.conversationHistory = [];
    session.currentTranscript = '';
    
    this.sendToClient(sessionId, { type: 'ready' });
    console.log(`[ConversationalVoice] Conversa resetada (${sessionId})`);
  }

  /**
   * Envia mensagem para cliente
   */
  private sendToClient(sessionId: string, message: ServerMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.clientWs.readyState !== WebSocket.OPEN) return;

    try {
      session.clientWs.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[ConversationalVoice] Erro ao enviar mensagem:`, error);
    }
  }

  /**
   * Fecha sessão
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Fechar STT se ativo
    if (session.sttWs) {
      (session.sttWs as any).finish?.();
    }

    this.sessions.delete(sessionId);
    console.log(`[ConversationalVoice] Sessão ${sessionId} encerrada`);
  }

  /**
   * Cleanup de sessões inativas
   */
  cleanupInactiveSessions(maxIdleMinutes: number = 30): void {
    const now = Date.now();
    const maxIdleMs = maxIdleMinutes * 60 * 1000;

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      const idleTime = now - session.lastActivity.getTime();
      if (idleTime > maxIdleMs) {
        console.log(`[ConversationalVoice] Removendo sessão inativa: ${sessionId}`);
        this.closeSession(sessionId);
      }
    }
  }
}
