/**
 * VOICE AGENT CLIENT
 * 
 * Cliente frontend para conversação em tempo real com Deepgram Voice Agent.
 * 
 * FEATURES:
 * - Gravação de áudio do microfone
 * - Reprodução de áudio do assistente
 * - Callbacks para eventos (transcrição, fala, etc)
 * - Gerenciamento automático de WebSocket
 * - Detecção de atividade de voz (VAD)
 * 
 * USO:
 * ```typescript
 * const client = new VoiceAgentClient();
 * 
 * client.on('transcription', (text, isFinal) => {
 *   console.log(`Transcrição: ${text}`);
 * });
 * 
 * client.on('agentSpeaking', (isStart) => {
 *   if (isStart) console.log('Assistente falando...');
 * });
 * 
 * await client.connect();
 * await client.startListening();
 * 
 * // Quando terminar:
 * client.disconnect();
 * ```
 */

type EventCallback = (...args: any[]) => void;

interface VoiceAgentEvents {
  connected: (sessionId: string) => void;
  disconnected: () => void;
  transcription: (text: string, isFinal: boolean) => void;
  userSpeaking: (isStart: boolean) => void;
  agentSpeaking: (isStart: boolean) => void;
  error: (error: string) => void;
  functionCall: (name: string, args: any) => void;
}

export class VoiceAgentClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private sessionId: string | null = null;
  private listeners: Map<keyof VoiceAgentEvents, EventCallback[]> = new Map();

  constructor() {
    // Inicializar listeners
    const eventTypes: (keyof VoiceAgentEvents)[] = [
      'connected',
      'disconnected',
      'transcription',
      'userSpeaking',
      'agentSpeaking',
      'error',
      'functionCall',
    ];

    eventTypes.forEach((type) => {
      this.listeners.set(type, []);
    });
  }

  /**
   * Conecta ao servidor de Voice Agent
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/voice-agent`;

      console.log('[VoiceAgent] Conectando...', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[VoiceAgent] Conectado ao servidor');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);

          if (message.type === 'connected') {
            this.sessionId = message.sessionId;
            this.emit('connected', message.sessionId);
            resolve();
          }
        } catch (error) {
          console.error('[VoiceAgent] Erro ao processar mensagem:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[VoiceAgent] Erro WebSocket:', error);
        this.emit('error', 'Erro de conexão');
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[VoiceAgent] Desconectado');
        this.emit('disconnected');
        this.cleanup();
      };

      // Timeout de 10 segundos
      setTimeout(() => {
        if (!this.sessionId) {
          reject(new Error('Timeout ao conectar'));
        }
      }, 10000);
    });
  }

  /**
   * Inicia gravação do microfone e envio de áudio
   */
  async startListening(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não está conectado');
    }

    console.log('[VoiceAgent] Solicitando permissão do microfone...');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // Usar MediaRecorder para capturar áudio
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Converter blob para buffer e enviar
        event.data.arrayBuffer().then((buffer) => {
          const base64 = this.arrayBufferToBase64(buffer);
          this.ws!.send(
            JSON.stringify({
              type: 'audio',
              audio: base64,
            })
          );
        });
      }
    };

    // Enviar dados a cada 100ms para baixa latência
    this.mediaRecorder.start(100);

    console.log('[VoiceAgent] Microfone ativo');
  }

  /**
   * Para gravação do microfone
   */
  stopListening(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      this.mediaRecorder = null;
      console.log('[VoiceAgent] Microfone desativado');
    }
  }

  /**
   * Desconecta e limpa recursos
   */
  disconnect(): void {
    this.stopListening();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end' }));
      this.ws.close();
    }

    this.cleanup();
  }

  /**
   * Processa mensagens recebidas do servidor
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'connected':
        console.log(`[VoiceAgent] Sessão criada: ${message.sessionId}`);
        break;

      case 'audio':
        // Áudio do assistente
        this.playAudio(message.audio);
        break;

      case 'transcription':
        this.emit('transcription', message.text, message.isFinal);
        break;

      case 'userStartedSpeaking':
        this.emit('userSpeaking', true);
        break;

      case 'userStoppedSpeaking':
        this.emit('userSpeaking', false);
        break;

      case 'agentStartedSpeaking':
        this.emit('agentSpeaking', true);
        break;

      case 'agentStoppedSpeaking':
        this.emit('agentSpeaking', false);
        break;

      case 'functionCall':
        this.emit('functionCall', message.name, message.args);
        break;

      case 'error':
        console.error('[VoiceAgent] Erro:', message.error);
        this.emit('error', message.error);
        break;

      default:
        console.log('[VoiceAgent] Mensagem desconhecida:', message.type);
    }
  }

  /**
   * Reproduz áudio recebido do assistente
   */
  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    // Converter base64 para ArrayBuffer
    const audioData = this.base64ToArrayBuffer(base64Audio);

    // Decodificar áudio
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      this.audioQueue.push(audioBuffer);

      // Iniciar reprodução se não estiver tocando
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('[VoiceAgent] Erro ao decodificar áudio:', error);
    }
  }

  /**
   * Reproduz próximo áudio da fila
   */
  private playNextInQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);

    source.onended = () => {
      this.playNextInQueue();
    };

    source.start();
  }

  /**
   * Registra listener para eventos
   */
  on<K extends keyof VoiceAgentEvents>(
    event: K,
    callback: VoiceAgentEvents[K]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.push(callback as EventCallback);
    }
  }

  /**
   * Remove listener de evento
   */
  off<K extends keyof VoiceAgentEvents>(
    event: K,
    callback: VoiceAgentEvents[K]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback as EventCallback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emite evento para listeners
   */
  private emit<K extends keyof VoiceAgentEvents>(
    event: K,
    ...args: Parameters<VoiceAgentEvents[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }

  /**
   * Converte ArrayBuffer para Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converte Base64 para ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Limpa recursos
   */
  private cleanup(): void {
    this.stopListening();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
    this.sessionId = null;
    this.ws = null;
  }

  /**
   * Retorna ID da sessão atual
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
