/**
 * Tipos para Sistema de Voz em Tempo Real
 * Arquitetura modular para fácil troca de providers (OpenAI, Deepgram, etc)
 */

import type WebSocket from 'ws';

/**
 * Configuração de sessão de voz
 */
export interface RealtimeSessionConfig {
  userId: string;
  sessionId?: string;
  
  // Áudio
  inputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  outputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate?: 16000 | 24000 | 48000;
  
  // Comportamento
  voice?: string;
  language?: string;
  temperature?: number;
  
  // Pedagogia
  systemPrompt?: string;
  enableFunctionCalling?: boolean;
  enableTranscription?: boolean;
  
  // VAD (Voice Activity Detection)
  vadEnabled?: boolean;
  vadThreshold?: number;
  vadSilenceDuration?: number; // ms
}

/**
 * Contexto do aluno para personalização
 */
export interface StudentContext {
  // Básico
  userId: string;
  name: string;
  age?: number;
  
  // Perfil de estudo
  studyProfile: 'disciplined' | 'undisciplined' | 'average';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
  learningDifficulties: string[];
  
  // Objetivos
  studyObjective?: string; // "ENEM", "Concurso", etc
  studyDeadline?: Date;
  dailyStudyHours?: number;
  
  // Contexto atual
  currentSubject?: {
    name: string;
    category: 'exatas' | 'humanas' | 'biologicas';
    level: 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert';
    weakTopics: string[];
    strongTopics: string[];
  };
  
  // Preferências
  needsMotivation: boolean;
  prefersExamples: boolean;
  preferredExplanationStyle: 'simple' | 'detailed' | 'practical' | 'theoretical' | 'balanced';
}

/**
 * Função disponível para o assistente chamar
 */
export interface AssistantFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any, context: { userId: string; sessionId: string }) => Promise<any>;
}

/**
 * Eventos emitidos pelo provider
 */
export type RealtimeProviderEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'disconnected'; reason?: string }
  | { type: 'error'; error: string; code?: string }
  
  // Áudio
  | { type: 'audio_input_started' }
  | { type: 'audio_input_ended' }
  | { type: 'audio_output_started' }
  | { type: 'audio_output_chunk'; audio: string; format: string } // base64
  | { type: 'audio_output_ended' }
  
  // Transcrição
  | { type: 'transcript_input'; text: string; isFinal: boolean }
  | { type: 'transcript_output'; text: string }
  
  // Resposta
  | { type: 'response_started' }
  | { type: 'response_completed' }
  | { type: 'response_cancelled' }
  
  // Function calling
  | { type: 'function_call'; functionName: string; arguments: string; callId: string }
  | { type: 'function_call_completed'; callId: string };

/**
 * Mensagens do cliente para o servidor
 */
export type ClientToServerMessage =
  | { type: 'start_session'; config?: Partial<RealtimeSessionConfig> }
  | { type: 'audio_chunk'; audio: string } // base64 PCM16
  | { type: 'interrupt' }
  | { type: 'end_session' };

/**
 * Mensagens do servidor para o cliente
 */
export type ServerToClientMessage =
  | { type: 'session_started'; sessionId: string }
  | { type: 'session_ended' }
  | { type: 'error'; error: string }
  
  // Áudio
  | { type: 'audio_output'; audio: string; format: string } // base64
  
  // Transcrição
  | { type: 'transcript_input'; text: string; isFinal: boolean }
  | { type: 'transcript_output'; text: string }
  
  // Estados
  | { type: 'listening' }
  | { type: 'thinking' }
  | { type: 'speaking' }
  | { type: 'idle' };

/**
 * Sessão ativa
 */
export interface RealtimeSession {
  id: string;
  userId: string;
  clientWs: WebSocket;
  providerSessionId?: string;
  config: RealtimeSessionConfig;
  studentContext?: StudentContext;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  lastActivity: Date;
}
