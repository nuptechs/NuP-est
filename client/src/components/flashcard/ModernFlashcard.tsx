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
  const [cardHistory, setCardHistory] = useState<{[key: string]: 'easy' | 'medium' | 'hard'}>({});
  const [containerHeight, setContainerHeight] = useState<number>(400);
  
  const frontContentRef = useRef<HTMLDivElement>(null);
  const backContentRef = useRef<HTMLDivElement>(null);

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  // Measure content height to prevent overlaps - improved robustness
  useEffect(() => {
    const updateContainerHeight = () => {
      let frontHeight = 400;
      let backHeight = 400;
      
      if (frontContentRef.current) {
        frontHeight = frontContentRef.current.scrollHeight;
      }
      if (backContentRef.current) {
        backHeight = backContentRef.current.scrollHeight;
      }
      
      const maxHeight = Math.max(frontHeight, backHeight, 400);
      setContainerHeight(maxHeight);
    };

    // Small delay to ensure content is rendered
    const timer = setTimeout(updateContainerHeight, 50);

    // Use ResizeObserver for dynamic content
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateContainerHeight, 20);
    });
    
    if (frontContentRef.current) resizeObserver.observe(frontContentRef.current);
    if (backContentRef.current) resizeObserver.observe(backContentRef.current);

    return () => {
      clearTimeout(timer);
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
      setShowAnswer(true);
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


  if (!currentCard) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background" data-testid="modern-flashcard-container">
        {/* Modern Top Bar - Sticky Header */}
        <div className="sticky top-0 z-20 backdrop-blur-sm bg-background/80 border-b">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm font-bold px-3 py-1" data-testid="card-progress">
                  {currentIndex + 1} de {flashcards.length}
                </Badge>
                {cardHistory[currentCard.id] && (
                  <div className={`w-3 h-3 rounded-full ring-2 ring-white ${
                    cardHistory[currentCard.id] === 'easy' ? 'bg-green-500' : 
                    cardHistory[currentCard.id] === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                )}
              </div>
              
              <div className="text-sm font-medium text-muted-foreground" data-testid="card-type">
                {showAnswer ? 'Resposta' : 'Pergunta'}
              </div>
            </div>
            
            <Progress value={progress} className="h-2 mt-3" data-testid="flashcard-progress" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          
          {/* Modern Card Layout */}
          <div className="relative">
            <div 
              className="bg-card border rounded-2xl shadow-sm min-h-[360px] md:min-h-[500px] overflow-hidden"
              style={{ minHeight: `${Math.max(containerHeight + 120, 360)}px` }}
            >
              {/* Card Content */}
              <div className="p-8 md:p-12" style={{ minHeight: `${containerHeight}px` }}>
                {!showAnswer ? (
                  // Question State - No 3D Flip
                  <div 
                    ref={frontContentRef}
                    className="cursor-pointer hover:bg-accent/5 rounded-lg transition-colors p-6 -m-6"
                    onClick={handleFlip}
                    data-testid="flashcard-content"
                  >
                    <div className="space-y-8">
                      {/* Bold Modern Typography */}
                      <div className="prose prose-xl max-w-[75ch] text-left">
                        <FlashcardRenderer content={decodeContent(currentCard.front)} />
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground text-base mt-12">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Lightbulb className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">Clique para revelar a resposta</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Answer State - Fade In
                  <div 
                    ref={backContentRef}
                    className="animate-in fade-in duration-300"
                    data-testid="flashcard-content"
                  >
                    <div className="prose prose-xl max-w-[75ch] text-left">
                      <FlashcardRenderer content={decodeContent(currentCard.back)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Unified Action Bar - Bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm bg-background/95 border-t shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              
              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrevious}
                  disabled={currentIndex === 0}
                  data-testid="button-previous"
                  className="h-10 px-4 font-medium"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnswer(false)}
                  disabled={!showAnswer}
                  data-testid="button-reset-card"
                  className="h-10 px-4 font-medium"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Pergunta
                </Button>
              </div>

              {/* Center Action */}
              <div className="flex-1 flex justify-center">
                {!showAnswer ? (
                  <Button 
                    onClick={handleFlip}
                    size="lg"
                    className="h-12 px-6 md:px-8 text-base font-semibold min-w-[180px] md:min-w-[200px]"
                    data-testid="button-show-answer"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Mostrar Resposta
                  </Button>
                ) : (
                  /* Difficulty Controls - Modern Segmented Style */
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      onClick={() => handleDifficulty('easy')}
                      variant="ghost"
                      size="sm"
                      className="h-10 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50"
                      data-testid="button-difficulty-easy"
                      aria-label="Marcar como fácil"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Fácil
                    </Button>

                    <Button
                      onClick={() => handleDifficulty('medium')}
                      variant="ghost"
                      size="sm"
                      className="h-10 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                      data-testid="button-difficulty-medium"
                      aria-label="Marcar como médio"
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Médio
                    </Button>

                    <Button
                      onClick={() => handleDifficulty('hard')}
                      variant="ghost"
                      size="sm"
                      className="h-10 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid="button-difficulty-hard"
                      aria-label="Marcar como difícil"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Difícil
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNext}
                  disabled={currentIndex === flashcards.length - 1 && !showAnswer}
                  data-testid="button-next"
                  className="h-10 px-4 font-medium"
                >
                  {currentIndex === flashcards.length - 1 ? 'Finalizar' : 'Próximo'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Compact Keyboard Shortcuts */}
            <div className="text-xs text-muted-foreground text-center mt-2 opacity-60">
              Espaço: revelar • ←→: navegar • 1,2,3: dificuldade • R: pergunta
            </div>
          </div>
        </div>

        {/* Bottom Spacer to Prevent Content Overlap */}
        <div className="h-24" />
      </div>
    </TooltipProvider>
  );
}