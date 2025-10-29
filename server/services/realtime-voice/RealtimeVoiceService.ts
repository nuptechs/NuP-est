/**
 * Serviço de Voz em Tempo Real
 * Orquestrador que gerencia providers, sessões e function calling
 * 
 * Arquitetura modular: trocar OpenAI por Deepgram ou outro provider sem mudar código
 */

import WebSocket from 'ws';
import type {
  RealtimeSession,
  RealtimeSessionConfig,
  ClientToServerMessage,
  ServerToClientMessage,
  StudentContext,
  AssistantFunction,
} from './types.js';
import type { IRealtimeVoiceProvider } from './providers/IRealtimeVoiceProvider.js';
import { OpenAIRealtimeProvider } from './providers/OpenAIRealtimeProvider.js';
import { getStudentContextFunction, getSubjectKnowledgeFunction } from './functions/getStudentContext.js';
import { QuestionRefiner } from './QuestionRefiner.js';
import { db } from '../../db.js';
import { users } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';

export class RealtimeVoiceService {
  private sessions: Map<string, RealtimeSession> = new Map();
  private providers: Map<string, IRealtimeVoiceProvider> = new Map();
  private functions: Map<string, AssistantFunction> = new Map();
  private questionRefiner: QuestionRefiner;

  constructor(
    private apiKey: string,
    private providerType: 'openai' | 'deepgram' = 'openai',
    private maxResponseTime: number = 30 // Tempo máximo de resposta em segundos
  ) {
    // Registrar funções padrão (compartilhadas entre providers)
    this.registerDefaultFunctions();
    
    // Inicializar Question Refiner
    this.questionRefiner = new QuestionRefiner(apiKey, maxResponseTime);
    console.log(`[RealtimeVoice] QuestionRefiner inicializado (max: ${maxResponseTime}s)`);
  }

