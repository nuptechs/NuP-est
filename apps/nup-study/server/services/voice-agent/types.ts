/**
 * VOICE AGENT TYPES
 * 
 * Tipos TypeScript para o sistema de conversação em tempo real.
 * Baseado na Deepgram Voice Agent API V1.
 */

import type { WebSocket } from 'ws';

/**
 * Configuração de áudio para entrada e saída
 */
export interface AudioConfig {
  input: {
    encoding: 'linear16' | 'mulaw' | 'alaw';
    sample_rate: number;
  };
  output: {
    encoding: 'linear16' | 'mulaw' | 'alaw';
    sample_rate: number;
    bitrate?: number;
    container?: string;
  };
}

/**
 * Configuração do provider de STT (Speech-to-Text)
 */
export interface ListenConfig {
  model?: 'nova-2' | 'nova-3' | 'flux-general-en';
  language?: string;
}

/**
 * Configuração do provider de LLM (Language Model)
 */
export interface ThinkConfig {
  provider: {
    type: 'open_ai' | 'custom';
  };
  model: string;
  instructions?: string;
  functions?: FunctionDefinition[];
}

/**
 * Configuração do provider de TTS (Text-to-Speech)
 */
export interface SpeakConfig {
  model?: string;
  language?: string;
}

/**
 * Definição de função para function calling
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  url: string;
  method: 'get' | 'post' | 'put' | 'delete';
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Contexto da conversação (histórico de mensagens)
 */
export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  replay?: boolean;
}

/**
 * Configuração completa do Voice Agent
 */
export interface VoiceAgentConfig {
  audio?: AudioConfig;
  agent: {
    listen?: ListenConfig;
    think: ThinkConfig;
    speak?: SpeakConfig;
  };
  context?: ConversationContext;
}

/**
 * Mensagem de configuração enviada ao Deepgram
 */
export interface SettingsMessage {
  type: 'SettingsConfiguration';
  audio?: AudioConfig;
  agent: {
    listen?: ListenConfig;
    think: ThinkConfig;
    speak?: SpeakConfig;
  };
  context?: ConversationContext;
}

/**
 * Eventos do Voice Agent
 */
export interface VoiceAgentEvents {
  connected: () => void;
  disconnected: () => void;
  userStartedSpeaking: () => void;
  userStoppedSpeaking: () => void;
  agentStartedSpeaking: () => void;
  agentStoppedSpeaking: () => void;
  audioData: (audio: Buffer) => void;
  transcription: (text: string, isFinal: boolean) => void;
  error: (error: Error) => void;
  functionCall: (name: string, args: any) => void;
}

/**
 * Estado da sessão do Voice Agent
 */
export interface VoiceAgentSession {
  id: string;
  userId: string;
  ws: WebSocket;
  dgWs: WebSocket | null;
  config: VoiceAgentConfig;
  isConnected: boolean;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Opções para criar uma nova sessão
 */
export interface CreateSessionOptions {
  userId: string;
  assistantId?: string;
  instructions?: string;
  functions?: FunctionDefinition[];
  context?: ConversationContext;
}

/**
 * Métricas da sessão (opcional, para analytics)
 */
export interface SessionMetrics {
  sessionId: string;
  duration: number;
  messagesExchanged: number;
  audioBytesSent: number;
  audioBytesReceived: number;
  errors: number;
}
