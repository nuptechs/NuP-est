/**
 * NATIVE VOICE SERVICE (Web Speech API)
 * 
 * Implementação gratuita usando APIs nativas do browser.
 * 
 * LIMITAÇÕES:
 * - Suporte apenas Chrome/Edge/Safari (Firefox não suporta STT)
 * - Requer conexão com servidores Google
 * - Qualidade inferior ao Whisper
 * 
 * VANTAGENS:
 * - Gratuito
 * - Baixa latência
 * - Bom para prototipagem
 */

import type { IVoiceService } from './IVoiceService';
import type { 
  VoiceConfig, 
  TranscriptionResult, 
  SynthesisResult, 
  VoiceServiceMetadata 
} from './types';
import { VoiceServiceError } from './types';

export class NativeVoiceService implements IVoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;

  getMetadata(): VoiceServiceMetadata {
    return {
      type: 'native',
      isAvailable: this.isAvailable(),
      requiresNetwork: true,
      supportedLanguages: ['pt-BR', 'en-US', 'es-ES', 'fr-FR'],
      features: {
        streaming: true,
        interim: true,
        punctuation: false,
      },
    };
  }

  isAvailable(): boolean {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    return !!(SpeechRecognition && window.speechSynthesis);
  }

  startTranscription(
    config: VoiceConfig,
    onResult: (result: TranscriptionResult) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isAvailable()) {
      onError(new VoiceServiceError(
        'Web Speech API não disponível neste navegador. Use Chrome ou Edge.',
        'NOT_SUPPORTED',
        false
      ));
      return;
    }

    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = config.language || 'pt-BR';
    this.recognition.continuous = config.continuous ?? true;
    this.recognition.interimResults = config.interimResults ?? true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const lastResult: any = results[results.length - 1];
      const transcript = lastResult[0].transcript;
      const confidence = lastResult[0].confidence;

      onResult({
        text: transcript,
        confidence,
        isFinal: lastResult.isFinal,
      });
    };

    this.recognition.onerror = (event: any) => {
      const errorMap: Record<string, string> = {
        'no-speech': 'Nenhuma fala detectada. Tente novamente.',
        'audio-capture': 'Não foi possível acessar o microfone.',
        'not-allowed': 'Permissão de microfone negada.',
        'network': 'Erro de rede. Verifique sua conexão.',
      };

      const message = errorMap[event.error] || `Erro: ${event.error}`;
      onError(new VoiceServiceError(message, event.error, true));
    };

    this.recognition.onend = () => {
      // Auto-restart se continuous
      if (config.continuous && this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {
          // Ignora se já está rodando
        }
      }
    };

    try {
      this.recognition.start();
    } catch (error: any) {
      onError(new VoiceServiceError(
        'Erro ao iniciar reconhecimento de voz',
        'START_FAILED',
        true
      ));
    }
  }

  stopTranscription(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  async synthesize(text: string, voice?: string): Promise<SynthesisResult> {
    if (!window.speechSynthesis) {
      throw new VoiceServiceError(
        'Speech Synthesis não disponível',
        'NOT_SUPPORTED',
        false
      );
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Seleciona voz se especificada
      if (voice) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => {
        resolve({
          audio: new Blob(), // Native synthesis não retorna blob
          duration: undefined,
        });
      };

      utterance.onerror = (event: any) => {
        reject(new VoiceServiceError(
          `Erro na síntese de voz: ${event.error}`,
          event.error,
          true
        ));
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  destroy(): void {
    this.stopTranscription();
    if (this.synthesis) {
      window.speechSynthesis.cancel();
    }
  }
}