  /**
   * Cria sessão de voz em tempo real
   */
  async createSession(
    userId: string,
    clientWs: WebSocket,
    config?: Partial<RealtimeSessionConfig>
  ): Promise<string> {
    const sessionId = `rtv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let provider: IRealtimeVoiceProvider | undefined;

    try {
      // Buscar contexto do aluno do DB
      const studentContext = await this.fetchStudentContext(userId);

      // Configuração padrão
      const fullConfig: RealtimeSessionConfig = {
        userId,
        sessionId,
        voice: 'alloy',
        language: 'pt-BR',
        temperature: 0.7,
        inputAudioFormat: 'pcm16',
        outputAudioFormat: 'pcm16',
        sampleRate: 24000,
        vadEnabled: true,
        vadThreshold: 0.5,
        vadSilenceDuration: 500,
        enableTranscription: true,
        enableFunctionCalling: true,
        systemPrompt: this.buildSystemPrompt(studentContext),
        ...config,
      };

      // Criar sessão
      const session: RealtimeSession = {
        id: sessionId,
        userId,
        clientWs,
        config: fullConfig,
        studentContext,
        conversationHistory: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      this.sessions.set(sessionId, session);

      // Criar provider específico para esta sessão
      provider = this.createProvider(this.providerType, this.apiKey);
      this.providers.set(sessionId, provider);

      // Registrar funções no provider da sessão
      for (const func of Array.from(this.functions.values())) {
        provider.registerFunction(func);
      }

      // Conectar provider (pode falhar)
      const providerSessionId = await provider.connect(fullConfig);
      session.providerSessionId = providerSessionId;

      // Setup event handlers
      this.setupProviderHandlers(sessionId);
      this.setupClientHandlers(sessionId);

      // Atualizar contexto no provider
      if (studentContext) {
        await provider.updateStudentContext(studentContext);
      }

      // Notificar cliente
      this.sendToClient(sessionId, {
        type: 'session_started',
        sessionId,
      });

      console.log(`[RealtimeVoice] Sessão criada: ${sessionId} (provider: ${provider.name})`);

      return sessionId;
      
    } catch (error) {
      // Cleanup em caso de erro
      console.error(`[RealtimeVoice] Erro ao criar sessão ${sessionId}:`, error);
      
      // Remover sessão e provider dos Maps
      this.sessions.delete(sessionId);
      
      if (provider) {
        try {
          await provider.disconnect();
        } catch (disconnectError) {
          console.error(`[RealtimeVoice] Erro ao desconectar provider durante cleanup:`, disconnectError);
        }
      }
      
      this.providers.delete(sessionId);
      
      // Re-throw para notificar caller
      throw error;
    }
  }

  /**
   * Encerra sessão
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const provider = this.providers.get(sessionId);
    if (provider) {
      await provider.disconnect();
      this.providers.delete(sessionId);
    }
    
    this.sendToClient(sessionId, { type: 'session_ended' });
    
    this.sessions.delete(sessionId);
    console.log(`[RealtimeVoice] Sessão encerrada: ${sessionId}`);
  }

  /**
   * Métodos privados
   */

  private createProvider(type: string, apiKey: string): IRealtimeVoiceProvider {
    switch (type) {
      case 'openai':
        return new OpenAIRealtimeProvider(apiKey);
      
      case 'deepgram':
        // TODO: Implementar DeepgramRealtimeProvider
        throw new Error('Deepgram provider ainda não implementado');
      
      default:
        throw new Error(`Provider desconhecido: ${type}`);
    }
  }

  private registerDefaultFunctions(): void {
    // Registrar funções de contexto do aluno
    this.registerFunction(getStudentContextFunction);
    this.registerFunction(getSubjectKnowledgeFunction);
  }

  private registerFunction(func: AssistantFunction): void {
    this.functions.set(func.name, func);
    // Funções serão registradas quando criar cada provider de sessão
  }

  private async fetchStudentContext(userId: string): Promise<StudentContext | undefined> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) return undefined;

      return {
        userId: user.id,
        name: user.firstName || 'Aluno',
        age: user.age || undefined,
        studyProfile: user.studyProfile as any || 'average',
        learningStyle: user.learningStyle as any || 'mixed',
        learningDifficulties: user.customDifficulties ? [user.customDifficulties] : [],
        studyObjective: user.studyObjective || undefined,
        dailyStudyHours: user.dailyStudyHours ? Number(user.dailyStudyHours) : undefined,
        needsMotivation: user.needsMotivation || false,
        prefersExamples: user.prefersExamples !== false,
        preferredExplanationStyle: user.preferredExplanationStyle as any || 'balanced',
      };
    } catch (error) {
      console.error('[RealtimeVoice] Erro ao buscar contexto:', error);
      return undefined;
    }
  }

  private buildSystemPrompt(context?: StudentContext): string {
    let prompt = `Você é um Professor IA do NuP-Study, um sistema de estudos personalizado.

Seu papel é ensinar de forma didática, paciente e motivadora, adaptando-se ao perfil do aluno.

${this.questionRefiner.generateTeacherInstructions()}

INSTRUÇÕES GERAIS:
- Sempre em português brasileiro
- Use linguagem clara e apropriada
- Seja encorajador e positivo
- Explique conceitos de forma gradual
- Use exemplos práticos quando possível (mas breves)
- Pergunte se o aluno entendeu antes de avançar
- Adapte ritmo e profundidade ao nível do aluno`;

    if (context) {
      prompt += `\n\n=== PERFIL DO ALUNO ===`;
      prompt += `\nNome: ${context.name}`;
      
      if (context.age) {
        prompt += `\nIdade: ${context.age} anos`;
      }
      
      if (context.studyObjective) {
        prompt += `\nObjetivo: ${context.studyObjective}`;
      }

      if (context.learningDifficulties.length > 0) {
        prompt += `\nDificuldades: ${context.learningDifficulties.join(', ')}`;
        prompt += `\n→ Seja ainda mais paciente e repita conceitos quando necessário`;
      }

      if (context.needsMotivation) {
        prompt += `\n→ Este aluno precisa de motivação extra. Celebre pequenas conquistas!`;
      }

      if (context.prefersExamples) {
        prompt += `\n→ Sempre use exemplos práticos e concretos`;
      }

      prompt += `\n\nEstilo de explicação preferido: ${context.preferredExplanationStyle}`;
    }

    prompt += `\n\nFUNÇÕES DISPONÍVEIS:
- get_student_context(): Busca perfil detalhado do aluno
- get_subject_knowledge(subject_name): Busca nível em uma matéria específica

Use essas funções quando precisar de informações sobre o aluno para personalizar sua explicação.`;

    return prompt;
  }

  private setupProviderHandlers(sessionId: string): void {
    const provider = this.providers.get(sessionId);
    if (!provider) return;

    provider.on(async (event) => {
      const session = this.sessions.get(sessionId);
      if (!session) return;

      session.lastActivity = new Date();

      switch (event.type) {
        case 'audio_output_chunk':
          this.sendToClient(sessionId, {
            type: 'audio_output',
            audio: event.audio,
            format: event.format,
          });
          break;

        case 'transcript_input':
          this.sendToClient(sessionId, {
            type: 'transcript_input',
            text: event.text,
            isFinal: event.isFinal,
          });
          
          if (event.isFinal) {
            // Refinar pergunta antes de processar
            const refinedQuestion = await this.questionRefiner.refineQuestion(
              event.text,
              {
                name: session.studentContext?.name,
                learningDifficulties: session.studentContext?.learningDifficulties || [],
                learningObjectives: session.studentContext?.studyObjective ? [session.studentContext.studyObjective] : [],
                currentSubject: undefined, // TODO: rastrear matéria atual
                category: undefined, // TODO: rastrear categoria
              }
            );
            
            console.log(`[RealtimeVoice] Pergunta original: "${event.text}"`);
            if (refinedQuestion.refined !== event.text) {
              console.log(`[RealtimeVoice] Pergunta refinada: "${refinedQuestion.refined}"`);
            }
            
            session.conversationHistory.push({
              role: 'user',
              content: refinedQuestion.refined, // Salvar versão refinada
            });
          }
          break;

        case 'transcript_output':
          this.sendToClient(sessionId, {
            type: 'transcript_output',
            text: event.text,
          });
          break;

        case 'response_started':
          this.sendToClient(sessionId, { type: 'thinking' });
          break;

        case 'response_completed':
          this.sendToClient(sessionId, { type: 'idle' });
          break;

        case 'audio_input_started':
          this.sendToClient(sessionId, { type: 'listening' });
          break;

        case 'audio_input_ended':
          this.sendToClient(sessionId, { type: 'thinking' });
          break;

        case 'function_call':
          await this.handleFunctionCall(sessionId, event.functionName, event.arguments, event.callId);
          break;

        case 'error':
          console.error(`[RealtimeVoice] Erro provider:`, event.error);
          this.sendToClient(sessionId, {
            type: 'error',
            error: event.error,
          });
          break;
      }
    });
  }

  private setupClientHandlers(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const provider = this.providers.get(sessionId);
    if (!provider) return;

    session.clientWs.on('message', async (data) => {
      try {
        const message: ClientToServerMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'audio_chunk':
            provider.sendAudio(message.audio);
            break;

          case 'interrupt':
            provider.interrupt();
            break;

          case 'end_session':
            await this.endSession(sessionId);
            break;
        }
      } catch (error) {
        console.error('[RealtimeVoice] Erro ao processar mensagem:', error);
      }
    });

    session.clientWs.on('close', async () => {
      await this.endSession(sessionId);
    });
  }

  private async handleFunctionCall(
    sessionId: string,
    functionName: string,
    argsJson: string,
    callId: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const provider = this.providers.get(sessionId);
    if (!provider) return;

    const func = this.functions.get(functionName);
    if (!func) {
      console.warn(`[RealtimeVoice] Função desconhecida: ${functionName}`);
      provider.sendFunctionResult(callId, { error: 'Função não encontrada' });
      return;
    }

    try {
      const args = JSON.parse(argsJson);
      const context = {
        userId: session.userId,
        sessionId: session.id,
      };

      console.log(`[RealtimeVoice] Executando função: ${functionName}`, args);

      const result = await func.handler(args, context);

      console.log(`[RealtimeVoice] Resultado:`, result);

      provider.sendFunctionResult(callId, result);

    } catch (error) {
      console.error(`[RealtimeVoice] Erro ao executar função ${functionName}:`, error);
      provider.sendFunctionResult(callId, { error: 'Erro ao executar função' });
    }
  }

  private sendToClient(sessionId: string, message: ServerToClientMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.clientWs.readyState !== WebSocket.OPEN) return;

    session.clientWs.send(JSON.stringify(message));
  }

  /**
   * Métodos públicos de utilidade
   */

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getProviderName(): string {
    // Retorna nome baseado no tipo configurado
    return this.providerType === 'openai' ? 'OpenAI Realtime' : 'Deepgram Aura';
  }

  /**
   * Atualiza tempo máximo de resposta
   */
  setMaxResponseTime(seconds: number): void {
    this.questionRefiner.setMaxResponseTime(seconds);
    console.log(`[RealtimeVoice] Tempo máximo de resposta atualizado: ${seconds}s`);
  }

  /**
   * Obtém tempo máximo de resposta
   */
  getMaxResponseTime(): number {
    return this.questionRefiner.getMaxResponseTime();
  }
}
