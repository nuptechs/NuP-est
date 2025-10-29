/**
 * Cliente de Voz Conversacional
 * Gerencia conexão WebSocket, captura de áudio e reprodução
 */

import type {
  ServerMessage,
  ClientMessage,
  ConnectionState,
  ConversationState,
  ConversationalVoiceClientCallbacks,
  ConversationalVoiceClientConfig,
} from './types';
import { AudioCapture } from './AudioCapture';

export class ConversationalVoiceClient {
  private ws: WebSocket | null = null;
  private audioCapture: AudioCapture | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private canSendAudio: boolean = false;
  private currentVolume: number = 0;

  private connectionState: ConnectionState = 'disconnected';
  private conversationState: ConversationState = 'idle';

  private callbacks: ConversationalVoiceClientCallbacks;
  private config: ConversationalVoiceClientConfig;

  constructor(
    callbacks: ConversationalVoiceClientCallbacks = {},
    config: ConversationalVoiceClientConfig = {}
  ) {
    this.callbacks = callbacks;
    this.config = {
      autoStart: false,
      sampleRate: 16000,
      debug: false,
      ...config,
    };
  }

  /**
   * Conecta ao servidor WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[ConversationalVoice] Já conectado');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.host}/api/conversational-voice`;

        this.log('Conectando ao servidor...', url);
        this.setConnectionState('connecting');

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.log('Conectado ao servidor');
          this.setConnectionState('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as ServerMessage;
            this.handleServerMessage(message);
          } catch (error) {
            console.error('[ConversationalVoice] Erro ao processar mensagem:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[ConversationalVoice] Erro WebSocket:', error);
          this.setConnectionState('error');
          this.callbacks.onError?.('Erro de conexão');
          reject(error);
        };

        this.ws.onclose = () => {
          this.log('Desconectado');
          this.setConnectionState('disconnected');
          this.cleanup();
        };
      } catch (error) {
        this.setConnectionState('error');
        reject(error);
      }
    });
  }

  /**
   * Desconecta do servidor
   */
  disconnect(): void {
    this.stopListening();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.cleanup();
  }

  /**
   * Inicia captura de áudio
   */
  async startListening(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Não conectado ao servidor');
    }

    if (this.audioCapture) {
      this.log('Já está ouvindo');
      return;
    }

    try {
      // Criar captura de áudio PCM
      this.audioCapture = new AudioCapture({
        sampleRate: this.config.sampleRate || 16000,
        onAudioData: (pcmData: Int16Array) => {
          if (!this.canSendAudio || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
          }

          // Converter Int16Array para base64
          const bytes = new Uint8Array(pcmData.buffer);
          const base64 = btoa(
            Array.from(bytes)
              .map((byte) => String.fromCharCode(byte))
              .join('')
          );

          // Enviar ao servidor
          this.sendMessage({ type: 'audio', data: base64 });
        },
        onError: (error) => {
          console.error('[ConversationalVoice] Erro captura:', error);
          this.callbacks.onError?.(error.message);
        },
        onVolumeChange: (volume) => {
          this.currentVolume = volume;
          // Callback para UI mostrar medidor de volume
          if (this.callbacks.onVolumeChange) {
            this.callbacks.onVolumeChange(volume);
          }
        },
      });

      // Iniciar captura
      await this.audioCapture.start();

      // Notificar servidor para iniciar escuta
      this.sendMessage({ type: 'start_listening' });

      this.log('Iniciou captura de áudio PCM');
    } catch (error: any) {
      console.error('[ConversationalVoice] Erro ao iniciar captura:', error);
      this.callbacks.onError?.('Erro ao acessar microfone');
      throw error;
    }
  }

  /**
   * Para captura de áudio
   */
  stopListening(): void {
    if (this.audioCapture) {
      this.audioCapture.stop();
      this.audioCapture = null;
      this.canSendAudio = false;
      this.currentVolume = 0;

      // Notificar servidor
      this.sendMessage({ type: 'stop_listening' });

      this.log('Parou captura de áudio');
    }
  }

  /**
   * Interrompe fala do assistente
   */
  interrupt(): void {
    this.stopAudioPlayback();
    this.sendMessage({ type: 'interrupt' });
    this.log('Interrompeu assistente');
  }

  /**
   * Reseta conversa
   */
  reset(): void {
    this.stopListening();
    this.stopAudioPlayback();
    this.sendMessage({ type: 'reset' });
    this.setConversationState('idle');
    this.log('Resetou conversa');
  }

  /**
   * Processa mensagens do servidor
   */
  private handleServerMessage(message: ServerMessage): void {
    this.log('Mensagem recebida:', message.type);

    switch (message.type) {
      case 'ready':
        this.setConversationState('idle');
        break;

      case 'listening':
        this.setConversationState('listening');
        this.canSendAudio = true;
        this.log('Pronto para enviar áudio');
        break;

      case 'transcript':
        this.callbacks.onTranscript?.(message.text, message.isFinal);
        break;

      case 'thinking':
        this.setConversationState('thinking');
        break;

      case 'speaking':
        this.setConversationState('speaking');
        this.callbacks.onAssistantMessage?.(message.text);
        break;

      case 'audio':
        this.playAudio(message.data);
        break;

      case 'done':
        this.setConversationState('idle');
        break;

      case 'error':
        this.callbacks.onError?.(message.error);
        break;
    }
  }

  /**
   * Reproduz áudio recebido
   */
  private async playAudio(base64Audio: string): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Decodificar base64 para ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decodificar áudio
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

      // Adicionar à fila e reproduzir
      this.audioQueue.push(audioBuffer);
      this.processAudioQueue();

    } catch (error) {
      console.error('[ConversationalVoice] Erro ao reproduzir áudio:', error);
    }
  }

  /**
   * Processa fila de áudio
   */
  private processAudioQueue(): void {
    if (this.isPlaying || this.audioQueue.length === 0) {
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);

    source.onended = () => {
      this.isPlaying = false;
      this.processAudioQueue();
    };

    source.start();
  }

  /**
   * Para reprodução de áudio
   */
  private stopAudioPlayback(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Envia mensagem ao servidor
   */
  private sendMessage(message: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[ConversationalVoice] Não conectado, mensagem não enviada');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[ConversationalVoice] Erro ao enviar mensagem:', error);
    }
  }

  /**
   * Atualiza estado de conexão
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.callbacks.onConnectionChange?.(state);
    }
  }

  /**
   * Atualiza estado de conversa
   */
  private setConversationState(state: ConversationState): void {
    if (this.conversationState !== state) {
      this.conversationState = state;
      this.callbacks.onConversationStateChange?.(state);
    }
  }

  /**
   * Limpeza de recursos
   */
  private cleanup(): void {
    this.stopListening();
    this.stopAudioPlayback();
  }

  /**
   * Log condicional
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ConversationalVoice]', ...args);
    }
  }

  /**
   * Getters
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getConversationState(): ConversationState {
    return this.conversationState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  isListening(): boolean {
    return this.audioCapture !== null && this.audioCapture.getIsCapturing();
  }

  getCurrentVolume(): number {
    return this.currentVolume;
  }
}
