/**
 * VOICE SERVICES CONFIGURATION
 * 
 * Configuração centralizada para troca rápida de providers de voz.
 * 
 * PARA TROCAR DE PROVIDER:
 * Edite apenas `premiumProvider` abaixo:
 * - 'whisper': OpenAI (~$0.006/min STT + $0.015/1K chars TTS)
 * - 'deepgram': Deepgram (~$0.0043/min STT, latência <300ms)
 * 
 * COMPARAÇÃO:
 * 
 * DEEPGRAM (Recomendado para custo-benefício):
 * ✅ Custo: $0.0043/min (~$0.26/hora) - 40% mais barato
 * ✅ Latência: <300ms - 10x mais rápido
 * ✅ Billing: por segundo (não arredonda)
 * ✅ Accuracy: ~99% (Nova-3 model)
 * ❌ TTS: Vozes limitadas (Aura)
 * 
 * WHISPER (Recomendado para qualidade):
 * ✅ Accuracy: 99%+ (state-of-the-art)
 * ✅ TTS: 6 vozes naturais (alloy, echo, fable, onyx, nova, shimmer)
 * ✅ Multilingual: 50+ idiomas
 * ❌ Custo: $0.006/min (~$0.36/hora)
 * ❌ Latência: 2-4 segundos
 * 
 * NATIVE (Free tier):
 * ✅ Gratuito
 * ✅ Latência baixa (local)
 * ❌ Chrome/Edge apenas
 * ❌ Qualidade variável
 */

import type { VoiceServiceType } from './types';

export const VOICE_CONFIG = {
  /**
   * Provider usado para usuários premium.
   * Troque aqui para mudar o provider de voz globalmente.
   */
  premiumProvider: 'deepgram' as VoiceServiceType,
  
  /**
   * Provider usado para usuários free tier.
   * Sempre 'native' (Web Speech API).
   */
  freeProvider: 'native' as VoiceServiceType,
} as const;
