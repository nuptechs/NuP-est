import { Brain, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useJobPolling } from '../hooks/useJobPolling';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@nup/ui";
import { Progress } from "@nup/ui";
import { Button } from "@nup/ui";

interface AIGenerationProgressProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: string) => void;
  onError?: (error: string) => void;
}

export function AIGenerationProgress({
  jobId,
  open,
  onOpenChange,
  onComplete,
  onError,
}: AIGenerationProgressProps) {
  const { jobState, isPolling } = useJobPolling<string>(jobId, {
    enabled: open && !!jobId,
    onComplete: (result) => {
      setTimeout(() => {
        onComplete(result);
        onOpenChange(false);
      }, 1000); // Brief delay to show completion state
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const getStatusMessage = () => {
    if (!jobState) return 'Iniciando...';
    
    switch (jobState.status) {
      case 'queued':
        return 'Na fila de processamento...';
      case 'processing':
        if (jobState.progress < 20) return 'Preparando geração...';
        if (jobState.progress < 50) return 'Buscando conhecimento relevante...';
        if (jobState.progress < 90) return 'Gerando estrutura do mapa mental...';
        return 'Finalizando...';
      case 'completed':
        return 'Mapa mental gerado com sucesso!';
      case 'failed':
        return 'Falha na geração';
      default:
        return 'Processando...';
    }
  };

  const getStatusIcon = () => {
    if (!jobState) {
      return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
    }

    switch (jobState.status) {
      case 'queued':
        return (
          <div className="relative">
            <Brain className="w-12 h-12 text-primary/60" />
            <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
        );
      case 'processing':
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-12 h-12 text-green-500" />;
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-500" />;
      default:
        return <Brain className="w-12 h-12 text-primary" />;
    }
  };

  const progress = jobState?.progress || 0;
  const isComplete = jobState?.status === 'completed';
  const isFailed = jobState?.status === 'failed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Geração Concluída
              </>
            ) : isFailed ? (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                Erro na Geração
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 text-primary" />
                Gerando Mapa Mental
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isFailed
              ? 'Ocorreu um erro ao gerar o mapa mental. Por favor, tente novamente.'
              : 'A IA está criando seu mapa mental personalizado'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Status Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
            <div className="relative">
              {getStatusIcon()}
            </div>
          </div>

          {/* Progress Bar */}
          {!isFailed && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {progress}% • {getStatusMessage()}
              </p>
            </div>
          )}

          {/* Error Message */}
          {isFailed && jobState?.error && (
            <div className="w-full p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">
                {jobState.error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {isComplete && (
            <div className="w-full p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300 text-center">
                Seu mapa mental está pronto! Carregando no editor...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {isFailed && (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  // User can try again manually
                }}
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>

        {/* Processing Stats */}
        {jobState && !isFailed && !isComplete && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{jobState.status}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Progresso</p>
                <p className="font-medium">{jobState.progress}%</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
