import { EmailResult } from '../types';

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff?: boolean;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  shouldRetry: (error: any) => boolean = () => true
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = config.exponentialBackoff
        ? config.delayMs * Math.pow(2, attempt - 1)
        : config.delayMs;
      
      console.log(`[Retry] Attempt ${attempt}/${config.maxAttempts} failed. Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export function shouldRetryEmailError(result: EmailResult): boolean {
  if (result.success) {
    return false;
  }
  
  const retryableErrors = [
    'timeout',
    'network',
    'connection',
    'temporarily unavailable',
    'rate limit',
    '429',
    '503',
    '504'
  ];
  
  const message = result.message.toLowerCase();
  return retryableErrors.some(error => message.includes(error));
}
