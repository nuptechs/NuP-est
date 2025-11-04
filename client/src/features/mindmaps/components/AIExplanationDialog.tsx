import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIExplanationDialogProps {
  concept: string;
  nodeId: string;
  onClose: () => void;
}

export function AIExplanationDialog({ concept, nodeId, onClose }: AIExplanationDialogProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="ai-explanation-dialog">
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
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                data-testid="text-explanation-content"
              >
                {explanation}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline" data-testid="button-close-explanation">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
