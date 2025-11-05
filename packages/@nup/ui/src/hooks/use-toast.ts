// Shared toast hook - will be fully implemented later
// For now, export a placeholder

export interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: (options: Toast) => {
      console.log('[Toast]', options);
      // TODO: Implement actual toast logic
    },
  };
}
