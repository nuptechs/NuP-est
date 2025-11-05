/**
 * VOICE AGENT DEMO COMPONENT
 * 
 * Componente de demonstração para conversação em tempo real com Deepgram Voice Agent.
 * 
 * USO:
 * ```tsx
 * import { VoiceAgentDemo } from '@/components/voice-agent/VoiceAgentDemo';
 * 
 * function MyPage() {
 *   return <VoiceAgentDemo />;
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import { VoiceAgentClient } from '@/services/voice-agent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function VoiceAgentDemo() {
  const [client] = useState(() => new VoiceAgentClient());
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Registrar listeners
    client.on('connected', (sessionId) => {
      console.log('Conectado! Sessão:', sessionId);
      setIsConnected(true);
      setError(null);
    });

    client.on('disconnected', () => {
      console.log('Desconectado');
      setIsConnected(false);
      setIsListening(false);
    });

    client.on('transcription', (text, isFinal) => {
      setCurrentTranscript(text);
      
      if (isFinal && text.trim()) {
        // Adicionar mensagem do usuário
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            type: 'user',
            text: text.trim(),
            timestamp: new Date(),
          },
        ]);
        setCurrentTranscript('');
      }
    });

    client.on('userSpeaking', (isStart) => {
      setUserSpeaking(isStart);
    });

    client.on('agentSpeaking', (isStart) => {
      setAgentSpeaking(isStart);
      
      // Quando o assistente começa a falar, adicionar marcador de mensagem
      if (isStart) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            text: '🎙️ Falando...',
            timestamp: new Date(),
          },
        ]);
      }
    });

    client.on('error', (errorMessage) => {
      console.error('Erro:', errorMessage);
      setError(errorMessage);
    });

    // Cleanup
    return () => {
      client.disconnect();
    };
  }, [client]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConnect = async () => {
    try {
      setError(null);
      await client.connect();
    } catch (err) {
      console.error('Erro ao conectar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao conectar');
    }
  };

  const handleDisconnect = () => {
    client.disconnect();
  };

  const handleStartListening = async () => {
    try {
      setError(null);
      await client.startListening();
      setIsListening(true);
    } catch (err) {
      console.error('Erro ao iniciar microfone:', err);
      setError('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const handleStopListening = () => {
    client.stopListening();
    setIsListening(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="card-voice-agent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Voice Agent Demo</CardTitle>
            <CardDescription>
              Conversação em tempo real com Deepgram Voice Agent
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            {isConnected && (
              <Badge variant="default" className="bg-green-500">
                Conectado
              </Badge>
            )}
            {userSpeaking && (
              <Badge variant="secondary">
                <Mic className="w-3 h-3 mr-1" />
                Você
              </Badge>
            )}
            {agentSpeaking && (
              <Badge variant="secondary">
                <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                Assistente
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controles */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={handleConnect}
              className="flex-1"
              data-testid="button-connect"
            >
              <Phone className="w-4 h-4 mr-2" />
              Conectar
            </Button>
          ) : (
            <>
              {!isListening ? (
                <Button 
                  onClick={handleStartListening}
                  className="flex-1"
                  variant="default"
                  data-testid="button-start-listening"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Iniciar Conversa
                </Button>
              ) : (
                <Button 
                  onClick={handleStopListening}
                  className="flex-1"
                  variant="destructive"
                  data-testid="button-stop-listening"
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Parar Microfone
                </Button>
              )}
              
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                data-testid="button-disconnect"
              >
                <PhoneOff className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400" data-testid="text-error">
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Transcrição em tempo real */}
        {currentTranscript && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-600 dark:text-blue-400 italic" data-testid="text-current-transcript">
              {currentTranscript}...
            </p>
          </div>
        )}

        {/* Histórico de mensagens */}
        <ScrollArea className="h-[400px] border rounded-md p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Nenhuma conversa ainda.</p>
                <p className="text-sm">Conecte e comece a falar!</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.type}-${message.id}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Instruções */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Como usar:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Clique em "Conectar" para iniciar a sessão</li>
            <li>Clique em "Iniciar Conversa" e permita o acesso ao microfone</li>
            <li>Fale naturalmente - o assistente responderá em tempo real</li>
            <li>Use fones de ouvido para evitar eco</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
