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
import { Badge } from '@/components/ui/badge';
import { Hint } from '@/components/ui/hint';
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

  const serviceType = isPremium ? 'whisper' : 'native';
  const tierLabel = isPremium ? 'Premium ⭐' : 'Básico 🆓';

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
      title: `Modo voz ativado (${tierLabel})`,
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

  const getHintContent = () => {
    if (isPremium) {
      return (
        <div className="text-center">
          <div className="font-semibold mb-1">⭐ Modo Premium</div>
          <div className="text-xs opacity-90">
            • OpenAI Whisper API<br/>
            • Qualidade superior (~99%)<br/>
            • Cross-browser<br/>
            • Custo: $0.006/min
          </div>
        </div>
      );
    }
    return (
      <div className="text-center">
        <div className="font-semibold mb-1">🆓 Modo Básico</div>
        <div className="text-xs opacity-90">
          • Web Speech API<br/>
          • Gratuito<br/>
          • Chrome/Edge apenas<br/>
          • Qualidade padrão
        </div>
      </div>
    );
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={disabled || !!error}
        data-testid="button-voice-toggle"
        className="gap-2 h-7 px-2 hover:bg-transparent"
      >
        {getButtonIcon()}
        <span className="text-sm font-medium">Modo Voz</span>
      </Button>

      <Hint content={getHintContent()} side="bottom">
        <Badge 
          variant={isPremium ? 'default' : 'secondary'}
          className="gap-1 text-xs cursor-help"
          data-testid="badge-voice-tier"
        >
          {tierLabel}
        </Badge>
      </Hint>
    </div>
  );
}
