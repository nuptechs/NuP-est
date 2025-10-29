/**
 * Página do Professor IA
 * Interface de conversação por voz em tempo real com latência ultra-baixa
 */

import { useState } from 'react';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, Brain, Waves } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProfessorIA() {
  const {
    state,
    error,
    transcripts,
    isConnected,
    autoInterruptEnabled,
    connect,
    disconnect,
    interrupt,
    toggleAutoInterrupt,
  } = useRealtimeVoice();

  const getStateConfig = () => {
    switch (state) {
      case 'idle':
        return {
          label: 'Desconectado',
          color: 'bg-gray-500',
          icon: PhoneOff,
          description: 'Clique em "Iniciar Conversa" para começar',
        };
      case 'connecting':
        return {
          label: 'Conectando...',
          color: 'bg-yellow-500 animate-pulse',
          icon: Phone,
          description: 'Estabelecendo conexão com o Professor IA',
        };
      case 'listening':
        return {
          label: 'Ouvindo',
          color: 'bg-green-500 animate-pulse',
          icon: Mic,
          description: 'Fale agora - o professor está ouvindo você',
        };
      case 'thinking':
        return {
          label: 'Pensando...',
          color: 'bg-blue-500 animate-pulse',
          icon: Brain,
          description: 'Processando sua pergunta',
        };
      case 'speaking':
        return {
          label: 'Falando',
          color: 'bg-purple-500 animate-pulse',
          icon: Waves,
          description: 'O professor está respondendo',
        };
      case 'error':
        return {
          label: 'Erro',
          color: 'bg-red-500',
          icon: AlertCircle,
          description: error || 'Ocorreu um erro',
        };
      default:
        return {
          label: 'Desconhecido',
          color: 'bg-gray-500',
          icon: PhoneOff,
          description: '',
        };
    }
  };

  const stateConfig = getStateConfig();
  const StateIcon = stateConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
            Professor IA
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Converse naturalmente com seu professor particular de IA
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna esquerda - Controles e Status */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card de Status */}
            <Card data-testid="card-status">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StateIcon className="w-5 h-5" />
                  Status da Conexão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Indicador visual */}
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${stateConfig.color}`} data-testid="indicator-state" />
                  <Badge variant={isConnected ? 'default' : 'secondary'} data-testid="badge-state">
                    {stateConfig.label}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-description">
                  {stateConfig.description}
                </p>

                {/* Controles */}
                <div className="space-y-2">
                  {!isConnected ? (
                    <Button
                      onClick={connect}
                      className="w-full"
                      disabled={state === 'connecting'}
                      data-testid="button-connect"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Iniciar Conversa
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={disconnect}
                        variant="destructive"
                        className="w-full"
                        data-testid="button-disconnect"
                      >
                        <PhoneOff className="w-4 h-4 mr-2" />
                        Encerrar Conversa
                      </Button>

                      {state === 'speaking' && (
                        <Button
                          onClick={interrupt}
                          variant="outline"
                          className="w-full"
                          data-testid="button-interrupt"
                        >
                          <MicOff className="w-4 h-4 mr-2" />
                          Interromper Professor
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card data-testid="card-settings">
              <CardHeader>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Interrupção Automática</p>
                    <p className="text-xs text-gray-500">
                      Permite interromper o professor quando você começa a falar
                    </p>
                  </div>
                  <Button
                    onClick={toggleAutoInterrupt}
                    variant={autoInterruptEnabled ? "default" : "outline"}
                    size="sm"
                    data-testid="button-toggle-auto-interrupt"
                    className={autoInterruptEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {autoInterruptEnabled ? "Ativado" : "Desativado"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instruções */}
            <Card data-testid="card-instructions">
              <CardHeader>
                <CardTitle className="text-lg">Como usar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex gap-2">
                  <span className="font-semibold min-w-[20px]">1.</span>
                  <span>Clique em "Iniciar Conversa" e permita o acesso ao microfone</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold min-w-[20px]">2.</span>
                  <span>Fale normalmente com o professor - sem precisar apertar botões</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold min-w-[20px]">3.</span>
                  <span>
                    {autoInterruptEnabled 
                      ? "Você pode interromper o professor automaticamente quando começar a falar"
                      : "Clique em 'Interromper' para parar o professor"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold min-w-[20px]">4.</span>
                  <span>O professor adapta o ensino ao seu perfil automaticamente</span>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card data-testid="card-features">
              <CardHeader>
                <CardTitle className="text-lg">Recursos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">Latência Ultra-Baixa</p>
                    <p className="text-xs text-gray-500">Respostas em menos de 500ms</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">Adaptação Automática</p>
                    <p className="text-xs text-gray-500">Ensino personalizado ao seu perfil</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">Interrupções Naturais</p>
                    <p className="text-xs text-gray-500">Converse como com um humano</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita - Transcrições */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-12rem)]" data-testid="card-transcripts">
              <CardHeader>
                <CardTitle>Conversa</CardTitle>
                <CardDescription>
                  {transcripts.length === 0
                    ? 'Suas mensagens aparecerão aqui'
                    : `${transcripts.length} mensagens`}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-5rem)]">
                {error && (
                  <Alert variant="destructive" className="mb-4" data-testid="alert-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <ScrollArea className="h-full pr-4">
                  {transcripts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                      <div className="text-center space-y-2">
                        <Brain className="w-12 h-12 mx-auto opacity-50" />
                        <p className="text-sm">Nenhuma conversa ainda</p>
                        <p className="text-xs">Inicie uma conversa para começar</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transcripts.map((transcript, index) => (
                        <div
                          key={index}
                          className={`flex ${transcript.type === 'input' ? 'justify-end' : 'justify-start'}`}
                          data-testid={`transcript-${transcript.type}-${index}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${
                              transcript.type === 'input'
                                ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {transcript.type === 'output' && (
                                <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm whitespace-pre-wrap">{transcript.text}</p>
                                <p
                                  className={`text-xs mt-1 ${
                                    transcript.type === 'input'
                                      ? 'text-indigo-200 dark:text-indigo-300'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}
                                >
                                  {transcript.timestamp.toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              {transcript.type === 'input' && (
                                <Mic className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
