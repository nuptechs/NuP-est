import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@nup/ui";
import { Button } from "@nup/ui";
import { Loader2, Sparkles, X, MessageSquare } from 'lucide-react';
import { useToast } from "@nup/ui";
import { useLocation } from 'wouter';
import ReactMarkdown from 'react-markdown';

interface AIExplanationDialogProps {
  concept: string;
  nodeId: string;
  mindMapId?: string;
  onClose: () => void;
}

export function AIExplanationDialog({ concept, nodeId, mindMapId, onClose }: AIExplanationDialogProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function fetchExplanation() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/ai/explain-concept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            concept,
            context: 'mind_map',
            mode: 'quick', // Quick mode for compact response
          }),
        });

        if (!response.ok) {
          throw new Error('Falha ao gerar explicação');
        }

        const data = await response.json();
        setExplanation(data.explanation);
      } catch (err) {
        console.error('Error fetching AI explanation:', err);
        const errorMessage = 'Não foi possível gerar a explicação. Tente novamente.';
        setError(errorMessage);
        toast({
          title: 'Erro',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchExplanation();
    // Remove onClose from dependencies to prevent re-fetching on parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept]);

  const handleViewFullExplanation = () => {
    const params = new URLSearchParams({
      concept,
      context: 'mindmap',
      ...(mindMapId && { mindMapId: mindMapId.toString() }),
    });
    setLocation(`/assistant?${params.toString()}`);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto" data-testid="ai-explanation-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <DialogTitle>Professor IA explica</DialogTitle>
          </div>
          <DialogDescription>
            Explicação do conceito: <strong>{concept}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-sm text-muted-foreground">
                Professor IA está preparando a explicação...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-sm text-destructive" data-testid="text-explanation-error">
                {error}
              </p>
            </div>
          ) : (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              data-testid="text-explanation-content"
            >
              <ReactMarkdown>
                {explanation}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 mt-6">
          <Button 
            onClick={handleViewFullExplanation} 
            variant="default"
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-view-full-explanation"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Ver explicação completa
          </Button>
          <Button onClick={onClose} variant="outline" data-testid="button-close-explanation">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
