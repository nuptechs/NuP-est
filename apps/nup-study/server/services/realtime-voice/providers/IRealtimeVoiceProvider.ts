/**
 * Interface para providers de voz em tempo real
 * Implementações: OpenAI Realtime, Deepgram Aura, etc
 * 
 * Esta interface permite trocar facilmente entre diferentes providers
 * sem modificar o código do sistema.
 */

import type {
  RealtimeSessionConfig,
  RealtimeProviderEvent,
  AssistantFunction,
  StudentContext,
} from '../types.js';

export interface IRealtimeVoiceProvider {
  /**
   * Nome do provider (para logging/debugging)
   */
  readonly name: string;

  /**
   * Inicializa conexão com o provider
   */
  connect(config: RealtimeSessionConfig): Promise<string>; // retorna session ID do provider

  /**
   * Desconecta sessão
   */
  disconnect(): Promise<void>;

  /**
   * Envia áudio para o provider
   * @param audioChunk - Base64 encoded PCM16 audio
   */
  sendAudio(audioChunk: string): void;

  /**
   * Interrompe resposta atual
   */
  interrupt(): void;

  /**
   * Atualiza contexto do aluno no meio da conversa
   */
  updateStudentContext(context: StudentContext): Promise<void>;

  /**
   * Registra funções que o assistente pode chamar
   */
  registerFunction(func: AssistantFunction): void;

  /**
   * Envia resultado de function call
   */
  sendFunctionResult(callId: string, result: any): void;

  /**
   * Registra listener para eventos
   */
  on(callback: (event: RealtimeProviderEvent) => void): void;

  /**
   * Remove listener
   */
  off(callback: (event: RealtimeProviderEvent) => void): void;

  /**
   * Retorna se está conectado
   */
  isConnected(): boolean;

  /**
   * Retorna informações de custo/uso (opcional)
   */
  getUsageInfo?(): {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}
