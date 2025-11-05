/**
 * VOICE TOGGLE COMPONENT
 * 
 * Componente de ativação de modo voz com indicador visual de tier.
 * 
 * FEATURES:
 * - Toggle on/off para ativar transcrição de voz
 * - Indicador visual de modo (Básico 🆓 / Premium ⭐)
 * - Estados visuais: idle, listening, processing
 * - Feedback de erros inline
 * 
 * PROPS:
 * - isPremium: boolean - Define qual implementação usar
 * - onTranscript: (text: string) => void - Callback com texto transcrito
 * - disabled: boolean - Desabilita o controle
 */

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { HINTS } from '@/config/hints';
import { 
  VoiceServiceFactory, 
  type IVoiceService, 
  type TranscriptionResult,
  VoiceServiceError 
} from '@/services/voice';
import { useToast } from '@/hooks/use-toast';

interface VoiceToggleProps {
  isPremium?: boolean;
  onTranscript: (text: string) => void;
  disabled?: boolean;
  language?: string;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export function VoiceToggle({ 
  isPremium = false, 
  onTranscript, 
  disabled = false,
  language = 'pt-BR'
}: VoiceToggleProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const voiceServiceRef = useRef<IVoiceService | null>(null);
  const { toast } = useToast();

  const hintContent = isPremium ? HINTS.voice.deepgram : HINTS.voice.native;

  useEffect(() => {
    // Inicializar serviço
    voiceServiceRef.current = VoiceServiceFactory.create(isPremium);

    // Verificar disponibilidade
    if (!voiceServiceRef.current.isAvailable()) {
      const metadata = voiceServiceRef.current.getMetadata();
      
      if (metadata.type === 'native') {
        setError('Reconhecimento de voz não disponível neste navegador. Use Chrome ou Edge.');
      } else {
        setError('Microfone não disponível. Verifique as permissões.');
      }
    }

    // Cleanup
    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.destroy();
      }
    };
  }, [isPremium]);

  const handleToggle = () => {
    if (disabled || !voiceServiceRef.current) return;

    if (isActive) {
      // Parar transcrição
      stopListening();
    } else {
      // Iniciar transcrição
      startListening();
    }
  };

  const startListening = () => {
    if (!voiceServiceRef.current) return;

    setError(null);
    setState('listening');
    setIsActive(true);

    const metadata = voiceServiceRef.current.getMetadata();
    const isWhisper = metadata.type === 'whisper';

    voiceServiceRef.current.startTranscription(
      {
        language,
        continuous: !isWhisper, // Native = continuous, Whisper = batch
        interimResults: !isWhisper,
      },
      handleTranscriptionResult,
      handleTranscriptionError
    );

    toast({
      title: `Modo voz ativado (${hintContent})`,
      description: isWhisper 
        ? 'Fale e clique novamente para transcrever'
        : 'Fale naturalmente, estarei ouvindo...',
    });
  };

  const stopListening = () => {
    if (!voiceServiceRef.current) return;

    const metadata = voiceServiceRef.current.getMetadata();
    const isWhisper = metadata.type === 'whisper';

    if (isWhisper) {
      setState('processing');
    }

    voiceServiceRef.current.stopTranscription();
    
    // Se não for Whisper, já pode voltar ao idle
    if (!isWhisper) {
      setState('idle');
      setIsActive(false);
    }
  };

  const handleTranscriptionResult = (result: TranscriptionResult) => {
    if (result.isFinal && result.text.trim()) {
      onTranscript(result.text);
      
      // Se for Whisper (batch), voltar ao idle após transcrição
      const metadata = voiceServiceRef.current?.getMetadata();
      if (metadata?.type === 'whisper') {
        setState('idle');
        setIsActive(false);
        
        toast({
          title: 'Transcrição concluída',
          description: `"${result.text.substring(0, 50)}${result.text.length > 50 ? '...' : ''}"`,
        });
      }
    }
  };

  const handleTranscriptionError = (err: Error) => {
    console.error('[VoiceToggle] Erro:', err);
    
    setState('error');
    setIsActive(false);

    if (err instanceof VoiceServiceError) {
      setError(err.message);
      
      if (!err.recoverable) {
        toast({
          title: 'Erro no reconhecimento de voz',
          description: err.message,
          variant: 'destructive',
        });
      }
    } else {
      setError('Erro desconhecido no reconhecimento de voz');
    }

    // Auto-limpar erro após 5s
    setTimeout(() => {
      if (state === 'error') {
        setError(null);
        setState('idle');
      }
    }, 5000);
  };

  const getButtonVariant = () => {
    if (state === 'error') return 'destructive';
    if (isActive) return 'default';
    return 'outline';
  };

  const getButtonIcon = () => {
    if (state === 'processing') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isActive) return <Mic className="h-4 w-4 animate-pulse" />;
    return <MicOff className="h-4 w-4" />;
  };

  const getTierColor = () => {
    return isPremium ? 'bg-violet-500' : 'bg-emerald-500';
  };

  return (
    <Hint content={hintContent} side="bottom">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={disabled || !!error}
        data-testid="button-voice-toggle"
        className="gap-2 relative"
      >
        {getButtonIcon()}
        <span>Modo Voz</span>
        
        {/* Indicador sutil de tier no canto superior direito */}
        <span 
          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${getTierColor()} ring-2 ring-background shadow-sm`}
          aria-hidden="true"
        />
      </Button>
    </Hint>
  );
}
