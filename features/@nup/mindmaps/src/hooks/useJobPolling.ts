import { useState, useEffect, useCallback, useRef } from 'react';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobState<TResult = any> {
  id: string;
  status: JobStatus;
  progress: number;
  result?: TResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface UseJobPollingOptions {
  /**
   * Polling interval in milliseconds
   * @default 1000 (1 second)
   */
  interval?: number;
  
  /**
   * Whether to start polling immediately
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Callback when job completes
   */
  onComplete?: (result: any) => void;
  
  /**
   * Callback when job fails
   */
  onError?: (error: string) => void;
}

/**
 * Hook to poll job status from the server
 * Automatically starts/stops polling based on job status
 */
export function useJobPolling<TResult = any>(
  jobId: string | null,
  options: UseJobPollingOptions = {}
) {
  const {
    interval = 1000,
    enabled = true,
    onComplete,
    onError,
  } = options;

  const [jobState, setJobState] = useState<JobState<TResult> | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/mindmaps/jobs/${jobId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[JobPolling] Job ${jobId} not found`);
          return;
        }
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }

      const data = await response.json();
      setJobState(data);

      // Stop polling if job is complete or failed
      if (data.status === 'completed' || data.status === 'failed') {
        setIsPolling(false);
        
        if (data.status === 'completed' && onCompleteRef.current) {
          onCompleteRef.current(data.result);
        } else if (data.status === 'failed' && onErrorRef.current) {
          onErrorRef.current(data.error || 'Job failed');
        }
      }
    } catch (error) {
      console.error('[JobPolling] Error fetching job status:', error);
      setIsPolling(false);
    }
  }, [jobId]);

  // Start polling when jobId is set and enabled
  useEffect(() => {
    if (!jobId || !enabled) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    
    // Fetch immediately
    fetchJobStatus();

    // Start interval
    intervalRef.current = setInterval(fetchJobStatus, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, enabled, interval, fetchJobStatus]);

  // Stop polling when job is complete
  useEffect(() => {
    if (!isPolling && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isPolling]);

  return {
    jobState,
    isPolling,
    refetch: fetchJobStatus,
  };
}
