/**
 * WHISPER VOICE SERVICE (OpenAI Premium)
 * 
 * Implementação premium usando OpenAI Whisper (STT) e TTS.
 * 
 * VANTAGENS:
 * - Qualidade superior (~99% precisão)
 * - Suporte multilíngue robusto (50+ idiomas)
 * - Cross-browser (não depende de APIs nativas)
 * - Melhor pontuação e capitalização
 * 
 * CUSTO:
 * - STT: $0.006/minuto (~R$0.03/min)
 * - TTS: $0.015/1K caracteres
 * 
 * LIMITAÇÕES:
 * - Latência maior (~2-4 segundos)
 * - Requer backend (segurança de API keys)
 */

import type { IVoiceService } from './IVoiceService';
import type { 
  VoiceConfig, 
  TranscriptionResult, 
  SynthesisResult, 
  VoiceServiceMetadata 
} from './types';
import { VoiceServiceError } from './types';

export class WhisperVoiceService implements IVoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  getMetadata(): VoiceServiceMetadata {
    return {
      type: 'whisper',
      isAvailable: this.isAvailable(),
      requiresNetwork: true,
      supportedLanguages: ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'zh-CN'],
      features: {
        streaming: false, // Whisper é batch processing
        interim: false,
        punctuation: true,
      },
    };
  }

  isAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  startTranscription(
    config: VoiceConfig,
    onResult: (result: TranscriptionResult) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isAvailable()) {
      onError(new VoiceServiceError(
        'MediaRecorder API não disponível',
        'NOT_SUPPORTED',
        false
      ));
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            
            // Envia para backend
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', config.language || 'pt-BR');

            const response = await fetch('/api/voice/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            onResult({
              text: data.text,
              confidence: data.confidence || 1.0,
              isFinal: true,
            });

            // Limpa chunks
            this.audioChunks = [];
          } catch (error: any) {
            onError(new VoiceServiceError(
              `Erro na transcrição: ${error.message}`,
              'TRANSCRIPTION_FAILED',
              true
            ));
          }
        };

        this.mediaRecorder.onerror = (event: any) => {
          onError(new VoiceServiceError(
            'Erro no MediaRecorder',
            'RECORDING_ERROR',
            true
          ));
        };

        // Inicia gravação
        this.mediaRecorder.start();
        this.isRecording = true;

        // Auto-stop após 30 segundos (evita uploads muito grandes)
        setTimeout(() => {
          if (this.isRecording) {
            this.stopTranscription();
          }
        }, 30000);

      })
      .catch(error => {
        onError(new VoiceServiceError(
          'Permissão de microfone negada',
          'PERMISSION_DENIED',
          false
        ));
      });
  }

  stopTranscription(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;

      // Para todas as tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  async synthesize(text: string, voice?: string): Promise<SynthesisResult> {
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: voice || 'alloy', // alloy, echo, fable, onyx, nova, shimmer
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Converte base64 para Blob
      const audioBlob = this.base64ToBlob(data.audio, 'audio/mpeg');

      return {
        audio: audioBlob,
        duration: data.duration,
      };
    } catch (error: any) {
      throw new VoiceServiceError(
        `Erro na síntese: ${error.message}`,
        'SYNTHESIS_FAILED',
        true
      );
    }
  }

  destroy(): void {
    this.stopTranscription();
    this.audioChunks = [];
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}
