/**
 * HINTS CONFIGURATION
 * 
 * Sistema centralizado para manter todas as mensagens de hints da aplicação.
 * Facilita tradução, atualização e consistência das mensagens.
 * 
 * USO:
 * import { HINTS } from '@/config/hints';
 * <Hint content={HINTS.voice.basic}>...</Hint>
 */

export const HINTS = {
  voice: {
    native: 'Básico 🆓',
    whisper: 'OpenAI Whisper ⭐',
    deepgram: 'Deepgram ⚡',
  },
  
  tts: {
    native: 'Ouvir (Básico 🆓)',
    whisper: 'Ouvir (OpenAI ⭐)',
    deepgram: 'Ouvir (Deepgram ⚡)',
  },
  
  // Adicione mais hints aqui conforme necessário
  // Exemplo:
  // features: {
  //   flashcards: 'Revise com flashcards inteligentes',
  //   quiz: 'Teste seus conhecimentos',
  // }
} as const;

// Type helper para autocomplete
export type HintKey = keyof typeof HINTS;
