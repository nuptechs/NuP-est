import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" data-testid="ai-explanation-dialog">
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
              className="prose prose-base dark:prose-invert max-w-none prose-headings:text-purple-600 dark:prose-headings:text-purple-400 prose-strong:text-primary prose-a:text-purple-600 dark:prose-a:text-purple-400 prose-code:text-purple-600 dark:prose-code:text-purple-400 prose-pre:bg-muted prose-table:text-sm"
              data-testid="text-explanation-content"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom table styling
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-muted" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-4 py-3 text-left text-sm font-semibold" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-4 py-3 text-sm border-t border-border" {...props} />
                  ),
                  // Highlighted boxes for important concepts
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/20 pl-4 py-2 my-4 italic" {...props} />
                  ),
                  // Code blocks
                  code: ({ node, inline, ...props }) => 
                    inline ? (
                      <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono" {...props} />
                    ) : (
                      <code className="block p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto" {...props} />
                    ),
                  // Lists with better spacing
                  ul: ({ node, ...props }) => (
                    <ul className="space-y-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="space-y-2" {...props} />
                  ),
                }}
              >
                {explanation}
              </ReactMarkdown>
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
