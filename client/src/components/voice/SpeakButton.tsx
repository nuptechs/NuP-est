/**
 * SPEAK BUTTON COMPONENT
 * 
 * Permite ouvir textos usando TTS (Text-to-Speech).
 * Funciona apenas com modo Premium (WhisperVoiceService).
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { VoiceServiceFactory } from '@/services/voice/VoiceServiceFactory';
import { useToast } from '@/hooks/use-toast';

interface SpeakButtonProps {
  text: string;
  isPremium: boolean;
  voice?: string;
  className?: string;
}

export function SpeakButton({ text, isPremium, voice = 'alloy', className }: SpeakButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handleSpeak = async () => {
    console.log('[SpeakButton] Clicado - isPremium:', isPremium, 'isPlaying:', isPlaying);
    
    // Se já está tocando, parar
    if (isPlaying) {
      console.log('[SpeakButton] Parando áudio...');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      // Para speechSynthesis também
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    console.log('[SpeakButton] Iniciando síntese...');

    try {
      const voiceService = VoiceServiceFactory.create(isPremium);
      console.log('[SpeakButton] VoiceService criado:', voiceService.getMetadata().type);
      
      if (!isPremium) {
        // Modo Básico: speechSynthesis toca diretamente (não retorna áudio)
        console.log('[SpeakButton] Usando modo básico - texto:', text.substring(0, 100) + '...');
        await voiceService.synthesize(text, voice);
        console.log('[SpeakButton] Síntese iniciada (modo básico)');
        setIsPlaying(true);
        setIsLoading(false);
        
        // Simula "onended" - reseta após um tempo estimado
        const estimatedDuration = (text.length / 15) * 1000; // ~15 caracteres/segundo
        console.log('[SpeakButton] Duração estimada:', estimatedDuration / 1000, 'segundos');
        setTimeout(() => {
          console.log('[SpeakButton] Áudio finalizado (estimativa)');
          setIsPlaying(false);
        }, estimatedDuration);
      } else {
        // Modo Premium: Whisper retorna áudio MP3
        const result = await voiceService.synthesize(text, voice);
        
        // Converter base64 para Blob
        let audioBlob: Blob;
        if (typeof result.audio === 'string') {
          const byteCharacters = atob(result.audio);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
        } else {
          audioBlob = result.audio;
        }

        // Criar URL do blob para tocar
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Criar elemento de áudio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
          toast({
            title: "Erro ao tocar áudio",
            description: "Não foi possível reproduzir o áudio gerado.",
            variant: "destructive",
          });
        };

        // Tocar
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      }

    } catch (error: any) {
      console.error('[SpeakButton] Erro completo:', error);
      setIsLoading(false);
      setIsPlaying(false);
      
      toast({
        title: "Erro na síntese de voz",
        description: error.message || "Não foi possível gerar o áudio.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleSpeak}
      size="sm"
      variant="ghost"
      disabled={isLoading}
      className={className}
      data-testid="button-speak"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      <span className="ml-2 text-xs">
        {isLoading ? 'Gerando...' : isPlaying ? 'Parar' : 'Ouvir'}
      </span>
    </Button>
  );
}
