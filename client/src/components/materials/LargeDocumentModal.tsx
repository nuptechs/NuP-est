/**
 * LARGE DOCUMENT MODAL
 * 
 * Shows confirmation modal for large documents
 * Displays processing progress with real-time updates
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Clock, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { useJobStatus } from '@/hooks/useJobStatus';
import { useToast } from '@/hooks/use-toast';

interface LargeDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle: string;
  pageCount: number;
  estimatedTime: number; // minutes
}

export default function LargeDocumentModal({
  isOpen,
  onClose,
  materialId,
  materialTitle,
  pageCount,
  estimatedTime,
}: LargeDocumentModalProps) {
  const { toast } = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);

  // Use job status hook for polling
  const { status, isLoading, error } = useJobStatus({
    jobId,
    enabled: !!jobId,
    pollInterval: 3000,
    onComplete: () => {
      // Auto-close modal after completion
      setTimeout(() => {
        onClose();
      }, 3000);
    },
  });

  // Initiate background processing
  const handleConfirm = async () => {
    try {
      setIsInitiating(true);

      const response = await fetch(`/api/materials/${materialId}/large-process`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate processing');
      }

      const data = await response.json();
      setJobId(data.jobId);

      toast({
        title: 'Processamento iniciado',
        description: 'O documento está sendo processado em segundo plano. Você será notificado quando concluir.',
      });
    } catch (err) {
      console.error('Error initiating processing:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar processamento',
        variant: 'destructive',
      });
    } finally {
      setIsInitiating(false);
    }
  };

  // Get phase description
  const getPhaseDescription = (phase?: string) => {
    switch (phase) {
      case 'analyzing':
        return 'Analisando estrutura do documento...';
      case 'splitting':
        return 'Dividindo documento em partes inteligentes...';
      case 'chunking':
        return 'Processando e dividindo conteúdo...';
      case 'indexing':
        return 'Indexando chunks para busca RAG...';
      case 'consolidating':
        return 'Finalizando e consolidando resultados...';
      case 'completed':
        return 'Processamento concluído!';
      default:
        return 'Aguardando início...';
    }
  };

  // Render initial confirmation screen
  if (!jobId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-large-document">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documento Grande Detectado
            </DialogTitle>
            <DialogDescription>
              Este documento requer processamento especial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Document info */}
            <Alert>
              <Layers className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{materialTitle}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{pageCount} páginas</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{estimatedTime} minutos
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Explanation */}
            <div className="space-y-3 text-sm">
              <p>
                Documentos com mais de 250 páginas são processados em segundo plano para evitar travamentos e garantir melhor qualidade.
              </p>
              
              <div className="space-y-2">
                <p className="font-medium">O que acontecerá:</p>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Análise inteligente da estrutura do documento</li>
                  <li>Divisão respeitando capítulos e seções</li>
                  <li>Processamento otimizado com chunking semântico</li>
                  <li>Indexação automática para busca RAG</li>
                </ul>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  Você pode fechar esta janela. O processamento continuará em segundo plano e você receberá uma notificação quando concluir.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-processing"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isInitiating}
              className="flex-1"
              data-testid="button-confirm-processing"
            >
              {isInitiating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar Processamento'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render processing screen
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-processing-status">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status?.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : status?.status === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            )}
            {status?.status === 'completed' 
              ? 'Processamento Concluído' 
              : status?.status === 'failed'
              ? 'Processamento Falhou'
              : 'Processando Documento'}
          </DialogTitle>
          <DialogDescription>
            {materialTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress info */}
          {status && status.status !== 'failed' && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {getPhaseDescription(status.currentPhase)}
                  </span>
                  <Badge variant="outline">
                    {status.completedParts || 0}/{status.totalParts || 0} partes
                  </Badge>
                </div>
                <Progress value={status.progressPercentage || 0} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {status.progressPercentage || 0}% concluído
                </p>
              </div>

              {/* Current activity */}
              {status.currentActivity && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {status.currentActivity}
                  </AlertDescription>
                </Alert>
              )}

              {/* Stats */}
              {status.chunksGenerated && status.chunksGenerated > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span>{status.chunksGenerated} chunks gerados</span>
                </div>
              )}
            </>
          )}

          {/* Error message */}
          {status?.status === 'failed' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {status.errorMessage || 'Erro desconhecido'}
              </AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {status?.status === 'completed' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                Documento processado com sucesso! {status.chunksGenerated} chunks foram indexados e estão prontos para uso.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant={status?.status === 'completed' || status?.status === 'failed' ? 'default' : 'outline'}
            onClick={onClose}
            data-testid="button-close-status"
          >
            {status?.status === 'completed' || status?.status === 'failed' ? 'Fechar' : 'Fechar e Continuar em Segundo Plano'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
