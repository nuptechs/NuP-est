/**
 * VOICE AGENT CONFIGURATION
 * 
 * Configurações centralizadas para o Deepgram Voice Agent.
 * Facilita ajustes sem modificar o código core.
 */

import type { AudioConfig, ThinkConfig } from './types';

/**
 * Configuração padrão de áudio
 * 
 * Recomendado:
 * - 16kHz para telefonia/low-bandwidth
 * - 24kHz para quality/web applications
 * - 44.1kHz para high-fidelity
 */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  input: {
    encoding: 'linear16',
    sample_rate: 24000, // 24kHz para qualidade web
  },
  output: {
    encoding: 'linear16',
    sample_rate: 24000,
  },
};

/**
 * Modelos de STT disponíveis
 */
export const STT_MODELS = {
  NOVA_2: 'nova-2',
  NOVA_3: 'nova-3', // Recomendado para voice agents
  FLUX: 'flux-general-en',
} as const;

/**
 * Modelos de TTS disponíveis (Deepgram Aura)
 * NOTA: Aura só suporta inglês e espanhol atualmente
 */
export const TTS_MODELS = {
  ASTERIA_EN: 'aura-asteria-en',
  LUNA_EN: 'aura-luna-en',
  STELLA_EN: 'aura-stella-en',
  ATHENA_EN: 'aura-athena-en',
  HERA_EN: 'aura-hera-en',
  ORION_EN: 'aura-orion-en',
  ARCAS_EN: 'aura-arcas-en',
  PERSEUS_EN: 'aura-perseus-en',
  ANGUS_EN: 'aura-angus-en',
} as const;

/**
 * Configuração padrão do LLM
 */
export const DEFAULT_THINK_CONFIG: Omit<ThinkConfig, 'instructions'> = {
  provider: {
    type: 'open_ai',
  },
  model: 'gpt-4o-mini', // Mais barato e rápido
};

/**
 * URL do WebSocket Deepgram Voice Agent
 */
export const DEEPGRAM_VOICE_AGENT_URL = 'wss://agent.deepgram.com/agent';

/**
 * Configurações de timeout e keep-alive
 */
export const TIMEOUTS = {
  KEEP_ALIVE_INTERVAL: 5000, // 5 segundos (recomendado pela Deepgram)
  SESSION_TIMEOUT: 300000, // 5 minutos de inatividade
  CONNECTION_TIMEOUT: 10000, // 10 segundos para conectar
} as const;

/**
 * Limites de segurança
 */
export const LIMITS = {
  MAX_SESSIONS_PER_USER: 3, // Máximo de sessões simultâneas por usuário
  MAX_AUDIO_CHUNK_SIZE: 1024 * 64, // 64KB por chunk
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB por mensagem
} as const;

/**
 * Configuração para português (usando OpenAI TTS externo)
 * 
 * Como Deepgram Aura não suporta português, esta configuração
 * usa apenas Deepgram STT + OpenAI LLM, deixando TTS para processamento externo.
 */
export const PORTUGUESE_CONFIG = {
  stt: {
    model: 'nova-3' as const,
    language: 'pt-BR',
  },
  llm: {
    provider: {
      type: 'open_ai' as const,
    },
    model: 'gpt-4o-mini',
  },
  // TTS será processado separadamente com OpenAI
  usesExternalTTS: true,
} as const;

/**
 * Instruções padrão para assistentes de estudo
 */
export const DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS = `Você é um assistente de estudos amigável e educado.

Suas responsabilidades:
- Ajudar o aluno a entender conceitos complexos
- Fornecer explicações claras e concisas
- Fazer perguntas para verificar compreensão
- Adaptar seu tom à personalidade do aluno
- Manter conversas naturais e envolventes

Diretrizes:
- Seja paciente e encorajador
- Use exemplos práticos quando possível
- Evite respostas muito longas (máximo 3-4 frases por vez)
- Pergunte se o aluno entendeu antes de avançar
- Fale de forma natural, como em uma conversa real`;
