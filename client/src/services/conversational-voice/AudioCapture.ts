/**
 * Captura de Áudio PCM Linear16
 * Converte áudio do microfone para formato compatível com Deepgram
 */

export interface AudioCaptureConfig {
  sampleRate: number;
  onAudioData: (data: Int16Array) => void;
  onError: (error: Error) => void;
  onVolumeChange?: (volume: number) => void;
}

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isCapturing: boolean = false;
  private config: AudioCaptureConfig;

  constructor(config: AudioCaptureConfig) {
    this.config = config;
  }

  /**
   * Inicia captura de áudio
   */
  async start(): Promise<void> {
    if (this.isCapturing) {
      console.warn('[AudioCapture] Já está capturando');
      return;
    }

    try {
      // Solicitar acesso ao microfone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.config.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Criar AudioContext com sample rate desejado
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // Criar source node do stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Criar ScriptProcessor para processar áudio
      // Buffer size: 4096 samples (~85ms a 48kHz, ~256ms a 16kHz)
      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        bufferSize,
        1, // mono input
        1  // mono output
      );

      // Processar chunks de áudio
      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isCapturing) return;

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Converter Float32 [-1, 1] para Int16 [-32768, 32767]
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp e escalar
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Enviar dados PCM
        this.config.onAudioData(pcmData);

        // Calcular volume para feedback visual
        if (this.config.onVolumeChange) {
          const rms = Math.sqrt(
            inputData.reduce((sum, val) => sum + val * val, 0) / inputData.length
          );
          const volume = Math.min(1, rms * 10); // Normalizado 0-1
          this.config.onVolumeChange(volume);
        }
      };

      // Conectar nodes (source → processor → destination)
      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.isCapturing = true;
      console.log('[AudioCapture] Captura iniciada');

    } catch (error: any) {
      console.error('[AudioCapture] Erro ao iniciar:', error);
      this.config.onError(error);
      throw error;
    }
  }

  /**
   * Para captura de áudio
   */
  stop(): void {
    if (!this.isCapturing) {
      return;
    }

    try {
      // Desconectar nodes
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
        this.scriptProcessor = null;
      }

      // Parar stream do microfone
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      // Fechar AudioContext
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.isCapturing = false;
      console.log('[AudioCapture] Captura parada');

    } catch (error) {
      console.error('[AudioCapture] Erro ao parar:', error);
    }
  }

  /**
   * Retorna se está capturando
   */
  getIsCapturing(): boolean {
    return this.isCapturing;
  }
}
