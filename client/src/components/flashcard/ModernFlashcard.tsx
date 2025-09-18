import { useState, useEffect } from "react";
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

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

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
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6 relative" data-testid="modern-flashcard-container">
        {/* Progress and Info Bar */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" data-testid="card-progress">
              {currentIndex + 1} de {flashcards.length}
            </Badge>
            {cardHistory[currentCard.id] && (
              <Badge 
                variant="secondary" 
                className={`text-white ${getDifficultyColor(cardHistory[currentCard.id])}`}
              >
                {cardHistory[currentCard.id] === 'easy' ? 'Fácil' : 
                 cardHistory[currentCard.id] === 'medium' ? 'Médio' : 'Difícil'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span data-testid="card-type">
              {showAnswer ? 'Resposta' : 'Pergunta'}
            </span>
            {showAnswer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </div>
        </div>

        <Progress value={progress} className="h-2" data-testid="flashcard-progress" />

        {/* Floating Difficulty Buttons - Only show when answer is visible */}
        {showAnswer && (
          <div className="absolute right-0 top-32 z-10 flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleDifficulty('easy')}
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 p-0 bg-green-50 hover:bg-green-100 border-green-200 text-green-600 hover:text-green-700 shadow-md"
                  data-testid="button-difficulty-easy"
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-green-600 text-white border-green-600">
                <p>Fácil (1)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleDifficulty('medium')}
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 p-0 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-600 hover:text-yellow-700 shadow-md"
                  data-testid="button-difficulty-medium"
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-yellow-600 text-white border-yellow-600">
                <p>Médio (2)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleDifficulty('hard')}
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 p-0 bg-red-50 hover:bg-red-100 border-red-200 text-red-600 hover:text-red-700 shadow-md"
                  data-testid="button-difficulty-hard"
                >
                  <AlertTriangle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-red-600 text-white border-red-600">
                <p>Difícil (3)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Main Flashcard with 3D Flip */}
        <div className="flashcard-container min-h-[400px]">
          <div 
            className={`flashcard-inner ${showAnswer ? 'flipped' : ''}`}
            onClick={() => !showAnswer && handleFlip()}
            data-testid="flashcard-content"
          >
            {/* Front Face - Question */}
            <div className={`flashcard-face flashcard-front ${!showAnswer ? 'cursor-pointer hover:shadow-lg' : ''}`}>
              <CardContent className="p-8 min-h-[400px] flex flex-col justify-start">
                <div className="text-center space-y-6 py-4">
                  <div className="prose prose-lg max-w-none mx-auto">
                    <FlashcardRenderer content={decodeContent(currentCard.front)} />
                  </div>

                  <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse mt-8">
                    <Lightbulb className="w-5 h-5" />
                    <span>Clique para revelar a resposta ou pressione Espaço</span>
                  </div>
                </div>
              </CardContent>
            </div>

            {/* Back Face - Answer */}
            <div className="flashcard-face flashcard-back">
              <CardContent className="p-8 min-h-[400px] flex flex-col justify-start">
                <div className="text-center space-y-6 py-4">
                  <div className="prose prose-lg max-w-none mx-auto">
                    <FlashcardRenderer content={decodeContent(currentCard.back)} />
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </div>

        {/* Navigation and Action Buttons */}
        <div className="flex flex-col gap-4">
          {/* Primary Actions */}
          {!showAnswer && (
            <div className="flex justify-center">
              <Button 
                onClick={handleFlip}
                size="lg"
                className="min-w-[200px] text-lg"
                data-testid="button-show-answer"
              >
                <Eye className="w-5 h-5 mr-2" />
                Mostrar Resposta
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentIndex === 0}
              data-testid="button-previous"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowAnswer(false)}
                disabled={!showAnswer}
                data-testid="button-reset-card"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Ver Pergunta (R)
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={onNext}
              disabled={currentIndex === flashcards.length - 1 && !showAnswer}
              data-testid="button-next"
            >
              {currentIndex === flashcards.length - 1 ? 'Finalizar' : 'Próximo'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="text-xs text-muted-foreground text-center space-y-1 pt-4 border-t">
          <p><strong>Atalhos:</strong> Espaço/Enter (revelar) | ← → (navegar) | 1,2,3 (dificuldade) | R (ver pergunta)</p>
        </div>
      </div>
    </TooltipProvider>
  );
}