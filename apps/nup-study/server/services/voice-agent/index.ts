/**
 * DEEPGRAM VOICE AGENT MODULE
 * 
 * Módulo completo e encapsulado para conversação em tempo real.
 * 
 * EXPORTS:
 * - DeepgramVoiceAgent: Classe principal
 * - Types: Todos os tipos TypeScript
 * - Config: Configurações e constantes
 * 
 * EXEMPLO DE USO:
 * ```typescript
 * import { DeepgramVoiceAgent, DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS } from './services/voice-agent';
 * 
 * const agent = new DeepgramVoiceAgent(process.env.DEEPGRAM_API_KEY!);
 * 
 * // Em uma rota WebSocket:
 * app.ws('/voice-agent', async (ws, req) => {
 *   const sessionId = await agent.createSession(ws, {
 *     userId: req.user.id,
 *     instructions: DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS,
 *   });
 * 
 *   ws.on('message', (data) => {
 *     const message = JSON.parse(data);
 *     if (message.type === 'audio') {
 *       agent.sendAudio(sessionId, Buffer.from(message.audio, 'base64'));
 *     }
 *   });
 * 
 *   ws.on('close', () => {
 *     agent.endSession(sessionId);
 *   });
 * });
 * ```
 * 
 * PARA COPIAR PARA OUTRO PROJETO:
 * 1. Copie a pasta `server/services/voice-agent/` inteira
 * 2. Instale dependências: `npm install ws @types/ws @deepgram/sdk`
 * 3. Configure DEEPGRAM_API_KEY no .env
 * 4. Importe e use como no exemplo acima
 */

export { DeepgramVoiceAgent } from './DeepgramVoiceAgent';

export type {
  AudioConfig,
  ListenConfig,
  ThinkConfig,
  SpeakConfig,
  FunctionDefinition,
  ConversationContext,
  VoiceAgentConfig,
  SettingsMessage,
  VoiceAgentEvents,
  VoiceAgentSession,
  CreateSessionOptions,
  SessionMetrics,
} from './types';

export {
  DEFAULT_AUDIO_CONFIG,
  STT_MODELS,
  TTS_MODELS,
  DEFAULT_THINK_CONFIG,
  DEEPGRAM_VOICE_AGENT_URL,
  TIMEOUTS,
  LIMITS,
  PORTUGUESE_CONFIG,
  DEFAULT_STUDY_ASSISTANT_INSTRUCTIONS,
} from './config';
