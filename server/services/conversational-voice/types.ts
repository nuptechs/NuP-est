/**
 * Sistema de Voz Conversacional
 * Deepgram STT + OpenAI GPT + Deepgram TTS
 */

import type WebSocket from 'ws';

/**
 * Configuração de áudio
 */
export interface AudioConfig {
  encoding: 'linear16' | 'opus' | 'mulaw';
  sampleRate: 16000 | 24000 | 48000;
  channels: 1 | 2;
}

/**
 * Configuração do assistente
 */
export interface AssistantConfig {
  systemPrompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  language: string;
}

/**
 * Sessão de conversa
 */
export interface ConversationSession {
  id: string;
  userId: string;
  clientWs: WebSocket;
  sttWs: WebSocket | null;
  audioConfig: AudioConfig;
  assistantConfig: AssistantConfig;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  isListening: boolean;
  isListeningReady: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Opções para criar sessão
 */
export interface CreateSessionOptions {
  userId: string;
  clientWs: WebSocket;
  audioConfig?: Partial<AudioConfig>;
  assistantConfig?: Partial<AssistantConfig>;
}

/**
 * Mensagens do cliente
 */
export type ClientMessage =
  | { type: 'audio'; data: string } // Base64 audio
  | { type: 'start_listening' }
  | { type: 'stop_listening' }
  | { type: 'interrupt' }
  | { type: 'reset' };

/**
 * Mensagens para o cliente
 */
export type ServerMessage =
  | { type: 'ready' }
  | { type: 'listening' }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'thinking' }
  | { type: 'speaking'; text: string }
  | { type: 'audio'; data: string } // Base64 audio
  | { type: 'done' }
  | { type: 'error'; error: string };

/**
 * Configuração padrão de áudio
 */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  encoding: 'linear16',
  sampleRate: 16000,
  channels: 1,
};

/**
 * Configuração padrão do assistente
 */
export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  systemPrompt: `Você é um assistente de estudos inteligente e amigável. 
Ajude o aluno com suas dúvidas de forma clara, didática e motivadora.
Mantenha respostas concisas e diretas ao ponto.
Sempre em português brasileiro.`,
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 500,
  language: 'pt-BR',
};
