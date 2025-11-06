/**
 * Hook for fetching document outline
 */

import { useQuery } from '@tanstack/react-query';
import type { DocumentOutline } from '@shared/schema';

interface DocumentOutlineResponse {
  materialId: string;
  materialTitle: string;
  hasOutline: boolean;
  outline?: DocumentOutline;
  message?: string;
}

export function useDocumentOutline(materialId: string | null) {
  return useQuery<DocumentOutlineResponse>({
    queryKey: ['/api/materials', materialId, 'outline'],
    enabled: !!materialId,
    staleTime: 1000 * 60 * 30,
    retry: false
  });
}
