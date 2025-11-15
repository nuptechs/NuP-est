/**
 * API Client Shim
 * Provides fallback API client when @nup/api-client is not available
 */

// Cache for monorepo detection
let isMonorepo = false;

// Try to detect if we're in monorepo
try {
  if (typeof require !== 'undefined') {
    require('@nup/api-client');
    isMonorepo = true;
  }
} catch {
  isMonorepo = false;
}

// API Request Function
export async function apiRequest(url: string, options?: RequestInit) {
  // In monorepo, use real API client
  if (isMonorepo && typeof require !== 'undefined') {
    const { apiRequest: realApiRequest } = require('@nup/api-client');
    return realApiRequest(url, options);
  }
  
  // Standalone fallback using native fetch
  console.log('ℹ️  Using @nup/app-kit API shim for:', url);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`API Error (${response.status}): ${error}`);
  }
  
  return response.json();
}

export const USING_API_SHIMS = !isMonorepo;
