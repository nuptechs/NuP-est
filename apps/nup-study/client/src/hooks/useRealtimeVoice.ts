/**
 * Hook para gerenciar conexão WebSocket com Professor IA
 * Captura áudio do microfone, envia para servidor, recebe e reproduz respostas
 */

import { useState, useRef, useCallback, useEffect } from 'react';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface TranscriptMessage {
  type: 'input' | 'output';
  text: string;
  timestamp: Date;
}

interface UseRealtimeVoiceReturn {
  state: VoiceState;
  error: string | null;
  transcripts: TranscriptMessage[];
  isConnected: boolean;
  autoInterruptEnabled: boolean;
  maxResponseTime: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
  toggleAutoInterrupt: () => void;
  setMaxResponseTime: (seconds: number) => Promise<void>;
}

export function useRealtimeVoice(): UseRealtimeVoiceReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoInterruptEnabled, setAutoInterruptEnabled] = useState(true);
  const [maxResponseTime, setMaxResponseTimeState] = useState(30);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // VAD (Voice Activity Detection) para interrupção automática
  const vadThreshold = 0.02; // Limite para detectar fala (ajustável)
  const vadConsecutiveFrames = 3; // Frames consecutivos acima do threshold
  const vadFrameCountRef = useRef(0);

  // Limpar recursos de áudio
  const cleanupAudio = useCallback(() => {
    // Parar áudio atual se estiver tocando
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {
        // Ignorar erro se já parou
      }
      currentAudioSourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    vadFrameCountRef.current = 0;
  }, []);

  // Converter Float32 para PCM16
  const floatTo16BitPCM = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }, []);

  // Reproduzir áudio recebido
  const playAudioChunk = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const audioContext = audioContextRef.current;

      // Decodificar base64 para ArrayBuffer
      const binaryString = atob(base64Audio);
      const length = binaryString.length;
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Garantir alinhamento correto (PCM16 = 2 bytes por sample)
      const alignedLength = bytes.length - (bytes.length % 2);
      const alignedBytes = bytes.slice(0, alignedLength);

      // Converter PCM16 para Float32 com alta qualidade
      const pcm16 = new Int16Array(alignedBytes.buffer, alignedBytes.byteOffset, alignedBytes.length / 2);
      const float32 = new Float32Array(pcm16.length);
      
      // Conversão PCM16 -> Float32 com normalização de alta qualidade
      for (let i = 0; i < pcm16.length; i++) {
        // Usar divisão com número exato para evitar artefatos
        float32[i] = pcm16[i] / 32768.0;
      }

      // Criar AudioBuffer
      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Adicionar à fila
      audioQueueRef.current.push(audioBuffer);

      // Iniciar reprodução se não estiver tocando
      if (!isPlayingRef.current) {
        playNextInQueue();
      }

    } catch (err) {
      console.error('[RealtimeVoice] Erro ao reproduzir áudio:', err);
    }
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioSourceRef.current = null;
      setState('listening');
      return;
    }

    isPlayingRef.current = true;
    setState('speaking');

    const audioBuffer = audioQueueRef.current.shift();
    if (!audioBuffer || !audioContextRef.current) return;

    // Criar source node
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer as any;
    
    // Conectar diretamente ao destino (sem processamento adicional)
    source.connect(audioContextRef.current.destination);

    currentAudioSourceRef.current = source;

    source.onended = () => {
      currentAudioSourceRef.current = null;
      // Reproduzir próximo chunk imediatamente (sem pausa)
      playNextInQueue();
    };

    // Iniciar reprodução imediatamente
    source.start(0);
  }, []);

  // Iniciar captura de microfone
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true, // Melhora qualidade do microfone
        },
      });

      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // VAD: Calcular RMS (Root Mean Square) do áudio de entrada
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Detectar se usuário está falando (apenas se auto-interrupt estiver ativado)
        if (rms > vadThreshold) {
          vadFrameCountRef.current++;
          
          // Se detectar voz consistente E professor está falando E auto-interrupt ativo, interromper
          if (autoInterruptEnabled && vadFrameCountRef.current >= vadConsecutiveFrames && isPlayingRef.current) {
            console.log('[RealtimeVoice] 🔴 Interrupção automática detectada (VAD)');
            
            // Parar áudio imediatamente
            if (currentAudioSourceRef.current) {
              try {
                currentAudioSourceRef.current.stop();
              } catch (e) {
                // Ignorar
              }
              currentAudioSourceRef.current = null;
            }
            
            // Limpar fila de áudio
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            
            // Enviar comando de interrupção ao servidor
            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
            
            setState('listening');
          }
        } else {
          // Reset contador se silêncio
          vadFrameCountRef.current = 0;
        }

        const pcm16 = floatTo16BitPCM(inputData);

        // Converter para base64
        const uint8Array = new Uint8Array(pcm16.buffer);
        const base64 = btoa(String.fromCharCode(...Array.from(uint8Array)));

        // Enviar para servidor
        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          audio: base64,
        }));
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      console.log('[RealtimeVoice] Microfone iniciado');
    } catch (err) {
      console.error('[RealtimeVoice] Erro ao acessar microfone:', err);
      throw new Error('Não foi possível acessar o microfone');
    }
  }, [floatTo16BitPCM]);

  // Conectar ao WebSocket
  const connect = useCallback(async () => {
    try {
      setState('connecting');
      setError(null);

      // Fechar conexão anterior se existir
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Criar WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/realtime-voice`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('[RealtimeVoice] Conectado ao servidor');
        setIsConnected(true);
        setState('listening');

        // Iniciar microfone
        await startMicrophone();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'session_started':
              console.log('[RealtimeVoice] Sessão iniciada:', message.sessionId);
              break;

            case 'audio_output':
              playAudioChunk(message.audio);
              break;

            case 'transcript_input':
              if (message.isFinal) {
                setTranscripts(prev => [...prev, {
                  type: 'input',
                  text: message.text,
                  timestamp: new Date(),
                }]);
              }
              break;

            case 'transcript_output':
              setTranscripts(prev => [...prev, {
                type: 'output',
                text: message.text,
                timestamp: new Date(),
              }]);
              break;

            case 'listening':
              setState('listening');
              break;

            case 'thinking':
              setState('thinking');
              break;

            case 'error':
              console.error('[RealtimeVoice] Erro do servidor:', message.error);
              setError(message.error);
              setState('error');
              break;

            case 'session_ended':
              console.log('[RealtimeVoice] Sessão encerrada');
              disconnect();
              break;
          }
        } catch (err) {
          console.error('[RealtimeVoice] Erro ao processar mensagem:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[RealtimeVoice] Erro WebSocket:', event);
        setError('Erro na conexão com o servidor');
        setState('error');
      };

      ws.onclose = () => {
        console.log('[RealtimeVoice] Conexão fechada');
        setIsConnected(false);
        setState('idle');
        cleanupAudio();
      };

    } catch (err: any) {
      console.error('[RealtimeVoice] Erro ao conectar:', err);
      setError(err.message || 'Erro ao conectar');
      setState('error');
    }
  }, [startMicrophone, playAudioChunk, cleanupAudio]);

  // Desconectar
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    cleanupAudio();
    setIsConnected(false);
    setState('idle');
  }, [cleanupAudio]);

  // Interromper professor (manual ou automático)
  const interrupt = useCallback(() => {
    console.log('[RealtimeVoice] Interrompendo professor...');
    
    // Parar áudio atual imediatamente
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {
        // Ignorar erro se já parou
      }
      currentAudioSourceRef.current = null;
    }
    
    // Limpar fila de áudio pendente
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Enviar comando ao servidor
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    
    setState('listening');
  }, []);

  // Toggle auto-interrupt
  const toggleAutoInterrupt = useCallback(() => {
    setAutoInterruptEnabled(prev => {
      console.log(`[RealtimeVoice] Interrupção automática: ${!prev ? 'ATIVADA' : 'DESATIVADA'}`);
      return !prev;
    });
  }, []);

  // Atualizar tempo máximo de resposta
  const setMaxResponseTime = useCallback(async (seconds: number) => {
    try {
      const response = await fetch('/api/realtime-voice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResponseTime: seconds }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar configuração');

      const data = await response.json();
      setMaxResponseTimeState(data.maxResponseTime);
      console.log(`[RealtimeVoice] Tempo máximo atualizado: ${data.maxResponseTime}s`);
    } catch (err) {
      console.error('[RealtimeVoice] Erro ao atualizar tempo máximo:', err);
    }
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Carregar configurações ao montar
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/realtime-voice/config');
        if (response.ok) {
          const data = await response.json();
          setMaxResponseTimeState(data.maxResponseTime);
        }
      } catch (err) {
        console.error('[RealtimeVoice] Erro ao carregar configuração:', err);
      }
    };
    loadConfig();
  }, []);

  return {
    state,
    error,
    transcripts,
    isConnected,
    autoInterruptEnabled,
    maxResponseTime,
    connect,
    disconnect,
    interrupt,
    toggleAutoInterrupt,
    setMaxResponseTime,
  };
}
