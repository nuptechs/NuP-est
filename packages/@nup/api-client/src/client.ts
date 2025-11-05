import type { ApiConfig } from './types';

export function createApiClient(config: ApiConfig) {
  const baseUrl = config.baseUrl || '';
  
  return {
    async request(method: string, url: string, data?: any) {
      const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      return response;
    },
  };
}
