/**
 * HOOK: useJobStatus
 * 
 * Polls job status for large document processing
 * Returns real-time status updates until job completes
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentPhase?: 'pending' | 'analyzing' | 'splitting' | 'chunking' | 'indexing' | 'consolidating' | 'completed';
  totalParts?: number;
  completedParts?: number;
  progressPercentage?: number;
  currentPartNumber?: number;
  currentActivity?: string;
  chunksGenerated?: number;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

interface UseJobStatusOptions {
  jobId: string | null;
  enabled?: boolean;
  pollInterval?: number; // milliseconds
  onComplete?: (status: JobStatus) => void;
  onError?: (error: Error) => void;
}

export function useJobStatus({
  jobId,
  enabled = true,
  pollInterval = 3000, // 3 seconds
  onComplete,
  onError,
}: UseJobStatusOptions) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownErrorToast = useRef(false); // Prevent toast spam
  const { toast } = useToast();

  // Fetch job status
  const fetchStatus = async () => {
    if (!jobId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/jobs/${jobId}/status`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const data: JobStatus = await response.json();
      setStatus(data);

      // Check if job completed
      if (data.status === 'completed') {
        console.log(`[useJobStatus] Job ${jobId} completed!`);
        
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Call completion callback
        onComplete?.(data);

        // Show success toast
        toast({
          title: 'Processamento concluído!',
          description: `Documento processado com sucesso. ${data.chunksGenerated || 0} chunks gerados.`,
        });
      } else if (data.status === 'failed') {
        console.error(`[useJobStatus] Job ${jobId} failed:`, data.errorMessage);
        
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        const err = new Error(data.errorMessage || 'Job failed');
        setError(err);
        onError?.(err);

        // Show error toast
        toast({
          title: 'Erro no processamento',
          description: data.errorMessage || 'Falha ao processar documento',
          variant: 'destructive',
        });
      }

      setIsLoading(false);
    } catch (err) {
      console.error('[useJobStatus] Error fetching status:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setIsLoading(false);
      onError?.(error);
      
      // Only show toast once to avoid spam on transient network issues
      if (!hasShownErrorToast.current) {
        hasShownErrorToast.current = true;
        toast({
          title: 'Erro ao buscar status',
          description: 'Não foi possível obter o status do processamento. Tentando novamente...',
          variant: 'destructive',
        });
      }
    }
  };

  // Start polling when jobId is provided
  useEffect(() => {
    if (!jobId || !enabled) {
      // Clear interval if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchStatus();

    // Start polling
    intervalRef.current = setInterval(fetchStatus, pollInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, enabled, pollInterval]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
