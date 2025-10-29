/**
 * Provider OpenAI Realtime API
 * Implementação do IRealtimeVoiceProvider usando GPT-4o Realtime
 */

import WebSocket from 'ws';
import type {
  RealtimeSessionConfig,
  RealtimeProviderEvent,
  AssistantFunction,
  StudentContext,
} from '../types.js';
import type { IRealtimeVoiceProvider } from './IRealtimeVoiceProvider.js';

interface OpenAIRealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
}

export class OpenAIRealtimeProvider implements IRealtimeVoiceProvider {
  readonly name = 'OpenAI Realtime';

  private ws: WebSocket | null = null;
  private apiKey: string;
  private config: RealtimeSessionConfig | null = null;
  private listeners: Array<(event: RealtimeProviderEvent) => void> = [];
  private functions: Map<string, AssistantFunction> = new Map();
  private sessionId: string = '';
  
  // Métricas
  private inputTokens = 0;
  private outputTokens = 0;
  
  // Acumuladores de transcrição
  private currentTranscriptOutput: string = '';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async connect(config: RealtimeSessionConfig): Promise<string> {
    this.config = config;
    
    // Conectar ao OpenAI Realtime API
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    
    this.ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket não inicializado'));
        return;
      }

      this.ws.on('open', () => {
        console.log('[OpenAIRealtime] Conectado');
        
        // Configurar sessão
        this.sendEvent({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            voice: config.voice || 'alloy',
            instructions: config.systemPrompt || 'Você é um professor assistente.',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: config.enableTranscription ? {
              model: 'whisper-1',
            } : null,
            turn_detection: config.vadEnabled !== false ? {
              type: 'server_vad',
              threshold: config.vadThreshold || 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: config.vadSilenceDuration || 500,
            } : null,
            tools: Array.from(this.functions.values()).map(f => ({
              type: 'function',
              name: f.name,
              description: f.description,
              parameters: f.parameters,
            })),
            temperature: config.temperature || 0.7,
          },
        });

        this.sessionId = config.sessionId || `session_${Date.now()}`;
        this.emit({ type: 'connected', sessionId: this.sessionId });
        resolve(this.sessionId);
      });

      this.ws.on('message', (data) => {
        this.handleEvent(JSON.parse(data.toString()));
      });

      this.ws.on('error', (error) => {
        console.error('[OpenAIRealtime] Erro:', error);
        this.emit({ type: 'error', error: error.message });
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[OpenAIRealtime] Desconectado: ${code} - ${reason}`);
        this.emit({ type: 'disconnected', reason: reason.toString() });
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendAudio(audioChunk: string): void {
    if (!this.isConnected()) {
      console.warn('[OpenAIRealtime] Tentando enviar áudio sem conexão');
      return;
    }

    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: audioChunk,
    });
  }

  interrupt(): void {
    if (!this.isConnected()) return;

    this.sendEvent({
      type: 'response.cancel',
    });

    this.emit({ type: 'response_cancelled' });
  }

  async updateStudentContext(context: StudentContext): Promise<void> {
    if (!this.isConnected()) return;

    // Atualizar system prompt com contexto do aluno
    const enrichedPrompt = this.buildContextualPrompt(context);

    this.sendEvent({
      type: 'session.update',
      session: {
        instructions: enrichedPrompt,
      },
    });
  }

  registerFunction(func: AssistantFunction): void {
    this.functions.set(func.name, func);
    console.log(`[OpenAIRealtime] Função registrada: ${func.name}`);
  }

  sendFunctionResult(callId: string, result: any): void {
    if (!this.isConnected()) return;

    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });

    // Trigger nova resposta
    this.sendEvent({
      type: 'response.create',
    });
  }

  on(callback: (event: RealtimeProviderEvent) => void): void {
    this.listeners.push(callback);
  }

  off(callback: (event: RealtimeProviderEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getUsageInfo() {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      estimatedCost: (this.inputTokens * 0.00001) + (this.outputTokens * 0.00002), // aproximado
    };
  }

  /**
   * Métodos privados
   */

  private sendEvent(event: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[OpenAIRealtime] WebSocket não está aberto');
      return;
    }

    this.ws.send(JSON.stringify(event));
  }

  private emit(event: RealtimeProviderEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  private handleEvent(event: OpenAIRealtimeEvent): void {
    // console.log(`[OpenAIRealtime] Evento: ${event.type}`);

    switch (event.type) {
      case 'session.created':
        console.log('[OpenAIRealtime] Sessão criada:', event.session?.id);
        break;

      case 'session.updated':
        console.log('[OpenAIRealtime] Sessão atualizada');
        break;

      case 'input_audio_buffer.speech_started':
        this.emit({ type: 'audio_input_started' });
        break;

      case 'input_audio_buffer.speech_stopped':
        this.emit({ type: 'audio_input_ended' });
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.emit({
          type: 'transcript_input',
          text: event.transcript || '',
          isFinal: true,
        });
        break;

      case 'response.audio.delta':
        this.emit({
          type: 'audio_output_chunk',
          audio: event.delta,
          format: 'pcm16',
        });
        break;

      case 'response.audio_transcript.delta':
        // Acumular deltas (OpenAI envia palavra por palavra)
        this.currentTranscriptOutput += event.delta || '';
        break;
      
      case 'response.audio_transcript.done':
        // Emitir transcrição completa
        if (this.currentTranscriptOutput) {
          this.emit({
            type: 'transcript_output',
            text: this.currentTranscriptOutput,
          });
          this.currentTranscriptOutput = '';
        }
        break;

      case 'response.created':
        this.emit({ type: 'response_started' });
        break;

      case 'response.done':
        this.emit({ type: 'response_completed' });
        
        // Extrair métricas
        if (event.response?.usage) {
          this.inputTokens += event.response.usage.input_tokens || 0;
          this.outputTokens += event.response.usage.output_tokens || 0;
        }
        break;

      case 'response.function_call_arguments.done':
        this.emit({
          type: 'function_call',
          functionName: event.name,
          arguments: event.arguments,
          callId: event.call_id,
        });
        break;

      case 'error':
        // Ignorar erro de cancelamento quando não há resposta ativa (não é crítico)
        if (event.error?.code === 'response_cancel_not_active') {
          console.log('[OpenAIRealtime] Tentativa de cancelar resposta inexistente (ignorado)');
          break;
        }
        
        console.error('[OpenAIRealtime] Erro do servidor:', event.error);
        this.emit({
          type: 'error',
          error: event.error?.message || 'Erro desconhecido',
          code: event.error?.code,
        });
        break;

      case 'rate_limits.updated':
        // Ignorar por enquanto
        break;

      default:
        // console.log(`[OpenAIRealtime] Evento não tratado: ${event.type}`);
        break;
    }
  }

  private buildContextualPrompt(context: StudentContext): string {
    const base = this.config?.systemPrompt || 'Você é um professor assistente.';
    
    let contextualInfo = `\n\n=== CONTEXTO DO ALUNO ===\n`;
    contextualInfo += `Nome: ${context.name}\n`;
    
    if (context.age) {
      contextualInfo += `Idade: ${context.age} anos\n`;
    }
    
    contextualInfo += `Perfil: ${context.studyProfile}\n`;
    contextualInfo += `Estilo de aprendizado: ${context.learningStyle}\n`;
    
    if (context.learningDifficulties.length > 0) {
      contextualInfo += `Dificuldades: ${context.learningDifficulties.join(', ')}\n`;
    }
    
    if (context.studyObjective) {
      contextualInfo += `Objetivo: ${context.studyObjective}\n`;
    }
    
    if (context.currentSubject) {
      contextualInfo += `\nMatéria atual: ${context.currentSubject.name} (${context.currentSubject.category})\n`;
      contextualInfo += `Nível: ${context.currentSubject.level}\n`;
      
      if (context.currentSubject.weakTopics.length > 0) {
        contextualInfo += `Tópicos fracos: ${context.currentSubject.weakTopics.join(', ')}\n`;
      }
    }
    
    contextualInfo += `\n=== PREFERÊNCIAS ===\n`;
    contextualInfo += `Estilo de explicação: ${context.preferredExplanationStyle}\n`;
    contextualInfo += `Precisa motivação: ${context.needsMotivation ? 'Sim' : 'Não'}\n`;
    contextualInfo += `Prefere exemplos: ${context.prefersExamples ? 'Sim' : 'Não'}\n`;
    
    contextualInfo += `\n=== INSTRUÇÕES ===\n`;
    contextualInfo += `- Adapte seu tom e ritmo ao perfil do aluno\n`;
    contextualInfo += `- Use linguagem apropriada para a idade\n`;
    contextualInfo += `- Reforce positivamente conquistas\n`;
    contextualInfo += `- Seja paciente e didático\n`;
    contextualInfo += `- Sempre em português brasileiro\n`;
    
    return base + contextualInfo;
  }
}
