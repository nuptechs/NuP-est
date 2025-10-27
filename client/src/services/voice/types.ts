/**
 * VOICE SERVICE TYPES
 * 
 * Define tipos compartilhados entre todas as implementações de voz.
 * Mantém consistência entre Native (gratuito) e Whisper (premium).
 */

export type VoiceServiceType = 'native' | 'whisper';

export interface VoiceConfig {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  isFinal: boolean;
}

export interface SynthesisResult {
  audio: Blob | string; // Blob para native, base64 para Whisper
  duration?: number;
}

export interface VoiceServiceMetadata {
  type: VoiceServiceType;
  isAvailable: boolean;
  requiresNetwork: boolean;
  supportedLanguages: string[];
  features: {
    streaming: boolean;
    interim: boolean;
    punctuation: boolean;
  };
}

export class VoiceServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'VoiceServiceError';
  }
}
