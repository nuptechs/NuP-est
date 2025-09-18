import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff, Lightbulb, ThumbsUp, Minus, AlertTriangle } from "lucide-react";
import type { Flashcard } from "@shared/schema";
import FlashcardRenderer from "./FlashcardRenderer";

interface ModernFlashcardProps {
  flashcards: Flashcard[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete?: (flashcardId: string, difficulty: number) => void;
}

// Função melhorada para decodificar conteúdo
const decodeContent = (content: string): string => {
  if (!content) return '';
  
  try {
    const jsonString = `"${content.replace(/"/g, '\\"')}"`;
    return JSON.parse(jsonString).trim();
  } catch {
    return content
      .replace(/\\\\/g, '\x00TEMP\x00')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\x00TEMP\x00/g, '\\')
      .trim();
  }
};

export default function ModernFlashcard({ flashcards, currentIndex, onNext, onPrevious, onComplete }: ModernFlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [cardHistory, setCardHistory] = useState<{[key: string]: 'easy' | 'medium' | 'hard'}>({});
  const [containerHeight, setContainerHeight] = useState<number>(400);
  
  const frontContentRef = useRef<HTMLDivElement>(null);
  const backContentRef = useRef<HTMLDivElement>(null);

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  // Measure content height to prevent overlaps
  useEffect(() => {
    const updateContainerHeight = () => {
      if (frontContentRef.current && backContentRef.current) {
        const frontHeight = frontContentRef.current.scrollHeight;
        const backHeight = backContentRef.current.scrollHeight;
        const maxHeight = Math.max(frontHeight, backHeight, 400);
        setContainerHeight(maxHeight);
      }
    };

    // Update height when content changes
    updateContainerHeight();

    // Use ResizeObserver for dynamic content
    const resizeObserver = new ResizeObserver(updateContainerHeight);
    if (frontContentRef.current) resizeObserver.observe(frontContentRef.current);
    if (backContentRef.current) resizeObserver.observe(backContentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [currentCard, showAnswer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (!showAnswer) {
            handleFlip();
          }
          break;
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (showAnswer) onNext();
          break;
        case 'r':
          e.preventDefault();
          setShowAnswer(false);
          break;
        case '1':
          if (showAnswer) handleDifficulty('easy');
          break;
        case '2':
          if (showAnswer) handleDifficulty('medium');
          break;
        case '3':
          if (showAnswer) handleDifficulty('hard');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, onNext, onPrevious]);

  // Reset answer visibility when card changes
  useEffect(() => {
    setShowAnswer(false);
  }, [currentIndex]);

  const handleFlip = () => {
    if (!showAnswer) {
      setIsFlipping(true);
      setTimeout(() => {
        setShowAnswer(true);
        setIsFlipping(false);
      }, 150);
    }
  };

  const handleDifficulty = (level: 'easy' | 'medium' | 'hard') => {
    const difficultyMap = { easy: 5, medium: 3, hard: 1 };
    
    setCardHistory(prev => ({
      ...prev,
      [currentCard.id]: level
    }));

    onComplete?.(currentCard.id, difficultyMap[level]);
    onNext();
  };

  const getDifficultyColor = (level: 'easy' | 'medium' | 'hard') => {
    return {
      easy: 'bg-green-500 hover:bg-green-600',
      medium: 'bg-yellow-500 hover:bg-yellow-600', 
      hard: 'bg-red-500 hover:bg-red-600'
    }[level];
  };

  if (!currentCard) return null;

  return (
    <TooltipProvider>
      <div className="w-full max-w-6xl mx-auto p-6 space-y-8" data-testid="modern-flashcard-container">
        {/* Minimal Progress and Info Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs font-medium" data-testid="card-progress">
              {currentIndex + 1}/{flashcards.length}
            </Badge>
            {cardHistory[currentCard.id] && (
              <div className={`w-2 h-2 rounded-full ${
                cardHistory[currentCard.id] === 'easy' ? 'bg-green-500' : 
                cardHistory[currentCard.id] === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            )}
          </div>
          
          <div className="text-xs text-muted-foreground font-medium" data-testid="card-type">
            {showAnswer ? 'Resposta' : 'Pergunta'}
          </div>
        </div>

        <Progress value={progress} className="h-1" data-testid="flashcard-progress" />

        {/* Main Layout: Card + Difficulty Rail (Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,64px] gap-6">
          {/* Flashcard Area */}
          <div className="flashcard-container" style={{ minHeight: `${containerHeight}px` }}>
            <div 
              className={`flashcard-inner ${showAnswer ? 'flipped' : ''}`}
              onClick={() => !showAnswer && handleFlip()}
              data-testid="flashcard-content"
              style={{ height: `${containerHeight}px` }}
            >
              {/* Front Face - Question */}
              <div className={`flashcard-face flashcard-front ${!showAnswer ? 'cursor-pointer hover:border-primary/20' : ''}`}>
                <CardContent ref={frontContentRef} className="p-8 min-h-[400px] flex flex-col justify-center">
                  <div className="space-y-8">
                    <div className="prose prose-lg max-w-prose mx-auto text-center">
                      <FlashcardRenderer content={decodeContent(currentCard.front)} />
                    </div>

                    {!showAnswer && (
                      <div className="flex items-center justify-center gap-3 text-muted-foreground/60 text-sm">
                        <Lightbulb className="w-4 h-4" />
                        <span>Clique para revelar a resposta</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Back Face - Answer */}
              <div className="flashcard-face flashcard-back">
                <CardContent ref={backContentRef} className="p-8 min-h-[400px] flex flex-col justify-center">
                  <div className="prose prose-lg max-w-prose mx-auto text-center">
                    <FlashcardRenderer content={decodeContent(currentCard.back)} />
                  </div>
                </CardContent>
              </div>
            </div>
          </div>

          {/* Difficulty Rail (Desktop Only) */}
          <div className="hidden md:flex flex-col justify-center gap-3">
            {showAnswer && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleDifficulty('easy')}
                      size="sm"
                      variant="ghost"
                      className="w-12 h-12 p-0 hover:bg-green-50 hover:text-green-600 border border-transparent hover:border-green-200"
                      data-testid="button-difficulty-easy"
                      aria-label="Marcar como fácil"
                    >
                      <ThumbsUp className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" collisionPadding={8}>
                    <p>Fácil (1)</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleDifficulty('medium')}
                      size="sm"
                      variant="ghost"
                      className="w-12 h-12 p-0 hover:bg-yellow-50 hover:text-yellow-600 border border-transparent hover:border-yellow-200"
                      data-testid="button-difficulty-medium"
                      aria-label="Marcar como médio"
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" collisionPadding={8}>
                    <p>Médio (2)</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleDifficulty('hard')}
                      size="sm"
                      variant="ghost"
                      className="w-12 h-12 p-0 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200"
                      data-testid="button-difficulty-hard"
                      aria-label="Marcar como difícil"
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" collisionPadding={8}>
                    <p>Difícil (3)</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Mobile Difficulty Buttons (Bottom Bar) */}
        {showAnswer && (
          <div className="md:hidden flex justify-center gap-4 pt-4 border-t">
            <Button
              onClick={() => handleDifficulty('easy')}
              size="sm"
              variant="ghost"
              className="flex items-center gap-2 hover:bg-green-50 hover:text-green-600"
              data-testid="button-difficulty-easy-mobile"
              aria-label="Marcar como fácil"
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs">Fácil</span>
            </Button>

            <Button
              onClick={() => handleDifficulty('medium')}
              size="sm"
              variant="ghost"
              className="flex items-center gap-2 hover:bg-yellow-50 hover:text-yellow-600"
              data-testid="button-difficulty-medium-mobile"
              aria-label="Marcar como médio"
            >
              <Minus className="w-4 h-4" />
              <span className="text-xs">Médio</span>
            </Button>

            <Button
              onClick={() => handleDifficulty('hard')}
              size="sm"
              variant="ghost"
              className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600"
              data-testid="button-difficulty-hard-mobile"
              aria-label="Marcar como difícil"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Difícil</span>
            </Button>
          </div>
        )}

        {/* Primary Action - Show Answer */}
        {!showAnswer && (
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleFlip}
              variant="outline"
              className="min-w-[180px] h-11 text-sm font-medium"
              data-testid="button-show-answer"
            >
              <Eye className="w-4 h-4 mr-2" />
              Mostrar Resposta
            </Button>
          </div>
        )}

        {/* Minimal Navigation */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            data-testid="button-previous"
            className="text-xs"
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnswer(false)}
              disabled={!showAnswer}
              data-testid="button-reset-card"
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Ver Pergunta
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={currentIndex === flashcards.length - 1 && !showAnswer}
            data-testid="button-next"
            className="text-xs"
          >
            {currentIndex === flashcards.length - 1 ? 'Finalizar' : 'Próximo'}
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Minimal Keyboard Shortcuts */}
        <div className="text-xs text-muted-foreground/50 text-center pt-4">
          <p>Espaço/Enter: revelar • ←→: navegar • 1,2,3: dificuldade • R: ver pergunta</p>
        </div>
      </div>
    </TooltipProvider>
  );
}