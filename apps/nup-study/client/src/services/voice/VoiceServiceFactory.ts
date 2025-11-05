/**
 * VOICE SERVICE FACTORY
 * 
 * Factory Pattern: Seleciona implementação adequada baseada no plano do usuário.
 * 
 * ESTRATÉGIA DE SELEÇÃO (configurável):
 * 1. Premium users → Provider configurado (Whisper/Deepgram)
 * 2. Free users → NativeVoiceService (gratuito, limitado)
 * 3. Fallback → NativeVoiceService (se provider premium indisponível)
 * 
 * PROVIDERS DISPONÍVEIS:
 * - native: Web Speech API (grátis, Chrome/Edge only)
 * - whisper: OpenAI Whisper + TTS (premium, ~$0.006/min STT + $0.015/1K chars TTS)
 * - deepgram: Deepgram Nova-3 + Aura (melhor custo-benefício, ~$0.0043/min STT)
 * 
 * USO:
 * ```typescript
 * const voiceService = VoiceServiceFactory.create(user.isPremium);
 * voiceService.startTranscription(config, onResult, onError);
 * ```
 */

import type { IVoiceService } from './IVoiceService';
import { NativeVoiceService } from './NativeVoiceService';
import { WhisperVoiceService } from './WhisperVoiceService';
import { DeepgramVoiceService } from './DeepgramVoiceService';
import type { VoiceServiceType } from './types';
import { VOICE_CONFIG } from '@/services/voice/config';

export class VoiceServiceFactory {
  /**
   * Cria instância apropriada baseada no tipo de usuário
   * @param isPremium - Se o usuário tem plano premium
   * @returns Implementação de IVoiceService
   */
  static create(isPremium: boolean = false): IVoiceService {
    if (isPremium) {
      // Usar provider configurado em config.ts
      return this.createByType(VOICE_CONFIG.premiumProvider);
    }

    return new NativeVoiceService();
  }

  /**
   * Cria instância específica por tipo
   * @param type - Tipo de serviço desejado
   */
  static createByType(type: VoiceServiceType): IVoiceService {
    switch (type) {
      case 'deepgram':
        const deepgramService = new DeepgramVoiceService();
        if (!deepgramService.isAvailable()) {
          console.warn('[VoiceFactory] Deepgram não disponível, usando Whisper fallback');
          return new WhisperVoiceService();
        }
        return deepgramService;
        
      case 'whisper':
        const whisperService = new WhisperVoiceService();
        if (!whisperService.isAvailable()) {
          console.warn('[VoiceFactory] Whisper não disponível, usando Native fallback');
          return new NativeVoiceService();
        }
        return whisperService;
        
      case 'native':
      default:
        return new NativeVoiceService();
    }
  }

  /**
   * Verifica quais serviços estão disponíveis no ambiente atual
   */
  static getAvailableServices(): VoiceServiceType[] {
    const available: VoiceServiceType[] = [];

    const native = new NativeVoiceService();
    if (native.isAvailable()) {
      available.push('native');
    }

    const whisper = new WhisperVoiceService();
    if (whisper.isAvailable()) {
      available.push('whisper');
    }

    const deepgram = new DeepgramVoiceService();
    if (deepgram.isAvailable()) {
      available.push('deepgram');
    }

    return available;
  }
}
