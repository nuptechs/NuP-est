import { QueryClient } from '@tanstack/react-query';

// Default fetcher for TanStack Query
async function defaultFetcher({ queryKey }: { queryKey: string[] }) {
  const url = queryKey[0];
  const response = await fetch(url, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultFetcher,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// API request helper
export async function apiRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  data?: any
) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response;
}
