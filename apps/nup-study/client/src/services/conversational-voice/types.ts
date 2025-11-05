/**
 * Tipos para o cliente de Voz Conversacional
 */

/**
 * Mensagens recebidas do servidor
 */
export type ServerMessage =
  | { type: 'ready' }
  | { type: 'listening' }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'thinking' }
  | { type: 'speaking'; text: string }
  | { type: 'audio'; data: string; format?: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

/**
 * Mensagens enviadas ao servidor
 */
export type ClientMessage =
  | { type: 'audio'; data: string }
  | { type: 'start_listening' }
  | { type: 'stop_listening' }
  | { type: 'interrupt' }
  | { type: 'reset' };

/**
 * Estado da conexão
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Estado da conversa
 */
export type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

/**
 * Callback para eventos do cliente
 */
export interface ConversationalVoiceClientCallbacks {
  onConnectionChange?: (state: ConnectionState) => void;
  onConversationStateChange?: (state: ConversationState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAssistantMessage?: (text: string) => void;
  onAudio?: (audioData: string) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: string) => void;
}

/**
 * Configuração do cliente
 */
export interface ConversationalVoiceClientConfig {
  autoStart?: boolean;
  sampleRate?: number;
  debug?: boolean;
}
