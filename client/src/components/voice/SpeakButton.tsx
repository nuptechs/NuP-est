/**
 * SPEAK BUTTON COMPONENT
 * 
 * Permite ouvir textos usando TTS (Text-to-Speech).
 * Funciona apenas com modo Premium (WhisperVoiceService).
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { HINTS } from '@/config/hints';
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
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handleSpeak = async () => {
    console.log('[SpeakButton] Clicado - isPremium:', isPremium, 'isPlaying:', isPlaying, 'isPaused:', isPaused);
    
    // Se está pausado, resumir
    if (isPaused) {
      console.log('[SpeakButton] Resumindo áudio...');
      if (audioRef.current) {
        audioRef.current.play();
      } else if (window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    
    // Se já está tocando, pausar
    if (isPlaying) {
      console.log('[SpeakButton] Pausando áudio...');
      if (audioRef.current) {
        audioRef.current.pause();
      } else if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
      setIsPaused(true);
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
        
        // Usar speechSynthesis diretamente para ter controle de pause
        if (!window.speechSynthesis) {
          throw new Error('Speech Synthesis não disponível neste navegador');
        }
        
        // Limpar fila antes de iniciar
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Carregar vozes (necessário em alguns navegadores)
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Tentar usar voz em português
          const ptVoice = voices.find(v => v.lang.startsWith('pt'));
          if (ptVoice) {
            utterance.voice = ptVoice;
            console.log('[SpeakButton] Usando voz:', ptVoice.name);
          }
        }
        
        utterance.onstart = () => {
          console.log('[SpeakButton] Síntese iniciada (modo básico)');
          setIsPlaying(true);
          setIsLoading(false);
          setIsPaused(false);
        };
        
        utterance.onend = () => {
          console.log('[SpeakButton] Áudio finalizado');
          setIsPlaying(false);
          setIsPaused(false);
        };
        
        utterance.onerror = (event) => {
          console.error('[SpeakButton] Erro no utterance:', event);
          setIsPlaying(false);
          setIsLoading(false);
          setIsPaused(false);
          toast({
            title: "Erro na síntese",
            description: "Não foi possível tocar o áudio.",
            variant: "destructive",
          });
        };
        
        // Setar estado imediatamente (workaround para eventos que não disparam)
        setIsPlaying(true);
        setIsLoading(false);
        
        window.speechSynthesis.speak(utterance);
        console.log('[SpeakButton] speak() chamado, esperando áudio...');
        
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

  const handleStop = () => {
    console.log('[SpeakButton] Parando áudio completamente...');
    
    // Parar áudio Premium
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Parar áudio Básico
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
  };

  const hintContent = isPremium ? HINTS.tts.premium : HINTS.tts.basic;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Hint content={hintContent} side="top">
        <Button
          onClick={handleSpeak}
          size="sm"
          variant="ghost"
          disabled={isLoading}
          data-testid="button-speak"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPaused ? (
            <Volume2 className="h-4 w-4" />
          ) : isPlaying ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          <span className="ml-2 text-xs">
            {isLoading ? 'Gerando...' : isPaused ? 'Continuar' : isPlaying ? 'Pausar' : 'Ouvir'}
          </span>
        </Button>
      </Hint>
      
      {/* Botão de parar (apenas se estiver tocando ou pausado) */}
      {(isPlaying || isPaused) && (
        <Button
          onClick={handleStop}
          size="sm"
          variant="ghost"
          data-testid="button-stop"
        >
          <span className="text-xs">Parar</span>
        </Button>
      )}
    </div>
  );
}
