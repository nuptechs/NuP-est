/**
 * VOICE SERVICE INTERFACE
 * 
 * Padrão Strategy: Define contrato comum para todas as implementações de voz.
 * 
 * Implementações:
 * - NativeVoiceService: Usa Web Speech API (gratuito, Chrome/Edge only)
 * - WhisperVoiceService: Usa OpenAI Whisper + TTS (premium, cross-browser)
 * 
 * Factory Pattern: VoiceServiceFactory seleciona implementação baseada no plano do usuário.
 */

import type { 
  VoiceConfig, 
  TranscriptionResult, 
  SynthesisResult, 
  VoiceServiceMetadata 
} from './types';

export interface IVoiceService {
  /**
   * Retorna metadados sobre este serviço
   */
  getMetadata(): VoiceServiceMetadata;

  /**
   * Verifica se o serviço está disponível no ambiente atual
   */
  isAvailable(): boolean;

  /**
   * Inicia transcrição de áudio para texto
   * @param config - Configuração de idioma e comportamento
   * @param onResult - Callback para resultados parciais/finais
   * @param onError - Callback para erros
   */
  startTranscription(
    config: VoiceConfig,
    onResult: (result: TranscriptionResult) => void,
    onError: (error: Error) => void
  ): void;

  /**
   * Para transcrição ativa
   */
  stopTranscription(): void;

  /**
   * Converte texto em áudio
   * @param text - Texto para sintetizar
   * @param voice - Voz a ser usada (opcional)
   * @returns Promise com resultado de áudio
   */
  synthesize(text: string, voice?: string): Promise<SynthesisResult>;

  /**
   * Cleanup de recursos
   */
  destroy(): void;
}
