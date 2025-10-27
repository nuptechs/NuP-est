/**
 * VOICE SERVICE FACTORY
 * 
 * Factory Pattern: Seleciona implementação adequada baseada no plano do usuário.
 * 
 * ESTRATÉGIA DE SELEÇÃO:
 * 1. Premium users → WhisperVoiceService (melhor qualidade)
 * 2. Free users → NativeVoiceService (gratuito, limitado)
 * 3. Fallback → NativeVoiceService (se Whisper indisponível)
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
import type { VoiceServiceType } from './types';

export class VoiceServiceFactory {
  /**
   * Cria instância apropriada baseada no tipo de usuário
   * @param isPremium - Se o usuário tem plano premium
   * @returns Implementação de IVoiceService
   */
  static create(isPremium: boolean = false): IVoiceService {
    if (isPremium) {
      const whisperService = new WhisperVoiceService();
      
      // Fallback para native se Whisper não disponível
      if (!whisperService.isAvailable()) {
        console.warn('[VoiceFactory] Whisper não disponível, usando Native');
        return new NativeVoiceService();
      }
      
      return whisperService;
    }

    return new NativeVoiceService();
  }

  /**
   * Cria instância específica por tipo
   * @param type - Tipo de serviço desejado
   */
  static createByType(type: VoiceServiceType): IVoiceService {
    switch (type) {
      case 'whisper':
        return new WhisperVoiceService();
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

    return available;
  }
}
