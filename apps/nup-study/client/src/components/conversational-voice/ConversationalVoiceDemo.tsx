/**
 * Componente de Demonstração do Sistema de Voz Conversacional
 * Deepgram STT + OpenAI + Deepgram TTS
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, RotateCcw } from 'lucide-react';
import { ConversationalVoiceClient, type ConnectionState, type ConversationState } from '@/services/conversational-voice';

export function ConversationalVoiceDemo() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);

  const clientRef = useRef<ConversationalVoiceClient | null>(null);

  useEffect(() => {
    // Criar cliente
    const client = new ConversationalVoiceClient(
      {
        onConnectionChange: setConnectionState,
        onConversationStateChange: setConversationState,
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setTranscript(text);
            setPartialTranscript('');
          } else {
            setPartialTranscript(text);
          }
        },
        onAssistantMessage: setAssistantMessage,
        onVolumeChange: setVolume,
        onError: (err) => {
          setError(err);
          setTimeout(() => setError(null), 5000);
        },
      },
      {
        debug: true,
        sampleRate: 16000,
      }
    );

    clientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    if (!clientRef.current) return;

    try {
      setError(null);
      await clientRef.current.connect();
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar');
    }
  };

  const handleDisconnect = () => {
    if (!clientRef.current) return;
    clientRef.current.disconnect();
    setIsListening(false);
  };

  const handleToggleListen = async () => {
    if (!clientRef.current) return;

    try {
      if (isListening) {
        clientRef.current.stopListening();
        setIsListening(false);
      } else {
        await clientRef.current.startListening();
        setIsListening(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao alternar escuta');
    }
  };

  const handleReset = () => {
    if (!clientRef.current) return;
    clientRef.current.reset();
    setTranscript('');
    setAssistantMessage('');
    setIsListening(false);
  };

  const getConnectionBadge = () => {
    const variants: Record<ConnectionState, { variant: any; label: string }> = {
      disconnected: { variant: 'secondary', label: 'Desconectado' },
      connecting: { variant: 'default', label: 'Conectando...' },
      connected: { variant: 'default', label: 'Conectado' },
      error: { variant: 'destructive', label: 'Erro' },
    };

    const config = variants[connectionState];
    return <Badge variant={config.variant} data-testid="badge-connection">{config.label}</Badge>;
  };

  const getConversationBadge = () => {
    const variants: Record<ConversationState, { variant: any; label: string }> = {
      idle: { variant: 'outline', label: 'Aguardando' },
      listening: { variant: 'default', label: '🎤 Escutando' },
      thinking: { variant: 'secondary', label: '🤔 Pensando...' },
      speaking: { variant: 'default', label: '🔊 Falando' },
    };

    const config = variants[conversationState];
    return <Badge variant={config.variant} data-testid="badge-conversation">{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assistente de Voz Conversacional</span>
            <div className="flex gap-2">
              {getConnectionBadge()}
              {getConversationBadge()}
            </div>
          </CardTitle>
          <CardDescription>
            Sistema inteligente de voz usando Deepgram STT + OpenAI + Deepgram TTS
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Controles */}
          <div className="flex gap-3 flex-wrap">
            {connectionState === 'disconnected' || connectionState === 'error' || connectionState === 'connecting' ? (
              <Button
                onClick={handleConnect}
                disabled={connectionState === 'connecting'}
                data-testid="button-connect"
              >
                <Phone className="mr-2 h-4 w-4" />
                {connectionState === 'connecting' ? 'Conectando...' : 'Conectar'}
              </Button>
            ) : (
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                data-testid="button-disconnect"
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            )}

            <Button
              onClick={handleToggleListen}
              disabled={connectionState !== 'connected'}
              variant={isListening ? 'destructive' : 'default'}
              data-testid="button-toggle-listen"
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Parar Escuta
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Iniciar Escuta
                </>
              )}
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              disabled={connectionState !== 'connected'}
              data-testid="button-reset"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetar
            </Button>
          </div>

          {/* Erro */}
          {error && (
            <div
              className="p-4 border border-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg"
              data-testid="error-message"
            >
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Medidor de Volume */}
          {isListening && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Nível de Áudio:
              </h3>
              <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100"
                  style={{ width: `${volume * 100}%` }}
                  data-testid="volume-meter"
                />
              </div>
            </div>
          )}

          {/* Transcrição */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Você disse:</h3>
            <div
              className="p-4 bg-muted rounded-lg min-h-[60px]"
              data-testid="text-transcript"
            >
              {transcript || partialTranscript ? (
                <>
                  {transcript && (
                    <div className="font-semibold text-foreground">{transcript}</div>
                  )}
                  {partialTranscript && !transcript && (
                    <div className="text-muted-foreground italic">{partialTranscript}...</div>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground italic">Nenhuma transcrição ainda...</span>
              )}
            </div>
          </div>

          {/* Resposta do Assistente */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Assistente respondeu:</h3>
            <div
              className="p-4 bg-primary/5 rounded-lg min-h-[80px]"
              data-testid="text-assistant-message"
            >
              {assistantMessage || (
                <span className="text-muted-foreground italic">Aguardando resposta...</span>
              )}
            </div>
          </div>

          {/* Instruções */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2 text-sm">Como usar:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Clique em "Conectar" para iniciar a conexão</li>
              <li>Clique em "Iniciar Escuta" e permita acesso ao microfone</li>
              <li>Fale sua pergunta naturalmente em português</li>
              <li>O assistente irá processar e responder por voz</li>
              <li>Use "Resetar" para começar uma nova conversa</li>
            </ol>
          </div>

          {/* Info Técnica */}
          <div className="pt-4 border-t">
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold mb-2">Informações Técnicas</summary>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>STT:</strong> Deepgram Nova-2 (Speech-to-Text)</li>
                <li><strong>LLM:</strong> OpenAI GPT-4o-mini</li>
                <li><strong>TTS:</strong> Deepgram Aura (Text-to-Speech)</li>
                <li><strong>Latência:</strong> ~500ms total</li>
                <li><strong>Idioma:</strong> Português Brasileiro</li>
              </ul>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
